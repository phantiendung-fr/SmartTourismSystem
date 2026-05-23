import React, { useState, useEffect } from 'react';
import { createPlanningSession, getRecommendations } from '../../services/planService';
import { createTrip } from '../../services/tripService';
import { API_BASE } from '../../config/api';
import './PlanRecommendScreen.css';

const PlanRecommendScreen = ({ planPayload, onBack, onTripCreated, onOpenLocationDetail, onSessionExpired }) => {
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

                // 2. Lấy tag names từ backend để map tag_ids -> tag_names
                let preferred_tags = [];
                try {
                    const tagsRes = await fetch(`${API_BASE}/api/reference/tags`);
                    const tagsData = await tagsRes.json();
                    const tagMap = {};
                    tagsData.forEach(t => { tagMap[t.tag_id] = t.tag_name; });
                    preferred_tags = (planPayload.tag_ids || []).map(id => tagMap[id]).filter(Boolean);
                } catch (e) {
                    console.warn("Không thể lấy danh sách tags, bỏ qua preferred_tags");
                }
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
        setCreatingTrip(true);
        try {
            const token = localStorage.getItem('access_token');

            // Lấy GPS hiện tại để gửi lên Backend làm điểm xuất phát (Thêm timeout để tránh bị treo trên Emulator/Webview)
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;

                const tripPayload = {
                    session_id: sessionData.session_id,
                    name: planPayload.city_name ? `Lộ trình ${planPayload.city_name}` : `Lộ trình ${planPayload.start_day || 'mới'}`,
                    location_ids: selectedLocations,
                    start_date: planPayload.start_day,
                    end_date: planPayload.end_day,
                    start_lat: latitude,
                    start_lon: longitude
                };

                try {
                    const result = await createTrip(tripPayload, token);
                    alert("Tạo lộ trình thành công!");
                    onTripCreated(result.itinerary_id);
                } catch (err) {
                    alert("Lỗi khi tạo lộ trình: " + err.message);
                } finally {
                    setCreatingTrip(false);
                }
            }, async (geoError) => {
                console.warn("Không lấy được GPS, tạo lộ trình không có điểm bắt đầu thực tế:", geoError);
                // Nếu không lấy được GPS, vẫn cho tạo lộ trình nhưng không có start_lat/lon
                const tripPayload = {
                    session_id: sessionData.session_id,
                    name: planPayload.city_name ? `Lộ trình ${planPayload.city_name}` : `Lộ trình ${planPayload.start_day || 'mới'}`,
                    location_ids: selectedLocations,
                    start_date: planPayload.start_day,
                    end_date: planPayload.end_day
                };
                try {
                    const result = await createTrip(tripPayload, token);
                    onTripCreated(result.itinerary_id);
                } catch (err) {
                    alert("Lỗi khi tạo lộ trình: " + err.message);
                } finally {
                    setCreatingTrip(false);
                }
            }, {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 10000
            });

        } catch (err) {
            const msg = typeof err.message === 'string' ? err.message : JSON.stringify(err.message);
            alert("Lỗi hệ thống: " + msg);
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
        const isTokenExpired = error.toLowerCase().includes('hết hạn') ||
            error.toLowerCase().includes('expired') ||
            error.toLowerCase().includes('unauthorized') ||
            error.includes('401');

        return (
            <div className="recommend-screen">
                <div className="error-state">
                    {isTokenExpired ? (
                        <>
                            <h2 style={{ fontSize: '20px', color: '#de350b', marginBottom: '10px' }}>
                                Phiên đăng nhập đã hết hạn
                            </h2>
                            <p style={{ color: '#636e72', marginBottom: '20px' }}>
                                Vui lòng đăng nhập lại để tiếp tục.
                            </p>
                            <button
                                onClick={onSessionExpired || onBack}
                                className="btn-back"
                                style={{ background: '#0abde3', color: '#fff', padding: '10px 20px', borderRadius: '20px', border: 'none', fontWeight: 'bold' }}
                            >
                                Đăng nhập lại
                            </button>
                        </>
                    ) : (
                        <>
                            <h2>Lỗi</h2>
                            <p>{error}</p>
                            <button onClick={onBack} className="btn-back">Quay lại</button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    const totalBudgetUsed = recommendations
        .filter(loc => selectedLocations.includes(loc.location_id))
        .reduce((sum, loc) => sum + parseFloat(loc.min_price || 0), 0);

    const budgetLimit = Number(planPayload.budget) || 0;
    const isOverBudget = totalBudgetUsed > budgetLimit;
    const budgetPercentage = budgetLimit > 0 ? Math.min(100, (totalBudgetUsed / budgetLimit) * 100) : 0;

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
                            <p className="loc-price">{new Intl.NumberFormat('vi-VN').format(loc.min_price)}đ - {new Intl.NumberFormat('vi-VN').format(loc.max_price)}đ</p>
                            {loc.score && <div className="loc-score">Điểm phù hợp: {Number(loc.score).toFixed(1)}</div>}
                            <div
                                className="loc-view-detail"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenLocationDetail(loc);
                                }}
                            >
                                Xem chi tiết ➔
                            </div>
                        </div>
                        <div className="loc-checkbox">
                            {selectedLocations.includes(loc.location_id) ? '✅' : '⚪'}
                        </div>
                    </div>
                ))}
            </div>

            <div className="recommend-footer">
                <div className="budget-tracker">
                    <div className="budget-info">
                        <span>Ngân sách sử dụng: <strong>{new Intl.NumberFormat('vi-VN').format(totalBudgetUsed)}đ</strong> / {new Intl.NumberFormat('vi-VN').format(budgetLimit)}đ</span>
                        <span className={`budget-status ${isOverBudget ? 'status-over' : 'status-ok'}`}>
                            {isOverBudget ? '⚠️ Vượt ngân sách' : '✅ Trong tầm giá'}
                        </span>
                    </div>
                    <div className="budget-bar-container">
                        <div
                            className={`budget-bar ${isOverBudget ? 'bar-over' : 'bar-ok'}`}
                            style={{ width: `${budgetPercentage}%` }}
                        ></div>
                    </div>
                </div>

                <div className="action-bar">
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
        </div>
    );
};

export default PlanRecommendScreen;
