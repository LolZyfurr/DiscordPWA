import React from 'https://esm.sh/react@18';

const e = React.createElement;

export default function AudioPlayerEmbed({ att }) {
    const audioRef = React.useRef(null);
    const containerRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentTime, setCurrentTime] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [waveHeights, setWaveHeights] = React.useState([]);

    const rafRef = React.useRef(null);
    const currentTimeRef = React.useRef(0);

    const barsCount = 200;

    React.useEffect(() => {
        const heights = [];
        let seed = 123456;
        for (let i = 0; i < att.url.length; i++) {
            seed = (seed * 31 + att.url.charCodeAt(i)) % 1000000;
        }
        for (let i = 0; i < barsCount; i++) {
            seed = (seed * 16807) % 2147483647;
            const val = 12 + (seed % 80);
            heights.push(val);
        }
        setWaveHeights(heights);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [att.url]);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheelEvent = (evt) => {
            evt.preventDefault();
            const delta = evt.deltaY || evt.deltaX;
            handleSeek(currentTimeRef.current + (delta > 0 ? 0.8 : -0.8));
        };

        container.addEventListener('wheel', handleWheelEvent, { passive: false });
        return () => {
            container.removeEventListener('wheel', handleWheelEvent);
        };
    }, [duration]);

    const updatePlayhead = () => {
        if (audioRef.current) {
            const t = audioRef.current.currentTime;
            currentTimeRef.current = t;
            setCurrentTime(t);
            if (!audioRef.current.paused && !audioRef.current.ended) {
                rafRef.current = requestAnimationFrame(updatePlayhead);
            }
        }
    };

    const togglePlay = (eEvt) => {
        eEvt.stopPropagation();
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        } else {
            audioRef.current.play().then(() => {
                setIsPlaying(true);
                rafRef.current = requestAnimationFrame(updatePlayhead);
            }).catch(err => console.error(err));
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
        }
    };

    const handleSeek = (newTime) => {
        if (audioRef.current) {
            const clamped = Math.max(0, Math.min(newTime, duration || 0));
            audioRef.current.currentTime = clamped;
            currentTimeRef.current = clamped;
            setCurrentTime(clamped);
        }
    };

    const dur = duration || 1;
    const windowSize = dur * 0.20;

    const isDragging = React.useRef(false);
    const startX = React.useRef(0);
    const startTimeAtDrag = React.useRef(0);

    const handleMouseDown = (eEvt) => {
        eEvt.stopPropagation();
        isDragging.current = true;
        startX.current = eEvt.clientX;
        startTimeAtDrag.current = currentTimeRef.current;
    };

    const handleMouseMove = (eEvt) => {
        if (!isDragging.current) return;
        const deltaX = eEvt.clientX - startX.current;
        const containerWidth = 240;
        const timeDelta = -(deltaX / containerWidth) * windowSize;
        handleSeek(startTimeAtDrag.current + timeDelta);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const handleTouchStart = (eEvt) => {
        if (eEvt.touches.length === 0) return;
        eEvt.stopPropagation();
        isDragging.current = true;
        startX.current = eEvt.touches[0].clientX;
        startTimeAtDrag.current = currentTimeRef.current;
    };

    const handleTouchMove = (eEvt) => {
        if (!isDragging.current || eEvt.touches.length === 0) return;
        const deltaX = eEvt.touches[0].clientX - startX.current;
        const containerWidth = 240;
        const timeDelta = -(deltaX / containerWidth) * windowSize;
        handleSeek(startTimeAtDrag.current + timeDelta);
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
    };

    const formatTime = (secs) => {
        if (isNaN(secs)) return '0:00';
        const mins = Math.floor(secs / 60);
        const remain = Math.floor(secs % 60);
        return `${mins}:${remain < 10 ? '0' : ''}${remain}`;
    };

    const startWindow = Math.max(0, Math.min(currentTime - windowSize / 2, Math.max(0, dur - windowSize)));
    const trackWidthPercent = Math.max(100, (dur / windowSize) * 100);
    const translatePercent = dur > windowSize ? (startWindow / dur) * 100 : 0;

    const totalBars = waveHeights.length || 1;

    return e('div', {
        className: 'mt-2 bg-[#050505] rounded-xl p-3 border border-white/10 flex items-center space-x-3 max-w-sm select-none',
        onClick: (eEvt) => eEvt.stopPropagation()
    },
        e('audio', {
            ref: audioRef,
            src: att.url,
            onLoadedMetadata: handleLoadedMetadata,
            onEnded: () => {
                setIsPlaying(false);
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
            }
        }),
        e('button', {
            onClick: togglePlay,
            className: 'w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0 transition-all cursor-pointer'
        },
            isPlaying ? e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
                e('rect', { x: '6', y: '4', width: '4', height: '16' }),
                e('rect', { x: '14', y: '4', width: '4', height: '16' })
            ) : e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
                e('polygon', { points: '5 3 19 12 5 21 5 3' })
            )
        ),
        e('div', { className: 'flex flex-col flex-1 overflow-hidden' },
            e('div', {
                ref: containerRef,
                onMouseDown: handleMouseDown,
                onMouseMove: handleMouseMove,
                onMouseUp: handleMouseUp,
                onMouseLeave: handleMouseUp,
                onTouchStart: handleTouchStart,
                onTouchMove: handleTouchMove,
                onTouchEnd: handleTouchEnd,
                onTouchCancel: handleTouchEnd,
                className: 'h-10 relative flex items-center cursor-grab active:cursor-grabbing overflow-hidden px-1 bg-black/40 rounded border border-white/5'
            },
                e('div', {
                    style: {
                        width: `${trackWidthPercent}%`,
                        transform: `translateX(-${translatePercent}%)`
                    },
                    className: 'flex items-center justify-between h-full space-x-[1px] absolute left-0 will-change-transform transition-transform duration-75 ease-linear'
                },
                    waveHeights.length > 0 ? waveHeights.map((h, idx) => {
                        const barTime = (idx / totalBars) * dur;
                        const isPast = barTime <= currentTime;
                        return e('div', {
                            key: idx,
                            style: { height: `${h}%` },
                            className: `w-[2px] rounded-full shrink-0 ${isPast ? 'bg-indigo-400' : 'bg-neutral-600'}`
                        });
                    }) : e('div', { className: 'text-[10px] text-neutral-500 w-full text-center' }, 'Loading audio waveform...')
                )
            ),
            e('div', { className: 'flex justify-between items-center mt-1 text-[10px] text-neutral-400 font-light' },
                e('span', {}, formatTime(currentTime)),
                e('span', {}, formatTime(duration || 0))
            )
        )
    );
}