import React from 'https://esm.sh/react@18';
import SelectionHeader from './SelectionHeader.js';
import DeleteModal from './DeleteModal.js';
import ChatMessageItem from './ChatMessageItem.js';
import { renderMessageContent } from './messageUtils.js';

const e = React.createElement;

export default function ChatMessagesList({
    currentMessages,
    state,
    activeMenuMsgId,
    setActiveMenuMsgId,
    fetchUserProfile,
    setReplyingTo,
    setEditingMessageId,
    handleDeleteMessage,
    handleRemoveLocalMessage,
    messagesEndRef,
    setMessageFullscreen,
    setText,
    handleLoadMore,
    handleRetryMessage
}) {
    const [showScrollButton, setShowScrollButton] = React.useState(false);
    const isAtBottomRef = React.useRef(true);
    const prevChannelIdRef = React.useRef(state?.currentChannelId);
    const isFetchingMoreRef = React.useRef(false);
    const prevScrollHeightRef = React.useRef(0);
    const prevScrollTopRef = React.useRef(0);
    const hasMoreRef = React.useRef(true);
    const prevMessagesLengthRef = React.useRef(currentMessages.length);
    const containerRef = React.useRef(null);

    // Mass Delete & Modal States
    const [isSelectMode, setIsSelectMode] = React.useState(false);
    const [selectedMsgIds, setSelectedMsgIds] = React.useState(new Set());
    const [deleteModal, setDeleteModal] = React.useState(null);

    // Deletion progress states for slow internet
    const [deletionProgress, setDeletionProgress] = React.useState(null);
    const [isPaused, setIsPaused] = React.useState(false);
    const [stallTimer, setStallTimer] = React.useState(0);
    const deletionAbortRef = React.useRef(false);
    const deleteStartTimeRef = React.useRef(0);

    React.useEffect(() => {
        if (state?.currentChannelId !== prevChannelIdRef.current) {
            prevChannelIdRef.current = state?.currentChannelId;
            isAtBottomRef.current = true;
            hasMoreRef.current = true;
            setShowScrollButton(false);
            setIsSelectMode(false);
            setSelectedMsgIds(new Set());
            setDeleteModal(null);
            setDeletionProgress(null);
            setIsPaused(false);
            setStallTimer(0);
            deletionAbortRef.current = false;
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            }, 50);
        }
    }, [state?.currentChannelId, messagesEndRef]);

    React.useEffect(() => {
        if (messagesEndRef && messagesEndRef.current) {
            const el = messagesEndRef.current;
            const originalScrollIntoView = el.scrollIntoView.bind(el);
            el.scrollIntoView = (options) => {
                if (isAtBottomRef.current) {
                    originalScrollIntoView(options);
                }
            };
        }
    }, [messagesEndRef]);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        if (isAtBottomRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        } else if (isFetchingMoreRef.current) {
            const newScrollHeight = container.scrollHeight;
            const scrollHeightDiff = newScrollHeight - prevScrollHeightRef.current;

            if (scrollHeightDiff > 0) {
                const distanceFromBottom = prevScrollHeightRef.current - prevScrollTopRef.current;
                container.style.overflow = 'hidden';
                container.scrollTop = newScrollHeight - distanceFromBottom;

                requestAnimationFrame(() => {
                    container.style.overflow = '';
                    isFetchingMoreRef.current = false;
                });
            }
        }

        if (currentMessages.length === prevMessagesLengthRef.current && isFetchingMoreRef.current) {
            hasMoreRef.current = false;
        }

        prevScrollHeightRef.current = container.scrollHeight;
        prevScrollTopRef.current = container.scrollTop;
        prevMessagesLengthRef.current = currentMessages.length;
    }, [currentMessages, messagesEndRef]);

    const handleScroll = async (evt) => {
        const container = evt.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = container;

        const distanceToBottom = scrollHeight - scrollTop - clientHeight;
        const atBottom = distanceToBottom < 100;
        isAtBottomRef.current = atBottom;
        setShowScrollButton(!atBottom);

        prevScrollTopRef.current = scrollTop;
        prevScrollHeightRef.current = scrollHeight;

        if (scrollTop < 20 && !isFetchingMoreRef.current && hasMoreRef.current && handleLoadMore && currentMessages.length > 0) {
            isFetchingMoreRef.current = true;
            prevScrollHeightRef.current = scrollHeight;
            prevScrollTopRef.current = scrollTop;

            await handleLoadMore();
        }
    };

    const scrollToBottom = () => {
        isAtBottomRef.current = true;
        setShowScrollButton(false);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToMessage = (messageId) => {
        if (!messageId) return;
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-white/[0.06]');
            setTimeout(() => {
                element.classList.remove('bg-white/[0.06]');
            }, 1000);
        }
    };

    const renderFormattedContent = (content, mentions = []) => {
        return renderMessageContent(content, mentions, fetchUserProfile);
    };

    return e('div', {
        className: 'flex-1 flex flex-col overflow-hidden relative'
    },
        isSelectMode && e(SelectionHeader, {
            selectedMsgIds,
            setDeleteModal,
            setIsSelectMode,
            setSelectedMsgIds
        }),
        e('div', {
            ref: containerRef,
            className: 'flex-1 overflow-y-auto p-4 space-y-0 relative scrollbar-none flex flex-col',
            onScroll: handleScroll
        },
            currentMessages.map(m => e(ChatMessageItem, {
                key: m.id,
                m,
                state,
                isSelectMode,
                setIsSelectMode,
                selectedMsgIds,
                setSelectedMsgIds,
                activeMenuMsgId,
                setActiveMenuMsgId,
                fetchUserProfile,
                setReplyingTo: m.status === 'pending' || m.status === 'failed' ? null : setReplyingTo,
                setEditingMessageId: m.status === 'pending' || m.status === 'failed' ? null : setEditingMessageId,
                setText,
                handleRetryMessage,
                handleDeleteMessage,
                handleRemoveLocalMessage,
                setMessageFullscreen,
                scrollToMessage,
                renderFormattedContent,
                setDeleteModal: m.status === 'pending' || m.status === 'failed' ? null : setDeleteModal
            })),
            showScrollButton && e('button', {
                onClick: scrollToBottom,
                className: 'sticky bottom-4 ml-auto z-30 bg-[#0a0a0a]/90 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-white/10 p-2.5 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 backdrop-blur-md cursor-pointer animate-slide-up mr-4'
            },
                e('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', className: 'w-4 h-4' },
                    e('path', { d: 'm7 6 5 5 5-5' }),
                    e('path', { d: 'm7 13 5 5 5-5' })
                )
            ),
            e('div', { ref: messagesEndRef })
        ),

        e(DeleteModal, {
            deleteModal,
            setDeleteModal,
            isPaused,
            setIsPaused,
            stallTimer,
            setStallTimer,
            deletionProgress,
            setDeletionProgress,
            deletionAbortRef,
            deleteStartTimeRef,
            setSelectedMsgIds,
            setIsSelectMode,
            handleDeleteMessage
        })
    );
}