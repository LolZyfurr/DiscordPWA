import { AppDispatcher } from '../dispatcher/Dispatcher.js';
import { sendMessageApi, editMessageApi, deleteMessageApi, fetchUserProfileApi } from '../network/api.js';

export async function handleSendMessage({
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
}) {
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
            const updatedMsg = await editMessageApi(state.token, state.currentChannelId, editId, content);
            AppDispatcher.dispatch({ type: 'UPDATE_MESSAGE', message: updatedMsg });
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
}

export async function fetchUserProfile(state, userId, evt, setPopoutCoords, setSelectedProfile) {
    const rect = evt.currentTarget.getBoundingClientRect();
    setPopoutCoords({
        x: Math.min(rect.right + 10, window.innerWidth - 320),
        y: Math.min(rect.top, window.innerHeight - 450)
    });

    try {
        const data = await fetchUserProfileApi(state.token, userId);
        if (data) {
            setSelectedProfile(data);
        }
    } catch (err) {
        console.error("Failed to fetch user profile:", err);
    }
}

export async function handleDeleteMessage(token, channelId, msgId, setActiveMenuMsgId) {
    setActiveMenuMsgId(null);
    try {
        await deleteMessageApi(token, channelId, msgId);
    } catch (err) {
        console.error("Failed to delete message:", err);
    }
}

export function handleRemoveLocalMessage(channelId, msgId, setActiveMenuMsgId) {
    setActiveMenuMsgId(null);
    AppDispatcher.dispatch({ type: 'DELETE_MESSAGE', messageId: msgId, channelId: channelId });
}