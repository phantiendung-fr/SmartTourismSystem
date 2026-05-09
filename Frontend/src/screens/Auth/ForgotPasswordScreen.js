import React, { useState } from 'react';

const ForgotPasswordScreen = ({ onBack, onSwitchToLogin }) => {
    const [step, setStep] = useState(1); // Bước 1: Nhập Email | Bước 2: Nhập OTP + Pass mới
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleSendOTP = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://127.0.0.1:8000/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.detail || "Lỗi khi gửi OTP");

            setMessage("✅ " + data.message);
            setStep(2); // Chuyển sang bước nhập OTP
        } catch (error) {
            alert("❌ " + error.message);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://127.0.0.1:8000/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: email, 
                    otp: otp, 
                    new_password: newPassword 
                })
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.detail || "Lỗi xác nhận OTP");

            alert("🎉 " + data.message);
            onSwitchToLogin(); // Thành công thì đẩy về màn hình đăng nhập
        } catch (error) {
            alert("❌ " + error.message);
        }
    };

    return (
        <div style={{ padding: '20px', paddingTop: '40px' }}>
            <div style={{ cursor: 'pointer', marginBottom: '20px', color: '#555', fontWeight: 'bold' }} onClick={onBack}>
                ⬅️ Quay lại
            </div>

            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Khôi phục mật khẩu</h2>

            {step === 1 && (
                <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <p style={{ fontSize: '14px', color: '#747d8c', textAlign: 'center' }}>
                        Nhập email bạn đã đăng ký, chúng tôi sẽ gửi mã xác nhận cho bạn.
                    </p>
                    <input 
                        type="email" placeholder="Nhập Email của bạn" required
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ccc' }}
                    />
                    <button type="submit" style={{ padding: '12px', borderRadius: '10px', background: '#0abde3', color: '#fff', border: 'none', fontWeight: 'bold' }}>
                        Gửi mã xác nhận
                    </button>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <p style={{ color: 'green', fontSize: '14px', textAlign: 'center', fontWeight: 'bold' }}>{message}</p>
                    <input 
                        type="text" placeholder="Nhập mã OTP 6 số" required
                        value={otp} onChange={(e) => setOtp(e.target.value)}
                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ccc' }}
                    />
                    <input 
                        type="password" placeholder="Mật khẩu mới" required
                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ccc' }}
                    />
                    <button type="submit" style={{ padding: '12px', borderRadius: '10px', background: '#2ed573', color: '#fff', border: 'none', fontWeight: 'bold' }}>
                        Cập nhật mật khẩu
                    </button>
                </form>
            )}
        </div>
    );
};

export default ForgotPasswordScreen;