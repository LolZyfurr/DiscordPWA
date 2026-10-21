import React from 'https://esm.sh/react@18';
import { fetchGames } from '../network/api.js';
import { ChatStore } from '../stores/ChatStore.js';
import { AppDispatcher } from '../dispatcher/Dispatcher.js';

const e = React.createElement;

export default function ProfilePopout({ selectedProfile, setSelectedProfile, popoutCoords }) {
    const [gamesMap, setGamesMap] = React.useState({});
    const [showProfileMenu, setShowProfileMenu] = React.useState(false);

    React.useEffect(() => {
        if (!selectedProfile) {
            setGamesMap({});
            return;
        }

        const token = ChatStore.getState().token;
        if (!token) {
            setGamesMap({});
            return;
        }

        const gameWidget = selectedProfile.widgets?.find(w => w.data?.type === 'played_games');
        const gameIds = gameWidget?.data?.games?.map(g => g.game_id) || [];
        if (gameIds.length === 0) {
            setGamesMap({});
            return;
        }

        fetchGames(token, gameIds)
            .then(data => {
                const map = {};
                data.forEach(game => {
                    map[game.id] = game;
                });
                setGamesMap(map);
            })
            .catch(err => console.error("Failed to fetch game details:", err));
    }, [selectedProfile]);

    if (!selectedProfile) return null;

    const usernameWithDiscrim = `${selectedProfile.user.username}#${selectedProfile.user.discriminator || '0000'}`;
    const pronouns = selectedProfile.user_profile?.pronouns;
    const subheaderText = pronouns ? `${usernameWithDiscrim} • ${pronouns}` : usernameWithDiscrim;

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    const bannerHash = selectedProfile.user?.banner || selectedProfile.user_profile?.banner;

    const channels = ChatStore.getState().channels || [];
    const dmChannel = channels.find(c =>
        (c.type === 1 || !c.type) && c.recipients?.some(r => r.id === selectedProfile.user.id)
    );

    return e(React.Fragment, null,
        !isDesktop && e('div', {
            onClick: () => {
                setSelectedProfile(null);
                setShowProfileMenu(false);
            },
            className: 'fixed inset-0 bg-black/80 z-50 backdrop-blur-md transition-all duration-300 md:hidden'
        }),
        isDesktop && e('div', {
            onClick: () => {
                setSelectedProfile(null);
                setShowProfileMenu(false);
            },
            className: 'fixed inset-0 z-50 bg-transparent'
        }),
        e('div', {
            style: isDesktop && popoutCoords ? {
                top: `${Math.min(popoutCoords.y, window.innerHeight - 450)}px`,
                left: `${Math.min(popoutCoords.x, window.innerWidth - 340)}px`,
                position: 'fixed',
                maxHeight: '85vh'
            } : { maxHeight: '85vh' },
            className: `
                z-50 bg-[#000000] text-[#f5f5f7] shadow-2xl overflow-y-auto border border-white/10
                fixed inset-x-0 bottom-0 w-full rounded-t-3xl pb-safe min-h-[80%] animate-slide-up
                md:inset-auto md:bottom-auto md:rounded-2xl md:w-80 md:min-h-0 md:animate-none transition-all duration-200 ease-in-out
                [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden
            `
        },
            // Banner / Header Area
            e('div', {
                className: 'h-32 bg-[#050505] relative shrink-0 border-b border-white/10 bg-cover bg-center',
                style: bannerHash
                    ? { backgroundImage: `url(https://cdn.discordapp.com/banners/${selectedProfile.user.id}/${bannerHash}.png?size=600)` }
                    : selectedProfile.user_profile?.accent_color
                        ? { backgroundColor: `#${selectedProfile.user_profile.accent_color.toString(16)}` }
                        : {}
            },
                e('div', { className: 'absolute inset-0 bg-gradient-to-b from-black/20 to-black/60' }),
                e('div', { className: 'absolute top-3 right-3 flex items-center space-x-2 z-10' },
                    e('button', { className: 'bg-black/60 hover:bg-black/90 text-neutral-300 hover:text-white rounded-full p-2 border border-white/10 transition-all duration-200 ease-in-out hover:scale-105' },
                        e('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' },
                            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' })
                        )
                    ),
                    e('div', { className: 'relative' },
                        e('button', {
                            onClick: (eEvt) => {
                                eEvt.stopPropagation();
                                setShowProfileMenu(!showProfileMenu);
                            },
                            className: 'bg-black/60 hover:bg-black/90 text-neutral-300 hover:text-white rounded-full p-2 block border border-white/10 transition-all duration-200 ease-in-out hover:scale-105'
                        },
                            e('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' },
                                e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z' })
                            )
                        ),
                        showProfileMenu && e(React.Fragment, null,
                            e('div', {
                                onClick: () => setShowProfileMenu(false),
                                className: 'fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm'
                            }),
                            e('div', {
                                className: `
                                    z-50 bg-[#0a0a0a] border border-white/10 shadow-2xl flex flex-col text-sm h-fit
                                    fixed inset-x-0 bottom-0 rounded-t-xl p-3 space-y-1 pb-safe animate-slide-up
                                    md:absolute md:inset-x-auto md:top-full md:right-0 md:mt-1.5 md:w-44 md:rounded-lg md:p-1 md:space-y-0
                                `
                            },
                                e('div', { className: 'hidden md:block px-3 py-1.5 text-[10px] font-light uppercase tracking-wider text-neutral-500 border-b border-white/10 mb-1' }, 'Options'),
                                e('button', {
                                    onClick: () => {
                                        navigator.clipboard.writeText(selectedProfile.user.id);
                                        setShowProfileMenu(false);
                                    },
                                    className: 'px-3 py-2 md:py-1.5 text-left font-light hover:bg-white/[0.05] text-neutral-200 rounded-md transition-all duration-200'
                                }, 'Copy User ID'),
                                e('button', {
                                    onClick: () => {
                                        navigator.clipboard.writeText(selectedProfile.user.username);
                                        setShowProfileMenu(false);
                                    },
                                    className: 'px-3 py-2 md:py-1.5 text-left font-light hover:bg-white/[0.05] text-neutral-200 rounded-md transition-all duration-200'
                                }, 'Copy Username'),
                                selectedProfile.user.banner && e('button', {
                                    onClick: () => {
                                        const bannerUrl = `https://cdn.discordapp.com/banners/${selectedProfile.user.id}/${selectedProfile.user.banner}.png?size=600`;
                                        navigator.clipboard.writeText(bannerUrl);
                                        setShowProfileMenu(false);
                                    },
                                    className: 'px-3 py-2 md:py-1.5 text-left font-light hover:bg-white/[0.05] text-neutral-200 rounded-md transition-all duration-200'
                                }, 'Copy Banner URL'),
                                selectedProfile.user.avatar && e('button', {
                                    onClick: () => {
                                        const avatarUrl = `https://cdn.discordapp.com/avatars/${selectedProfile.user.id}/${selectedProfile.user.avatar}.png?size=600`;
                                        navigator.clipboard.writeText(avatarUrl);
                                        setShowProfileMenu(false);
                                    },
                                    className: 'px-3 py-2 md:py-1.5 text-left font-light hover:bg-white/[0.05] text-neutral-200 rounded-md transition-all duration-200'
                                }, 'Copy Avatar URL'),
                                e('button', {
                                    onClick: () => setShowProfileMenu(false),
                                    className: 'mt-2 md:hidden px-3 py-2 text-center bg-white/10 hover:bg-white/20 text-white font-normal rounded-md transition-all duration-200'
                                }, 'Cancel')
                            )
                        )
                    )
                )
            ),
            // Profile Content Body Container
            e('div', { className: 'px-4 pb-4 pt-12 relative bg-[#000000] m-3 rounded-2xl border border-white/10' },
                selectedProfile.isLimited && e('div', { className: 'mb-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 px-3 py-2 rounded-lg text-xs font-light' },
                    'Profile is limited (not friends or shared servers). Some data may be missing.'
                ),
                e('div', { className: 'absolute -top-10 left-3 p-1 bg-[#000000] rounded-full border border-white/10' },
                    e('img', {
                        src: selectedProfile.user.avatar
                            ? `https://cdn.discordapp.com/avatars/${selectedProfile.user.id}/${selectedProfile.user.avatar}.png?size=128`
                            : `https://cdn.discordapp.com/embed/avatars/0.png`,
                        alt: 'Avatar',
                        className: 'w-20 h-20 rounded-full bg-[#050505] object-cover'
                    })
                ),
                e('div', { className: 'flex flex-col mb-3' },
                    e('span', { className: 'font-normal text-lg text-white tracking-wider' }, selectedProfile.user.global_name || selectedProfile.user.username),
                    e('span', { className: 'text-xs text-neutral-400 font-light tracking-tight mt-0.5' }, subheaderText)
                ),
                selectedProfile.badges && selectedProfile.badges.length > 0 && e('div', { className: 'flex items-center space-x-1.5 mb-3 py-1 px-2.5 bg-[#050505] rounded-lg w-fit border border-white/10' },
                    selectedProfile.badges.map(b =>
                        e('img', {
                            key: b.id,
                            src: `https://cdn.discordapp.com/badge-icons/${b.icon}.png`,
                            alt: b.description,
                            title: b.description,
                            className: 'w-4 h-4 object-contain opacity-80 hover:opacity-100 transition-opacity'
                        })
                    )
                ),
                selectedProfile.user_profile?.bio && e('div', { className: 'mt-3 text-xs text-neutral-300 border-t border-white/10 pt-3 whitespace-pre-wrap leading-relaxed font-light' },
                    selectedProfile.user_profile.bio
                ),
                selectedProfile.widgets && selectedProfile.widgets.length > 0 && e('div', { className: 'mt-4 bg-[#050505] rounded-xl p-3 border border-white/10' },
                    e('span', { className: 'text-[10px] font-normal text-neutral-400 uppercase tracking-widest block mb-2.5' }, 'Game Collection'),
                    e('div', { className: 'flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none' },
                        selectedProfile.widgets[0].data?.games?.map((g, idx) => {
                            const gameInfo = gamesMap[g.game_id];
                            const iconUrl = gameInfo?.icon_hash
                                ? `https://cdn.discordapp.com/app-icons/${g.game_id}/${gameInfo.icon_hash}.png?size=48`
                                : 'https://cdn.discordapp.com/embed/avatars/0.png';
                            const gameName = gameInfo?.name || 'Loading Game...';

                            return e('div', {
                                key: idx,
                                title: gameName,
                                className: 'w-10 h-10 bg-[#000000] rounded-xl shrink-0 flex items-center justify-center overflow-hidden border border-white/10 cursor-pointer hover:border-white/30 hover:scale-105 transition-all duration-200 ease-in-out'
                            },
                                e('img', {
                                    src: iconUrl,
                                    alt: gameName,
                                    className: 'w-full h-full object-cover'
                                })
                            );
                        })
                    )
                ),
                dmChannel && e('div', {
                    onClick: () => {
                        AppDispatcher.dispatch({ type: 'SET_CURRENT_CHANNEL', channelId: dmChannel.id });
                        AppDispatcher.dispatch({ type: 'SELECT_CHANNEL', channelId: dmChannel.id });
                        setSelectedProfile(null);
                        setShowProfileMenu(false);
                        setTimeout(() => {
                            const textarea = document.querySelector('textarea') || document.querySelector('input[type="text"]');
                            if (textarea) textarea.focus();
                        }, 50);
                    },
                    className: 'mt-4 bg-[#050505] rounded-xl px-3.5 py-3 flex items-center justify-between text-neutral-300 text-xs cursor-pointer hover:border-white/30 hover:text-white border border-white/10 transition-all duration-200 ease-in-out group'
                },
                    e('span', { className: 'font-light tracking-wide' }, `Message @${selectedProfile.user.username}`),
                    e('svg', { className: 'w-4 h-4 text-neutral-400 group-hover:text-white transition-colors duration-200', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', viewBox: '0 0 24 24' },
                        e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z' })
                    )
                )
            )
        )
    );
}