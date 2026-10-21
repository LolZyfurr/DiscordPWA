import React from 'https://esm.sh/react@18';

const e = React.createElement;

export default function ChatMessageItem({
    m,
    state,
    isSelectMode,
    setIsSelectMode,
    selectedMsgIds,
    setSelectedMsgIds,
    activeMenuMsgId,
    setActiveMenuMsgId,
    fetchUserProfile,
    setReplyingTo,
    setEditingMessageId,
    setText,
    handleRetryMessage,
    setMessageFullscreen,
    scrollToMessage,
    renderFormattedContent,
    setDeleteModal
}) {
    const avatarUrl = m.author.avatar
        ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png?size=64`
        : `https://cdn.discordapp.com/embed/avatars/0.png`;
    const isOwn = state.user && m.author.id === state.user.id;
    const showMenu = activeMenuMsgId === m.id;

    // Fixed: Exclude audio attachments from image attachments
    const imageAttachments = (m.attachments || []).filter(att =>
        att.url &&
        !att.content_type?.startsWith('audio/') &&
        !att.url?.match(/\.(mp3|wav|ogg|m4a|aac)$/i)
    );
    const audioAttachments = (m.attachments || []).filter(att => att.content_type?.startsWith('audio/') || att.url?.match(/\.(mp3|wav|ogg|m4a|aac)$/i));

    const isPending = m.status === 'pending';
    const isFailed = m.status === 'failed';
    const isSelected = selectedMsgIds.has(m.id);

    // Check if we should hide message content when it's just a matching gifv embed link
    const hasGifvEmbed = m.embeds && m.embeds.some(emb => emb.type === 'gifv' && emb.url);
    const trimmedContent = (m.content || '').trim();
    const isSingleGifvLink = hasGifvEmbed && m.embeds.length === 1 && m.embeds.some(emb => emb.url === trimmedContent);
    const displayContent = isSingleGifvLink ? '' : m.content;

    // Collect all viewable media for fullscreen viewing (images + gifv videos/thumbnails)
    const gifvEmbeds = (m.embeds || []).filter(emb => emb.type === 'gifv' && (emb.video?.url || emb.thumbnail?.url));
    const allFullscreenItems = [
        ...imageAttachments.map(att => ({ type: 'image', url: att.url })),
        ...gifvEmbeds.map(emb => ({ type: 'video', url: emb.video?.url, poster: emb.thumbnail?.url }))
    ];

    return e('div', {
        key: m.id,
        id: `message-${m.id}`,
        onClick: () => {
            if (isSelectMode && isOwn && !isPending && !isFailed) {
                const next = new Set(selectedMsgIds);
                if (next.has(m.id)) next.delete(m.id);
                else next.add(m.id);
                setSelectedMsgIds(next);
            }
        },
        className: `group relative px-3 py-2 my-1 rounded-lg border transition-all duration-300 ease-in-out ${isFailed
            ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
            : isPending
                ? 'border-white/5 bg-[#000000] opacity-75'
                : isSelected
                    ? 'border-white/30 bg-white/[0.04]'
                    : 'border-transparent hover:border-white/10 hover:bg-white/[0.02]'
            } ${isSelectMode && isOwn ? 'cursor-pointer' : ''}`
    },
        m.referenced_message && e('div', {
            onClick: (eEvt) => {
                if (isSelectMode) return;
                eEvt.stopPropagation();
                scrollToMessage(m.referenced_message.id);
            },
            className: 'text-xs font-light text-neutral-400 border-l border-white/20 pl-2 mb-1 truncate cursor-pointer hover:text-white transition-colors duration-200 flex items-center space-x-1 ml-[50px]'
        },
            e('span', { className: 'font-normal text-neutral-300' }, `@${m.referenced_message.author.username}`),
            e('span', { className: 'truncate' }, `: ${m.referenced_message.content || 'Attachment'}`)
        ),
        e('div', { className: 'flex items-start' },
            isSelectMode && isOwn && !isPending && !isFailed && e('div', {
                onClick: (eEvt) => {
                    eEvt.stopPropagation();
                    const next = new Set(selectedMsgIds);
                    if (next.has(m.id)) next.delete(m.id);
                    else next.add(m.id);
                    setSelectedMsgIds(next);
                },
                className: `w-4 h-4 rounded border flex items-center justify-center shrink-0 mr-3.5 mt-1 transition-all duration-200 ease-in-out cursor-pointer ${isSelected
                    ? 'bg-white/20 border-white/50 text-white'
                    : 'bg-[#000000] border-white/20 hover:border-white/40 text-transparent'
                    }`
            },
                isSelected && e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '10', height: '10', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '3', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-3 h-3 text-white' },
                    e('polyline', { points: '20 6 9 17 4 12' })
                )
            ),
            (!isSelectMode || !isOwn || isPending || isFailed) && e('img', {
                src: avatarUrl,
                alt: 'Avatar',
                className: 'w-9 h-9 rounded-full object-cover bg-neutral-900 border border-white/10 shrink-0 mr-3.5 cursor-pointer hover:opacity-80 transition-opacity duration-200',
                onClick: (eEvt) => fetchUserProfile(m.author.id, eEvt)
            }),
            e('div', { className: 'flex flex-col overflow-hidden flex-1' },
                e('div', { className: 'flex items-baseline space-x-2 mb-1' },
                    e('span', {
                        className: 'font-normal text-sm text-neutral-100 tracking-wide hover:underline cursor-pointer',
                        onClick: (eEvt) => fetchUserProfile(m.author.id, eEvt)
                    }, m.author.username),
                    e('span', { className: 'text-[10px] font-light text-neutral-500' }, new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
                    isPending && e('span', { className: 'flex items-center space-x-1 text-neutral-400 text-[10px]' },
                        e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '10', height: '10', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', className: 'animate-spin' },
                            e('circle', { cx: '12', cy: '12', r: '10', strokeOpacity: '0.25' }),
                            e('path', { d: 'M12 2a10 10 0 0 1 10 10', strokeOpacity: '1' })
                        ),
                        e('span', {}, 'Sending...')
                    ),
                    isFailed && e('span', { className: 'flex items-center space-x-1 text-red-400 text-[10px] font-medium' },
                        e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '10', height: '10', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
                            e('circle', { cx: '12', cy: '12', r: '10' }),
                            e('line', { x1: '12', y1: '8', x2: '12', y2: '12' }),
                            e('line', { x1: '12', y1: '16', x2: '12.01', y2: '16' })
                        ),
                        e('span', {}, 'Failed to send')
                    )
                ),
                displayContent && e('div', { className: 'text-sm font-light text-neutral-200 break-words leading-relaxed' }, renderFormattedContent(displayContent, m.mentions)),
                imageAttachments.length > 0 && e('div', { className: 'flex flex-wrap gap-2 mt-2' },
                    imageAttachments.map((att, attIdx) =>
                        e('img', {
                            key: att.id || attIdx,
                            src: att.url,
                            alt: 'attachment',
                            onClick: () => setMessageFullscreen({ images: allFullscreenItems, index: attIdx, message: m }),
                            className: 'max-w-[220px] max-h-[220px] rounded-lg border border-white/10 object-cover shadow-sm cursor-pointer hover:opacity-90 transition-opacity duration-200'
                        })
                    )
                ),
                audioAttachments.map((att, attIdx) => {
                    return e(AudioPlayerEmbed, { key: att.id || attIdx, att });
                }),
                m.embeds && m.embeds.map((emb, embIdx) => {
                    if (emb.type === 'gifv' && emb.video?.url) {
                        const globalIndex = imageAttachments.length + embIdx;
                        return e('div', {
                            key: embIdx,
                            onClick: () => setMessageFullscreen({ images: allFullscreenItems, index: globalIndex, message: m }),
                            className: 'mt-2 max-w-[280px] rounded-xl overflow-hidden border border-white/10 bg-[#050505] shadow-sm cursor-pointer hover:opacity-95 transition-opacity'
                        },
                            e('video', {
                                src: emb.video.url,
                                poster: emb.thumbnail?.url,
                                autoPlay: true,
                                loop: true,
                                muted: true,
                                playsInline: true,
                                className: 'w-full h-auto object-cover max-h-[350px] pointer-events-none'
                            })
                        );
                    }
                    return null;
                }),
                isFailed && e('div', { className: 'mt-2 flex items-center space-x-2' },
                    e('button', {
                        onClick: () => handleRetryMessage ? handleRetryMessage(m) : setText(m.content),
                        className: 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 px-2.5 py-1 rounded text-xs font-light transition-colors cursor-pointer flex items-center space-x-1.5'
                    },
                        e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
                            e('polyline', { points: '1 4 1 10 7 10' }),
                            e('path', { d: 'M3.51 15a9 9 0 1 0 2.13-9.36L1 10' })
                        ),
                        e('span', {}, 'Tap to Retry')
                    )
                )
            ),

            // Context Menu
            !isSelectMode && e('div', { className: 'absolute right-3 top-1.5 flex items-center' },
                e('button', {
                    onClick: (eEvt) => {
                        eEvt.stopPropagation();
                        setActiveMenuMsgId(showMenu ? null : m.id);
                    },
                    className: 'p-1 text-neutral-400 hover:text-white rounded border border-transparent hover:border-white/10 bg-[#0a0a0a] opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out'
                },
                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-3.5 h-3.5' },
                        e('circle', { cx: '12', cy: '12', r: '1' }),
                        e('circle', { cx: '12', cy: '5', r: '1' }),
                        e('circle', { cx: '12', cy: '19', r: '1' })
                    )
                ),
                showMenu && e(React.Fragment, null,
                    e('div', {
                        onClick: () => setActiveMenuMsgId(null),
                        className: 'fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm'
                    }),
                    e('div', {
                        className: `
                            z-50 bg-[#0a0a0a] border border-white/10 shadow-2xl flex flex-col text-sm
                            fixed inset-x-0 bottom-0 rounded-t-xl p-3 space-y-1 pb-safe animate-slide-up
                            md:absolute md:inset-x-auto md:bottom-full md:right-0 md:mb-1.5 md:w-44 md:rounded-lg md:p-1 md:space-y-0
                        `
                    },
                        e('div', { className: 'hidden md:block px-3 py-1.5 text-[10px] font-light uppercase tracking-wider text-neutral-500 border-b border-white/10 mb-1' }, 'Options'),
                        e('button', {
                            onClick: () => { setReplyingTo(m); setActiveMenuMsgId(null); },
                            className: 'px-3 py-2 md:py-1.5 text-left font-light hover:bg-white/[0.05] text-neutral-200 rounded-md transition-all duration-200'
                        }, 'Reply'),
                        m.content && e('button', {
                            onClick: () => {
                                navigator.clipboard.writeText(m.content);
                                setActiveMenuMsgId(null);
                            },
                            className: 'px-3 py-2 md:py-1.5 text-left font-light hover:bg-white/[0.05] text-neutral-200 rounded-md transition-all duration-200'
                        }, 'Copy Message Content'),
                        isOwn && !isPending && !isFailed && e('button', {
                            onClick: () => { setEditingMessageId(m.id); setText(m.content); setActiveMenuMsgId(null); },
                            className: 'px-3 py-2 md:py-1.5 text-left font-light hover:bg-white/[0.05] text-neutral-200 rounded-md transition-all duration-200'
                        }, 'Edit'),
                        isOwn && !isPending && !isFailed && e('button', {
                            onClick: () => {
                                setIsSelectMode(true);
                                setSelectedMsgIds(new Set([m.id]));
                                setActiveMenuMsgId(null);
                            },
                            className: 'px-3 py-2 md:py-1.5 text-left font-light hover:bg-white/[0.05] text-neutral-200 rounded-md transition-all duration-200'
                        }, 'Select Messages'),
                        isOwn && e('button', {
                            onClick: () => {
                                setActiveMenuMsgId(null);
                                if (setDeleteModal) {
                                    setDeleteModal({ type: 'single', ids: [m.id], status: 'prompt' });
                                }
                            },
                            className: 'px-3 py-2 md:py-1.5 text-left font-light hover:bg-red-500/10 text-red-400 rounded-md transition-all duration-200'
                        }, 'Delete'),
                        e('button', {
                            onClick: () => setActiveMenuMsgId(null),
                            className: 'mt-2 md:hidden px-3 py-2 text-center bg-white/10 hover:bg-white/20 text-white font-normal rounded-md transition-all duration-200'
                        }, 'Cancel')
                    )
                )
            )
        )
    );
}

function AudioPlayerEmbed({ att }) {
    const audioRef = React.useRef(null);
    const containerRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentTime, setCurrentTime] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [waveHeights, setWaveHeights] = React.useState([]);

    const rafRef = React.useRef(null);
    const currentTimeRef = React.useRef(0);

    const barsCount = 200; // Fixed total number of bars for every file so density remains uniform

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

    // Attach a non-passive wheel event listener to avoid passive event listener warnings when preventing default
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
    // Scale total width relative to duration so that 10% corresponds to 1 second per 10 seconds of audio (or scale factor based on 10% view window)
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

    // Calculate pagination start window and track sizing/translation
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
                // Proportional track container with smooth translate
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