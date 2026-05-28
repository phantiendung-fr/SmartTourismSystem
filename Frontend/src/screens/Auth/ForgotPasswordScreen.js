import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { API_BASE } from '../../config/api';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import './LoginScreen.css';

const ForgotPasswordScreen = ({ onBack, onSwitchToLogin }) => {
    const [step, setStep] = useState(() => {
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            return 3; // Màn hình nhập mật khẩu mới trực tiếp từ link email
        }
        return 1; // Nhập email gửi yêu cầu
    });

    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            setStep(3);
        }
    }, []);

    const translateError = (msg) => {
        const m = msg.toLowerCase();
        if (m.includes('invalid login credentials')) return 'Email hoặc mật khẩu không chính xác.';
        if (m.includes('password should be at least 6 characters')) return 'Mật khẩu phải có ít nhất 6 ký tự.';
        if (m.includes('too many requests') || m.includes('rate limit')) return 'Yêu cầu quá nhanh, vui lòng thử lại sau ít phút.';
        if (m.includes('access_denied') || m.includes('otp_expired') || m.includes('expired')) return 'Link khôi phục đã hết hạn hoặc không còn hiệu lực. Vui lòng gửi lại yêu cầu mới.';
        if (m.includes('network error') || m.includes('failed to fetch') || m.includes('err_connection_refused')) return 'Không thể kết nối đến máy chủ Backend (Port 8000). Vui lòng kiểm tra lại.';
        if (m.includes('user not found')) return 'Không tìm thấy người dùng với email này.';
        if (m.includes('invalid email')) return 'Địa chỉ email không hợp lệ.';
        return msg;
    };

    const handleSendResetEmail = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const emailTrimmed = email.trim();
        if (!emailTrimmed) {
            setError('Vui lòng nhập địa chỉ email.');
            setLoading(false);
            return;
        }

        try {
            // 1. Kiểm tra email có tồn tại trên Backend (Port 8000) không
            try {
                const checkRes = await axios.get(`${API_BASE}/api/auth/check-email?email=${emailTrimmed}`);
                if (!checkRes.data.exists) {
                    throw new Error('Email này chưa có trong hệ thống. Vui lòng đăng ký tài khoản mới.');
                }
            } catch (err) {
                if (err.response?.data?.detail) {
                    throw new Error(err.response.data.detail);
                } else if (err.message.includes('chưa có trong hệ thống')) {
                    throw err;
                } else {
                    throw new Error("Lỗi kết nối Backend (Port 8000). Vui lòng thử lại.");
                }
            }

            // 2. Gửi email khôi phục mật khẩu thông qua Supabase Auth
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailTrimmed, {
                redirectTo: `${window.location.origin}/#type=recovery`,
            });
            if (resetError) throw resetError;

            setSuccess('Đã gửi email khôi phục! Vui lòng kiểm tra hộp thư của bạn.');
            setStep(2); // Chuyển sang bước chờ
        } catch (err) {
            setError(translateError(err.message || 'Lỗi gửi yêu cầu khôi phục.'));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const newPass = newPassword.trim();
        const confPass = confirmPassword.trim();

        if (!newPass) {
            setError('Vui lòng nhập mật khẩu mới.');
            setLoading(false);
            return;
        }
        if (newPass.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự.');
            setLoading(false);
            return;
        }
        if (newPass !== confPass) {
            setError('Mật khẩu xác nhận không khớp.');
            setLoading(false);
            return;
        }

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPass
            });
            if (updateError) throw updateError;

            setSuccess('Đổi mật khẩu thành công! Đang quay lại trang đăng nhập...');
            setTimeout(() => {
                window.location.hash = ''; // Clear recovery hash fragment
                onSwitchToLogin();
            }, 3000);
        } catch (err) {
            setError(translateError(err.message || 'Lỗi cập nhật mật khẩu.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div 
                className="auth-back" 
                onClick={() => {
                    window.location.hash = '';
                    onBack();
                }} 
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
                <ArrowLeft size={16} /> Quay lại
            </div>

            <h2 className="login-title">Khôi phục mật khẩu</h2>

            {step === 1 && (
                <form onSubmit={handleSendResetEmail} className="auth-form-stack">
                    <p className="auth-helper-text" style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '14px', textAlign: 'center' }}>
                        Nhập email bạn đã đăng ký, chúng tôi sẽ gửi liên kết khôi phục mật khẩu đến email của bạn.
                    </p>
                    <input 
                        type="email" 
                        placeholder="Nhập Email của bạn" 
                        required
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        className="login-input"
                        disabled={loading}
                    />
                    <button type="submit" className="login-button forgot-submit-btn" disabled={loading}>
                        {loading ? 'Đang gửi yêu cầu...' : 'Gửi liên kết khôi phục'}
                    </button>
                    {error && <p className="error-msg" style={{ marginTop: '12px', color: '#e74c3c', fontSize: '12px', textAlign: 'center' }}>{error}</p>}
                </form>
            )}

            {step === 2 && (
                <div className="auth-form-stack" style={{ textAlign: 'center' }}>
                    <p className="auth-success-msg" style={{ color: '#2ecc71', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px' }}>
                        {success}
                    </p>
                    <p className="auth-helper-text" style={{ fontSize: '11px', color: '#7f8c8d' }}>
                        Vui lòng click vào đường dẫn trong hộp thư email để tiến hành tạo mật khẩu mới. Sau khi click, ứng dụng sẽ tự động chuyển hướng bạn đến biểu mẫu cập nhật mật khẩu.
                    </p>
                    <button 
                        type="button" 
                        className="login-button" 
                        onClick={onSwitchToLogin}
                        style={{ marginTop: '16px' }}
                    >
                        Quay lại đăng nhập
                    </button>
                </div>
            )}

            {step === 3 && (
                <form onSubmit={handleUpdatePassword} className="auth-form-stack">
                    <p className="auth-helper-text" style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '14px', textAlign: 'center' }}>
                        Nhập mật khẩu mới cho tài khoản của bạn.
                    </p>
                    <input 
                        type="password" 
                        placeholder="Mật khẩu mới" 
                        required
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="login-input"
                        disabled={loading}
                    />
                    <input 
                        type="password" 
                        placeholder="Xác nhận mật khẩu mới" 
                        required
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="login-input"
                        disabled={loading}
                    />
                    <button type="submit" className="login-button reset-submit-btn" disabled={loading}>
                        {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                    </button>
                    {success && <p className="auth-success-msg" style={{ color: '#2ecc71', fontSize: '12px', fontWeight: 'bold', marginTop: '12px', textAlign: 'center' }}>{success}</p>}
                    {error && <p className="error-msg" style={{ marginTop: '12px', color: '#e74c3c', fontSize: '12px', textAlign: 'center' }}>{error}</p>}
                </form>
            )}
        </div>
    );
};

export default ForgotPasswordScreen;

