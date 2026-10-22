import React from 'https://esm.sh/react@18';

const e = React.createElement;

export default function GifPreviewModal({ gif, onClose, onInsert }) {
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