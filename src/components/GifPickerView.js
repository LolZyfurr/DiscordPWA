import React from 'https://esm.sh/react@18';
import { fetchGifsApi } from '../network/api.js';

const e = React.createElement;

// In-memory thumbnail cache up to 20MB, referenced by original url (gif.url)
const thumbnailCache = new Map();
const MAX_THUMBNAIL_CACHE_SIZE = 20 * 1024 * 1024;
let currentThumbnailCacheSize = 0;

// In-memory search results cache to eliminate redundant network overhead for present/past queries
const searchCache = new Map();
const MAX_SEARCH_CACHE_SIZE = 40;

function enforceThumbnailCacheSizeLimit() {
    while (currentThumbnailCacheSize > MAX_THUMBNAIL_CACHE_SIZE && thumbnailCache.size > 0) {
        const oldestKey = thumbnailCache.keys().next().value;
        const entry = thumbnailCache.get(oldestKey);
        if (entry) {
            currentThumbnailCacheSize -= entry.size;
        }
        thumbnailCache.delete(oldestKey);
    }
}

function enforceSearchCacheLimit() {
    if (searchCache.size > MAX_SEARCH_CACHE_SIZE) {
        const oldestKey = searchCache.keys().next().value;
        searchCache.delete(oldestKey);
    }
}

function GifItem({ gif, onSelect, isPaused }) {
    const gifUrl = gif.url;
    const rawSrc = gif.gif_src;

    const [isLoaded, setIsLoaded] = React.useState(() => thumbnailCache.has(gifUrl));
    const [thumbnailSrc, setThumbnailSrc] = React.useState(() => {
        if (thumbnailCache.has(gifUrl)) {
            const entry = thumbnailCache.get(gifUrl);
            thumbnailCache.delete(gifUrl);
            thumbnailCache.set(gifUrl, entry);
            return entry.dataUrl;
        }
        return rawSrc;
    });
    const itemRef = React.useRef(null);

    React.useEffect(() => {
        if (thumbnailCache.has(gifUrl)) {
            const entry = thumbnailCache.get(gifUrl);
            thumbnailCache.delete(gifUrl);
            thumbnailCache.set(gifUrl, entry);
            setThumbnailSrc(entry.dataUrl);
            setIsLoaded(true);
        } else {
            setThumbnailSrc(gif.gif_src);
            setIsLoaded(false);
        }
    }, [gif.gif_src, gifUrl]);

    // If background work is paused (modal is open), don't trigger new image loads/canvas conversions
    if (isPaused) {
        return e('div', {
            className: 'group relative w-full rounded-md bg-[#0a0a0a] border border-white/10 opacity-60 overflow-hidden'
        },
            e('div', { className: 'w-full h-24 bg-neutral-900/40 flex items-center justify-center text-[10px] text-neutral-500' }, 'Paused')
        );
    }

    if (!rawSrc && !thumbnailCache.has(gifUrl)) return null;

    // Capture the first frame onto a canvas and freeze the WebP animation to save bandwidth/CPU
    const handleImageLoad = (event) => {
        if (!isLoaded) {
            setIsLoaded(true);
            const img = event.target;
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width || 100;
                canvas.height = img.naturalHeight || img.height || 100;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const staticDataUrl = canvas.toDataURL('image/webp');

                const size = staticDataUrl.length * 2; // Approximate byte size
                if (!thumbnailCache.has(gifUrl)) {
                    thumbnailCache.set(gifUrl, { dataUrl: staticDataUrl, size });
                    currentThumbnailCacheSize += size;
                    enforceThumbnailCacheSizeLimit();
                }

                setThumbnailSrc(staticDataUrl);
            } catch (err) {
                // Fallback gracefully if CORS/tainted canvas restriction applies
            }
        }
    };

    const handleImageError = () => {
        if (!isLoaded) {
            setIsLoaded(true);
        }
    };

    return e('div', {
        ref: itemRef,
        onClick: () => onSelect(gif),
        className: 'group relative w-full rounded-md bg-[#0a0a0a] border border-white/10 hover:border-white/30 cursor-pointer transition-all duration-200 ease-in-out hover:scale-[1.02] overflow-hidden'
    },
        e('img', {
            src: thumbnailSrc,
            crossOrigin: 'anonymous',
            alt: gif.title || 'GIF',
            title: gif.title,
            onLoad: handleImageLoad,
            onError: handleImageError,
            className: `w-full h-auto object-contain transition-opacity duration-200 ease-in-out block ${isLoaded ? 'opacity-90 group-hover:opacity-100' : 'opacity-40 animate-pulse'}`
        })
    );
}

function GifPreviewModal({ gif, onClose, onInsert }) {
    const [progressState, setProgressState] = React.useState({
        percent: 0,
        loaded: 0,
        total: 0,
        speed: 0,
        eta: 'Calculating...'
    });
    const [isPaused, setIsPaused] = React.useState(false);
    const [stallTimer, setStallTimer] = React.useState(0);
    const [videoBlobUrl, setVideoBlobUrl] = React.useState(null);
    const [hasError, setHasError] = React.useState(false);

    const abortControllerRef = React.useRef(null);
    const historyRef = React.useRef([]);
    const lastUpdateRef = React.useRef(Date.now());
    const prevPercentRef = React.useRef(0);
    const isPausedRef = React.useRef(isPaused);
    isPausedRef.current = isPaused;

    // Fetch video with streaming progress tracking
    React.useEffect(() => {
        if (!gif || !gif.preview) return;

        let isCancelled = false;
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const downloadVideo = async () => {
            try {
                const response = await fetch(gif.preview, { signal: controller.signal });
                if (!response.ok) throw new Error('Network response failed');

                const total = parseInt(response.headers.get('content-length'), 10) || 0;
                let loaded = 0;
                const reader = response.body.getReader();
                const chunks = [];

                while (true) {
                    if (isPausedRef.current) {
                        await new Promise(resolve => {
                            const interval = setInterval(() => {
                                if (!isPausedRef.current) {
                                    clearInterval(interval);
                                    resolve();
                                }
                            }, 200);
                        });
                    }

                    const { done, value } = await reader.read();
                    if (done) break;
                    if (isCancelled) return;

                    chunks.push(value);
                    loaded += value.length;

                    const now = Date.now();
                    const percent = total > 0 ? Math.round((loaded / total) * 100) : Math.min(99, Math.round(loaded / 1024));
                    const timeDiff = (now - lastUpdateRef.current) / 1000;
                    const percentDiff = percent - prevPercentRef.current;

                    let speed = 0;
                    if (timeDiff > 0 && percentDiff > 0) {
                        speed = Math.round((value.length / 1024) / timeDiff);
                        historyRef.current = [...historyRef.current.slice(-5), { rate: percentDiff / timeDiff, time: now }];
                        prevPercentRef.current = percent;
                        lastUpdateRef.current = now;
                        setStallTimer(0);
                    }

                    // ETA calculation
                    let etaStr = 'Calculating...';
                    if (percent >= 100) {
                        etaStr = '0s';
                    } else if (historyRef.current.length > 0) {
                        const avgRate = historyRef.current.reduce((acc, h) => acc + h.rate, 0) / historyRef.current.length;
                        if (avgRate > 0) {
                            const remainingSecs = Math.ceil((100 - percent) / avgRate);
                            etaStr = remainingSecs < 60 ? `${remainingSecs}s` : `${Math.floor(remainingSecs / 60)}m ${remainingSecs % 60}s`;
                        }
                    }

                    setProgressState({
                        percent,
                        loaded,
                        total,
                        speed,
                        eta: etaStr
                    });
                }

                if (!isCancelled) {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    const blobUrl = URL.createObjectURL(blob);
                    setVideoBlobUrl(blobUrl);
                    setProgressState(prev => ({ ...prev, percent: 100, eta: '0s' }));
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.error("Preview download error:", err);
                setHasError(true);
            }
        };

        downloadVideo();

        return () => {
            isCancelled = true;
            controller.abort();
            if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
        };
    }, [gif]);

    const formatBytes = (loaded, total) => {
        if (loaded === undefined) return '';
        const format = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        };
        return total ? `${format(loaded)} / ${format(total)}` : format(loaded);
    };

    const uploadStage = React.useMemo(() => {
        if (isPaused) return 'Preview download paused by user';
        if (progressState.percent === 0) return 'Connecting & initializing stream...';
        if (progressState.percent < 40) return 'Streaming WebM preview chunks...';
        if (progressState.percent < 100) return 'Buffering media payload...';
        return 'Preview ready!';
    }, [progressState.percent, isPaused]);

    return e('div', { className: 'fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4' },
        e('div', { className: 'bg-[#0a0a0a] border border-white/10 rounded-xl p-4 max-w-sm w-full flex flex-col space-y-4 shadow-2xl' },
            // Header
            e('div', { className: 'flex justify-between items-center' },
                e('span', { className: 'text-white font-medium text-xs truncate max-w-[260px]' }, gif.title || 'GIF Preview'),
                e('button', {
                    onClick: onClose,
                    className: 'text-neutral-400 hover:text-white cursor-pointer p-1'
                }, '✕')
            ),

            // Video Preview or Loading Placeholder
            e('div', { className: 'w-full rounded-lg overflow-hidden bg-black flex items-center justify-center min-h-[200px] max-h-[300px] relative' },
                videoBlobUrl
                    ? e('video', {
                        src: videoBlobUrl,
                        autoPlay: true,
                        loop: true,
                        muted: true,
                        playsInline: true,
                        className: 'w-full h-auto object-contain max-h-[280px]'
                    })
                    : e('div', { className: 'flex flex-col items-center justify-center p-6 text-center space-y-2' },
                        e('div', { className: 'w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin' }),
                        e('span', { className: 'text-neutral-400 text-xs' }, `Loading preview (${progressState.percent}%)`)
                    )
            ),

            // Progress Bar & Stats (matching UploadProgressView style)
            progressState.percent < 100 && !hasError && e('div', { className: 'bg-[#050505] border border-white/10 p-3 flex flex-col space-y-2.5 rounded-lg shadow-inner' },
                e('div', { className: 'flex justify-between items-center text-xs font-light text-neutral-300' },
                    e('div', { className: 'flex items-center space-x-2 truncate' },
                        e('span', { className: 'w-2 h-2 rounded-full ' + (isPaused ? 'bg-amber-400 animate-pulse' : 'bg-white animate-pulse') }),
                        e('span', { className: 'font-normal truncate' }, 'Downloading Preview', ` (${progressState.percent}%)`)
                    ),
                    e('div', { className: 'flex items-center space-x-2 text-neutral-400 font-light shrink-0' },
                        progressState.loaded > 0 && e('span', { className: 'text-neutral-400' }, formatBytes(progressState.loaded, progressState.total)),
                        progressState.loaded > 0 && e('span', { className: 'text-neutral-600' }, '•'),
                        e('span', { className: 'text-neutral-300 font-normal' }, `${progressState.speed} KB/s`),
                        e('span', { className: 'text-neutral-600' }, '•'),
                        e('span', { className: 'text-neutral-400' }, `ETA: ${progressState.eta}`)
                    )
                ),
                e('div', { className: 'text-[11px] text-neutral-400 font-light italic' }, uploadStage),
                e('div', { className: 'w-full bg-neutral-900 border border-white/10 h-2 rounded-full overflow-hidden flex' },
                    e('div', {
                        className: `h-full transition-all duration-300 ease-out ${isPaused ? 'bg-amber-400/80' : 'bg-white'}`,
                        style: { width: `${progressState.percent}%` }
                    })
                ),
                e('div', { className: 'flex justify-between items-center pt-0.5' },
                    e('button', {
                        onClick: () => setIsPaused(!isPaused),
                        className: 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 px-2.5 py-1 rounded-md text-xs font-light transition-all cursor-pointer flex items-center space-x-1'
                    }, isPaused ? 'Resume Download' : 'Pause Download'),
                    e('button', {
                        onClick: () => {
                            if (abortControllerRef.current) abortControllerRef.current.abort();
                            onClose();
                        },
                        className: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1 rounded-md text-xs font-light transition-all cursor-pointer'
                    }, 'Cancel')
                )
            ),

            hasError && e('div', { className: 'text-red-400 text-xs text-center py-2' }, 'Failed to load preview.'),

            // Insert Button (enabled once loaded or available)
            e('button', {
                onClick: onInsert,
                disabled: !videoBlobUrl && progressState.percent < 100,
                className: `w-full font-medium py-2.5 rounded-md text-xs transition-all shadow-lg ${videoBlobUrl ? 'bg-white text-black hover:bg-neutral-200 cursor-pointer' : 'bg-white/20 text-white/50 cursor-not-allowed'}`
            }, 'Insert')
        )
    );
}

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
    const [selectedGif, setSelectedGif] = React.useState(null);

    const pickerRef = React.useRef(null);
    const abortControllerRef = React.useRef(null);

    const isLowEndNetwork = React.useMemo(() => {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) return false;
        return conn.saveData ||
            conn.effectiveType === 'slow-2g' ||
            conn.effectiveType === '2g' ||
            conn.effectiveType === '3g' ||
            (conn.effectiveType === '4g' && conn.downlink && conn.downlink < 1.5);
    }, []);

    const loadGifs = async (query) => {
        const trimmedQuery = (query || 'cat').trim();
        if (!token || selectedGif || !showGifPicker) return;

        // Serve instantly from cache if this search query was previously fetched
        if (searchCache.has(trimmedQuery)) {
            setGifResults(searchCache.get(trimmedQuery));
            setIsSearchingGifs(false);
            setHasError(false);
            return;
        }

        // On slow 3G/4G connections, prevent automatic default loading if query is empty
        if (isLowEndNetwork && !gifSearchQuery.trim() && trimmedQuery === 'cat') {
            setIsSearchingGifs(false);
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsSearchingGifs(true);
        setHasError(false);

        try {
            const data = await fetchGifsApi(token, trimmedQuery, { signal: controller.signal });
            const results = data || [];
            searchCache.set(trimmedQuery, results);
            enforceSearchCacheLimit();
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

    // Optimized search and debounce effect with zero background overhead when picker is closed or on slow networks
    React.useEffect(() => {
        if (!showGifPicker || selectedGif || !token) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            return;
        }

        const trimmedQuery = gifSearchQuery.trim();

        // On slow 3G/4G connections without an active query, avoid background loading/fetching entirely
        if (isLowEndNetwork && !trimmedQuery) {
            setGifResults([]);
            setIsSearchingGifs(false);
            return;
        }

        const debounceTime = isLowEndNetwork ? 600 : 300;
        const timer = setTimeout(() => {
            loadGifs(trimmedQuery || 'cat');
        }, debounceTime);

        return () => clearTimeout(timer);
    }, [gifSearchQuery, showGifPicker, token, isLowEndNetwork, selectedGif]);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target) && !selectedGif) {
                setShowGifPicker(false);
            }
        };

        if (showGifPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showGifPicker, setShowGifPicker, selectedGif]);

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
                    disabled: Boolean(selectedGif),
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

        // Results scroll container
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
                                gifResults.filter((_, idx) => idx % 2 === 0).map((gif) => {
                                    return e(GifItem, {
                                        key: gif.id || gif.url,
                                        gif,
                                        onSelect: setSelectedGif,
                                        isPaused: Boolean(selectedGif)
                                    });
                                })
                            ),
                            // Column 2
                            e('div', { className: 'flex flex-col space-y-2' },
                                gifResults.filter((_, idx) => idx % 2 !== 0).map((gif) => {
                                    return e(GifItem, {
                                        key: gif.id || gif.url,
                                        gif,
                                        onSelect: setSelectedGif,
                                        isPaused: Boolean(selectedGif)
                                    });
                                })
                            )
                        )
        ),

        // Modal Preview with Stream Progress
        selectedGif && e(GifPreviewModal, {
            gif: selectedGif,
            onClose: () => setSelectedGif(null),
            onInsert: () => {
                setText(selectedGif.url);
                setSelectedGif(null);
                setShowGifPicker(false);
            }
        })
    );
}