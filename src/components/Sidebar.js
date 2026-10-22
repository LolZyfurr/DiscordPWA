import React from 'https://esm.sh/react@18';
import { AppDispatcher } from '../dispatcher/Dispatcher.js';

const e = React.createElement;

export default function Sidebar({ state, mobileView, setMobileView, fetchUserProfile }) {
    const dmChannels = state.channels
        .filter(c => c.type === 1 || c.type === 3 || c.recipients)
        .sort((a, b) => {
            const idA = a.last_message_id ? BigInt(a.last_message_id) : 0n;
            const idB = b.last_message_id ? BigInt(b.last_message_id) : 0n;
            return idB > idA ? 1 : idB < idA ? -1 : 0;
        });

    return e('div', {
        className: `absolute inset-0 bg-[#000000] flex flex-col transition-all duration-300 ease-in-out z-10 ${mobileView === 'chat' ? '-translate-x-full md:translate-x-0' : 'translate-x-0'} md:relative md:w-64 md:translate-x-0 md:border-r md:border-white/10`
    },
        e('div', { className: 'px-4 py-4 border-b border-white/10 flex items-center justify-between pt-safe' },
            e('div', { className: 'flex items-center space-x-2' },
                e('svg', {
                    className: 'w-4 h-4 text-neutral-400',
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: '1.5',
                    viewBox: '0 0 24 24'
                },
                    e('path', {
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                        d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
                    })
                ),
                e('span', { className: 'font-light text-xs tracking-[0.2em] text-neutral-300 uppercase' }, 'Direct Messages')
            )
        ),
        e('div', { className: 'flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none' },
            dmChannels.map(ch => {
                const recipient = ch.recipients && ch.recipients[0];
                const dmName = ch.name || (recipient ? recipient.username : 'Direct Message');

                let avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
                if (ch.icon) {
                    avatarUrl = `https://cdn.discordapp.com/channel-icons/${ch.id}/${ch.icon}.png?size=64`;
                } else if (recipient && recipient.avatar) {
                    avatarUrl = `https://cdn.discordapp.com/avatars/${recipient.id}/${recipient.avatar}.png?size=64`;
                }

                const isActive = state.currentChannelId === ch.id;

                return e('div', {
                    key: ch.id,
                    onClick: () => {
                        AppDispatcher.dispatch({ type: 'SELECT_CHANNEL', channelId: ch.id });
                        setMobileView('chat');
                    },
                    className: `group px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all duration-200 ease-in-out flex items-center space-x-3 border ${isActive
                        ? 'bg-white/[0.06] border-white/20 text-white font-normal shadow-sm'
                        : 'bg-transparent border-transparent text-neutral-400 hover:bg-white/[0.03] hover:border-white/10 hover:text-neutral-200'
                        }`
                },
                    e('div', { className: 'shrink-0' },
                        e('img', {
                            src: avatarUrl,
                            alt: 'DM Avatar',
                            className: 'w-7 h-7 rounded-full bg-neutral-900 object-cover ring-1 ring-white/10 group-hover:ring-white/30 transition-all duration-200'
                        })
                    ),
                    e('span', { className: 'truncate text-xs tracking-wide font-light' }, dmName)
                );
            })
        ),
        state.user && e('div', { className: 'p-3 bg-[#050505] border-t border-white/10 flex items-center justify-between pb-safe' },
            e('div', {
                className: 'flex items-center space-x-3 flex-1 min-w-0 cursor-pointer group py-1.5 px-2 rounded-xl hover:bg-white/[0.04] transition-all duration-200',
                onClick: (eEvt) => fetchUserProfile(state.user.id, eEvt)
            },
                e('img', {
                    src: `https://cdn.discordapp.com/avatars/${state.user.id}/${state.user.avatar}.png?size=64`,
                    alt: 'Avatar',
                    className: 'w-8 h-8 rounded-full bg-neutral-900 object-cover shrink-0 ring-1 ring-white/10 group-hover:ring-white/30 transition-all duration-200'
                }),
                e('div', { className: 'flex flex-col truncate flex-1 leading-tight' },
                    e('span', { className: 'font-normal text-xs text-neutral-200 tracking-wide truncate group-hover:text-white transition-colors' }, state.user.username),
                    e('span', { className: 'text-[10px] font-light text-neutral-500 tracking-wider font-mono' }, `#${state.user.discriminator || '0000'}`)
                )
            ),
            e('button', {
                className: 'p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer',
                title: 'Settings'
            },
                e('svg', {
                    className: 'w-4 h-4',
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: '1.5',
                    viewBox: '0 0 24 24'
                },
                    e('path', {
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                        d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                    }),
                    e('path', {
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                        d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                    })
                )
            )
        )
    );
}