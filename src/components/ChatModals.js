import React from 'https://esm.sh/react@18';

const e = React.createElement;

export default function ChatModals({
    fullscreenFileIndex,
    setFullscreenFileIndex,
    stagedFiles,
    setEditingFileIndex,
    setTempFileName,
    removeStagedFile,
    messageFullscreen,
    setMessageFullscreen,
    setReplyingTo,
    editingFileIndex,
    tempFileName,
    saveFileName
}) {
    return e(React.Fragment, null,
        // Fullscreen Staged Image View Modal
        fullscreenFileIndex !== null && stagedFiles[fullscreenFileIndex] && e('div', {
            className: 'fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fadeIn'
        },
            e('div', { className: 'absolute top-6 right-6 flex items-center space-x-2 bg-[#0a0a0a] px-3.5 py-2 rounded-lg border border-white/10 shadow-2xl text-neutral-300' },
                e('button', {
                    onClick: () => {
                        setEditingFileIndex(fullscreenFileIndex);
                        setTempFileName(stagedFiles[fullscreenFileIndex].name);
                    },
                    className: 'hover:text-white transition-colors duration-200 cursor-pointer p-1.5 rounded-md hover:bg-white/10',
                    title: 'Edit File Name'
                },
                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4' },
                        e('path', { d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z' }),
                        e('path', { d: 'm15 5 4 4' })
                    )
                ),
                e('button', {
                    onClick: () => {
                        removeStagedFile(fullscreenFileIndex);
                        setFullscreenFileIndex(null);
                    },
                    className: 'text-red-400 hover:text-red-300 transition-colors duration-200 cursor-pointer p-1.5 rounded-md hover:bg-red-500/10',
                    title: 'Delete'
                },
                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4' },
                        e('path', { d: 'M10 11v6' }),
                        e('path', { d: 'M14 11v6' }),
                        e('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }),
                        e('path', { d: 'M3 6h18' }),
                        e('path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })
                    )
                ),
                e('div', { className: 'w-px h-4 bg-white/10 mx-1' }),
                e('button', {
                    onClick: () => setFullscreenFileIndex(null),
                    className: 'hover:text-white transition-colors duration-200 cursor-pointer p-1.5 rounded-md hover:bg-white/10',
                    title: 'Close'
                },
                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4' },
                        e('path', { d: 'M18 6L6 18M6 6l12 12' })
                    )
                )
            ),
            e('img', {
                src: stagedFiles[fullscreenFileIndex].preview,
                alt: stagedFiles[fullscreenFileIndex].name,
                className: 'max-w-full max-h-[80vh] object-contain rounded-lg border border-white/10 shadow-2xl'
            }),
            e('span', { className: 'text-neutral-300 text-sm font-light mt-4 tracking-wide' }, stagedFiles[fullscreenFileIndex].name)
        ),

        // Fullscreen Image Gallery Modal (handles both messages and profile banners/avatars)
        messageFullscreen !== null && messageFullscreen.images[messageFullscreen.index] && e('div', {
            className: 'fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fadeIn'
        },
            e('div', { className: 'absolute top-6 right-6 flex items-center space-x-2 bg-[#0a0a0a] px-3.5 py-2 rounded-lg border border-white/10 shadow-2xl text-neutral-300 z-20' },
                messageFullscreen.message?.id ? e('button', {
                    onClick: () => {
                        setReplyingTo(messageFullscreen.message);
                        setMessageFullscreen(null);
                    },
                    className: 'hover:text-white transition-colors duration-200 cursor-pointer p-1.5 rounded-md hover:bg-white/10 flex items-center space-x-1.5 text-xs font-light',
                    title: 'Reply'
                },
                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4' },
                        e('polyline', { points: '9 17 4 12 9 7' }),
                        e('path', { d: 'M20 18v-2a4 4 0 0 0-4-4H4' })
                    ),
                    e('span', {}, 'Reply')
                ) : e('button', {
                    onClick: () => {
                        const currentImg = messageFullscreen.images[messageFullscreen.index];
                        if (currentImg?.url) {
                            navigator.clipboard.writeText(currentImg.url);
                        }
                    },
                    className: 'hover:text-white transition-colors duration-200 cursor-pointer p-1.5 rounded-md hover:bg-white/10 flex items-center space-x-1.5 text-xs font-light',
                    title: 'Copy URL'
                },
                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4' },
                        e('rect', { x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' }),
                        e('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' })
                    ),
                    e('span', {}, 'Copy URL')
                ),
                e('div', { className: 'w-px h-4 bg-white/10 mx-1' }),
                e('button', {
                    onClick: () => setMessageFullscreen(null),
                    className: 'hover:text-white transition-colors duration-200 cursor-pointer p-1.5 rounded-md hover:bg-white/10',
                    title: 'Close'
                },
                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4' },
                        e('path', { d: 'M18 6L6 18M6 6l12 12' })
                    )
                )
            ),

            messageFullscreen.images.length > 1 && e('div', { className: 'absolute inset-x-6 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-20' },
                e('button', {
                    onClick: (eEvt) => {
                        eEvt.stopPropagation();
                        setMessageFullscreen(prev => ({
                            ...prev,
                            index: (prev.index - 1 + prev.images.length) % prev.images.length
                        }));
                    },
                    className: 'pointer-events-auto bg-[#0a0a0a]/80 hover:bg-[#0a0a0a] text-white p-3 rounded-full border border-white/10 shadow-xl transition-all duration-200 cursor-pointer'
                },
                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' },
                        e('polyline', { points: '15 18 9 12 15 6' })
                    )
                ),
                e('button', {
                    onClick: (eEvt) => {
                        eEvt.stopPropagation();
                        setMessageFullscreen(prev => ({
                            ...prev,
                            index: (prev.index + 1) % prev.images.length
                        }));
                    },
                    className: 'pointer-events-auto bg-[#0a0a0a]/80 hover:bg-[#0a0a0a] text-white p-3 rounded-full border border-white/10 shadow-xl transition-all duration-200 cursor-pointer'
                },
                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' },
                        e('polyline', { points: '9 18 15 12 9 6' })
                    )
                )
            ),

            e('img', {
                src: messageFullscreen.images[messageFullscreen.index].url,
                alt: 'Fullscreen attachment',
                className: 'max-w-full max-h-[80vh] object-contain rounded-lg border border-white/10 shadow-2xl'
            }),
            e('div', { className: 'flex items-center space-x-3 mt-4 text-neutral-400 text-xs font-light' },
                messageFullscreen.images.length > 1 && e('span', {}, `${messageFullscreen.index + 1} / ${messageFullscreen.images.length}`),
                e('span', {}, messageFullscreen.message.author.username)
            )
        ),

        // Modal for editing attachment file name
        editingFileIndex !== null && e('div', { className: 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn' },
            e('div', { className: 'bg-[#0a0a0a] border border-white/10 rounded-xl p-5 w-80 shadow-2xl flex flex-col space-y-4' },
                e('span', { className: 'text-white font-normal text-sm tracking-wide' }, 'Edit File Name'),
                e('input', {
                    type: 'text',
                    value: tempFileName,
                    onChange: (evt) => setTempFileName(evt.target.value),
                    onKeyDown: (evt) => {
                        if (evt.key === 'Enter') saveFileName(editingFileIndex);
                    },
                    autoFocus: true,
                    className: 'bg-black border border-white/10 text-neutral-100 rounded-lg px-3.5 py-2 text-sm font-light focus:outline-none focus:border-white/40 transition-all duration-200'
                }),
                e('div', { className: 'flex justify-end space-x-2 pt-1' },
                    e('button', {
                        onClick: () => { setEditingFileIndex(null); setTempFileName(''); },
                        className: 'px-3.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 rounded-lg text-xs font-light transition-all duration-200'
                    }, 'Cancel'),
                    e('button', {
                        onClick: () => saveFileName(editingFileIndex),
                        className: 'px-3.5 py-1.5 bg-white text-black hover:bg-neutral-200 rounded-lg text-xs font-normal transition-all duration-200 flex items-center space-x-1.5 shadow-sm'
                    },
                        e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-3.5 h-3.5' },
                            e('path', { d: 'M20 6 9 17l-5-5' })
                        ),
                        e('span', {}, 'Save')
                    )
                )
            )
        )
    );
}