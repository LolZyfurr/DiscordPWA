import React from 'https://esm.sh/react@18';
import UploadProgressView from './UploadProgressView.js';
import GifPickerView from './GifPickerView.js';
import StagedFilesView from './StagedFilesView.js';

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
    const [showGifPicker, setShowGifPicker] = React.useState(false);

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

        e(GifPickerView, {
            token,
            showGifPicker,
            setShowGifPicker,
            setText
        }),

        e(UploadProgressView, {
            uploadProgress,
            clearAttachment
        }),

        e(StagedFilesView, {
            stagedFiles,
            uploadProgress,
            setEditingFileIndex,
            setTempFileName,
            removeStagedFile,
            setFullscreenFileIndex
        }),

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