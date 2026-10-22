import React from 'https://esm.sh/react@18';
import { fetchGifsApi } from '../network/api.js';

const e = React.createElement;

// In-memory cache for search results to avoid redundant network hits on poor connections
const searchCache = new Map();

// Rough estimation: 200MB limit for cached search results
const MAX_CACHE_SIZE_BYTES = 200 * 1024 * 1024;
let currentCacheSizeBytes = 0;

// In-memory thumbnail cache up to 20MB, referenced by original url (gif.url)
const thumbnailCache = new Map();
const MAX_THUMBNAIL_CACHE_SIZE = 20 * 1024 * 1024;
let currentThumbnailCacheSize = 0;

function enforceCacheSizeLimit() {
    while (currentCacheSizeBytes > MAX_CACHE_SIZE_BYTES && searchCache.size > 0) {
        // Delete the oldest entry (first inserted in Map)
        const oldestKey = searchCache.keys().next().value;
        const entry = searchCache.get(oldestKey);

        // Estimate size reduction based on URL strings or remove a fixed weight/count approximation
        if (entry && Array.isArray(entry)) {
            // Roughly estimate 500KB per GIF object/asset reference
            currentCacheSizeBytes -= entry.length * 500 * 1024;
        } else {
            currentCacheSizeBytes -= 1024 * 1024;
        }

        searchCache.delete(oldestKey);
    }
}

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

function GifItem({ gif, setText, setShowGifPicker }) {
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

    if (!rawSrc && !thumbnailCache.has(gifUrl)) return null;

    // Capture the first frame onto a canvas and freeze the WebP animation to save bandwidth/CPU
    const handleImageLoad = (e) => {
        if (!isLoaded) {
            setIsLoaded(true);
            const img = e.target;
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

                // Switch image source to the cached thumbnail and release the animated WebP from memory
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
        onClick: () => {
            setText(gifUrl);
            setShowGifPicker(false);
        },
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

    const pickerRef = React.useRef(null);
    const abortControllerRef = React.useRef(null);

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

        try {
            const data = await fetchGifsApi(token, query, { signal: controller.signal });
            const results = data || [];

            // Approximate size contribution for new results
            currentCacheSizeBytes += results.length * 500 * 1024;
            searchCache.set(cacheKey, results);
            enforceCacheSizeLimit();

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
                                gifResults.filter((_, idx) => idx % 2 === 0).map((gif) => {
                                    return e(GifItem, {
                                        key: gif.id || gif.url,
                                        gif,
                                        setText,
                                        setShowGifPicker
                                    });
                                })
                            ),
                            // Column 2
                            e('div', { className: 'flex flex-col space-y-2' },
                                gifResults.filter((_, idx) => idx % 2 !== 0).map((gif) => {
                                    return e(GifItem, {
                                        key: gif.id || gif.url,
                                        gif,
                                        setText,
                                        setShowGifPicker
                                    });
                                })
                            )
                        )
        )
    );
}