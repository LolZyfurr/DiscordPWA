import React from 'https://esm.sh/react@18';

const e = React.createElement;

export default function StagedFilesView({
    stagedFiles,
    uploadProgress,
    setEditingFileIndex,
    setTempFileName,
    removeStagedFile,
    setFullscreenFileIndex
}) {
    if (!stagedFiles || stagedFiles.length === 0 || uploadProgress) return null;

    return e('div', { className: 'flex space-x-3 overflow-x-auto p-3 bg-[#000000] border-t border-white/10 shrink-0 z-25 scrollbar-none' },
        stagedFiles.map((fileObj, idx) => {
            const isImage = (fileObj.type && fileObj.type.startsWith('image/')) ||
                (fileObj.name && /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff)$/i.test(fileObj.name));

            const isAudio = (fileObj.type && fileObj.type.startsWith('audio/')) ||
                (fileObj.name && /\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i.test(fileObj.name));

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
                isImage && fileObj.preview
                    ? e('img', {
                        src: fileObj.preview,
                        alt: fileObj.name,
                        onClick: () => setFullscreenFileIndex && setFullscreenFileIndex(idx),
                        className: 'w-full h-24 object-cover rounded-md mt-6 cursor-pointer hover:opacity-90 border border-white/10 transition-opacity duration-200'
                    })
                    : isAudio
                        ? e('div', { className: 'w-full h-24 bg-neutral-900 border border-white/10 rounded-md mt-6 flex items-center justify-center text-neutral-400' },
                            e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-8 h-8' },
                                e('path', { d: 'M9 18V5l12-2v13' }),
                                e('circle', { cx: '6', cy: '18', r: '3' }),
                                e('circle', { cx: '18', cy: '16', r: '3' })
                            )
                        )
                        : e('div', { className: 'w-full h-24 bg-neutral-900 border border-white/10 rounded-md mt-6 flex items-center justify-center text-neutral-400' },
                            e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-8 h-8' },
                                e('path', { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' }),
                                e('polyline', { points: '14 2 14 8 20 8' })
                            )
                        ),
                e('span', { className: 'text-xs font-light text-neutral-300 truncate block mt-2' }, fileObj.name)
            );
        })
    );
}