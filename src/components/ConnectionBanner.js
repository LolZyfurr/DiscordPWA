import React from 'https://esm.sh/react@18';
import { AppDispatcher } from '../dispatcher/Dispatcher.js';

const e = React.createElement;

export default function ConnectionBanner({
    authFailed,
    setAuthFailed,
    isOnline,
    gatewayStatus,
    resumedBannerVisible
}) {
    let connectionBanner = null;
    if (authFailed) {
        connectionBanner = {
            bg: 'bg-red-600/20 border-red-500/30 text-red-200 shadow-lg',
            dot: 'bg-red-500 animate-pulse',
            text: 'Your session has expired or your token is invalid. Please update your token.',
            actionText: 'Update Token'
        };
    } else if (!isOnline) {
        connectionBanner = {
            bg: 'bg-red-500/10 border-red-500/20 text-red-300',
            dot: 'bg-red-400 animate-pulse',
            text: 'You are offline. Check your internet connection.',
            actionText: 'Logout'
        };
    } else if (gatewayStatus.status === 'connecting' || gatewayStatus.status === 'disconnected' || gatewayStatus.status === 'reconnecting') {
        const attemptText = gatewayStatus.attempt > 0 ? ` (Attempt ${gatewayStatus.attempt})` : '';
        connectionBanner = {
            bg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
            dot: 'bg-amber-400 animate-ping',
            text: `Reconnecting to server${attemptText}...`,
            actionText: 'Logout'
        };
    } else if (resumedBannerVisible) {
        connectionBanner = {
            bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
            dot: 'bg-emerald-400',
            text: 'Session successfully restored!',
            actionText: null
        };
    }

    if (!connectionBanner) return null;

    return e('div', { className: `${connectionBanner.bg} border-b border-white/10 px-4 py-2.5 flex items-center justify-between text-xs font-light z-30 shrink-0 transition-all duration-300` },
        e('div', { className: 'flex items-center space-x-2 truncate pr-2' },
            e('span', { className: `w-2 h-2 rounded-full shrink-0 ${connectionBanner.dot}` }),
            e('span', { className: 'font-normal truncate tracking-wide text-neutral-100' }, connectionBanner.text)
        ),
        connectionBanner.actionText && e('button', {
            onClick: () => {
                setAuthFailed(false);
                AppDispatcher.dispatch({ type: 'SET_TOKEN', token: '' });
            },
            className: 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 px-3 py-1.5 rounded-md text-xs font-light tracking-wide cursor-pointer shrink-0 transition-all duration-200'
        }, connectionBanner.actionText)
    );
}