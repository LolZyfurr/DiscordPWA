import React from 'https://esm.sh/react@18';
import { ChatStore } from '../stores/ChatStore.js';
import { AppDispatcher } from '../dispatcher/Dispatcher.js';
import { fetchCurrentUser, fetchChannels, fetchMessages } from '../network/api.js';
import { connectGateway } from '../network/gateway.js';
import LoginScreen from './LoginScreen.js';
import Sidebar from './Sidebar.js';
import ChatFeed from './ChatFeed.js';
import ProfilePopout from './ProfilePopout.js';
import ChatModals from './ChatModals.js';
import ConnectionBanner from './ConnectionBanner.js';
import MobileHeader from './MobileHeader.js';
import { renderMessageContent } from './messageUtils.js';
import { handleSendMessage, fetchUserProfile, handleDeleteMessage, handleRemoveLocalMessage } from './chatHandlers.js';

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
    const [stagedFiles, setStagedFiles] = React.useState([]);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [previewUrl, setPreviewUrl] = React.useState(null);
    const [replyingTo, setReplyingTo] = React.useState(null);
    const [editingMessageId, setEditingMessageId] = React.useState(null);
    const [activeMenuMsgId, setActiveMenuMsgId] = React.useState(null);

    // Profile Popout State
    const [selectedProfile, setSelectedProfile] = React.useState(null);
    const [popoutCoords, setPopoutCoords] = React.useState({ x: 0, y: 0 });

    // Fullscreen Attachment & Profile Gallery State
    const [messageFullscreen, setMessageFullscreen] = React.useState(null);

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
            } else if (action.type === 'OPEN_FULLSCREEN') {
                setMessageFullscreen(action.file);
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
        setStagedFiles([]);
        setPreviewUrl(null);
        setUploadProgress(null);
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

        e(ConnectionBanner, {
            authFailed,
            setAuthFailed,
            isOnline,
            gatewayStatus,
            resumedBannerVisible
        }),

        e('div', { className: 'flex-1 flex overflow-hidden relative' },
            e(Sidebar, {
                state,
                mobileView,
                setMobileView,
                fetchUserProfile: (userId, evt) => fetchUserProfile(state, userId, evt, setPopoutCoords, setSelectedProfile)
            }),
            e('div', { className: 'flex-1 flex flex-col overflow-hidden relative min-h-0' },
                e(MobileHeader, {
                    mobileView,
                    setMobileView,
                    activeChannel,
                    channelDisplayName,
                    channelSubtext,
                    fetchUserProfile: (userId, evt) => fetchUserProfile(state, userId, evt, setPopoutCoords, setSelectedProfile)
                }),
                e('div', { className: 'flex-1 flex flex-col overflow-hidden min-h-0' },
                    e(ChatFeed, {
                        state,
                        mobileView,
                        channelName,
                        currentMessages,
                        typingUsersList,
                        activeMenuMsgId,
                        setActiveMenuMsgId,
                        fetchUserProfile: (userId, evt) => fetchUserProfile(state, userId, evt, setPopoutCoords, setSelectedProfile),
                        setReplyingTo,
                        setEditingMessageId,
                        handleDeleteMessage: (msgId) => handleDeleteMessage(state.token, state.currentChannelId, msgId, setActiveMenuMsgId),
                        handleRemoveLocalMessage: (msgId) => handleRemoveLocalMessage(state.currentChannelId, msgId, setActiveMenuMsgId),
                        renderMessageContent: (content, mentions) => renderMessageContent(content, mentions, (userId, evt) => fetchUserProfile(state, userId, evt, setPopoutCoords, setSelectedProfile)),
                        messagesEndRef,
                        replyingTo,
                        editingMessageId,
                        uploadProgress,
                        previewUrl,
                        selectedFile,
                        stagedFiles,
                        setStagedFiles,
                        clearAttachment,
                        handleSendMessage: (evt) => handleSendMessage({
                            evt,
                            text,
                            stagedFiles,
                            replyingTo,
                            editingMessageId,
                            state,
                            setText,
                            clearAttachment,
                            setReplyingTo,
                            setEditingMessageId,
                            setUploadProgress
                        }),
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
            popoutCoords,
            setFullscreenFile: (file) => setMessageFullscreen(file)
        }),

        e(ChatModals, {
            fullscreenFileIndex: null,
            setFullscreenFileIndex: () => { },
            stagedFiles: [],
            setEditingFileIndex: () => { },
            setTempFileName: () => { },
            removeStagedFile: () => { },
            messageFullscreen,
            setMessageFullscreen,
            setReplyingTo,
            editingFileIndex: null,
            tempFileName: '',
            saveFileName: () => { }
        })
    );
}