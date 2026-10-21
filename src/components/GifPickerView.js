import React from 'https://esm.sh/react@18';
import { fetchGifsApi } from '../network/api.js';

const e = React.createElement;

export default function GifPickerView({
    token,
    showGifPicker,
    setShowGifPicker,
    setText
}) {
    const [gifSearchQuery, setGifSearchQuery] = React.useState('');
    const [gifResults, setGifResults] = React.useState([]);
    const [isSearchingGifs, setIsSearchingGifs] = React.useState(false);

    React.useEffect(() => {
        const loadGifs = async (query) => {
            if (!token) return;
            setIsSearchingGifs(true);
            try {
                const data = await fetchGifsApi(token, query);
                setGifResults(data || []);
            } catch (err) {
                console.error("Failed to fetch GIFs:", err);
            } finally {
                setIsSearchingGifs(false);
            }
        };

        const timer = setTimeout(() => {
            if (showGifPicker) {
                loadGifs(gifSearchQuery || 'cat');
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [gifSearchQuery, showGifPicker, token]);

    if (!showGifPicker) return null;

    return e('div', { className: 'bg-[#000000] border border-white/10 p-3 flex flex-col space-y-3 z-30 max-h-72 rounded-lg backdrop-blur-md font-sans text-xs tracking-wide' },
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
                    placeholder: 'Search GIFs...',
                    className: 'w-full bg-[#0a0a0a] border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 font-light tracking-wide focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all duration-200 ease-in-out'
                })
            ),
            e('button', {
                onClick: () => setShowGifPicker(false),
                ariaLabel: 'Close GIF picker',
                className: 'flex items-center justify-center w-7 h-7 rounded-md text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200 ease-in-out'
            },
                e('svg', {
                    className: 'w-3.5 h-3.5',
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: '1.5',
                    viewBox: '0 0 24 24'
                },
                    e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M6 18L18 6M6 6l12 12' })
                )
            )
        ),
        e('div', { className: 'grid grid-cols-2 gap-2 overflow-y-auto max-h-52 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent' },
            isSearchingGifs && gifResults.length === 0
                ? e('div', { className: 'col-span-4 flex items-center justify-center py-8 text-neutral-500 font-light tracking-widest text-[11px] uppercase' }, 'Searching...')
                : gifResults.map((gif, idx) => {
                    const gifUrl = gif.url;
                    const previewImg = gif.gif_src || gif.preview || gif.url;
                    if (!previewImg) return null;
                    return e('div', {
                        key: idx,
                        onClick: () => {
                            setText(gifUrl);
                            setShowGifPicker(false);
                        },
                        className: 'group relative w-full rounded-md bg-[#0a0a0a] border border-white/10 hover:border-white/30 cursor-pointer transition-all duration-200 ease-in-out hover:scale-[1.02] flex items-center justify-center'
                    },
                        e('img', {
                            src: previewImg,
                            alt: gif.title || 'GIF',
                            title: gif.title,
                            className: 'w-full h-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-200 ease-in-out block'
                        })
                    );
                })
        )
    );
}