import React, { useState, useRef, useLayoutEffect } from 'https://esm.sh/react@18';

const e = React.createElement;

export default function ContextMenu({
    isOpen,
    onClose,
    title = 'Options',
    desktopPosition = 'bottom-full md:right-0 md:mb-1.5',
    widthClass = 'md:w-52',
    children
}) {
    const menuRef = useRef(null);
    const [isAbove, setIsAbove] = useState(true);
    const [maxHeight, setMaxHeight] = useState(null);

    // Dynamically calculate position and maximum available height on open
    useLayoutEffect(() => {
        if (!isOpen || !menuRef.current) return;

        const menuEl = menuRef.current;
        const parentEl = menuEl.parentElement;
        if (!parentEl) return;

        const parentRect = parentEl.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Check if the trigger/parent leans toward the bottom half of the screen
        const parentCenterY = parentRect.top + parentRect.height / 2;
        const shouldBeAbove = parentCenterY > windowHeight / 2;

        setIsAbove(shouldBeAbove);

        // Calculate available space to prevent going off-screen
        const margin = 16;
        const availableHeight = shouldBeAbove
            ? parentRect.top - margin                    // Space above the trigger
            : windowHeight - parentRect.bottom - margin; // Space below the trigger

        // Set dynamic maxHeight so it becomes scrollable if taller than available space
        setMaxHeight(Math.max(150, availableHeight));
    }, [isOpen]);

    if (!isOpen) return null;

    // Dynamically adjust desktop position classes based on screen placement
    const currentDesktopPosition = isAbove
        ? 'bottom-full md:right-0 md:mb-1.5'
        : 'top-full md:right-0 md:mt-1.5';

    return e(React.Fragment, null,
        // Mobile backdrop overlay
        e('div', {
            onClick: onClose,
            className: 'fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm'
        }),
        // Menu container with fit-content height and dynamic max-height constraint
        e('div', {
            ref: menuRef,
            style: {
                height: 'fit-content',
                ...(maxHeight ? { maxHeight: `${maxHeight}px` } : {})
            },
            className: `
                z-50 bg-[#000000] border border-white/10 shadow-2xl flex flex-col text-sm
                fixed inset-x-0 bottom-0 rounded-t-2xl p-3 pb-safe animate-slide-up
                md:absolute md:inset-x-auto md:${currentDesktopPosition} ${widthClass} md:rounded-2xl md:p-1.5
            `
        },
            // Title (desktop only)
            title && e('div', {
                className: 'hidden md:block px-3 py-1.5 text-[10px] font-light uppercase tracking-wider text-neutral-500 border-b border-white/10 mb-1 flex-shrink-0'
            }, title),

            // Scrollable container for menu items if content exceeds available height
            e('div', {
                className: 'flex flex-col space-y-1 overflow-y-auto pr-0.5'
            }, children),

            // Mobile cancel button
            e('button', {
                onClick: onClose,
                className: 'mt-2 md:hidden px-3 py-2 text-center bg-white/10 hover:bg-white/20 text-white font-normal rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0'
            }, 'Cancel')
        )
    );
}