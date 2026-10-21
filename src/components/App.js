import React from 'https://esm.sh/react@18';
import { ChatStore } from '../stores/ChatStore.js';
import { AppDispatcher } from '../dispatcher/Dispatcher.js';
import { fetchCurrentUser, fetchChannels, fetchMessages, sendMessageApi } from '../network/api.js';
import { connectGateway } from '../network/gateway.js';
import LoginScreen from './LoginScreen.js';
import Sidebar from './Sidebar.js';
import ChatFeed from './ChatFeed.js';
import ProfilePopout from './ProfilePopout.js';

const e = React.createElement;

async function initNetworking(token) {
    try {
        connectGateway(token);
        const userData = await fetchCurrentUser(token);
        AppDispatcher.dispatch({ type: 'SET_USER', user: userData });

        const channelsData = await fetchChannels(token);
        AppDispatcher.dispatch({ type: 'SET_CHANNELS', channels: channelsData });
    } catch (err) {
        console.error("Network initialization failed:", err);
    }
}

export default function App() {
    const [state, setState] = React.useState(ChatStore.getState());
    const [mobileView, setMobileView] = React.useState('channels');

    // Feature States
    const [text, setText] = React.useState('');
    const [stagedFiles, setStagedFiles] = React.useState([]); // Added stagedFiles state here
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [previewUrl, setPreviewUrl] = React.useState(null);
    const [replyingTo, setReplyingTo] = React.useState(null);
    const [editingMessageId, setEditingMessageId] = React.useState(null);
    const [activeMenuMsgId, setActiveMenuMsgId] = React.useState(null);

    // Profile Popout State
    const [selectedProfile, setSelectedProfile] = React.useState(null);
    const [popoutCoords, setPopoutCoords] = React.useState({ x: 0, y: 0 });

    // Upload Progress & Cancellation State
    const [uploadProgress, setUploadProgress] = React.useState(null);

    // Gateway & Network Status States
    const [gatewayStatus, setGatewayStatus] = React.useState({ status: 'connecting', attempt: 0 });
    const [isOnline, setIsOnline] = React.useState(navigator.onLine);
    const [authFailed, setAuthFailed] = React.useState(false);
    const [resumedBannerVisible, setResumedBannerVisible] = React.useState(false);

    const messagesEndRef = React.useRef(null);

    React.useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const handleStoreChange = (newState) => {
            setState({ ...newState });
        };
        ChatStore.addListener(handleStoreChange);

        const dispatcherToken = AppDispatcher.register((action) => {
            if (action.type === 'GATEWAY_STATUS') {
                setGatewayStatus({ status: action.status, attempt: action.attempt || 0 });
            } else if (action.type === 'GATEWAY_RESUMED') {
                setResumedBannerVisible(true);
                setTimeout(() => setResumedBannerVisible(false), 4000);
            } else if (action.type === 'AUTH_FAILED') {
                setAuthFailed(true);
            } else if (action.type === 'NETWORK_OFFLINE') {
                setIsOnline(false);
            }
        });

        if (state.token) {
            initNetworking(state.token);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            ChatStore.removeListener(handleStoreChange);
            AppDispatcher.unregister(dispatcherToken);
        };
    }, []);

    React.useEffect(() => {
        if (!state.currentChannelId || !state.token) return;
        fetchMessages(state.token, state.currentChannelId, 20)
            .then(history => {
                history.reverse().forEach(msg => {
                    AppDispatcher.dispatch({ type: 'ADD_MESSAGE', message: msg });
                });
            })
            .catch(err => console.error("Failed to load message history:", err));
    }, [state.currentChannelId, state.token]);

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [state.messages, state.currentChannelId]);

    const handleLoadMore = async () => {
        const currentMsgs = state.messages[state.currentChannelId] || [];
        if (currentMsgs.length === 0) return;

        const oldestMessageId = currentMsgs[0].id;
        try {
            const olderHistory = await fetchMessages(state.token, state.currentChannelId, 20, oldestMessageId);
            if (olderHistory.length > 0) {
                olderHistory.reverse();
                AppDispatcher.dispatch({
                    type: 'PREPEND_MESSAGES',
                    channelId: state.currentChannelId,
                    messages: olderHistory
                });
            }
        } catch (err) {
            console.error("Failed to load older messages:", err);
        }
    };

    const handleTokenSubmit = (evt) => {
        evt.preventDefault();
        const tokenInput = evt.target.elements.token.value.trim();
        if (tokenInput) {
            setAuthFailed(false);
            AppDispatcher.dispatch({ type: 'SET_TOKEN', token: tokenInput });
            initNetworking(tokenInput);
        }
    };

    const handleFileSelect = (evt) => {
        const file = evt.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const clearAttachment = () => {
        setSelectedFile(null);
        setStagedFiles([]); // Clear staged files as well
        setPreviewUrl(null);
        setUploadProgress(null);
    };

    const fetchUserProfile = async (userId, evt) => {
        const rect = evt.currentTarget.getBoundingClientRect();
        setPopoutCoords({
            x: Math.min(rect.right + 10, window.innerWidth - 320),
            y: Math.min(rect.top, window.innerHeight - 450)
        });

        try {
            const res = await fetch(`https://discord.com/api/v9/users/${userId}/profile?type=popout&with_mutual_guilds=false&with_mutual_friends=false&with_mutual_friends_count=false`, {
                headers: { 'Authorization': state.token }
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedProfile(data);
            }
        } catch (err) {
            console.error("Failed to fetch user profile:", err);
        }
    };

    const handleSendMessage = async (evt) => {
        evt.preventDefault();
        if ((!text.trim() && stagedFiles.length === 0) || !state.currentChannelId) return;

        const content = text;
        const filesToSend = [...stagedFiles];
        const replyRef = replyingTo;
        const editId = editingMessageId;

        setText('');
        clearAttachment();
        setReplyingTo(null);
        setEditingMessageId(null);

        const nonce = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

        try {
            if (editId) {
                const res = await fetch(`https://discord.com/api/v9/channels/${state.currentChannelId}/messages/${editId}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': state.token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });
                if (res.ok) {
                    const updatedMsg = await res.json();
                    AppDispatcher.dispatch({ type: 'UPDATE_MESSAGE', message: updatedMsg });
                }
            } else {
                const optimisticMsg = {
                    id: nonce,
                    nonce: nonce,
                    channel_id: state.currentChannelId,
                    content: content,
                    author: state.user || { username: 'You', id: 'me' },
                    timestamp: new Date().toISOString(),
                    status: 'pending',
                    attachments: filesToSend.map(f => ({ url: f.preview, filename: f.name, proxy_url: f.preview })),
                    referenced_message: replyRef ? { id: replyRef.id, content: replyRef.content, author: replyRef.author } : undefined
                };
                AppDispatcher.dispatch({ type: 'ADD_MESSAGE', message: optimisticMsg });

                let newMsg;
                if (filesToSend.length > 0) {
                    const formData = new FormData();
                    const payloadObj = { content, nonce };
                    if (replyRef) {
                        payloadObj.message_reference = { message_id: replyRef.id };
                    }
                    formData.append('payload_json', JSON.stringify(payloadObj));

                    filesToSend.forEach((fileObj, idx) => {
                        formData.append(`files[${idx}]`, fileObj.file, fileObj.name);
                    });

                    newMsg = await sendMessageApi(state.token, state.currentChannelId, formData, (progressData) => {
                        setUploadProgress(progressData);
                    });
                } else {
                    const payload = { content, nonce };
                    if (replyRef) {
                        payload.message_reference = { message_id: replyRef.id };
                    }
                    newMsg = await sendMessageApi(state.token, state.currentChannelId, payload);
                }

                AppDispatcher.dispatch({ type: 'ADD_MESSAGE', message: newMsg });
            }
        } catch (err) {
            console.error("Failed to send/edit message:", err);
            AppDispatcher.dispatch({
                type: 'UPDATE_MESSAGE',
                message: {
                    id: nonce,
                    nonce: nonce,
                    channel_id: state.currentChannelId,
                    content: content,
                    author: state.user || { username: 'You', id: 'me' },
                    status: 'failed',
                    timestamp: new Date().toISOString()
                }
            });
        } finally {
            setUploadProgress(null);
        }
    };

    const handleDeleteMessage = async (msgId) => {
        setActiveMenuMsgId(null);
        try {
            const res = await fetch(`https://discord.com/api/v9/channels/${state.currentChannelId}/messages/${msgId}`, {
                method: 'DELETE',
                headers: { 'Authorization': state.token }
            });
            if (res.ok) {
                AppDispatcher.dispatch({ type: 'DELETE_MESSAGE', messageId: msgId, channelId: state.currentChannelId });
            }
        } catch (err) {
            console.error("Failed to delete message:", err);
        }
    };

    const renderMessageContent = (content, mentions = []) => {
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
    };

    if (!state.token) {
        return e(LoginScreen, { handleTokenSubmit });
    }

    const activeChannel = state.channels.find(c => c.id === state.currentChannelId);
    let channelName = 'Select DM';
    let channelDisplayName = 'Select DM';
    let channelSubtext = null;

    if (activeChannel) {
        if (activeChannel.name) {
            channelName = activeChannel.name;
            channelDisplayName = activeChannel.name;
        } else if (activeChannel.recipients && activeChannel.recipients.length > 0) {
            channelName = activeChannel.recipients.map(r => r.username).join(', ');
            if (activeChannel.type === 1 && activeChannel.recipients.length === 1) {
                const recipient = activeChannel.recipients[0];
                channelDisplayName = recipient.global_name || recipient.username;
                const presence = state.presences?.[recipient.id] || recipient;
                const status = presence.status || 'offline';
                if (status === 'online' || status === 'idle') {
                    channelSubtext = 'Active Now';
                } else if (status === 'dnd') {
                    channelSubtext = 'Notifications Silenced';
                } else {
                    channelSubtext = recipient.username;
                }
            } else {
                channelDisplayName = channelName;
            }
        }
    }

    const currentMessages = state.messages[state.currentChannelId] || [];
    const activeTypingSet = state.typing[state.currentChannelId];
    const typingUsersList = activeTypingSet ? Array.from(activeTypingSet) : [];

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

    return e('div', { className: 'flex flex-col h-full w-full bg-[#000000] overflow-hidden font-sans text-neutral-100 relative' },
        e('style', null, `
            @keyframes slideUp {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .animate-slide-up {
                animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
        `),

        connectionBanner && e('div', { className: `${connectionBanner.bg} border-b px-4 py-2.5 flex items-center justify-between text-xs font-light z-30 shrink-0 transition-all duration-300` },
            e('div', { className: 'flex items-center space-x-2 truncate pr-2' },
                e('span', { className: `w-2 h-2 rounded-full shrink-0 ${connectionBanner.dot}` }),
                e('span', { className: 'font-medium truncate' }, connectionBanner.text)
            ),
            connectionBanner.actionText && e('button', {
                onClick: () => {
                    setAuthFailed(false);
                    AppDispatcher.dispatch({ type: 'SET_TOKEN', token: '' });
                },
                className: 'bg-white/10 hover:bg-white/25 text-white border border-white/20 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer shrink-0 transition-colors duration-200'
            }, connectionBanner.actionText)
        ),

        e('div', { className: 'flex-1 flex overflow-hidden relative' },
            e(Sidebar, {
                state,
                mobileView,
                setMobileView,
                fetchUserProfile
            }),
            e('div', { className: 'flex-1 flex flex-col overflow-hidden relative min-h-0' },
                mobileView === 'chat' && e('div', { className: 'flex items-center px-4 h-14 bg-[#000000] border-b border-white/10 shrink-0 pt-safe' },
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
                    e('div', { className: 'flex flex-col flex-1 items-center justify-center truncate pr-12' },
                        e('span', { className: 'font-normal text-sm truncate text-neutral-100 leading-tight' }, channelDisplayName),
                        channelSubtext && e('span', { className: 'text-[10px] text-neutral-400 font-light truncate leading-tight mt-0.5' }, channelSubtext)
                    )
                ),
                e('div', { className: 'flex-1 flex flex-col overflow-hidden min-h-0' },
                    e(ChatFeed, {
                        state,
                        mobileView,
                        channelName,
                        currentMessages,
                        typingUsersList,
                        activeMenuMsgId,
                        setActiveMenuMsgId,
                        fetchUserProfile,
                        setReplyingTo,
                        setEditingMessageId,
                        handleDeleteMessage,
                        renderMessageContent,
                        messagesEndRef,
                        replyingTo,
                        editingMessageId,
                        uploadProgress,
                        previewUrl,
                        selectedFile,
                        stagedFiles, // Pass stagedFiles down
                        setStagedFiles, // Pass setStagedFiles down
                        clearAttachment,
                        handleSendMessage,
                        handleFileSelect,
                        text,
                        setText,
                        handleLoadMore
                    })
                )
            )
        ),

        e(ProfilePopout, {
            selectedProfile,
            setSelectedProfile,
            popoutCoords
        })
    );
}