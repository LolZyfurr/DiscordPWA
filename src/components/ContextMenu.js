import React from 'https://esm.sh/react@18';

const e = React.createElement;

export default function ContextMenu({
    isOpen,
    onClose,
    title = 'Options',
    desktopPosition = 'bottom-full md:right-0 md:mb-1.5',
    widthClass = 'md:w-52',
    children
}) {
    if (!isOpen) return null;

    return e(React.Fragment, null,
        e('div', {
            onClick: onClose,
            className: 'fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm'
        }),
        e('div', {
            style: { height: 'fit-content' },
            className: `
                z-50 bg-[#000000] border border-white/10 shadow-2xl flex flex-col text-sm
                fixed inset-x-0 bottom-0 rounded-t-2xl p-3 space-y-1 pb-safe animate-slide-up
                md:absolute md:inset-x-auto md:${desktopPosition} ${widthClass} md:rounded-2xl md:p-1.5 md:space-y-1
            `
        },
            title && e('div', { className: 'hidden md:block px-3 py-1.5 text-[10px] font-light uppercase tracking-wider text-neutral-500 border-b border-white/10 mb-1' }, title),
            children,
            e('button', {
                onClick: onClose,
                className: 'mt-2 md:hidden px-3 py-2 text-center bg-white/10 hover:bg-white/20 text-white font-normal rounded-xl transition-all duration-200 cursor-pointer'
            }, 'Cancel')
        )
    );
}