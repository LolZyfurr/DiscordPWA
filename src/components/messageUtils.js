import React from 'https://esm.sh/react@18';

const e = React.createElement;

export function renderMessageContent(content, mentions = [], fetchUserProfile) {
    if (!content) return null;
    const parts = content.split(/(<@!?\d+>|@\w+| <@\d+>)/g);
    return parts.map((part, idx) => {
        const mentionMatch = part.match(/<@!?(\d+)>/);
        if (mentionMatch) {
            const userId = mentionMatch[1];
            const user = mentions.find(u => u.id === userId);
            const displayName = user ? (user.global_name || user.username) : userId;
            return e('span', {
                key: idx,
                onClick: (eEvt) => fetchUserProfile(userId, eEvt),
                className: 'bg-[#7289da]/30 text-[#7289da] font-semibold px-1 rounded cursor-pointer hover:underline inline-block'
            }, `@${displayName}`);
        }
        if (part === '@here' || part === '@everyone') {
            return e('span', { key: idx, className: 'bg-[#7289da]/30 text-[#7289da] font-semibold px-1 rounded inline-block' }, part);
        }
        if (part.startsWith('@')) {
            return e('span', { key: idx, className: 'text-neutral-200 inline-block' }, part);
        }
        return part;
    });
}