import React, { useState } from 'react';

const UserProfile = ({ user, onBack }) => {
    // 1. Kiểm tra vai trò người dùng
    const isEnterprise = user?.role === 'ENTERPRISE';

    // 2. Khởi tạo state linh hoạt theo vai trò
    const [profileData, setProfileData] = useState(isEnterprise ? {
        business_name: user?.full_name || '',
        contact_person: '',
        contact_email: user?.email || '',
        contact_phone: '',
        status: 'PENDING'
    } : {
        full_name: user?.full_name || '',
        date_of_birth: '',
        gender: 'MALE',
        base_location: '',
        travel_style: '',
        privacy_status: 'PUBLIC',
        kyc_status: 'UNVERIFIED',
        bio: '',
        avatar_url: ''
    });

    const handleChange = (field, value) => {
        setProfileData({ ...profileData, [field]: value });
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('http://127.0.0.1:8000/api/auth/update-profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                alert("Cập nhật hồ sơ thành công! ✨");
                onBack(); 
            } else {
                const errorData = await response.json();
                alert("Lỗi: " + (errorData.detail || "Không thể cập nhật"));
            }
        } catch (error) {
            alert("Không thể kết nối tới máy chủ.");
        }
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#fafbfc', minHeight: '100vh' }}>
            {/* Header & Back Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '16px', color: '#576574', cursor: 'pointer' }}>
                    ⬅️ Quay lại
                </button>
                <span style={{ 
                    padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                    backgroundColor: '#fff3cd', color: '#856404'
                }}>
                    {isEnterprise ? `Trạng thái: ${profileData.status}` : `KYC: ${profileData.kyc_status}`}
                </span>
            </div>

            <h2 style={{ color: '#222f3e', marginBottom: '20px', fontSize: '24px', fontWeight: 800 }}>
                {isEnterprise ? "Hồ sơ Doanh nghiệp" : "Hồ sơ của tôi"}
            </h2>

            {/* Avatar Section */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                <div style={{ position: 'relative' }}>
                    <img 
                        src={profileData.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                        alt="Avatar" 
                        style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #0abde3' }}
                    />
                    <button style={{ position: 'absolute', bottom: 0, right: 0, background: '#0abde3', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>📷</button>
                </div>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* --- TRƯỜNG NHẬP LIỆU CHO DOANH NGHIỆP --- */}
                {isEnterprise ? (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 600, color: '#576574' }}>Tên Doanh nghiệp *</label>
                            <input 
                                type="text" value={profileData.business_name}
                                onChange={(e) => handleChange('business_name', e.target.value)} required
                                style={{ padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 600, color: '#576574' }}>Người đại diện liên hệ *</label>
                            <input 
                                type="text" value={profileData.contact_person}
                                onChange={(e) => handleChange('contact_person', e.target.value)} required
                                style={{ padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 600, color: '#576574' }}>Số điện thoại liên hệ *</label>
                            <input 
                                type="text" value={profileData.contact_phone}
                                onChange={(e) => handleChange('contact_phone', e.target.value)} required
                                style={{ padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5' }}
                            />
                        </div>
                    </>
                ) : (
                    /* --- TRƯỜNG NHẬP LIỆU CHO CÁ NHÂN*/
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 600, color: '#576574' }}>Họ và tên *</label>
                            <input 
                                type="text" value={profileData.full_name}
                                onChange={(e) => handleChange('full_name', e.target.value)} required
                                style={{ padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', fontWeight: 600 }}>Ngày sinh *</label>
                                <input type="date" value={profileData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', fontWeight: 600 }}>Giới tính *</label>
                                <select value={profileData.gender} onChange={(e) => handleChange('gender', e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5' }}>
                                    <option value="MALE">Nam (MALE)</option>
                                    <option value="FEMALE">Nữ (FEMALE)</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 600, color: '#576574' }}>Nơi sống (Base Location)</label>
                            <input 
                                type="text" placeholder="VD: TP. Hồ Chí Minh"
                                value={profileData.base_location}
                                onChange={(e) => handleChange('base_location', e.target.value)}
                                style={{ padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', fontWeight: 600 }}>Phong cách Du lịch</label>
                                <select value={profileData.travel_style} onChange={(e) => handleChange('travel_style', e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5' }}>
                                    <option value="">-- Chưa chọn --</option>
                                    <option value="BACKPACKER">Phượt</option>
                                    <option value="RESORT">Nghỉ dưỡng</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', fontWeight: 600 }}>Quyền riêng tư</label>
                                <select value={profileData.privacy_status} onChange={(e) => handleChange('privacy_status', e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5' }}>
                                    <option value="PUBLIC">Công khai</option>
                                    <option value="PRIVATE">Cá nhân</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 600, color: '#576574' }}>Giới thiệu bản thân (Bio)</label>
                            <textarea 
                                rows="3"
                                placeholder="Chia sẻ một chút về đam mê xê dịch của bạn..."
                                value={profileData.bio}
                                onChange={(e) => handleChange('bio', e.target.value)}
                                style={{ padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5', resize: 'none', fontFamily: 'inherit' }}
                            />
                        </div>
                    </>
                )}

                <button type="submit" style={{ marginTop: '15px', background: '#22a6b3', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                    💾 Lưu hồ sơ
                </button>
            </form>
        </div>
    );
};

export default UserProfile;