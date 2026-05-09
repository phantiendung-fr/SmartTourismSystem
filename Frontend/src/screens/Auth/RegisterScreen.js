import React, { useState } from 'react';
import { authService } from '../../services/authService';

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
        <div style={{ padding: '20px', paddingTop: '40px', maxWidth: '400px', margin: 'auto' }}>
            {/* Nút Quay lại */}
            <div 
                style={{ cursor: 'pointer', marginBottom: '20px', color: '#555', fontWeight: 'bold', fontSize: '18px' }} 
                onClick={onBack}
            >
                ⬅️ Quay lại
            </div>

            <h2>Đăng ký tài khoản</h2>

            {/* 3. NÚT CHỌN LOẠI TÀI KHOẢN */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', marginTop: '15px' }}>
                <button 
                    type="button"
                    onClick={() => setFormData({...formData, role: 'USER'})}
                    style={{ 
                        flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer',
                        backgroundColor: formData.role === 'USER' ? '#0abde3' : '#f1f2f6',
                        color: formData.role === 'USER' ? 'white' : 'black',
                        border: 'none', fontWeight: 'bold', transition: '0.3s'
                    }}
                >
                    👤 Cá nhân
                </button>
                <button 
                    type="button"
                    onClick={() => setFormData({...formData, role: 'ENTERPRISE'})}
                    style={{ 
                        flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer',
                        backgroundColor: formData.role === 'ENTERPRISE' ? '#f0932b' : '#f1f2f6',
                        color: formData.role === 'ENTERPRISE' ? 'white' : 'black',
                        border: 'none', fontWeight: 'bold', transition: '0.3s'
                    }}
                >
                    🏢 Doanh nghiệp
                </button>
            </div>

            <form onSubmit={handleRegister}>
                <input style={{width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc'}} placeholder="Họ và Tên" type="text" required
                    onChange={e => setFormData({...formData, fullName: e.target.value})} />
                <input style={{width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc'}} placeholder="Email" type="email" required
                    onChange={e => setFormData({...formData, email: e.target.value})} />
                <input style={{width: '100%', padding: '10px', marginBottom: '15px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #ccc'}} placeholder="Mật khẩu" type="password" required
                    onChange={e => setFormData({...formData, password: e.target.value})} />
                <button style={{width: '100%', padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}} type="submit">
                    Đăng ký
                </button>
            </form>
            
            <p style={{textAlign: 'center', color: message.includes('❌') ? 'red' : 'green', fontWeight: 'bold'}}>{message}</p>

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