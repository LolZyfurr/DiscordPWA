import React from 'https://esm.sh/react@18';

const e = React.createElement;

export default function ChatInputBar({
    token,
    typingUsersList,
    replyingTo,
    setReplyingTo,
    editingMessageId,
    setEditingMessageId,
    text,
    setText,
    uploadProgress,
    clearAttachment,
    stagedFiles,
    setStagedFiles,
    setEditingFileIndex,
    setTempFileName,
    removeStagedFile,
    setFullscreenFileIndex,
    handleSendMessage,
    handleMultipleFileSelect,
    maxChars,
    hasContent
}) {
    const [isPaused, setIsPaused] = React.useState(false);
    const [uploadHistory, setUploadHistory] = React.useState([]);
    const [stallTimer, setStallTimer] = React.useState(0);
    const [showGifPicker, setShowGifPicker] = React.useState(false);
    const [gifSearchQuery, setGifSearchQuery] = React.useState('');
    const [gifResults, setGifResults] = React.useState([]);
    const [isSearchingGifs, setIsSearchingGifs] = React.useState(false);
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

    React.useEffect(() => {
        const fetchGifs = async (query) => {
            if (!token) return;
            setIsSearchingGifs(true);
            try {
                const res = await fetch(`https://discord.com/api/v9/gifs/search?q=${encodeURIComponent(query)}&media_format=webm&locale=en-US`, {
                    "headers": {
                        "accept": "*/*",
                        "accept-language": "en-US",
                        "authorization": token,
                    },
                    "body": null,
                    "method": "GET",
                    "mode": "cors",
                    "credentials": "include"
                });
                if (res.ok) {
                    const data = await res.json();
                    setGifResults(data || []);
                }
            } catch (err) {
                console.error("Failed to fetch GIFs:", err);
            } finally {
                setIsSearchingGifs(false);
            }
        };

        const timer = setTimeout(() => {
            if (showGifPicker) {
                fetchGifs(gifSearchQuery || 'cat');
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [gifSearchQuery, showGifPicker, token]);

    const handlePaste = (evt) => {
        const items = evt.clipboardData?.items;
        if (!items) return;
        const filesToAdd = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const file = item.getAsFile();
            if (file) {
                filesToAdd.push({
                    file,
                    preview: item.type.indexOf('image') !== -1 ? URL.createObjectURL(file) : null,
                    name: file.name || `pasted-file-${Date.now()}`,
                    size: file.size,
                    type: file.type
                });
            }
        }
        if (filesToAdd.length > 0) {
            evt.preventDefault();
            const availableSlots = 10 - (stagedFiles?.length || 0);
            const sliceFiles = filesToAdd.slice(0, availableSlots);
            if (sliceFiles.length > 0 && setStagedFiles) {
                setStagedFiles(prev => [...(prev || []), ...sliceFiles].slice(0, 10));
            }
        }
    };

    return e(React.Fragment, null,
        typingUsersList.length > 0 && e('div', { className: 'px-4 py-1.5 text-xs font-light text-neutral-400 flex items-center space-x-2 bg-[#000000] border-t border-white/10' },
            e('div', { className: 'flex space-x-1 items-center' },
                e('span', { className: 'w-1 h-1 bg-white/60 rounded-full animate-pulse [animation-delay:-0.3s]' }),
                e('span', { className: 'w-1 h-1 bg-white/60 rounded-full animate-pulse [animation-delay:-0.15s]' }),
                e('span', { className: 'w-1 h-1 bg-white/60 rounded-full animate-pulse' })
            ),
            e('span', { className: 'truncate' }, 'Someone is typing...')
        ),

        replyingTo && e('div', { className: 'bg-[#050505] border-t border-white/10 px-4 py-2 flex items-center justify-between text-xs font-light text-neutral-300 z-20' },
            e('span', { className: 'truncate' }, `Replying to @${replyingTo.author.username}: ${replyingTo.content}`),
            e('button', { onClick: () => setReplyingTo(null), className: 'text-neutral-400 hover:text-white font-medium ml-2 transition-colors duration-200' }, '✕')
        ),

        editingMessageId && e('div', { className: 'bg-[#050505] border-t border-white/10 px-4 py-2 flex items-center justify-between text-xs font-light text-white z-20' },
            e('span', { className: 'truncate' }, 'Editing message...'),
            e('button', { onClick: () => { setEditingMessageId(null); setText(''); }, className: 'text-neutral-400 hover:text-white font-medium ml-2 transition-colors duration-200' }, '✕')
        ),

        showGifPicker && e('div', { className: 'bg-[#0a0a0a] border-t border-white/10 p-3 flex flex-col space-y-3 z-30 max-h-64 shadow-2xl' },
            e('div', { className: 'flex items-center justify-between' },
                e('input', {
                    type: 'text',
                    value: gifSearchQuery,
                    onChange: (e) => setGifSearchQuery(e.target.value),
                    placeholder: 'Search Discord GIFs...',
                    className: 'flex-1 bg-neutral-900 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30'
                }),
                e('button', {
                    onClick: () => setShowGifPicker(false),
                    className: 'ml-2 text-neutral-400 hover:text-white p-1 text-xs'
                }, '✕')
            ),
            e('div', { className: 'grid grid-cols-4 gap-2 overflow-y-auto max-h-48 scrollbar-none' },
                isSearchingGifs && gifResults.length === 0
                    ? e('div', { className: 'col-span-4 text-center text-xs text-neutral-500 py-4' }, 'Loading GIFs...')
                    : gifResults.map((gif, idx) => {
                        const gifUrl = gif.url;
                        const previewImg = gif.gif_src || gif.preview || gif.url;
                        if (!previewImg) return null;
                        return e('img', {
                            key: idx,
                            src: previewImg,
                            alt: gif.title || 'GIF',
                            title: gif.title,
                            onClick: () => {
                                setText(gifUrl);
                                setShowGifPicker(false);
                            },
                            className: 'w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-80 border border-white/10 transition-opacity'
                        });
                    })
            )
        ),

        uploadProgress && e('div', { className: 'bg-[#050505] border-t border-white/10 p-3 flex flex-col space-y-2.5 z-20 shadow-lg' },
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
        ),

        stagedFiles.length > 0 && !uploadProgress && e('div', { className: 'flex space-x-3 overflow-x-auto p-3 bg-[#000000] border-t border-white/10 shrink-0 z-25 scrollbar-none' },
            stagedFiles.map((fileObj, idx) => {
                const isImage = fileObj.type?.startsWith('image/') || fileObj.preview?.startsWith('blob:');
                return e('div', {
                    key: idx,
                    className: 'w-36 h-48 bg-[#050505] border border-white/10 rounded-lg p-2.5 flex flex-col justify-between relative shrink-0 shadow-sm hover:border-white/30 transition-all duration-200 ease-in-out'
                },
                    e('div', { className: 'absolute top-2 right-2 flex items-center space-x-1.5 text-neutral-400 z-10' },
                        e('button', {
                            onClick: () => {
                                setEditingFileIndex(idx);
                                setTempFileName(fileObj.name);
                            },
                            className: 'hover:text-white transition-colors duration-200 cursor-pointer p-1 rounded hover:bg-white/10',
                            title: 'Edit File Name'
                        },
                            e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-3.5 h-3.5' },
                                e('path', { d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z' }),
                                e('path', { d: 'm15 5 4 4' })
                            )
                        ),
                        e('button', {
                            onClick: () => removeStagedFile(idx),
                            className: 'text-red-400 hover:text-red-300 transition-colors duration-200 cursor-pointer p-1 rounded hover:bg-red-500/10',
                            title: 'Delete'
                        },
                            e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-3.5 h-3.5' },
                                e('path', { d: 'M10 11v6' }),
                                e('path', { d: 'M14 11v6' }),
                                e('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }),
                                e('path', { d: 'M3 6h18' }),
                                e('path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })
                            )
                        )
                    ),
                    isImage
                        ? e('img', {
                            src: fileObj.preview,
                            alt: fileObj.name,
                            onClick: () => setFullscreenFileIndex(idx),
                            className: 'w-full h-24 object-cover rounded-md mt-6 cursor-pointer hover:opacity-90 border border-white/10 transition-opacity duration-200'
                        })
                        : e('div', { className: 'w-full h-24 bg-neutral-900 border border-white/10 rounded-md mt-6 flex items-center justify-center text-neutral-400' },
                            e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-8 h-8' },
                                e('path', { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' }),
                                e('polyline', { points: '14 2 14 8 20 8' })
                            )
                        ),
                    e('span', { className: 'text-xs font-light text-neutral-300 truncate block mt-2' }, fileObj.name)
                );
            })
        ),

        e('form', { onSubmit: handleSendMessage, className: 'p-4 bg-[#000000] border-t border-white/10 pb-safe shrink-0 z-30' },
            e('div', { className: 'bg-[#050505] rounded-xl px-4 py-2.5 flex items-center space-x-3 border border-white/10 focus-within:border-white/30 transition-all duration-200 ease-in-out' },
                e('label', { className: 'cursor-pointer text-neutral-400 hover:text-white transition-colors duration-200 shrink-0 flex items-center justify-center p-1 rounded-md hover:bg-white/5', title: 'Add Attachment' },
                    e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-5 h-5' },
                        e('circle', { cx: '12', cy: '12', r: '10' }),
                        e('path', { d: 'M8 12h8' }),
                        e('path', { d: 'M12 8v8' })
                    ),
                    e('input', { type: 'file', multiple: true, onChange: handleMultipleFileSelect, className: 'hidden' })
                ),
                e('textarea', {
                    rows: 1,
                    value: text,
                    onChange: (evt) => {
                        const val = evt.target.value;
                        if (val.length <= maxChars) {
                            setText(val);
                        }
                        evt.target.style.height = 'auto';
                        evt.target.style.height = `${Math.min(evt.target.scrollHeight, 120)}px`;
                    },
                    onKeyDown: (evt) => {
                        if (evt.key === 'Enter' && !evt.shiftKey) {
                            evt.preventDefault();
                            handleSendMessage(evt);
                        }
                    },
                    onPaste: handlePaste,
                    placeholder: 'Message DM...',
                    className: 'flex-1 bg-transparent border-none text-neutral-100 placeholder-neutral-500 text-sm font-light focus:outline-none resize-none max-h-[120px] py-1 scrollbar-none'
                }),
                e('div', { className: 'flex items-center space-x-2 shrink-0 text-neutral-400' },
                    e('button', {
                        type: 'button',
                        onClick: () => setShowGifPicker(!showGifPicker),
                        className: 'hover:text-white transition-colors duration-200 cursor-pointer flex items-center p-1 rounded-md hover:bg-white/5',
                        title: 'GIF'
                    },
                        e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-5 h-5' },
                            e('path', { d: 'M15 15.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997a1 1 0 0 1-1.517-.86z' }),
                            e('path', { d: 'M21 12.17V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6' }),
                            e('path', { d: 'm6 21 5-5' }),
                            e('circle', { cx: '9', cy: '9', r: '2' })
                        )
                    ),
                    e('button', { type: 'button', className: 'hover:text-white transition-colors duration-200 cursor-pointer flex items-center p-1 rounded-md hover:bg-white/5', title: 'Speed/Emoji' },
                        e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-5 h-5' },
                            e('path', { d: 'M15 10V9' }),
                            e('path', { d: 'M16.472 15a6 6 0 01-8.943 0' }),
                            e('path', { d: 'M9 10V9' }),
                            e('circle', { cx: '12', cy: '12', r: '10' })
                        )
                    ),
                    e('div', {
                        className: `flex items-center transition-all duration-200 ease-in-out overflow-hidden ${hasContent ? 'opacity-100 max-w-[32px] ml-1' : 'opacity-0 max-w-0 ml-0 pointer-events-none'}`
                    },
                        e('button', {
                            type: 'submit',
                            className: 'text-neutral-100 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200 ease-in-out active:scale-95 shrink-0 flex items-center justify-center w-7 h-7 rounded-md shadow-sm',
                            title: editingMessageId ? 'Save' : 'Send'
                        },
                            editingMessageId
                                ? e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4' },
                                    e('path', { d: 'M20 6 9 17l-5-5' })
                                )
                                : e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4' },
                                    e('path', { d: 'M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z' }),
                                    e('path', { d: 'M6 12h16' })
                                )
                        )
                    )
                )
            )
        )
    );
}