import React from 'https://esm.sh/react@18';

const e = React.createElement;

export default function LoginScreen({ handleTokenSubmit }) {
    return e('div', { className: 'flex items-center justify-center w-full h-full bg-[#000000] px-4 font-sans' },
        e('form', { onSubmit: handleTokenSubmit, className: 'bg-[#000000] border border-white/10 p-6 rounded-2xl shadow-2xl w-full max-w-sm space-y-4' },
            e('h2', { className: 'text-base font-normal text-white tracking-wide text-center' }, 'Enter Discord Token'),
            e('p', { className: 'text-xs font-light text-neutral-400 text-center leading-relaxed' }, 'Required to bootstrap REST networking and WebSocket gateway.'),
            e('input', {
                name: 'token',
                type: 'password',
                placeholder: 'Token...',
                className: 'w-full bg-[#050505] text-white border border-white/10 rounded-xl px-4 py-3 text-xs font-light focus:outline-none focus:border-white/30 transition-all duration-200'
            }),
            e('button', {
                type: 'submit',
                className: 'w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 py-3 rounded-xl font-normal text-xs tracking-wide transition-all duration-200 cursor-pointer active:scale-95'
            }, 'Launch Client')
        )
    );
}