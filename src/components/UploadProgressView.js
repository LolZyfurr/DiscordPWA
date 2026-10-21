import React from 'https://esm.sh/react@18';

const e = React.createElement;

export default function UploadProgressView({
    uploadProgress,
    clearAttachment
}) {
    const [isPaused, setIsPaused] = React.useState(false);
    const [uploadHistory, setUploadHistory] = React.useState([]);
    const [stallTimer, setStallTimer] = React.useState(0);
    const prevPercentRef = React.useRef(0);
    const lastUpdateTimeRef = React.useRef(Date.now());

    React.useEffect(() => {
        if (!uploadProgress) {
            setIsPaused(false);
            setUploadHistory([]);
            setStallTimer(0);
            prevPercentRef.current = 0;
            return;
        }

        const now = Date.now();
        const currentPercent = uploadProgress.percent || 0;

        if (currentPercent !== prevPercentRef.current) {
            const timeDiff = (now - lastUpdateTimeRef.current) / 1000;
            const percentDiff = currentPercent - prevPercentRef.current;

            if (timeDiff > 0 && percentDiff > 0) {
                const rate = percentDiff / timeDiff;
                setUploadHistory(prev => [...prev.slice(-5), { rate, time: now }]);
            }

            prevPercentRef.current = currentPercent;
            lastUpdateTimeRef.current = now;
            setStallTimer(0);
        } else {
            if (currentPercent < 100 && !isPaused) {
                const inactiveTime = (now - lastUpdateTimeRef.current) / 1000;
                if (inactiveTime > 2.5) {
                    setStallTimer(Math.floor(inactiveTime));
                }
            }
        }
    }, [uploadProgress, isPaused]);

    const calculatedEta = React.useMemo(() => {
        if (!uploadProgress) return '0s';
        if (uploadProgress.percent >= 100) return '0s';
        if (isPaused) return 'Paused';
        if (stallTimer > 3) return 'Stalled (retrying...)';

        const remainingPercent = 100 - (uploadProgress.percent || 0);
        if (uploadHistory.length === 0) {
            return uploadProgress.eta !== undefined ? `${uploadProgress.eta}s` : 'Calculating...';
        }

        const avgRate = uploadHistory.reduce((acc, h) => acc + h.rate, 0) / uploadHistory.length;
        if (avgRate <= 0) return uploadProgress.eta !== undefined ? `${uploadProgress.eta}s` : 'Calculating...';

        const seconds = Math.ceil(remainingPercent / avgRate);
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }, [uploadProgress, uploadHistory, stallTimer, isPaused]);

    const uploadStage = React.useMemo(() => {
        if (!uploadProgress) return '';
        if (isPaused) return 'Upload Paused by User';
        if (uploadProgress.percent === 0) return 'Preparing file & generating checksums...';
        if (stallTimer > 3) return `Connection stalled for ${stallTimer}s — check network or resume...`;
        if (uploadProgress.percent < 25) return 'Establishing secure connection & uploading initial chunk...';
        if (uploadProgress.percent < 85) return 'Uploading payload data chunks...';
        if (uploadProgress.percent < 100) return 'Finalizing server processing & verification...';
        return 'Upload complete! Processing response...';
    }, [uploadProgress, stallTimer, isPaused]);

    const formatBytes = (loaded, total) => {
        if (loaded === undefined || total === undefined) return '';
        const format = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        };
        return `${format(loaded)} / ${format(total)}`;
    };

    const handleTogglePause = () => {
        if (isPaused) {
            setIsPaused(false);
            if (uploadProgress.resume) uploadProgress.resume();
        } else {
            setIsPaused(true);
            if (uploadProgress.pause) uploadProgress.pause();
        }
    };

    if (!uploadProgress) return null;

    return e('div', { className: 'bg-[#050505] border-t border-white/10 p-3 flex flex-col space-y-2.5 z-20 shadow-lg' },
        e('div', { className: 'flex justify-between items-center text-xs font-light text-neutral-300' },
            e('div', { className: 'flex items-center space-x-2 truncate' },
                e('span', { className: 'w-2 h-2 rounded-full ' + (isPaused ? 'bg-amber-400 animate-pulse' : stallTimer > 3 ? 'bg-red-400 animate-ping' : 'bg-white animate-pulse') }),
                e('span', { className: 'font-normal truncate' }, uploadProgress.fileName ? `Uploading "${uploadProgress.fileName}"` : 'Uploading media...', ` (${uploadProgress.percent}%)`)
            ),
            e('div', { className: 'flex items-center space-x-2 text-neutral-400 font-light shrink-0' },
                uploadProgress.loaded !== undefined && uploadProgress.total !== undefined && e('span', { className: 'text-neutral-400' }, formatBytes(uploadProgress.loaded, uploadProgress.total)),
                uploadProgress.loaded !== undefined && uploadProgress.total !== undefined && e('span', { className: 'text-neutral-600' }, '•'),
                e('span', { className: 'text-neutral-300 font-normal' }, `${uploadProgress.speed || 0} KB/s`),
                e('span', { className: 'text-neutral-600' }, '•'),
                e('span', { className: 'text-neutral-400' }, `ETA: ${calculatedEta}`)
            )
        ),
        e('div', { className: 'text-[11px] text-neutral-400 font-light italic flex items-center justify-between' },
            e('span', { className: 'truncate' }, uploadStage),
            stallTimer > 3 && e('span', { className: 'text-amber-400 not-italic font-normal text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20' }, 'Connection Stalled')
        ),
        e('div', { className: 'w-full bg-neutral-900 border border-white/10 h-2 rounded-full overflow-hidden flex shadow-inner' },
            e('div', {
                className: `h-full transition-all duration-300 ease-out ${isPaused ? 'bg-amber-400/80' : stallTimer > 3 ? 'bg-amber-500 animate-pulse' : 'bg-white'}`,
                style: { width: `${uploadProgress.percent}%` }
            })
        ),
        e('div', { className: 'flex justify-between items-center pt-0.5' },
            e('div', { className: 'flex items-center space-x-2' },
                e('button', {
                    onClick: handleTogglePause,
                    className: 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 px-2.5 py-1 rounded-md text-xs font-light transition-all duration-200 ease-in-out flex items-center space-x-1.5 cursor-pointer'
                },
                    isPaused
                        ? e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }, e('polygon', { points: '5 3 19 12 5 21 5 3' }))
                        : e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }, e('rect', { x: '6', y: '4', width: '4', height: '16' }), e('rect', { x: '14', y: '4', width: '4', height: '16' })),
                    isPaused ? 'Resume' : 'Pause'
                ),
                stallTimer > 3 && e('button', {
                    onClick: () => {
                        setStallTimer(0);
                        lastUpdateTimeRef.current = Date.now();
                        if (uploadProgress.retry) uploadProgress.retry();
                    },
                    className: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-md text-xs font-light transition-all duration-200 ease-in-out cursor-pointer'
                }, 'Retry Connection')
            ),
            e('button', {
                onClick: () => {
                    if (uploadProgress.xhr && typeof uploadProgress.xhr.abort === 'function') {
                        uploadProgress.xhr.abort();
                    }
                    clearAttachment();
                },
                className: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1 rounded-md text-xs font-light transition-all duration-200 ease-in-out cursor-pointer'
            }, 'Cancel Upload')
        )
    );
}