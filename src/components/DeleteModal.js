import React from 'https://esm.sh/react@18';

const e = React.createElement;

export default function DeleteModal({
    deleteModal,
    setDeleteModal,
    isPaused,
    setIsPaused,
    stallTimer,
    setStallTimer,
    deletionProgress,
    setDeletionProgress,
    deletionAbortRef,
    deleteStartTimeRef,
    setSelectedMsgIds,
    setIsSelectMode,
    handleDeleteMessage
}) {
    if (!deleteModal) return null;

    return e('div', { className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4' },
        e('div', { className: 'bg-[#0a0a0a] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl flex flex-col space-y-5' },
            e('div', { className: 'flex flex-col space-y-1.5' },
                e('h3', { className: 'text-sm font-normal text-white tracking-wide' },
                    deleteModal.status === 'pending'
                        ? 'Deleting Message(s)...'
                        : `Delete ${deleteModal.ids.length} message${deleteModal.ids.length > 1 ? 's' : ''}?`
                ),
                e('p', { className: 'text-xs font-light text-neutral-400' },
                    deleteModal.status === 'pending'
                        ? (isPaused ? 'Deletion paused by user.' : stallTimer > 3 ? `Connection stalled for ${stallTimer}s — check network or resume...` : 'Processing secure deletion requests...')
                        : 'This action cannot be undone.'
                )
            ),
            deleteModal.status === 'pending' && deletionProgress ? e('div', { className: 'flex flex-col space-y-3 py-1' },
                e('div', { className: 'flex justify-between items-center text-xs font-light text-neutral-300' },
                    e('div', { className: 'flex items-center space-x-2 truncate' },
                        e('span', { className: `w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-400 animate-pulse' : stallTimer > 3 ? 'bg-red-400 animate-ping' : 'bg-white animate-pulse'}` }),
                        e('span', { className: 'font-normal truncate tracking-tight text-neutral-200' }, `Deleted ${deletionProgress.current} of ${deletionProgress.total} (${Math.round((deletionProgress.current / deletionProgress.total) * 100)}%)`)
                    ),
                    e('div', { className: 'flex items-center space-x-2 text-neutral-400 font-light shrink-0 text-[11px]' },
                        e('span', { className: 'text-neutral-300 font-normal' }, `${deletionProgress.speed || 0} msgs/s`),
                        e('span', { className: 'text-neutral-600' }, '•'),
                        e('span', { className: 'text-neutral-400' }, `ETA: ${deletionProgress.eta}`)
                    )
                ),
                e('div', { className: 'w-full bg-neutral-900 border border-white/10 h-1.5 rounded-full overflow-hidden flex' },
                    e('div', {
                        className: `h-full transition-all duration-300 ease-out ${isPaused ? 'bg-amber-400/80' : stallTimer > 3 ? 'bg-amber-500 animate-pulse' : 'bg-white'}`,
                        style: { width: `${Math.round((deletionProgress.current / deletionProgress.total) * 100)}%` }
                    })
                ),
                e('div', { className: 'flex justify-between items-center pt-3 border-t border-white/10' },
                    e('div', { className: 'flex items-center space-x-2' },
                        e('button', {
                            onClick: () => {
                                setIsPaused(prev => !prev);
                                setDeletionProgress(prev => prev ? { ...prev, isPaused: !isPaused } : null);
                            },
                            className: 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 px-3 py-1.5 rounded-md text-xs font-light transition-all duration-200 ease-in-out flex items-center space-x-1.5 cursor-pointer'
                        },
                            isPaused
                                ? e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, e('polygon', { points: '5 3 19 12 5 21 5 3' }))
                                : e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' }, e('rect', { x: '6', y: '4', width: '4', height: '16' }), e('rect', { x: '14', y: '4', width: '4', height: '16' })),
                            isPaused ? 'Resume' : 'Pause'
                        ),
                        stallTimer > 3 && e('button', {
                            onClick: () => {
                                setStallTimer(0);
                                deleteStartTimeRef.current = Date.now();
                            },
                            className: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 px-3 py-1.5 rounded-md text-xs font-light transition-all duration-200 ease-in-out cursor-pointer'
                        }, 'Retry Connection')
                    ),
                    e('button', {
                        onClick: () => {
                            deletionAbortRef.current = true;
                            setDeleteModal(null);
                            setDeletionProgress(null);
                            setIsPaused(false);
                            setStallTimer(0);
                        },
                        className: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-md text-xs font-light transition-all duration-200 ease-in-out cursor-pointer'
                    }, 'Cancel Deletion')
                )
            ) : deleteModal.status === 'pending' ? e('div', { className: 'flex items-center justify-center py-8' },
                e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', className: 'animate-spin text-white opacity-80' },
                    e('circle', { cx: '12', cy: '12', r: '10', strokeOpacity: '0.2' }),
                    e('path', { d: 'M12 2a10 10 0 0 1 10 10', strokeOpacity: '1' })
                )
            ) : e('div', { className: 'flex items-center justify-end space-x-2 pt-3 border-t border-white/10' },
                e('button', {
                    onClick: () => setDeleteModal(null),
                    className: 'bg-white/5 hover:bg-white/10 text-neutral-300 px-4 py-1.5 rounded-md text-xs font-light transition-colors cursor-pointer border border-white/10'
                }, 'Cancel'),
                e('button', {
                    onClick: async () => {
                        setDeleteModal(prev => ({ ...prev, status: 'pending' }));
                        deletionAbortRef.current = false;
                        setIsPaused(false);
                        setStallTimer(0);

                        const total = deleteModal.ids.length;
                        let current = 0;
                        deleteStartTimeRef.current = Date.now();
                        let lastPercentTime = deleteStartTimeRef.current;

                        for (const id of deleteModal.ids) {
                            if (deletionAbortRef.current) break;

                            while (isPaused && !deletionAbortRef.current) {
                                await new Promise(r => setTimeout(r, 200));
                            }
                            if (deletionAbortRef.current) break;

                            try {
                                await handleDeleteMessage(id);
                                current++;
                                const now = Date.now();
                                const elapsedTotal = (now - deleteStartTimeRef.current) / 1000;
                                const speed = elapsedTotal > 0 ? (current / elapsedTotal).toFixed(1) : '0';
                                const remaining = total - current;
                                const avgRate = elapsedTotal > 0 ? current / elapsedTotal : 0;
                                const seconds = avgRate > 0 ? Math.ceil(remaining / avgRate) : 0;
                                const eta = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

                                setDeletionProgress({ current, total, speed, eta, isPaused: false });
                                setStallTimer(0);
                                lastPercentTime = now;

                                // Add a randomized human-like delay between requests to prevent automation detection
                                const randomDelay = Math.floor(Math.random() * 600) + 350;
                                await new Promise(r => setTimeout(r, randomDelay));
                            } catch (err) {
                                console.error("Failed to delete message during batch:", err);
                                const inactiveTime = (Date.now() - lastPercentTime) / 1000;
                                if (inactiveTime > 2.5) {
                                    setStallTimer(Math.floor(inactiveTime));
                                }
                            }
                        }

                        setDeleteModal(null);
                        setDeletionProgress(null);
                        setSelectedMsgIds(new Set());
                        setIsSelectMode(false);
                    },
                    className: 'bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-1.5 rounded-md text-xs font-normal transition-all duration-200 cursor-pointer'
                }, 'Delete')
            )
        )
    );
}