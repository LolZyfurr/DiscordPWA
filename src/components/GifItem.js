import React from 'https://esm.sh/react@18';

export const thumbnailCache = new Map();
const MAX_THUMBNAIL_CACHE_SIZE = 20 * 1024 * 1024;
let currentThumbnailCacheSize = 0;

export function enforceThumbnailCacheSizeLimit() {
    while (currentThumbnailCacheSize > MAX_THUMBNAIL_CACHE_SIZE && thumbnailCache.size > 0) {
        const oldestKey = thumbnailCache.keys().next().value;
        const entry = thumbnailCache.get(oldestKey);
        if (entry) {
            currentThumbnailCacheSize -= entry.size;
        }
        thumbnailCache.delete(oldestKey);
    }
}

export function GifItem({ gif, onSelect, isPaused }) {
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

    if (isPaused) {
        return React.createElement('div', {
            className: 'group relative w-full rounded-xl bg-[#050505] border border-white/10 opacity-60 overflow-hidden'
        },
            React.createElement('div', { className: 'w-full h-24 bg-neutral-900/40 flex items-center justify-center text-[10px] text-neutral-500 font-light' }, 'Paused')
        );
    }

    if (!rawSrc && !thumbnailCache.has(gifUrl)) return null;

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

                const size = staticDataUrl.length * 2;
                if (!thumbnailCache.has(gifUrl)) {
                    thumbnailCache.set(gifUrl, { dataUrl: staticDataUrl, size });
                    currentThumbnailCacheSize += size;
                    enforceThumbnailCacheSizeLimit();
                }

                setThumbnailSrc(staticDataUrl);
            } catch (err) {
                // Fallback gracefully
            }
        }
    };

    const handleImageError = () => {
        if (!isLoaded) {
            setIsLoaded(true);
        }
    };

    return React.createElement('div', {
        ref: itemRef,
        onClick: () => onSelect(gif),
        className: 'group relative w-full rounded-xl bg-[#050505] border border-white/10 hover:border-white/30 cursor-pointer transition-all duration-200 ease-in-out hover:scale-[1.02] overflow-hidden'
    },
        React.createElement('img', {
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