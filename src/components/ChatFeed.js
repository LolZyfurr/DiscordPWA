import React from 'https://esm.sh/react@18';
import ChatMessagesList from './ChatMessagesList.js';
import ChatInputBar from './ChatInputBar.js';
import ChatModals from './ChatModals.js';

const e = React.createElement;

export default function ChatFeed({
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
    handleRemoveLocalMessage,
    renderMessageContent,
    messagesEndRef,
    replyingTo,
    editingMessageId,
    uploadProgress,
    previewUrl,
    selectedFile,
    stagedFiles,
    setStagedFiles,
    clearAttachment,
    handleSendMessage,
    handleFileSelect,
    text,
    setText,
    handleLoadMore,
    handleRetryMessage
}) {
    const [editingFileIndex, setEditingFileIndex] = React.useState(null);
    const [fullscreenFileIndex, setFullscreenFileIndex] = React.useState(null);
    const [messageFullscreen, setMessageFullscreen] = React.useState(null);
    const [tempFileName, setTempFileName] = React.useState('');

    React.useEffect(() => {
        if (selectedFile && previewUrl) {
            const fileObj = { file: selectedFile, preview: previewUrl, name: selectedFile.name, size: selectedFile.size, type: selectedFile.type };
            setStagedFiles(prev => {
                if (prev.some(f => f.name === fileObj.name)) return prev;
                if (prev.length >= 10) return prev;
                return [...prev, fileObj];
            });
        } else if (!selectedFile && !previewUrl) {
            setStagedFiles([]);
        }
    }, [selectedFile, previewUrl, setStagedFiles]);

    const handleMultipleFileSelect = (evt) => {
        const files = Array.from(evt.target.files || []);
        if (files.length === 0) return;
        const availableSlots = 10 - stagedFiles.length;
        const filesToAdd = files.slice(0, availableSlots).map(file => ({
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            type: file.type
        }));
        setStagedFiles(prev => [...prev, ...filesToAdd].slice(0, 10));
        if (filesToAdd.length > 0 && handleFileSelect) {
            const syntheticEvent = { target: { files: filesToAdd.map(f => f.file) } };
            handleFileSelect(syntheticEvent);
        }
    };

    const removeStagedFile = (idx) => {
        setStagedFiles(prev => {
            const updated = prev.filter((_, i) => i !== idx);
            if (updated.length === 0) {
                clearAttachment();
            }
            return updated;
        });
    };

    const saveFileName = (idx) => {
        if (!tempFileName.trim()) return;
        setStagedFiles(prev => prev.map((f, i) => i === idx ? { ...f, name: tempFileName.trim() } : f));
        setEditingFileIndex(null);
        setTempFileName('');
    };

    const maxChars = (state.user?.premium_type > 0 || state.premium_type > 0) ? 4000 : 2000;
    const hasContent = text.trim().length > 0 || stagedFiles.length > 0;

    return e('div', {
        className: `flex-1 flex flex-col bg-[#000000] text-neutral-100 overflow-hidden min-h-0 w-full relative transition-all duration-200 ease-in-out ${mobileView === 'chat' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} md:translate-x-0`
    },
        e(ChatMessagesList, {
            currentMessages,
            state,
            activeMenuMsgId,
            setActiveMenuMsgId,
            fetchUserProfile,
            setReplyingTo,
            setEditingMessageId,
            handleDeleteMessage,
            handleRemoveLocalMessage,
            renderMessageContent,
            messagesEndRef,
            setMessageFullscreen,
            setText,
            handleLoadMore,
            handleRetryMessage
        }),
        e(ChatInputBar, {
            token: state?.token,
            typingUsersList,
            replyingTo,
            setReplyingTo,
            editingMessageId,
            setEditingMessageId,
            text,
            setText,
            uploadProgress,
            clearAttachment,
            stagedFiles,
            setStagedFiles,
            setEditingFileIndex,
            setTempFileName,
            removeStagedFile,
            setFullscreenFileIndex,
            handleSendMessage,
            handleMultipleFileSelect,
            maxChars,
            hasContent
        }),
        e(ChatModals, {
            fullscreenFileIndex,
            setFullscreenFileIndex,
            stagedFiles,
            setEditingFileIndex,
            setTempFileName,
            removeStagedFile,
            messageFullscreen,
            setMessageFullscreen,
            setReplyingTo,
            editingFileIndex,
            tempFileName,
            saveFileName
        })
    );
}