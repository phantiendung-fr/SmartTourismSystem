import React, { useState } from 'react';
import './TripInputForm.css';

const MOCK_CITIES = [
    { id: 1, name: 'Hà Nội' },
    { id: 2, name: 'Thành phố Hồ Chí Minh' },
    { id: 3, name: 'Thừa Thiên Huế' },
    { id: 4, name: 'Hội An' },
    { id: 5, name: 'Đà Lạt' },
    { id: 6, name: 'Đà Nẵng' },
    { id: 7, name: 'Nha Trang' },
    { id: 8, name: 'Hạ Long' },
    { id: 9, name: 'Ninh Bình' },
    { id: 10, name: 'Phú Quốc' }
];

const MOCK_TAGS = [
    { id: 1, name: 'Biển' },
    { id: 2, name: 'Núi' },
    { id: 3, name: 'Ẩm thực' },
    { id: 4, name: 'Sống ảo' },
    { id: 5, name: 'Nghỉ dưỡng' },
    { id: 6, name: 'Mạo hiểm' }
];

// Nhận vào hàm onSubmit từ component cha 
const TripInputForm = ({ onSubmitPlan }) => {
    // State quản lý bước hiện tại 
    const [step, setStep] = useState(1);

    const getTodayStr = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // State tổng chứa toàn bộ DỮ LIỆU ĐẦU VÀO để giao cho Backend
    const [tripData, setTripData] = useState({
        city_id: 1, // Default to Ha Noi
        start_day: getTodayStr(),
        days: 1, // Will be used to calculate end_day
        pax_adult: 1,
        pax_children: 0,
        budget: 0,
        tag_ids: [] 
    });

    // Hàm xử lý cập nhật dữ liệu khi gõ
    const handleChange = (field, value) => {
        setTripData({ ...tripData, [field]: value });
    };

    // Hàm chọn/bỏ chọn sở thích
    const togglePreference = (tagId) => {
        const currentPrefs = tripData.tag_ids;
        if (currentPrefs.includes(tagId)) {
            handleChange('tag_ids', currentPrefs.filter(id => id !== tagId));
        } else {
            handleChange('tag_ids', [...currentPrefs, tagId]);
        }
    };

    const handleFinalSubmit = () => {
        // Calculate end_day based on start_day and days
        const start = new Date(tripData.start_day);
        const end = new Date(start);
        end.setDate(start.getDate() + tripData.days - 1);
        const end_day = end.toISOString().split('T')[0];

        const payload = {
            city_id: tripData.city_id,
            start_day: tripData.start_day,
            end_day: end_day,
            budget: tripData.budget || 5000000,
            currency: "VND",
            pax_adult: tripData.pax_adult,
            pax_children: tripData.pax_children,
            tag_ids: tripData.tag_ids
        };

        onSubmitPlan(payload);
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
                        <select 
                            value={tripData.city_id} 
                            onChange={(e) => handleChange('city_id', parseInt(e.target.value))}
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
                        >
                            {MOCK_CITIES.map(city => (
                                <option key={city.id} value={city.id}>{city.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="input-group">
                        <label>Ngày bắt đầu</label>
                        <input 
                            type="date" 
                            value={tripData.start_day} 
                            min={getTodayStr()}
                            onChange={(e) => handleChange('start_day', e.target.value)} 
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label>Số ngày</label>
                            <input type="number" min="1" value={tripData.days} onChange={(e) => handleChange('days', parseInt(e.target.value))} />
                        </div>
                    </div>
                    
                    <div className="input-group">
                        <label>Người lớn</label>
                        <input type="number" min="1" value={tripData.pax_adult} onChange={(e) => handleChange('pax_adult', parseInt(e.target.value))} />
                    </div>
                    <div className="input-group">
                        <label>Trẻ em</label>
                        <input type="number" min="0" value={tripData.pax_children} onChange={(e) => handleChange('pax_children', parseInt(e.target.value))} />
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
                        {MOCK_TAGS.map(tag => (
                            <button 
                                key={tag.id}
                                className={`tag-btn ${tripData.tag_ids.includes(tag.id) ? 'selected' : ''}`}
                                onClick={() => togglePreference(tag.id)}
                            >
                                {tag.name}
                            </button>
                        ))}
                    </div>
                    <div className="btn-row">
                        <button className="btn-back" onClick={() => setStep(2)}>⬅️ Quay lại</button>
                        <button 
                            className="btn-next" 
                            style={{ width: 'auto', background: '#0abde3' }} 
                            onClick={handleFinalSubmit}
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