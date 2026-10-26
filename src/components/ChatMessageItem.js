import React from 'https://esm.sh/react@18';
import AudioPlayerEmbed from './AudioPlayerEmbed.js';
import ContextMenu from './ContextMenu.js';

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
    handleDeleteMessage,
    setMessageFullscreen,
    scrollToMessage,
    renderFormattedContent,
    setDeleteModal,
    handleRemoveLocalMessage
}) {
    const avatarUrl = m.author.avatar
        ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png?size=64`
        : `https://cdn.discordapp.com/embed/avatars/0.png`;
    const isOwn = state.user && m.author.id === state.user.id;
    const showMenu = activeMenuMsgId === m.id;

    const imageAttachments = (m.attachments || []).filter(att =>
        att.url &&
        !att.content_type?.startsWith('audio/') &&
        !att.url?.match(/\.(mp3|wav|ogg|m4a|aac)$/i)
    );
    const audioAttachments = (m.attachments || []).filter(att => att.content_type?.startsWith('audio/') || att.url?.match(/\.(mp3|wav|ogg|m4a|aac)$/i));

    const isPending = m.status === 'pending';
    const isFailed = m.status === 'failed';
    const isSelected = selectedMsgIds.has(m.id);

    const hasGifvEmbed = m.embeds && m.embeds.some(emb => emb.type === 'gifv' && emb.url);
    const trimmedContent = (m.content || '').trim();
    const isSingleGifvLink = hasGifvEmbed && m.embeds.length === 1 && m.embeds.some(emb => emb.url === trimmedContent);
    const displayContent = isSingleGifvLink ? '' : m.content;

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
        className: `group relative px-3 py-2 my-1 rounded-xl border transition-all duration-300 ease-in-out ${isFailed
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
            className: 'text-xs font-light text-neutral-400 border-l border-white/25 pl-2 mb-1 truncate cursor-pointer hover:text-white transition-colors duration-200 flex items-center space-x-1 ml-[50px]'
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
                className: `w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mr-3.5 mt-1 transition-all duration-200 ease-in-out cursor-pointer ${isSelected
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
                    isFailed && e('span', { className: 'flex items-center space-x-1 text-red-400 text-[10px] font-normal' },
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
                            className: 'max-w-[220px] max-h-[220px] rounded-xl border border-white/10 object-cover shadow-sm cursor-pointer hover:opacity-90 transition-opacity duration-200'
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
                        onClick: () => {
                            if (handleRetryMessage) handleRetryMessage(m);
                        },
                        className: 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 px-3 py-1.5 rounded-md text-xs font-light transition-colors cursor-pointer flex items-center space-x-1.5'
                    },
                        e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
                            e('polyline', { points: '1 4 1 10 7 10' }),
                            e('path', { d: 'M3.51 15a9 9 0 1 0 2.13-9.36L1 10' })
                        ),
                        e('span', {}, 'Tap to Retry')
                    )
                )
            ),

            e('div', { className: 'absolute right-3 top-1.5 flex items-center' },
                e('button', {
                    onClick: (eEvt) => {
                        eEvt.stopPropagation();
                        setActiveMenuMsgId(showMenu ? null : m.id);
                    },
                    className: 'p-1.5 text-neutral-400 hover:text-white rounded-lg border border-transparent hover:border-white/10 bg-[#000000] opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out cursor-pointer'
                },
                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-3.5 h-3.5' },
                        e('circle', { cx: '12', cy: '12', r: '1' }),
                        e('circle', { cx: '12', cy: '5', r: '1' }),
                        e('circle', { cx: '12', cy: '19', r: '1' })
                    )
                ),
                e(ContextMenu, {
                    isOpen: showMenu,
                    onClose: () => setActiveMenuMsgId(null),
                    desktopPosition: 'bottom-full md:right-0 md:mb-1.5',
                    widthClass: 'md:w-52'
                },
                    isPending
                        ? e('button', {
                            onClick: () => {
                                setActiveMenuMsgId(null);
                                if (handleRemoveLocalMessage) {
                                    handleRemoveLocalMessage(m.id);
                                } else if (handleDeleteMessage) {
                                    handleDeleteMessage(m.id);
                                }
                            },
                            className: 'flex items-center space-x-2.5 w-full px-3 py-2 md:py-1.5 text-left font-light hover:bg-red-500/10 text-red-400 rounded-xl transition-all duration-200 cursor-pointer'
                        },
                            e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4 shrink-0' },
                                e('path', { d: 'M18 6 6 18' }),
                                e('path', { d: 'm6 6 12 12' })
                            ),
                            e('span', {}, 'Cancel Send')
                        )
                        : isFailed
                            ? e(React.Fragment, null,
                                e('button', {
                                    onClick: () => {
                                        setActiveMenuMsgId(null);
                                        if (handleRetryMessage) handleRetryMessage(m);
                                    },
                                    className: 'flex items-center space-x-2.5 w-full px-3 py-2 md:py-1.5 text-left font-light hover:bg-white/[0.05] text-neutral-200 rounded-xl transition-all duration-200 cursor-pointer'
                                },
                                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4 shrink-0' },
                                        e('path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }),
                                        e('path', { d: 'M3 3v5h5' })
                                    ),
                                    e('span', {}, 'Retry Message')
                                ),
                                e('button', {
                                    onClick: () => {
                                        setActiveMenuMsgId(null);
                                        if (handleRemoveLocalMessage) {
                                            handleRemoveLocalMessage(m.id);
                                        } else if (handleDeleteMessage) {
                                            handleDeleteMessage(m.id);
                                        }
                                    },
                                    className: 'flex items-center space-x-2.5 w-full px-3 py-2 md:py-1.5 text-left font-light hover:bg-red-500/10 text-red-400 rounded-xl transition-all duration-200 cursor-pointer'
                                },
                                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4 shrink-0' },
                                        e('path', { d: 'M10 11v6' }),
                                        e('path', { d: 'M14 11v6' }),
                                        e('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }),
                                        e('path', { d: 'M3 6h18' }),
                                        e('path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })
                                    ),
                                    e('span', {}, 'Remove Message')
                                )
                            )
                            : e(React.Fragment, null,
                                e('button', {
                                    onClick: () => { setReplyingTo(m); setActiveMenuMsgId(null); },
                                    className: 'flex items-center space-x-2.5 w-full px-3 py-2 md:py-1.5 text-left font-light hover:bg-white/[0.05] text-neutral-200 rounded-xl transition-all duration-200 cursor-pointer'
                                },
                                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4 shrink-0' },
                                        e('path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }),
                                        e('path', { d: 'M3 3v5h5' })
                                    ),
                                    e('span', {}, 'Reply Message')
                                ),
                                m.content && e('button', {
                                    onClick: () => {
                                        navigator.clipboard.writeText(m.content);
                                        setActiveMenuMsgId(null);
                                    },
                                    className: 'flex items-center space-x-2.5 w-full px-3 py-2 md:py-1.5 text-left font-light hover:bg-white/[0.05] text-neutral-200 rounded-xl transition-all duration-200 cursor-pointer'
                                },
                                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4 shrink-0' },
                                        e('rect', { width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2' }),
                                        e('path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' })
                                    ),
                                    e('span', {}, 'Copy Content')
                                ),
                                isOwn && e('button', {
                                    onClick: () => { setEditingMessageId(m.id); setText(m.content); setActiveMenuMsgId(null); },
                                    className: 'flex items-center space-x-2.5 w-full px-3 py-2 md:py-1.5 text-left font-light hover:bg-white/[0.05] text-neutral-200 rounded-xl transition-all duration-200 cursor-pointer'
                                },
                                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4 shrink-0' },
                                        e('path', { d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z' }),
                                        e('path', { d: 'm15 5 4 4' })
                                    ),
                                    e('span', {}, 'Edit Message')
                                ),
                                isOwn && e('button', {
                                    onClick: () => {
                                        setIsSelectMode(true);
                                        setSelectedMsgIds(new Set([m.id]));
                                        setActiveMenuMsgId(null);
                                    },
                                    className: 'flex items-center space-x-2.5 w-full px-3 py-2 md:py-1.5 text-left font-light hover:bg-white/[0.05] text-neutral-200 rounded-xl transition-all duration-200 cursor-pointer'
                                },
                                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4 shrink-0' },
                                        e('path', { d: 'M18 6 6 18' }),
                                        e('path', { d: 'm6 6 12 12' })
                                    ),
                                    e('span', {}, 'Select Messages')
                                ),
                                isOwn && e('button', {
                                    onClick: () => {
                                        setActiveMenuMsgId(null);
                                        if (setDeleteModal) {
                                            setDeleteModal({ type: 'single', ids: [m.id], status: 'prompt' });
                                        }
                                    },
                                    className: 'flex items-center space-x-2.5 w-full px-3 py-2 md:py-1.5 text-left font-light hover:bg-red-500/10 text-red-400 rounded-xl transition-all duration-200 cursor-pointer'
                                },
                                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4 shrink-0' },
                                        e('path', { d: 'M10 11v6' }),
                                        e('path', { d: 'M14 11v6' }),
                                        e('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }),
                                        e('path', { d: 'M3 6h18' }),
                                        e('path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })
                                    ),
                                    e('span', {}, 'Delete Message')
                                )
                            )
                )
            )
        )
    );
}