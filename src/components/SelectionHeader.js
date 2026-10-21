import React from 'https://esm.sh/react@18';

const e = React.createElement;

export default function SelectionHeader({
    selectedMsgIds,
    setDeleteModal,
    setIsSelectMode,
    setSelectedMsgIds
}) {
    return e('div', { className: 'z-30 bg-[#000000] border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-md shrink-0 animate-slide-up' },
        e('div', { className: 'flex items-center space-x-2 text-xs font-light text-neutral-300 tracking-wide' },
            e('span', { className: 'font-normal text-white' }, `${selectedMsgIds.size}`),
            e('span', {}, `message${selectedMsgIds.size === 1 ? '' : 's'} selected`)
        ),
        e('div', { className: 'flex items-center space-x-2' },
            e('button', {
                onClick: () => {
                    if (selectedMsgIds.size > 0) {
                        setDeleteModal({ type: 'bulk', ids: Array.from(selectedMsgIds), status: 'prompt' });
                    }
                },
                disabled: selectedMsgIds.size === 0,
                className: `px-3 py-1.5 rounded-md text-xs font-light transition-all duration-200 ease-in-out cursor-pointer border ${selectedMsgIds.size > 0 ? 'bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30' : 'bg-transparent text-neutral-600 border-white/5 cursor-not-allowed'}`
            }, 'Delete Selected'),
            e('button', {
                onClick: () => {
                    setIsSelectMode(false);
                    setSelectedMsgIds(new Set());
                },
                className: 'bg-transparent hover:bg-white/5 text-neutral-400 hover:text-white px-3 py-1.5 rounded-md text-xs font-light transition-all duration-200 ease-in-out cursor-pointer border border-white/10 hover:border-white/20'
            }, 'Cancel')
        )
    );
}