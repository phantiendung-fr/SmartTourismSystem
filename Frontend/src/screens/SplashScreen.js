import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onFinish }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Tăng thanh tiến trình dần dần trong vòng 3 giây
        const duration = 3000;
        const intervalTime = 30;
        const step = 100 / (duration / intervalTime);

        const interval = setInterval(() => {
            setProgress(prev => {
                const next = prev + step;
                if (next >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return next;
            });
        }, intervalTime);

        // Chuyển trang sau 3.2 giây (cho người dùng kịp nhìn thấy 100%)
        const timer = setTimeout(() => {
            onFinish();
        }, 3200);

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }, [onFinish]);

    return (
        <div 
            className="splash-container"
            style={{
                background: `url('${process.env.PUBLIC_URL || ''}/assets/splash_bg.png') center/cover no-repeat`,
                backgroundColor: '#1a5683'
            }}
        >
            {/* Lớp mờ (nếu cần) để chữ dễ đọc hơn, tạm thời tắt vì hình đã đẹp */}
            {/* <div className="splash-overlay"></div> */}
            
            <div className="splash-bottom-section">
                <div className="loading-text">Đang tải dữ liệu... {Math.round(progress)}%</div>
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;