import React, { useEffect, useRef, useState } from 'react';
import {
    Bot,
    LoaderCircle,
    RotateCcw,
    Send,
    X,
    ClipboardList,
    MessageSquare,
    Lock,
} from 'lucide-react';

import { sendSupportMessage, createSupportTicket, listSupportTickets } from '../../services/supportService';
import { storageGet } from '../../platform/storage';
import './SupportChatbot.css';

const WELCOME_MESSAGE = {
    role: 'assistant',
    content: 'Xin chào! Tôi là trợ lý Smart Tourism. Bạn đang cần hỗ trợ vấn đề gì?',
    isWelcome: true,
};

const INITIAL_SUGGESTIONS = [
    'Tôi không đăng nhập được',
    'Cách lập kế hoạch chuyến đi',
    'Ảnh check-in không được duyệt',
];

const isIosStandalone = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.navigator.standalone === true
        || window.matchMedia?.('(display-mode: standalone)').matches;

    return isIos && isStandalone;
};

export default function SupportChatbot({ isOpen, onClose }) {
    const [messages, setMessages] = useState([WELCOME_MESSAGE]);
    const [suggestions, setSuggestions] = useState(INITIAL_SUGGESTIONS);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    
    // Support ticket states
    const [activeTab, setActiveTab] = useState('chat');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [ticketType, setTicketType] = useState('SUGGESTION');
    const [ticketContent, setTicketContent] = useState('');
    const [submittingTicket, setSubmittingTicket] = useState(false);
    const [ticketSuccess, setTicketSuccess] = useState(false);
    const [ticketError, setTicketError] = useState('');
    const [expandedTicketId, setExpandedTicketId] = useState(null);

    const [viewportState, setViewportState] = useState({
        height: null,
        offsetTop: 0,
        keyboardVisible: false,
    });
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;

        const visualViewport = window.visualViewport;
        const initialHeight = Math.round(visualViewport?.height || window.innerHeight);
        let animationFrame;

        const syncViewport = () => {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = window.requestAnimationFrame(() => {
                const height = Math.round(visualViewport?.height || window.innerHeight);
                const offsetTop = Math.round(visualViewport?.offsetTop || 0);
                const keyboardVisible = initialHeight - height > 120;

                setViewportState((current) => (
                    current.height === height
                    && current.offsetTop === offsetTop
                    && current.keyboardVisible === keyboardVisible
                        ? current
                        : { height, offsetTop, keyboardVisible }
                ));
            });
        };

        syncViewport();
        window.addEventListener('resize', syncViewport);
        visualViewport?.addEventListener('resize', syncViewport);
        visualViewport?.addEventListener('scroll', syncViewport);

        return () => {
            window.cancelAnimationFrame(animationFrame);
            window.removeEventListener('resize', syncViewport);
            visualViewport?.removeEventListener('resize', syncViewport);
            visualViewport?.removeEventListener('scroll', syncViewport);
            setViewportState({ height: null, offsetTop: 0, keyboardVisible: false });
        };
    }, [isOpen]);

    useEffect(() => {
        const root = document.documentElement;
        const iosStandaloneActive = isOpen && isIosStandalone();

        root.classList.toggle('support-active', isOpen);
        root.classList.toggle('support-ios-standalone-active', iosStandaloneActive);

        if (isOpen && viewportState.height !== null) {
            root.style.setProperty('--support-visual-height', `${viewportState.height}px`);
            root.style.setProperty('--support-visual-offset-top', `${viewportState.offsetTop}px`);
        } else {
            root.style.removeProperty('--support-visual-height');
            root.style.removeProperty('--support-visual-offset-top');
        }

        if (isOpen && viewportState.keyboardVisible) {
            root.classList.add('support-keyboard-visible');
        } else {
            root.classList.remove('support-keyboard-visible');
        }
        return undefined;
    }, [viewportState, isOpen]);

    useEffect(() => () => {
        const root = document.documentElement;
        root.classList.remove('support-active');
        root.classList.remove('support-ios-standalone-active');
        root.classList.remove('support-keyboard-visible');
        root.style.removeProperty('--support-visual-height');
        root.style.removeProperty('--support-visual-offset-top');
    }, []);


    // Authentication and Ticket fetching effect
    useEffect(() => {
        const checkAuthAndFetch = async () => {
            try {
                const token = await storageGet('access_token');
                const loggedIn = !!token;
                setIsLoggedIn(loggedIn);
                if (loggedIn && activeTab === 'ticket') {
                    await fetchTickets();
                }
            } catch (err) {
                setIsLoggedIn(false);
            }
        };

        if (isOpen) {
            void checkAuthAndFetch();
        }
    }, [isOpen, activeTab]);

    const fetchTickets = async () => {
        setLoadingTickets(true);
        try {
            const list = await listSupportTickets();
            setTickets(list);
        } catch (err) {
            console.error('Error fetching tickets:', err);
        } finally {
            setLoadingTickets(false);
        }
    };

    useEffect(() => {
        if (!isOpen || activeTab !== 'chat') return;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 150);
        return () => window.clearTimeout(focusTimer);
    }, [isOpen, messages, sending, activeTab]);

    const clearConversation = () => {
        setMessages([WELCOME_MESSAGE]);
        setSuggestions(INITIAL_SUGGESTIONS);
        setInput('');
    };

    const submitMessage = async (rawMessage) => {
        const message = rawMessage.trim();
        if (!message || sending) return;

        const history = messages
            .filter((item) => !item.isWelcome && !item.isError)
            .slice(-10)
            .map(({ role, content }) => ({ role, content }));

        setMessages((current) => [...current, { role: 'user', content: message }]);
        setInput('');
        setSending(true);

        try {
            const data = await sendSupportMessage(message, history);
            setMessages((current) => [
                ...current,
                { role: 'assistant', content: data.reply },
            ]);
            if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
                setSuggestions(data.suggestions.slice(0, 3));
            }
        } catch (error) {
            setMessages((current) => [
                ...current,
                {
                    role: 'assistant',
                    content: error.message || 'Trợ lý đang bận. Vui lòng thử lại sau.',
                    isError: true,
                },
            ]);
        } finally {
            setSending(false);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        void submitMessage(input);
    };

    const handleTicketSubmit = async (event) => {
        event.preventDefault();
        const content = ticketContent.trim();
        if (content.length < 10) {
            setTicketError('Nội dung yêu cầu cần tối thiểu 10 ký tự.');
            return;
        }

        setSubmittingTicket(true);
        setTicketError('');
        setTicketSuccess(false);

        try {
            await createSupportTicket(ticketType, content);
            setTicketSuccess(true);
            setTicketContent('');
            await fetchTickets();
        } catch (err) {
            setTicketError(err.message || 'Có lỗi xảy ra khi gửi yêu cầu.');
        } finally {
            setSubmittingTicket(false);
        }
    };

    if (!isOpen) return null;

    const keyboardViewportStyle = viewportState.keyboardVisible
        ? {
            height: `${viewportState.height}px`,
            top: `${viewportState.offsetTop}px`,
            bottom: 'auto',
        }
        : undefined;

    return (
        <div
            className={`support-chatbot-root ${viewportState.keyboardVisible ? 'keyboard-visible' : ''} ${isIosStandalone() ? 'ios-standalone-support' : ''}`}
            style={keyboardViewportStyle}
            onClick={onClose}
        >
            <section
                className="support-chatbot-panel"
                aria-label="Trợ lý hỗ trợ Smart Tourism"
                onClick={(event) => event.stopPropagation()}
            >
                    <header className="support-chatbot-header">
                        <div className="support-chatbot-avatar">
                            <Bot size={21} />
                        </div>
                        <div className="support-chatbot-heading">
                            <strong>Trợ lý hỗ trợ</strong>
                            <span><i /> Smart Tourism AI</span>
                        </div>
                        {activeTab === 'chat' && (
                            <button
                                type="button"
                                className="support-chatbot-icon-btn"
                                onClick={clearConversation}
                                title="Bắt đầu lại"
                                aria-label="Bắt đầu lại cuộc trò chuyện"
                            >
                                <RotateCcw size={17} />
                            </button>
                        )}
                        <button
                            type="button"
                            className="support-chatbot-icon-btn"
                            onClick={onClose}
                            title="Đóng"
                            aria-label="Đóng trợ lý hỗ trợ"
                        >
                            <X size={19} />
                        </button>
                    </header>

                    <div className="support-chatbot-tabs">
                        <button
                            type="button"
                            className={`support-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                            onClick={() => setActiveTab('chat')}
                        >
                            <MessageSquare size={13} style={{ marginRight: '5px' }} />
                            Trợ lý AI
                        </button>
                        <button
                            type="button"
                            className={`support-tab-btn ${activeTab === 'ticket' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ticket')}
                        >
                            <ClipboardList size={13} style={{ marginRight: '5px' }} />
                            Gửi hỗ trợ Admin
                        </button>
                    </div>

                    {activeTab === 'chat' ? (
                        <>
                            <div className="support-chatbot-messages" aria-live="polite">
                                {messages.map((message, index) => (
                                    <div
                                        key={`${message.role}-${index}`}
                                        className={`support-message-row ${message.role}`}
                                    >
                                        {message.role === 'assistant' && (
                                            <span className="support-message-avatar"><Bot size={15} /></span>
                                        )}
                                        <div className={`support-message-bubble ${message.isError ? 'error' : ''}`}>
                                            {message.content}
                                        </div>
                                    </div>
                                ))}

                                {sending && (
                                    <div className="support-message-row assistant">
                                        <span className="support-message-avatar"><Bot size={15} /></span>
                                        <div className="support-message-bubble support-typing">
                                            <LoaderCircle size={16} />
                                            Đang tìm câu trả lời...
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="support-chatbot-suggestions">
                                {suggestions.map((suggestion) => (
                                    <button
                                        type="button"
                                        key={suggestion}
                                        onClick={() => void submitMessage(suggestion)}
                                        disabled={sending}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>

                            <form className="support-chatbot-form" onSubmit={handleSubmit}>
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={(event) => setInput(event.target.value)}
                                    maxLength={1000}
                                    placeholder="Nhập vấn đề bạn cần hỗ trợ..."
                                    disabled={sending}
                                    aria-label="Tin nhắn hỗ trợ"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !input.trim()}
                                    aria-label="Gửi tin nhắn"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                            <p className="support-chatbot-disclaimer">
                                AI có thể trả lời chưa chính xác. Không cung cấp mật khẩu hoặc mã OTP.
                            </p>
                        </>
                    ) : (
                        <div className="support-ticket-container">
                            {!isLoggedIn ? (
                                <div className="support-ticket-login-required">
                                    <Lock size={40} className="lock-icon" />
                                    <h3>Yêu cầu đăng nhập</h3>
                                    <p>Vui lòng đăng nhập tài khoản Smart Tourism để gửi yêu cầu hỗ trợ trực tiếp đến quản trị viên và theo dõi lịch sử hỗ trợ.</p>
                                </div>
                            ) : (
                                <>
                                    <form className="support-ticket-form-tab" onSubmit={handleTicketSubmit}>
                                        <h4>Gửi hỗ trợ mới</h4>
                                        {ticketSuccess && (
                                            <div className="ticket-alert success">
                                                Gửi yêu cầu hỗ trợ thành công! Admin sẽ xử lý sớm nhất có thể.
                                            </div>
                                        )}
                                        {ticketError && (
                                            <div className="ticket-alert error">
                                                {ticketError}
                                            </div>
                                        )}

                                        <div className="form-group">
                                            <label>Loại hỗ trợ:</label>
                                            <div className="ticket-type-selector">
                                                {[
                                                    { key: 'BUG', label: 'Báo lỗi' },
                                                    { key: 'SUGGESTION', label: 'Góp ý' },
                                                    { key: 'REPORT', label: 'Báo cáo/Khác' },
                                                ].map((type) => (
                                                    <button
                                                        type="button"
                                                        key={type.key}
                                                        className={`type-chip ${ticketType === type.key ? 'active' : ''}`}
                                                        onClick={() => setTicketType(type.key)}
                                                    >
                                                        {type.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="ticket-content">Nội dung chi tiết:</label>
                                            <textarea
                                                id="ticket-content"
                                                value={ticketContent}
                                                onChange={(event) => setTicketContent(event.target.value)}
                                                placeholder="Vui lòng mô tả chi tiết lỗi hoặc vấn đề bạn cần trợ giúp..."
                                                maxLength={2000}
                                                rows={4}
                                                required
                                            />
                                            <div className="char-counter">
                                                {ticketContent.length}/2000 ký tự (tối thiểu 10)
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="ticket-submit-btn"
                                            disabled={submittingTicket || ticketContent.trim().length < 10}
                                        >
                                            {submittingTicket ? (
                                                <>
                                                    <LoaderCircle size={16} className="spinner-animation" /> Đang gửi...
                                                </>
                                            ) : (
                                                'Gửi hỗ trợ đến Admin'
                                            )}
                                        </button>
                                    </form>

                                    <div className="support-ticket-history">
                                        <h4>Lịch sử hỗ trợ của bạn</h4>
                                        {loadingTickets ? (
                                            <div className="history-loading">
                                                <LoaderCircle size={18} className="spinner-animation" />
                                                <span>Đang tải lịch sử...</span>
                                            </div>
                                        ) : tickets.length === 0 ? (
                                            <div className="history-empty">
                                                Bạn chưa gửi yêu cầu hỗ trợ nào.
                                            </div>
                                        ) : (
                                            <div className="ticket-list">
                                                {tickets.map((ticket) => {
                                                    const isExpanded = expandedTicketId === ticket.feedback_id;
                                                    return (
                                                        <div
                                                            key={ticket.feedback_id}
                                                            className={`ticket-item-card ${isExpanded ? 'expanded' : ''}`}
                                                            onClick={() => setExpandedTicketId(isExpanded ? null : ticket.feedback_id)}
                                                        >
                                                            <div className="ticket-card-header">
                                                                <span className={`ticket-type-badge ${ticket.feedback_type.toLowerCase()}`}>
                                                                    {ticket.feedback_type === 'BUG' && 'Báo lỗi'}
                                                                    {ticket.feedback_type === 'SUGGESTION' && 'Góp ý'}
                                                                    {ticket.feedback_type === 'REPORT' && 'Báo cáo/Khác'}
                                                                </span>
                                                                <span className={`ticket-status-badge ${ticket.status.toLowerCase()}`}>
                                                                    {ticket.status === 'PENDING' && 'Đang chờ'}
                                                                    {ticket.status === 'PROCESSING' && 'Đang xử lý'}
                                                                    {ticket.status === 'RESOLVED' && 'Đã giải quyết'}
                                                                </span>
                                                            </div>
                                                            <p className="ticket-card-content">
                                                                {ticket.content}
                                                            </p>
                                                            <div className="ticket-card-footer">
                                                                <span>{new Date(ticket.created_at).toLocaleString('vi-VN', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}</span>
                                                                {ticket.content.length > 80 && (
                                                                    <span className="expand-trigger">
                                                                        {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
            </section>
        </div>
    );
}
