import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { GoogleLogin } from '@react-oauth/google';
import './LoginScreen.css'; 

// Thêm các hàm điều hướng vào tham số
const LoginScreen = ({ onBack, onSwitchToRegister, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Hứng toàn bộ cục data (chứa access_token, full_name, role...) từ API
            const userData = await authService.login(email, password); 
            
            // Gửi cục data đó lên cho App.js
            onLoginSuccess(userData); 
        } catch (err) {
            setError("❌ " + err.message);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const userData = await authService.loginWithGoogle(credentialResponse.credential);
            onLoginSuccess(userData);
        } catch (err) {
            setError("❌ " + err.message);
        }
    };

    return (
        <div className="login-container" style={{ padding: '20px', paddingTop: '40px' }}>
            {/* Nút Quay lại */}
            <div 
                style={{ cursor: 'pointer', marginBottom: '20px', color: '#555', fontWeight: 'bold', fontSize: '18px' }} 
                onClick={onBack}
            >
                ⬅️ Quay lại
            </div>

            <form onSubmit={handleLogin}>
                <h2 className="login-title">✈️ Đăng nhập</h2>
                <input 
                    className="login-input" 
                    placeholder="Email" type="email" required
                    onChange={e => setEmail(e.target.value)} 
                />
                <input 
                    className="login-input" 
                    placeholder="Mật khẩu" type="password" required
                    onChange={e => setPassword(e.target.value)} 
                />
                <button className="login-button" type="submit">Khởi hành</button>
                
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError("❌ Đăng nhập Google thất bại")}
                        theme="filled_blue"
                        shape="pill"
                        text="continue_with"
                    />
                </div>

                {/* Hiển thị lỗi nếu sai pass */}
                {error && <p className="error-msg">{error}</p>}

                {/* Các liên kết hỗ trợ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '14px' }}>
                    <span style={{ color: '#0abde3', cursor: 'pointer', fontWeight: 'bold' }}>Quên mật khẩu?</span>
                    <span 
                        style={{ color: '#0abde3', cursor: 'pointer', fontWeight: 'bold' }} 
                        onClick={onSwitchToRegister}
                    >
                        Chưa có tài khoản?
                    </span>
                </div>
            </form>
        </div>
    );
};

export default LoginScreen;