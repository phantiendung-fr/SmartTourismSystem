import React, { useState } from 'react';
import './TripInputForm.css';

// Nhận vào hàm onSubmit từ component cha 
const TripInputForm = ({ onSubmitPlan }) => {
    // State quản lý bước hiện tại 
    const [step, setStep] = useState(1);

    // State tổng chứa toàn bộ DỮ LIỆU ĐẦU VÀO để giao cho Backend
    const [tripData, setTripData] = useState({
        destination: '',
        days: 1,
        people: 1,
        budget: 0,
        preferences: [] // VD: ['Bãi biển', 'Ẩm thực']
    });

    // Hàm xử lý cập nhật dữ liệu khi gõ
    const handleChange = (field, value) => {
        setTripData({ ...tripData, [field]: value });
    };

    // Hàm chọn/bỏ chọn sở thích
    const togglePreference = (pref) => {
        const currentPrefs = tripData.preferences;
        if (currentPrefs.includes(pref)) {
            handleChange('preferences', currentPrefs.filter(p => p !== pref));
        } else {
            handleChange('preferences', [...currentPrefs, pref]);
        }
    };

    // Phần giao diện
    return (
        <div className="wizard-container">
            <div className="step-indicator">Bước {step} / 3</div>

            {/* 1: ĐỊA ĐIỂM & THỜI GIAN */}
            {step === 1 && (
                <div className="step-content">
                    <h3 className="wizard-title">Bạn muốn đi đâu?</h3>
                    <div className="input-group">
                        <label>Điểm đến (Thành phố/Tỉnh)</label>
                        <input 
                            type="text" 
                            placeholder="VD: Vũng Tàu, Đà Lạt..." 
                            value={tripData.destination}
                            onChange={(e) => handleChange('destination', e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label>Số ngày</label>
                            <input type="number" min="1" value={tripData.days} onChange={(e) => handleChange('days', parseInt(e.target.value))} />
                        </div>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label>Số người</label>
                            <input type="number" min="1" value={tripData.people} onChange={(e) => handleChange('people', parseInt(e.target.value))} />
                        </div>
                    </div>
                    <div className="btn-row">
                        <button className="btn-next" onClick={() => setStep(2)}>Tiếp tục ➡️</button>
                    </div>
                </div>
            )}

            {/* 2: NGÂN SÁCH (Phục vụ cho chức năng Tối ưu) */}
            {step === 2 && (
                <div className="step-content">
                    <h3 className="wizard-title">Ngân sách dự kiến</h3>
                    <div className="input-group">
                        <label>Tổng chi phí tối đa (VNĐ)</label>
                        <input 
                            type="number" 
                            step="100000"
                            placeholder="VD: 5000000" 
                            value={tripData.budget}
                            onChange={(e) => handleChange('budget', parseInt(e.target.value))}
                        />
                        <small style={{color: '#8395a7', marginTop: '5px'}}>
                            Hệ thống sẽ tối ưu lộ trình dựa trên ngân sách này.
                        </small>
                    </div>
                    <div className="btn-row">
                        <button className="btn-back" onClick={() => setStep(1)}>⬅️ Quay lại</button>
                        <button className="btn-next" style={{ width: 'auto' }} onClick={() => setStep(3)}>Tiếp tục ➡️</button>
                    </div>
                </div>
            )}

            {/* 3: SỞ THÍCH & HOÀN THÀNH */}
            {step === 3 && (
                <div className="step-content">
                    <h3 className="wizard-title">Phong cách du lịch</h3>
                    <div className="tags-container">
                        {['Biển', 'Núi', 'Ẩm thực', 'Sống ảo', 'Nghỉ dưỡng', 'Mạo hiểm'].map(tag => (
                            <button 
                                key={tag}
                                className={`tag-btn ${tripData.preferences.includes(tag) ? 'selected' : ''}`}
                                onClick={() => togglePreference(tag)}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                    <div className="btn-row">
                        <button className="btn-back" onClick={() => setStep(2)}>⬅️ Quay lại</button>
                        <button 
                            className="btn-next" 
                            style={{ width: 'auto', background: '#0abde3' }} 
                            onClick={() => onSubmitPlan(tripData)} // Gửi cục data này cho chức năng tiếp theo
                        >
                            🚀 Tạo Lộ Trình
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TripInputForm;