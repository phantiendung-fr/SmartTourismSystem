import React from 'react';
import './WelcomeScreen.css';

const WelcomeScreen = ({ onSignIn, onCreateAccount, onSkip }) => {
    return (
        <div className="welcome-container">
            <button className="skip-btn" onClick={onSkip}>Skip</button>

            {/* Khối hình ảnh ghép */}
            <div className="collage">
                <img src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=400" alt="Hiker" className="img-1" />
                <img src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400" alt="Lake" className="img-2" />
                <img src="https://images.unsplash.com/photo-1518684079-3c830dcef090?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" alt="City" className="img-3" />
            </div>

            {/* Khối chữ */}
            <div className="text-section">
                <h1 className="title-line">Discover</h1>
                <h1 className="title-line">Amazing</h1>
                <div className="highlight-box">
                    <span>Destinations</span>
                </div>
                <p className="sub-text">We believe traveling around the world shouldn't be hard.</p>
            </div>

            {/* Khối Nút bấm */}
            <div className="btn-group">
                <button className="btn-primary" onClick={onSignIn}>Sign In</button>
                <button className="btn-outline" onClick={onCreateAccount}>Create Account</button>
            </div>
        </div>
    );
};

export default WelcomeScreen;