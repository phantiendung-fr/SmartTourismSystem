import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './IosPwaPrompt.css';

const SafariShareIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="prompt-svg-icon">
        <rect x="5" y="9" width="14" height="11" rx="2" ry="2" />
        <path d="M12 2v13" />
        <path d="M9 5l3-3 3 3" />
    </svg>
);

const SafariAddIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="prompt-svg-icon">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
);

export default function IosPwaPrompt() {
    const [shouldShow, setShouldShow] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

        // Cho phép lập trình viên ép buộc hiển thị để test bằng cách thêm ?force_pwa_prompt=true vào URL
        const forceTest = window.location.search.includes('force_pwa_prompt=true');
        if (forceTest) {
            const timer = setTimeout(() => setShouldShow(true), 1000);
            return () => clearTimeout(timer);
        }

        // 1. Kiểm tra iOS
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        // 2. Kiểm tra Safari chính chủ (tránh Chrome, Firefox, Edge, Brave, Opera, GSA, DuckDuckGo, và các in-app WebView trên iOS)
        const ua = navigator.userAgent;
        const isBrave = !!window.navigator.brave || /Brave/i.test(ua);
        const isSafari = typeof window !== 'undefined' 
            && window.navigator 
            && ('standalone' in window.navigator)
            && /Safari/i.test(ua)
            && !/Chrome/i.test(ua)
            && !/CriOS/i.test(ua)
            && !/FxiOS/i.test(ua)
            && !/EdgiOS/i.test(ua)
            && !/OPiOS/i.test(ua)
            && !isBrave
            && !/GSA/i.test(ua)
            && !/DuckDuckGo/i.test(ua)
            && !/FBAN|FBAV|Instagram|Twitter|Line/i.test(ua);

        // 3. Kiểm tra Standalone (đã add to home screen chưa)
        const isStandalone = window.navigator.standalone === true
            || window.matchMedia?.('(display-mode: standalone)').matches;

        // 4. Kiểm tra đã tắt trước đó chưa (localStorage: vĩnh viễn, sessionStorage: tạm thời phiên này)
        const isDismissedPermanent = localStorage.getItem('ios_pwa_prompt_dismissed') === 'true';
        const isDismissedSession = sessionStorage.getItem('ios_pwa_prompt_session_dismissed') === 'true';

        console.log("iOS PWA Prompt Detection Details:", {
            userAgent: navigator.userAgent,
            isIos,
            isSafari,
            isStandalone,
            isDismissedPermanent,
            isDismissedSession,
            forceTest,
            willShow: isIos && isSafari && !isStandalone && !isDismissedPermanent && !isDismissedSession
        });

        if (isIos && isSafari && !isStandalone && !isDismissedPermanent && !isDismissedSession) {
            // Hiển thị sau một khoảng trễ nhỏ để trải nghiệm mượt mà hơn
            const timer = setTimeout(() => setShouldShow(true), 2500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        if (dontShowAgain) {
            localStorage.setItem('ios_pwa_prompt_dismissed', 'true');
        } else {
            sessionStorage.setItem('ios_pwa_prompt_session_dismissed', 'true');
        }
        setShouldShow(false);
    };

    if (!shouldShow) return null;

    return (
        <div className="ios-pwa-prompt-overlay" onClick={handleDismiss}>
            <div className="ios-pwa-prompt-card" onClick={(e) => e.stopPropagation()}>
                <button className="ios-pwa-prompt-close" onClick={handleDismiss} aria-label="Đóng">
                    <X size={18} />
                </button>
                
                <header className="ios-pwa-prompt-header">
                    <div className="ios-pwa-app-icon">
                        <img src="/logo192.png" alt="Smart Tourism App Icon" onError={(e) => {
                            e.target.src = '/logo.svg';
                        }} />
                    </div>
                    <div className="ios-pwa-app-title">
                        <h3>Cài đặt Smart Tourism</h3>
                        <p>Thêm vào Màn hình chính để trải nghiệm mượt mà nhất như ứng dụng thật.</p>
                    </div>
                </header>

                <hr className="ios-pwa-divider" />

                <div className="ios-pwa-instructions">
                    <div className="ios-pwa-step">
                        <span className="ios-pwa-step-number">1</span>
                        <p className="ios-pwa-step-text">
                            Nhấn vào nút <strong>Chia sẻ</strong> <span className="ios-pwa-icon-wrapper"><SafariShareIcon /></span> ở thanh dưới cùng của Safari.
                        </p>
                    </div>
                    
                    <div className="ios-pwa-step">
                        <span className="ios-pwa-step-number">2</span>
                        <p className="ios-pwa-step-text">
                            Cuộn xuống dưới và chọn <strong>Thêm vào MH chính</strong> <span className="ios-pwa-icon-wrapper"><SafariAddIcon /></span>.
                        </p>
                    </div>

                    <div className="ios-pwa-step">
                        <span className="ios-pwa-step-number">3</span>
                        <p className="ios-pwa-step-text">
                            Nhấn <strong>Thêm</strong> (Add) ở góc trên bên phải màn hình để hoàn tất.
                        </p>
                    </div>
                </div>

                <hr className="ios-pwa-divider" />

                <div className="ios-pwa-footer">
                    <label className="ios-pwa-checkbox-container">
                        <input 
                            type="checkbox" 
                            checked={dontShowAgain} 
                            onChange={(e) => setDontShowAgain(e.target.checked)} 
                        />
                        <span className="ios-pwa-checkbox-checkmark"></span>
                        <span className="ios-pwa-checkbox-label-text">Không hiển thị lại hướng dẫn này</span>
                    </label>
                </div>
                
                <div className="ios-pwa-arrow-pointer" />
            </div>
        </div>
    );
}
