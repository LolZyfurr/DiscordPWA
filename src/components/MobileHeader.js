import React from 'https://esm.sh/react@18';

const e = React.createElement;

export default function MobileHeader({
    mobileView,
    setMobileView,
    activeChannel,
    channelDisplayName,
    channelSubtext,
    fetchUserProfile
}) {
    if (mobileView !== 'chat') return null;

    return e('div', { className: 'flex items-center px-4 h-14 bg-[#000000] border-b border-white/10 shrink-0 pt-safe' },
        e('button', {
            onClick: () => setMobileView('channels'),
            className: 'p-1 text-neutral-400 hover:text-white transition-colors duration-200 cursor-pointer flex items-center rounded-md hover:bg-white/5 mr-2',
            title: 'Back'
        },
            e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-5 h-5' },
                e('path', { d: 'M4 5h16' }),
                e('path', { d: 'M4 12h16' }),
                e('path', { d: 'M4 19h16' })
            )
        ),
        e('div', {
            className: 'flex flex-col flex-1 items-center justify-center truncate pr-12 cursor-pointer',
            onClick: (evt) => {
                if (activeChannel && activeChannel.recipients && activeChannel.recipients.length === 1) {
                    fetchUserProfile(activeChannel.recipients[0].id, evt);
                }
            }
        },
            e('span', { className: 'font-normal text-sm truncate text-neutral-100 leading-tight hover:underline' }, channelDisplayName),
            channelSubtext && e('span', { className: 'text-[10px] text-neutral-400 font-light truncate leading-tight mt-0.5' }, channelSubtext)
        )
    );
}