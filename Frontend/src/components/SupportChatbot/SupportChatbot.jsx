import React, { useEffect, useRef, useState } from 'react';
import {
    Bot,
    LoaderCircle,
    RotateCcw,
    Send,
    X,
} from 'lucide-react';

import { sendSupportMessage } from '../../services/supportService';
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

export default function SupportChatbot({ isOpen, onClose }) {
    const [messages, setMessages] = useState([WELCOME_MESSAGE]);
    const [suggestions, setSuggestions] = useState(INITIAL_SUGGESTIONS);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
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
        if (!isOpen) return;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 150);
        return () => window.clearTimeout(focusTimer);
    }, [isOpen, messages, sending]);

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
            className={`support-chatbot-root ${viewportState.keyboardVisible ? 'keyboard-visible' : ''}`}
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
                        <button
                            type="button"
                            className="support-chatbot-icon-btn"
                            onClick={clearConversation}
                            title="Bắt đầu lại"
                            aria-label="Bắt đầu lại cuộc trò chuyện"
                        >
                            <RotateCcw size={17} />
                        </button>
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
            </section>
        </div>
    );
}
