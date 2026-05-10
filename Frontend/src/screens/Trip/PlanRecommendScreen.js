import React, { useState, useEffect } from 'react';
import { createPlanningSession, getRecommendations } from '../../services/planService';
import { createTrip } from '../../services/tripService';
import './PlanRecommendScreen.css'; // We'll create a basic CSS file

const MOCK_TAGS_MAP = {
    1: 'Biển', 2: 'Núi', 3: 'Ẩm thực', 4: 'Sống ảo', 5: 'Nghỉ dưỡng', 6: 'Mạo hiểm'
};

const PlanRecommendScreen = ({ planPayload, onBack, onTripCreated }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [selectedLocations, setSelectedLocations] = useState([]);
    const [creatingTrip, setCreatingTrip] = useState(false);

    useEffect(() => {
        const fetchPlanAndRecommendations = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('access_token');
                
                // 1. Khởi tạo phiên
                const sessionRes = await createPlanningSession(planPayload, token);
                setSessionData(sessionRes);

                // 2. Lấy gợi ý
                const preferred_tags = planPayload.tag_ids.map(id => MOCK_TAGS_MAP[id]).filter(Boolean);
                const suggestPayload = {
                    city_id: planPayload.city_id,
                    budget: planPayload.budget,
                    preferred_tags: preferred_tags,
                    max_results: 15
                };
                const suggestRes = await getRecommendations(suggestPayload);
                
                setRecommendations(suggestRes.locations || []);
                // Mặc định chọn 5 địa điểm điểm cao nhất
                const top5 = (suggestRes.locations || []).slice(0, 5).map(loc => loc.location_id);
                setSelectedLocations(top5);

            } catch (err) {
                setError(err.message || "Có lỗi xảy ra khi tải dữ liệu.");
            } finally {
                setLoading(false);
            }
        };

        if (planPayload) {
            fetchPlanAndRecommendations();
        }
    }, [planPayload]);

    const toggleSelection = (locationId) => {
        if (selectedLocations.includes(locationId)) {
            setSelectedLocations(selectedLocations.filter(id => id !== locationId));
        } else {
            setSelectedLocations([...selectedLocations, locationId]);
        }
    };

    const handleCreateTrip = async () => {
        if (selectedLocations.length === 0) {
            alert("Vui lòng chọn ít nhất 1 địa điểm.");
            return;
        }

        try {
            setCreatingTrip(true);
            const token = localStorage.getItem('access_token');
            const tripPayload = {
                session_id: sessionData.session_id,
                name: "Chuyến đi tuyệt vời", // Có thể cho người dùng nhập
                start_date: planPayload.start_day,
                end_date: planPayload.end_day,
                location_ids: selectedLocations
            };

            const tripRes = await createTrip(tripPayload, token);
            onTripCreated(tripRes.itinerary_id);
        } catch (err) {
            alert(err.message || "Lỗi tạo chuyến đi.");
        } finally {
            setCreatingTrip(false);
        }
    };

    if (loading) {
        return (
            <div className="recommend-screen">
                <div className="loading-state">
                    <h2>Đang AI hóa lộ trình...</h2>
                    <p>Vui lòng đợi giây lát</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="recommend-screen">
                <div className="error-state">
                    <h2>Lỗi</h2>
                    <p>{error}</p>
                    <button onClick={onBack} className="btn-back">Quay lại</button>
                </div>
            </div>
        );
    }

    return (
        <div className="recommend-screen">
            <div className="recommend-header">
                <button onClick={onBack} className="btn-back-icon">⬅️</button>
                <h2>Gợi ý địa điểm</h2>
            </div>
            
            <p className="recommend-subtitle">
                Chúng tôi tìm thấy {recommendations.length} địa điểm phù hợp. Hãy chọn những nơi bạn thích!
            </p>

            <div className="locations-list">
                {recommendations.map(loc => (
                    <div 
                        key={loc.location_id} 
                        className={`location-card ${selectedLocations.includes(loc.location_id) ? 'selected' : ''}`}
                        onClick={() => toggleSelection(loc.location_id)}
                    >
                        <div className="loc-info">
                            <h4>{loc.location_name}</h4>
                            <p className="loc-tags">{(loc.tags || []).join(', ')}</p>
                            <p className="loc-price">{loc.min_price}đ - {loc.max_price}đ</p>
                            {loc.score && <div className="loc-score">Điểm phù hợp: {Math.round(loc.score)}</div>}
                        </div>
                        <div className="loc-checkbox">
                            {selectedLocations.includes(loc.location_id) ? '✅' : '⚪'}
                        </div>
                    </div>
                ))}
            </div>

            <div className="recommend-footer">
                <div className="selected-count">
                    Đã chọn: <strong>{selectedLocations.length}</strong> điểm
                </div>
                <button 
                    className="btn-create-trip" 
                    onClick={handleCreateTrip}
                    disabled={creatingTrip || selectedLocations.length === 0}
                >
                    {creatingTrip ? 'Đang tạo...' : 'Tạo Lộ Trình Ngay'}
                </button>
            </div>
        </div>
    );
};

export default PlanRecommendScreen;
