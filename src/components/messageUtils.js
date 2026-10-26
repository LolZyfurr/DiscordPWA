import React from 'https://esm.sh/react@18';

const e = React.createElement;

export function renderMessageContent(content, mentions = [], fetchUserProfile) {
    if (!content) return null;
    const parts = content.split(/(<a?:\w+:\d+>|<@!?\d+>|@\w+| <@\d+>|\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}\p{Emoji_Modifier}]*|\p{Emoji})/gu);
    return parts.map((part, idx) => {
        const customEmojiMatch = part.match(/<(a?):(\w+):(\d+)>/);
        if (customEmojiMatch) {
            const isAnimated = customEmojiMatch[1] === 'a';
            const name = customEmojiMatch[2];
            const id = customEmojiMatch[3];
            const ext = isAnimated ? 'gif' : 'png';
            const url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;
            return e('img', {
                key: idx,
                src: url,
                alt: `:${name}:`,
                title: `:${name}:`,
                className: 'inline-block w-[1.375em] h-[1.375em] object-contain mx-0.5'
            });
        }
        const emojiMatch = part.match(/^(\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}\p{Emoji_Modifier}]*|\p{Emoji})$/u);
        if (emojiMatch) {
            const codePoints = [];
            for (const cp of part) {
                const code = cp.codePointAt(0);
                if (code !== 0xFE0F) {
                    codePoints.push(code.toString(16));
                }
            }
            if (codePoints.length === 0) {
                codePoints.push('fe0f');
            }
            const url = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${codePoints.join('-')}.png`;
            return e('img', {
                key: idx,
                src: url,
                alt: part,
                title: part,
                className: 'inline-block w-[1.375em] h-[1.375em] object-contain mx-0.5'
            });
        }
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