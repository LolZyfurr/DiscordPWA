import { AppDispatcher } from '../dispatcher/Dispatcher.js';

class ChatStoreClass {
    constructor() {
        this.listeners = [];
        this.state = {
            token: localStorage.getItem('token') || '',
            user: null,
            channels: [],
            currentChannelId: null,
            messages: {},
            typing: {},
            presences: {}
        };
        AppDispatcher.register(this.handleAction.bind(this));
    }

    getState() { return this.state; }
    addListener(listener) { this.listeners.push(listener); }
    removeListener(listener) { this.listeners = this.listeners.filter(l => l !== listener); }
    emitChange() { this.listeners.forEach(l => l(this.state)); }

    handleAction(action) {
        switch (action.type) {
            case 'SET_TOKEN':
                this.state = {
                    ...this.state,
                    token: action.token
                };
                localStorage.setItem('token', action.token);
                this.emitChange();
                break;
            case 'SET_USER':
                this.state = {
                    ...this.state,
                    user: action.user
                };
                this.emitChange();
                break;
            case 'READY': {
                const sessions = action.data.sessions;
                const newPresences = { ...(this.state.presences || {}) };
                if (action.data.user && sessions && sessions.length > 0 && sessions[0].status) {
                    newPresences[action.data.user.id] = {
                        ...(newPresences[action.data.user.id] || {}),
                        status: sessions[0].status
                    };
                }
                if (action.data.presences && Array.isArray(action.data.presences)) {
                    action.data.presences.forEach(p => {
                        const userId = p.user?.id;
                        if (userId) {
                            const existing = newPresences[userId] || {};
                            newPresences[userId] = {
                                ...existing,
                                ...p,
                                last_seen: existing.last_seen || p.last_seen
                            };
                        }
                    });
                }
                this.state = {
                    ...this.state,
                    presences: newPresences
                };
                this.emitChange();
                break;
            }
            case 'PRESENCE_UPDATE': {
                const p = action.presence;
                const userId = p.user?.id;
                if (userId) {
                    const existing = this.state.presences[userId] || {};
                    const oldStatus = existing.status;
                    const newStatus = p.status;

                    let lastSeen = existing.last_seen;
                    if (newStatus === 'offline' && oldStatus !== 'offline') {
                        lastSeen = new Date().toISOString();
                    }

                    const newPresences = {
                        ...(this.state.presences || {}),
                        [userId]: {
                            ...existing,
                            ...p,
                            last_seen: lastSeen
                        }
                    };
                    this.state = {
                        ...this.state,
                        presences: newPresences
                    };
                    this.emitChange();
                }
                break;
            }
            case 'SET_CHANNELS': {
                let currentChannelId = this.state.currentChannelId;
                if (!currentChannelId && action.channels.length > 0) {
                    currentChannelId = action.channels[0].id;
                }
                this.state = {
                    ...this.state,
                    channels: action.channels,
                    currentChannelId
                };
                this.emitChange();
                break;
            }
            case 'SELECT_CHANNEL':
                this.state = {
                    ...this.state,
                    currentChannelId: action.channelId
                };
                this.emitChange();
                break;
            case 'ADD_MESSAGE': {
                const msg = action.message;
                const chId = msg.channel_id;
                const existingMessages = this.state.messages[chId] || [];

                if (existingMessages.some(m => m.id === msg.id)) {
                    break;
                }

                let updatedMessages;
                if (msg.nonce) {
                    const index = existingMessages.findIndex(m => m.nonce === msg.nonce || m.id === msg.nonce);
                    if (index !== -1) {
                        updatedMessages = [...existingMessages];
                        updatedMessages[index] = msg;
                    } else {
                        updatedMessages = [...existingMessages, msg];
                    }
                } else {
                    updatedMessages = [...existingMessages, msg];
                }

                const authorId = msg.author?.id || msg.user_id;
                let newPresences = { ...(this.state.presences || {}) };
                if (authorId) {
                    const existingPresence = newPresences[authorId] || {};
                    const msgTime = msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString();
                    newPresences[authorId] = {
                        ...existingPresence,
                        last_seen: msgTime
                    };
                }

                this.state = {
                    ...this.state,
                    presences: newPresences,
                    messages: {
                        ...this.state.messages,
                        [chId]: updatedMessages
                    }
                };
                this.emitChange();
                break;
            }
            case 'PREPEND_MESSAGES': {
                const { channelId, messages } = action;
                const existingMessages = this.state.messages[channelId] || [];
                const existingIds = new Set(existingMessages.map(m => m.id));
                const newMessages = messages.filter(m => !existingIds.has(m.id));

                if (newMessages.length > 0) {
                    this.state = {
                        ...this.state,
                        messages: {
                            ...this.state.messages,
                            [channelId]: [...newMessages, ...existingMessages]
                        }
                    };
                    this.emitChange();
                }
                break;
            }
            case 'UPDATE_MESSAGE': {
                const msg = action.message;
                const chId = msg.channel_id;
                if (this.state.messages[chId]) {
                    const updatedMessages = this.state.messages[chId].map(m => (m.id === msg.id || (msg.nonce && m.nonce === msg.nonce)) ? { ...m, ...msg } : m);
                    this.state = {
                        ...this.state,
                        messages: {
                            ...this.state.messages,
                            [chId]: updatedMessages
                        }
                    };
                    this.emitChange();
                }
                break;
            }
            case 'DELETE_MESSAGE': {
                const targetId = action.id || action.messageId;
                const channelId = action.channelId;
                if (targetId && channelId && this.state.messages[channelId]) {
                    const filteredMessages = this.state.messages[channelId].filter(m => m.id !== targetId && m.nonce !== targetId);
                    this.state = {
                        ...this.state,
                        messages: {
                            ...this.state.messages,
                            [channelId]: filteredMessages
                        }
                    };
                    this.emitChange();
                }
                break;
            }
            case 'TYPING_START': {
                const { channelId, userId } = action;
                const currentTypingSet = this.state.typing[channelId] ? new Set(this.state.typing[channelId]) : new Set();
                currentTypingSet.add(userId);

                let newPresences = { ...(this.state.presences || {}) };
                if (userId) {
                    const existingPresence = newPresences[userId] || {};
                    newPresences[userId] = {
                        ...existingPresence,
                        last_seen: new Date().toISOString()
                    };
                }

                this.state = {
                    ...this.state,
                    presences: newPresences,
                    typing: {
                        ...this.state.typing,
                        [channelId]: currentTypingSet
                    }
                };
                this.emitChange();

                setTimeout(() => {
                    if (this.state.typing[channelId] && this.state.typing[channelId].has(userId)) {
                        const nextTypingSet = new Set(this.state.typing[channelId]);
                        nextTypingSet.delete(userId);
                        this.state = {
                            ...this.state,
                            typing: {
                                ...this.state.typing,
                                [channelId]: nextTypingSet
                            }
                        };
                        this.emitChange();
                    }
                }, 9000);
                break;
            }
            default:
                break;
        }
    }
}

export const ChatStore = new ChatStoreClass();