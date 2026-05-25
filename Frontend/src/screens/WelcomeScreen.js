import React from 'react';
import './WelcomeScreen.css';

const WelcomeScreen = ({ onSignIn, onCreateAccount, onSkip }) => {
    return (
        <div className="welcome-container">
            <button className="skip-btn" onClick={onSkip}>BỎ QUA</button>

            {/* Khối hình ảnh ghép */}
            <div className="collage">
                <img src="https://images.unsplash.com/photo-1518684079-3c830dcef090?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" alt="City" className="img-3" />
                <img src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=400" alt="Hiker" className="img-1" />
                <img src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400" alt="Lake" className="img-2" />
            </div>

            {/* Khối chữ */}
            <div className="text-section">
                <h1 className="title-line text-black">Khám phá</h1>
                <h1 className="title-line text-gray">Những Vùng Đất</h1>
                <h1 className="title-line text-blue">
                    Kỳ Diệu 
                    <svg className="sparkle-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20.5 4.5L21.5 7L24 8L21.5 9L20.5 11.5L19.5 9L17 8L19.5 7L20.5 4.5Z" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </h1>
                <p className="sub-text">Hành trình du lịch thông minh và trải nghiệm game hóa độc đáo. Đưa thế giới vào trong tầm tay bạn.</p>
            </div>

            {/* Khối Nút bấm */}
            <div className="btn-group">
                <button className="btn-primary" onClick={onSignIn}>ĐĂNG NHẬP NGAY &rarr;</button>
                <button className="btn-outline" onClick={onCreateAccount}>TẠO TÀI KHOẢN</button>
            </div>
        </div>
    );
};

export default WelcomeScreen;