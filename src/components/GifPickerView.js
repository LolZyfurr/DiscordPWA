import React from 'https://esm.sh/react@18';
import { fetchGifsApi } from '../network/api.js';
import { GifItem } from './GifItem.js';
import GifPreviewModal from './GifPreviewModal.js';

const e = React.createElement;

const searchCache = new Map();
const MAX_SEARCH_CACHE_SIZE = 40;

function enforceSearchCacheLimit() {
    if (searchCache.size > MAX_SEARCH_CACHE_SIZE) {
        const oldestKey = searchCache.keys().next().value;
        searchCache.delete(oldestKey);
    }
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

        if (searchCache.has(trimmedQuery)) {
            setGifResults(searchCache.get(trimmedQuery));
            setIsSearchingGifs(false);
            setHasError(false);
            return;
        }

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

    React.useEffect(() => {
        if (!showGifPicker || selectedGif || !token) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            return;
        }

        const trimmedQuery = gifSearchQuery.trim();

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
        className: 'bg-[#000000] border border-white/10 p-3 flex flex-col space-y-3 z-35 sm:z-[99] max-h-[450px] rounded-t-2xl sm:rounded-2xl backdrop-blur-md font-sans text-xs tracking-wide sm:fixed sm:bottom-20 sm:right-4 sm:w-80 shadow-2xl animate-slide-up'
    },
        e('div', { className: 'flex items-center gap-2 pb-2.5 border-b border-white/10' },
            e('div', { className: 'relative flex-1 flex items-center' },
                e('svg', {
                    className: 'absolute left-3 w-3.5 h-3.5 text-neutral-400 pointer-events-none',
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
                    className: 'w-full bg-[#050505] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 font-light tracking-wide focus:outline-none focus:border-white/30 transition-all duration-200'
                })
            ),
            e('button', {
                onClick: () => setShowGifPicker(false),
                ariaLabel: 'Close GIF picker',
                className: 'flex items-center justify-center w-7 h-7 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer'
            },
                e('svg', { className: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' },
                    e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M6 18L18 6M6 6l12 12' })
                )
            )
        ),

        e('div', { className: 'overflow-y-auto max-h-[360px] pr-1 scrollbar-none' },
            isSearchingGifs && gifResults.length === 0
                ? e('div', { className: 'grid grid-cols-2 gap-2' },
                    [1, 2, 3, 4].map(n =>
                        e('div', { key: n, className: 'w-full h-24 bg-neutral-900/80 animate-pulse rounded-xl border border-white/5' })
                    )
                )
                : hasError
                    ? e('div', { className: 'flex flex-col items-center justify-center py-6 text-center space-y-2' },
                        e('span', { className: 'text-neutral-400 text-xs font-light' }, 'Network connection unstable'),
                        e('button', {
                            onClick: () => loadGifs(gifSearchQuery || 'cat'),
                            className: 'bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-1.5 rounded-md text-xs font-light cursor-pointer transition-all'
                        }, 'Tap to Retry')
                    )
                    : gifResults.length === 0
                        ? e('div', { className: 'flex items-center justify-center py-8 text-neutral-500 font-light text-xs uppercase tracking-wider' }, 'No GIFs found')
                        : e('div', { className: 'grid grid-cols-2 gap-2 items-start' },
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