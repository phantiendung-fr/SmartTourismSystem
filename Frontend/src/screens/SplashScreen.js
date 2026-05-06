import React, { useEffect } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onFinish }) => {
    useEffect(() => {
        // Cài đặt đồng hồ: Sau 2.5 giây sẽ gọi hàm onFinish để chuyển trang
        const timer = setTimeout(() => {
            onFinish();
        }, 2500);
        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className="splash-container">
            <div className="splash-logo">
                <h1>TravelSafe</h1>
                <span className="splash-icon">📍</span>
            </div>
        </div>
    );
};

export default SplashScreen;