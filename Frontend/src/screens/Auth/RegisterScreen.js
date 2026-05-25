import React, { useState } from 'react';
import { authService } from '../../services/authService';
import './LoginScreen.css';

const RegisterScreen = ({ onBack, onSwitchToLogin }) => {
    // 1. Thêm trường 'role' vào formData, mặc định là 'USER' (Cá nhân)
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '', role: 'USER' });
    const [message, setMessage] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            // 2. Truyền thêm formData.role vào hàm gọi API
            await authService.register(formData.fullName, formData.email, formData.password, formData.role);
            setMessage("🎉 Đăng ký thành công! Hãy bấm đăng nhập.");
        } catch (error) {
            setMessage("❌ Lỗi: " + error.message);
        }
    };

    return (
        <div className="login-container">
            {/* Nút Quay lại */}
            <div 
                className="auth-back"
                onClick={onBack}
            >
                ⬅️ Quay lại
            </div>

            <h2 className="login-title">Đăng ký tài khoản</h2>

            {/* 3. NÚT CHỌN LOẠI TÀI KHOẢN */}
            <div className="role-toggle-row">
                <button 
                    type="button"
                    onClick={() => setFormData({...formData, role: 'USER'})}
                    className={`role-toggle-btn ${formData.role === 'USER' ? 'user-active' : 'inactive'}`}
                >
                    👤 Cá nhân
                </button>
                <button 
                    type="button"
                    onClick={() => setFormData({...formData, role: 'ENTERPRISE'})}
                    className={`role-toggle-btn ${formData.role === 'ENTERPRISE' ? 'enterprise-active' : 'inactive'}`}
                >
                    🏢 Doanh nghiệp
                </button>
            </div>

            <form onSubmit={handleRegister}>
                <input className="login-input" placeholder="Họ và Tên" type="text" required
                    onChange={e => setFormData({...formData, fullName: e.target.value})} />
                <input className="login-input" placeholder="Email" type="email" required
                    onChange={e => setFormData({...formData, email: e.target.value})} />
                <input className="login-input" placeholder="Mật khẩu" type="password" required
                    onChange={e => setFormData({...formData, password: e.target.value})} />
                <button className="login-button register-submit-btn" type="submit">
                    Đăng ký
                </button>
            </form>
            
            <p className={`auth-register-message ${message.includes('❌') ? 'error' : 'success'}`}>{message}</p>

            {/* Chuyển sang đăng nhập */}
            <div className="auth-center-link-row">
                <span 
                    className="auth-link"
                    onClick={onSwitchToLogin}
                >
                    Đã có tài khoản? Đăng nhập ngay
                </span>
            </div>
        </div>
    );
};

export default RegisterScreen;
