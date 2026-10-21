import React from 'https://esm.sh/react@18';
import { AppDispatcher } from '../dispatcher/Dispatcher.js';

const e = React.createElement;

export default function Sidebar({ state, mobileView, setMobileView, fetchUserProfile }) {
    const dmChannels = state.channels.filter(c => c.type === 1 || c.type === 3 || c.recipients);

    return e('div', {
        className: `absolute inset-0 bg-[#2f3136] flex flex-col transition-transform duration-200 z-10 ${mobileView === 'chat' ? '-translate-x-full md:translate-x-0' : 'translate-x-0'} md:relative md:w-60 md:translate-x-0 md:border-r md:border-[#202225]`
    },
        e('div', { className: 'p-4 font-bold border-b border-[#202225] text-sm tracking-wide text-white uppercase pt-safe' }, 'Direct Messages'),
        e('div', { className: 'flex-1 overflow-y-auto p-2 space-y-0.5' },
            dmChannels.map(ch => {
                const recipient = ch.recipients && ch.recipients[0];
                const dmName = ch.name || (recipient ? recipient.username : 'Direct Message');

                let avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
                if (ch.icon) {
                    avatarUrl = `https://cdn.discordapp.com/channel-icons/${ch.id}/${ch.icon}.png?size=64`;
                } else if (recipient && recipient.avatar) {
                    avatarUrl = `https://cdn.discordapp.com/avatars/${recipient.id}/${recipient.avatar}.png?size=64`;
                }

                return e('div', {
                    key: ch.id,
                    onClick: () => {
                        AppDispatcher.dispatch({ type: 'SELECT_CHANNEL', channelId: ch.id });
                        setMobileView('chat');
                    },
                    className: `px-2.5 py-2 rounded cursor-pointer text-sm font-medium transition flex items-center space-x-3 ${state.currentChannelId === ch.id ? 'bg-[#393c43] text-white font-semibold' : 'text-[#8e9297] hover:bg-[#34373c] hover:text-[#dcddde]'}`
                },
                    e('img', {
                        src: avatarUrl,
                        alt: 'DM Avatar',
                        className: 'w-8 h-8 rounded-full bg-[#202225] object-cover shrink-0'
                    }),
                    e('span', { className: 'truncate text-sm' }, dmName)
                );
            })
        ),
        state.user && e('div', { className: 'p-2.5 bg-[#292b2f] border-t border-[#202225] flex items-center space-x-2.5 pb-safe' },
            e('img', {
                src: `https://cdn.discordapp.com/avatars/${state.user.id}/${state.user.avatar}.png?size=64`,
                alt: 'Avatar',
                className: 'w-9 h-9 rounded-full bg-[#202225] object-cover shrink-0 cursor-pointer hover:opacity-80',
                onClick: (eEvt) => fetchUserProfile(state.user.id, eEvt)
            }),
            e('div', { className: 'flex flex-col truncate flex-1 leading-tight' },
                e('span', { className: 'font-bold text-sm text-white truncate' }, state.user.username),
                e('span', { className: 'text-[11px] text-[#b9bbbe]' }, `#${state.user.discriminator || '0000'}`)
            )
        )
    );
}