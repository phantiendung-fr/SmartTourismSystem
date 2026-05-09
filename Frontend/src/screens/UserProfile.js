import React, { useState } from 'react';

const UserProfile = ({ user, onBack }) => {
    // Khởi tạo state bám sát 100% cấu trúc của bảng user_profiles
    const [profileData, setProfileData] = useState({
        full_name: user?.full_name || '',
        avatar_url: '',
        bio: '',
        date_of_birth: '',
        gender: 'MALE', // Giá trị mặc định nằm trong mảng [MALE, FEMALE, OTHER]
        base_location: '',
        travel_style: '', // Có thể rỗng (null) hoặc BACKPACKER / RESORT
        privacy_status: 'PUBLIC', // Mặc định là PUBLIC
        kyc_status: 'UNVERIFIED' // Trạng thái hiển thị (Read-only)
    });

    const handleChange = (field, value) => {
        setProfileData({ ...profileData, [field]: value });
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        
        try {
            // Gọi "anh bếp trưởng" Backend
            const API_BASE_URL = process.env.REACT_APP_API_URL;
            const response = await fetch(`${API_BASE_URL}/api/update-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...profileData,
                    user_id: user.id // Đừng quên gửi kèm ID của người dùng đang đăng nhập
                })
            });

            if (response.ok) {
                alert("Cập nhật hồ sơ lên Supabase thành công!");
                onBack(); 
            } else {
                alert("Có lỗi từ Backend!");
            }
        } catch (error) {
            console.error("Lỗi kết nối:", error);
        }
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#fafbfc', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: '16px', color: '#576574', cursor: 'pointer' }}>
                    ⬅️ Quay lại
                </button>
                {/* Hiển thị trạng thái KYC (Xác minh danh tính) */}
                <span style={{ 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    backgroundColor: profileData.kyc_status === 'APPROVED' ? '#d4edda' : '#fff3cd',
                    color: profileData.kyc_status === 'APPROVED' ? '#155724' : '#856404'
                }}>
                    KYC: {profileData.kyc_status}
                </span>
            </div>

            <h2 style={{ color: '#222f3e', marginBottom: '20px', fontSize: '24px', fontWeight: 800 }}>Hồ sơ của tôi</h2>

            {/* Avatar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                <div style={{ position: 'relative' }}>
                    <img 
                        src={profileData.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                        alt="Avatar" 
                        style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #0abde3' }}
                    />
                    <button style={{ position: 'absolute', bottom: 0, right: 0, background: '#0abde3', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>
                        📷
                    </button>
                </div>
            </div>

            {/* Form điền thông tin */}
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#576574' }}>Họ và tên *</label>
                    <input 
                        type="text" 
                        value={profileData.full_name}
                        onChange={(e) => handleChange('full_name', e.target.value)}
                        required
                        style={{ padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5', outline: 'none' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <label style={{ fontSize: '14px', fontWeight: 600, color: '#576574' }}>Ngày sinh *</label>
                        <input 
                            type="date" 
                            value={profileData.date_of_birth}
                            onChange={(e) => handleChange('date_of_birth', e.target.value)}
                            required
                            style={{ padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5', outline: 'none' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <label style={{ fontSize: '14px', fontWeight: 600, color: '#576574' }}>Giới tính *</label>
                        <select 
                            value={profileData.gender}
                            onChange={(e) => handleChange('gender', e.target.value)}
                            style={{ padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5', outline: 'none', backgroundColor: 'white' }}
                        >
                            <option value="MALE">Nam (MALE)</option>
                            <option value="FEMALE">Nữ (FEMALE)</option>
                            <option value="OTHER">Khác (OTHER)</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#576574' }}>Nơi sống (Base Location)</label>
                    <input 
                        type="text" 
                        placeholder="VD: TP. Hồ Chí Minh"
                        value={profileData.base_location}
                        onChange={(e) => handleChange('base_location', e.target.value)}
                        style={{ padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5', outline: 'none' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <label style={{ fontSize: '14px', fontWeight: 600, color: '#576574' }}>Phong cách Du lịch</label>
                        <select 
                            value={profileData.travel_style}
                            onChange={(e) => handleChange('travel_style', e.target.value)}
                            style={{ padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5', outline: 'none', backgroundColor: 'white' }}
                        >
                            <option value="">-- Chưa chọn --</option>
                            <option value="BACKPACKER">Phượt bụi (BACKPACKER)</option>
                            <option value="RESORT">Nghỉ dưỡng (RESORT)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <label style={{ fontSize: '14px', fontWeight: 600, color: '#576574' }}>Quyền riêng tư</label>
                        <select 
                            value={profileData.privacy_status}
                            onChange={(e) => handleChange('privacy_status', e.target.value)}
                            style={{ padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5', outline: 'none', backgroundColor: 'white' }}
                        >
                            <option value="PUBLIC">Công khai (PUBLIC)</option>
                            <option value="PRIVATE">Cá nhân (PRIVATE)</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#576574' }}>Giới thiệu bản thân (Bio)</label>
                    <textarea 
                        rows="3"
                        maxLength="500"
                        placeholder="Chia sẻ một chút về đam mê xê dịch của bạn..."
                        value={profileData.bio}
                        onChange={(e) => handleChange('bio', e.target.value)}
                        style={{ padding: '12px', borderRadius: '12px', border: '1px solid #c8d6e5', outline: 'none', resize: 'none' }}
                    />
                </div>

                <button type="submit" style={{ marginTop: '15px', background: '#22a6b3', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(34, 166, 179, 0.3)' }}>
                    💾 Lưu hồ sơ
                </button>
            </form>
        </div>
    );
};

export default UserProfile;