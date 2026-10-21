import React from 'https://esm.sh/react@18';

const e = React.createElement;

export default function LoginScreen({ handleTokenSubmit }) {
    return e('div', { className: 'flex items-center justify-center w-full h-full bg-[#202225] px-4 font-sans' },
        e('form', { onSubmit: handleTokenSubmit, className: 'bg-[#2f3136] p-6 rounded-lg shadow-2xl w-full max-w-sm space-y-4 border border-[#202225]' },
            e('h2', { className: 'text-xl font-bold text-center text-white' }, 'Enter Discord Token'),
            e('p', { className: 'text-xs text-[#b9bbbe] text-center' }, 'Required to bootstrap REST networking and WebSocket gateway.'),
            e('input', { name: 'token', type: 'password', placeholder: 'Token...', className: 'w-full bg-[#202225] text-white border border-[#202225] rounded px-4 py-3 text-sm focus:outline-none focus:border-[#7289da]' }),
            e('button', { type: 'submit', className: 'w-full bg-[#7289da] hover:bg-[#5b6eae] py-3 rounded font-semibold text-sm text-white transition active:scale-95' }, 'Launch Client')
        )
    );
}