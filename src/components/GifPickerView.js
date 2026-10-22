import React from 'https://esm.sh/react@18';
import { fetchGifsApi } from '../network/api.js';

const e = React.createElement;

// In-memory cache for search results to avoid redundant network hits on poor connections
const searchCache = new Map();

export default function GifPickerView({
    token,
    showGifPicker,
    setShowGifPicker,
    setText
}) {
    const [gifSearchQuery, setGifSearchQuery] = React.useState('');
    const [gifResults, setGifResults] = React.useState([]);
    const [isSearchingGifs, setIsSearchingGifs] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);

    // Buffering & preloading progress state (inspired by UploadProgressView)
    const [isBuffering, setIsBuffering] = React.useState(false);
    const [bufferingProgress, setBufferingProgress] = React.useState({ loaded: 0, total: 0, percent: 0, speed: '0' });
    const [isPaused, setIsPaused] = React.useState(false);
    const [stallTimer, setStallTimer] = React.useState(0);
    const [bufferHistory, setBufferHistory] = React.useState([]);

    const pickerRef = React.useRef(null);
    const abortControllerRef = React.useRef(null);
    const preloadAbortRef = React.useRef(null);
    const prevLoadedRef = React.useRef(0);
    const lastUpdateTimeRef = React.useRef(Date.now());

    // Detect slow network / data saver
    const isLowEndNetwork = React.useMemo(() => {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) return false;
        return conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
    }, []);

    const loadGifs = async (query) => {
        if (!token) return;
        const cacheKey = query.trim().toLowerCase();

        // Check memory cache first
        if (searchCache.has(cacheKey)) {
            setGifResults(searchCache.get(cacheKey));
            setIsSearchingGifs(false);
            setHasError(false);
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsSearchingGifs(true);
        setHasError(false);
        setIsBuffering(false);

        try {
            const data = await fetchGifsApi(token, query, { signal: controller.signal });
            const results = data || [];
            searchCache.set(cacheKey, results);
            setGifResults(results);
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error("Failed to fetch GIFs:", err);
            setHasError(true);
        } finally {
            if (abortControllerRef.current === controller) {
                setIsSearchingGifs(false);
            }
        }
    };

    // Background preloader effect to ensure all GIFs load immediately and stay cached
    React.useEffect(() => {
        if (!gifResults || gifResults.length === 0 || isPaused) {
            if (gifResults.length > 0 && !isPaused) {
                setIsBuffering(false);
            }
            return;
        }

        const total = gifResults.length;
        let loaded = 0;
        setIsBuffering(true);
        setStallTimer(0);
        prevLoadedRef.current = 0;
        lastUpdateTimeRef.current = Date.now();

        const controller = new AbortController();
        preloadAbortRef.current = controller;

        const preloadAll = async () => {
            const promises = gifResults.map((gif) => {
                const previewImg = gif.gif_src || gif.preview || gif.url;
                if (!previewImg) {
                    loaded++;
                    return Promise.resolve();
                }
                return new Promise((resolve) => {
                    if (controller.signal.aborted) {
                        resolve();
                        return;
                    }
                    const img = new Image();
                    img.src = previewImg;
                    img.onload = () => {
                        if (!controller.signal.aborted) {
                            loaded++;
                            const now = Date.now();
                            const percent = Math.round((loaded / total) * 100);
                            const timeDiff = (now - lastUpdateTimeRef.current) / 1000;
                            const loadedDiff = loaded - prevLoadedRef.current;

                            if (timeDiff > 0 && loadedDiff > 0) {
                                const rate = loadedDiff / timeDiff;
                                setBufferHistory(prev => [...prev.slice(-5), { rate, time: now }]);
                            }

                            prevLoadedRef.current = loaded;
                            lastUpdateTimeRef.current = now;
                            setStallTimer(0);
                            setBufferingProgress({
                                loaded,
                                total,
                                percent,
                                speed: (loadedDiff / (timeDiff || 1)).toFixed(1),
                            });
                        }
                        resolve();
                    };
                    img.onerror = () => {
                        if (!controller.signal.aborted) {
                            loaded++;
                            const percent = Math.round((loaded / total) * 100);
                            setBufferingProgress({ loaded, total, percent, speed: '0' });
                        }
                        resolve();
                    };
                });
            });

            await Promise.all(promises);
            if (!controller.signal.aborted) {
                setIsBuffering(false);
            }
        };

        preloadAll();

        return () => {
            controller.abort();
        };
    }, [gifResults, isPaused]);

    // Stall timer check
    React.useEffect(() => {
        if (!isBuffering || isPaused) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const inactiveTime = (now - lastUpdateTimeRef.current) / 1000;
            if (inactiveTime > 2.5 && bufferingProgress.loaded < bufferingProgress.total) {
                setStallTimer(Math.floor(inactiveTime));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isBuffering, isPaused, bufferingProgress]);

    const calculatedEta = React.useMemo(() => {
        if (!isBuffering || bufferingProgress.loaded >= bufferingProgress.total) return '0s';
        if (isPaused) return 'Paused';
        if (stallTimer > 3) return 'Stalled (retrying...)';

        const remainingItems = bufferingProgress.total - bufferingProgress.loaded;
        if (bufferHistory.length === 0) return 'Calculating...';

        const avgRate = bufferHistory.reduce((acc, h) => acc + h.rate, 0) / bufferHistory.length;
        if (avgRate <= 0) return 'Calculating...';

        const seconds = Math.ceil(remainingItems / avgRate);
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }, [isBuffering, bufferingProgress, bufferHistory, stallTimer, isPaused]);

    const bufferStage = React.useMemo(() => {
        if (!isBuffering) return 'All GIFs loaded & cached in memory';
        if (isPaused) return 'Buffering paused by user';
        if (stallTimer > 3) return `Connection stalled for ${stallTimer}s — check network or resume...`;
        if (bufferingProgress.percent < 50) return 'Preloading GIF previews into memory...';
        return 'Finalizing buffer & optimizing scroll cache...';
    }, [isBuffering, stallTimer, isPaused, bufferingProgress]);

    const handleTogglePause = () => {
        if (isPaused) {
            setIsPaused(false);
            lastUpdateTimeRef.current = Date.now();
        } else {
            setIsPaused(true);
        }
    };

    React.useEffect(() => {
        // Increase debounce slightly on slow connections to prevent spamming requests while typing
        const debounceTime = isLowEndNetwork ? 500 : 300;

        const timer = setTimeout(() => {
            if (showGifPicker) {
                loadGifs(gifSearchQuery || 'cat');
            }
        }, debounceTime);

        return () => clearTimeout(timer);
    }, [gifSearchQuery, showGifPicker, token, isLowEndNetwork]);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setShowGifPicker(false);
            }
        };

        if (showGifPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showGifPicker, setShowGifPicker]);

    if (!showGifPicker) return null;

    return e('div', {
        ref: pickerRef,
        className: 'bg-[#000000] border border-white/10 p-3 flex flex-col space-y-3 z-35 sm:z-[99] max-h-[450px] rounded-t-lg sm:rounded-lg backdrop-blur-md font-sans text-xs tracking-wide sm:fixed sm:bottom-20 sm:right-4 sm:w-80 shadow-2xl'
    },
        // Search bar & header
        e('div', { className: 'flex items-center gap-2 pb-2 border-b border-white/10' },
            e('div', { className: 'relative flex-1 flex items-center' },
                e('svg', {
                    className: 'absolute left-2.5 w-3.5 h-3.5 text-neutral-400 pointer-events-none',
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: '1.5',
                    viewBox: '0 0 24 24'
                },
                    e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z' })
                ),
                e('input', {
                    type: 'text',
                    value: gifSearchQuery,
                    onChange: (event) => setGifSearchQuery(event.target.value),
                    placeholder: isLowEndNetwork ? 'Search KLIPY (Lite Mode)...' : 'Search KLIPY GIFs...',
                    className: 'w-full bg-[#0a0a0a] border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 font-light tracking-wide focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all duration-200'
                })
            ),
            e('button', {
                onClick: () => setShowGifPicker(false),
                ariaLabel: 'Close GIF picker',
                className: 'flex items-center justify-center w-7 h-7 rounded-md text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer'
            },
                e('svg', { className: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' },
                    e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M6 18L18 6M6 6l12 12' })
                )
            )
        ),

        // Download / Buffering Progress Bar (Inspired by UploadProgressView)
        (isBuffering || (gifResults.length > 0 && bufferingProgress.loaded < bufferingProgress.total)) && e('div', { className: 'bg-[#050505] border border-white/10 p-2 rounded-md flex flex-col space-y-1.5 shadow-inner' },
            e('div', { className: 'flex justify-between items-center text-[11px] font-light text-neutral-300' },
                e('div', { className: 'flex items-center space-x-1.5 truncate' },
                    e('span', { className: 'w-2 h-2 rounded-full ' + (isPaused ? 'bg-amber-400 animate-pulse' : stallTimer > 3 ? 'bg-red-400 animate-ping' : 'bg-white animate-pulse') }),
                    e('span', { className: 'font-normal truncate' }, `Buffering GIFs (${bufferingProgress.loaded}/${bufferingProgress.total})`, ` (${bufferingProgress.percent}%)`)
                ),
                e('div', { className: 'flex items-center space-x-1.5 text-neutral-400 font-light shrink-0 text-[10px]' },
                    e('span', { className: 'text-neutral-300 font-normal' }, `${bufferingProgress.speed} items/s`),
                    e('span', { className: 'text-neutral-600' }, '•'),
                    e('span', { className: 'text-neutral-400' }, `ETA: ${calculatedEta}`)
                )
            ),
            e('div', { className: 'text-[10px] text-neutral-400 font-light italic flex items-center justify-between' },
                e('span', { className: 'truncate' }, bufferStage),
                stallTimer > 3 && e('span', { className: 'text-amber-400 not-italic font-normal text-[9px] bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20' }, 'Stalled')
            ),
            e('div', { className: 'w-full bg-neutral-900 border border-white/10 h-1.5 rounded-full overflow-hidden flex' },
                e('div', {
                    className: `h-full transition-all duration-300 ease-out ${isPaused ? 'bg-amber-400/80' : stallTimer > 3 ? 'bg-amber-500 animate-pulse' : 'bg-white'}`,
                    style: { width: `${bufferingProgress.percent}%` }
                })
            ),
            e('div', { className: 'flex justify-between items-center pt-1' },
                e('div', { className: 'flex items-center space-x-1.5' },
                    e('button', {
                        onClick: handleTogglePause,
                        className: 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 px-2 py-0.5 rounded text-[10px] font-light transition-all flex items-center space-x-1 cursor-pointer'
                    }, isPaused ? 'Resume Buffering' : 'Pause Buffering'),
                    stallTimer > 3 && e('button', {
                        onClick: () => {
                            setStallTimer(0);
                            lastUpdateTimeRef.current = Date.now();
                            setGifResults([...gifResults]); // Trigger re-preload
                        },
                        className: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] cursor-pointer'
                    }, 'Retry')
                ),
                e('span', { className: 'text-[10px] text-neutral-500' }, isBuffering ? 'Pre-caching for smooth scroll' : 'Ready')
            )
        ),

        // Results scroll container with explicit two-column layout
        e('div', { className: 'overflow-y-auto max-h-[360px] pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent' },
            isSearchingGifs && gifResults.length === 0
                ? e('div', { className: 'grid grid-cols-2 gap-2' },
                    [1, 2, 3, 4].map(n =>
                        e('div', { key: n, className: 'w-full h-24 bg-neutral-900/80 animate-pulse rounded-md border border-white/5' })
                    )
                )
                : hasError
                    ? e('div', { className: 'flex flex-col items-center justify-center py-6 text-center space-y-2' },
                        e('span', { className: 'text-neutral-400 text-[11px]' }, 'Network connection unstable'),
                        e('button', {
                            onClick: () => loadGifs(gifSearchQuery || 'cat'),
                            className: 'bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-[11px] cursor-pointer'
                        }, 'Tap to Retry')
                    )
                    : gifResults.length === 0
                        ? e('div', { className: 'flex items-center justify-center py-8 text-neutral-500 font-light text-[11px] uppercase tracking-wider' }, 'No GIFs found')
                        : e('div', { className: 'grid grid-cols-2 gap-2 items-start' },
                            // Column 1
                            e('div', { className: 'flex flex-col space-y-2' },
                                gifResults.filter((_, idx) => idx % 2 === 0).map((gif, idx) => {
                                    const realIdx = idx * 2;
                                    const gifUrl = gif.url;
                                    const previewImg = gif.gif_src || gif.preview || gif.url;
                                    if (!previewImg) return null;

                                    return e('div', {
                                        key: realIdx,
                                        onClick: () => {
                                            setText(gifUrl);
                                            setShowGifPicker(false);
                                        },
                                        className: 'group relative w-full rounded-md bg-[#0a0a0a] border border-white/10 hover:border-white/30 cursor-pointer transition-all duration-200 ease-in-out hover:scale-[1.02] overflow-hidden'
                                    },
                                        e('img', {
                                            src: previewImg,
                                            alt: gif.title || 'GIF',
                                            title: gif.title,
                                            loading: 'eager', // Eager loading prevents unloading on scroll back up
                                            className: 'w-full h-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-200 ease-in-out block'
                                        })
                                    );
                                })
                            ),
                            // Column 2
                            e('div', { className: 'flex flex-col space-y-2' },
                                gifResults.filter((_, idx) => idx % 2 !== 0).map((gif, idx) => {
                                    const realIdx = idx * 2 + 1;
                                    const gifUrl = gif.url;
                                    const previewImg = gif.gif_src || gif.preview || gif.url;
                                    if (!previewImg) return null;

                                    return e('div', {
                                        key: realIdx,
                                        onClick: () => {
                                            setText(gifUrl);
                                            setShowGifPicker(false);
                                        },
                                        className: 'group relative w-full rounded-md bg-[#0a0a0a] border border-white/10 hover:border-white/30 cursor-pointer transition-all duration-200 ease-in-out hover:scale-[1.02] overflow-hidden'
                                    },
                                        e('img', {
                                            src: previewImg,
                                            alt: gif.title || 'GIF',
                                            title: gif.title,
                                            loading: 'eager', // Eager loading prevents unloading on scroll back up
                                            className: 'w-full h-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-200 ease-in-out block'
                                        })
                                    );
                                })
                            )
                        )
        )
    );
}