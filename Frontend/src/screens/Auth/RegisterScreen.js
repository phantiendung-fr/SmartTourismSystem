import React, { useState } from 'react';
import { authService } from '../../services/authService';

// Thêm các hàm điều hướng vào tham số
const RegisterScreen = ({ onBack, onSwitchToLogin }) => {
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
    const [message, setMessage] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await authService.register(formData.fullName, formData.email, formData.password);
            setMessage("🎉 Đăng ký thành công! Hãy bấm đăng nhập.");
        } catch (error) {
            setMessage("❌ Lỗi: " + error.message);
        }
    };

    return (
        <div style={{ padding: '20px', paddingTop: '40px', maxWidth: '400px', margin: 'auto' }}>
            {/* Nút Quay lại */}
            <div 
                style={{ cursor: 'pointer', marginBottom: '20px', color: '#555', fontWeight: 'bold', fontSize: '18px' }} 
                onClick={onBack}
            >
                ⬅️ Quay lại
            </div>

            <h2>Đăng ký tài khoản</h2>
            <form onSubmit={handleRegister}>
                <input style={{width: '100%', padding: '10px', marginBottom: '10px'}} placeholder="Họ và Tên" type="text" required
                    onChange={e => setFormData({...formData, fullName: e.target.value})} />
                <input style={{width: '100%', padding: '10px', marginBottom: '10px'}} placeholder="Email" type="email" required
                    onChange={e => setFormData({...formData, email: e.target.value})} />
                <input style={{width: '100%', padding: '10px', marginBottom: '15px'}} placeholder="Mật khẩu" type="password" required
                    onChange={e => setFormData({...formData, password: e.target.value})} />
                <button style={{width: '100%', padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}} type="submit">Đăng ký</button>
            </form>
            
            <p style={{textAlign: 'center', color: message.includes('❌') ? 'red' : 'green'}}>{message}</p>

            {/* Chuyển sang đăng nhập */}
            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
                <span 
                    style={{ color: '#0abde3', cursor: 'pointer', fontWeight: 'bold' }} 
                    onClick={onSwitchToLogin}
                >
                    Đã có tài khoản? Đăng nhập ngay
                </span>
            </div>
        </div>
    );
};

export default RegisterScreen;