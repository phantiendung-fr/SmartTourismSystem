import React, { useState, useEffect, useRef } from 'react';
import { getTripDetail, getDeviationStatus, checkinStop, completeTrip, cancelTrip } from '../../services/tripService';
import IslandMap from '../../components/IslandMap/IslandMap';
import './TripDetailScreen.css';
import RouteMap from '../../components/RouteMap/RouteMap';
import Mascot from '../../components/Mascot/Mascot';
import TreasureOverlay from '../../components/TreasureOverlay/TreasureOverlay';

const TripDetailScreen = ({ itineraryId, onBack, refreshUser, onPointsUpdate, user }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tripDetail, setTripDetail] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    // Deviation state — updated by click (demo) OR by fetching from backend (real)
    const [selectedStop, setSelectedStop] = useState(null);
    const [isDeviated, setIsDeviated] = useState(false);
    const [checkinLoading, setCheckinLoading] = useState(false);
    const [checkinMsg, setCheckinMsg] = useState('');
    const checkinInProgress = useRef(false);

    // Trip action states
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMsg, setActionMsg] = useState('');

    const [cloudState, setCloudState] = useState('idle');
    const [mascotMessage, setMascotMessage] = useState('');
    const [rewardData, setRewardData] = useState(null);

    useEffect(() => {
        if (!tripDetail) return;
        if (tripDetail.status === 'COMPLETED') {
            setMascotMessage(["Chúc mừng bạn đã hoàn thành trọn vẹn hành trình tuyệt vời này!"]);
        } else {
            const introSequence = [
                " Chào mừng bạn đến với kỷ nguyên du lịch! Hãy cùng tôi khám phá mọi miền trên khắp đất nước Việt Nam.",
                " Trên bản đồ đảo này, mỗi tòa nhà tượng trưng cho một địa điểm thú vị mà bạn sẽ đi qua.",
                " Bạn có thể nhấn vào từng công trình để xem chi tiết và thực hiện check-in khi đến nơi.",
                " Chúc bạn có một chuyến đi thật vui vẻ! Nếu cần trợ giúp, hãy nhấn vào tôi nhé!"
            ];
            // Truyền toàn bộ chuỗi để Mascot phát lần lượt
            setMascotMessage(introSequence);
        }
    }, [tripDetail?.itinerary_id, tripDetail?.status]);

    const handleBuildingClick = (stop) => {
        if (cloudState !== 'idle') return;
        setCloudState('in');
        setTimeout(() => {
            setSelectedStop(stop);
            setCloudState('out');
            setTimeout(() => setCloudState('idle'), 600);
        }, 500);
    };

    const handleCloseDetail = () => {
        if (cloudState !== 'idle') return;
        setCloudState('in');
        setTimeout(() => {
            setSelectedStop(null);
            setCloudState('out');
            setTimeout(() => setCloudState('idle'), 600);
        }, 500);
    };

    const fetchDetail = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const token = localStorage.getItem('access_token');
            const data = await getTripDetail(itineraryId, token);
            setTripDetail(data);
        } catch (err) {
            if (!silent) setError(err.message || "Không thể tải chi tiết chuyến đi");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchDeviationStatus = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const result = await getDeviationStatus(itineraryId, token);
            setIsDeviated(result.is_deviated);
        } catch (err) {
            console.error("Lỗi khi lấy trạng thái lệch hướng:", err);
        }
    };

    const handleRefresh = async (silent = false) => {
        await Promise.all([fetchDetail(silent), fetchDeviationStatus()]);
    };

    useEffect(() => {
        // Reset trạng thái check-in khi chuyển trip (tránh khóa nút từ trip cũ)
        checkinInProgress.current = false;
        setCheckinLoading(false);
        setCheckinMsg('');
        setActionMsg('');

        if (itineraryId) {
            fetchDetail();
            fetchDeviationStatus();
        }

        // Theo dõi vị trí hiện tại của người dùng
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setUserLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
            },
            (err) => console.warn("Không thể lấy vị trí:", err),
            {
                enableHighAccuracy: false,
                timeout: 20000,
                maximumAge: 60000
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [itineraryId]);

    // Determine if trip is ongoing (can be completed/cancelled)
    const isTripOngoing = tripDetail && (tripDetail.status === 'DRAFT' || tripDetail.status === 'CONFIRMED');
    const isTripCompleted = tripDetail && tripDetail.status === 'COMPLETED';
    const isTripCancelled = tripDetail && tripDetail.status === 'CANCELLED';

    const getStatusLabel = () => {
        if (isTripCompleted) return { text: '✅ Hoàn thành', className: 'status-completed' };
        if (isTripCancelled) return { text: '❌ Đã hủy', className: 'status-cancelled' };
        return { text: '🔄 Đang diễn ra', className: 'status-ongoing' };
    };

    const handleCompleteTrip = async () => {
        if (!window.confirm('Bạn có chắc chắn muốn hoàn thành chuyến đi này không?')) return;

        setActionLoading(true);
        setActionMsg('');
        try {
            const token = localStorage.getItem('access_token');
            const result = await completeTrip(itineraryId, token);
            setActionMsg(`✅ ${result.detail}`);
            // Refresh trip detail to get updated status
            await fetchDetail(true);
            if (onPointsUpdate) onPointsUpdate();
        } catch (err) {
            setActionMsg(`❌ ${err.message}`);
        } finally {
            setActionLoading(false);
            setTimeout(() => setActionMsg(''), 3000);
        }
    };

    const handleCancelTrip = async () => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy chuyến đi này không? Hành động này không thể hoàn tác.')) return;

        setActionLoading(true);
        setActionMsg('');
        try {
            const token = localStorage.getItem('access_token');
            const result = await cancelTrip(itineraryId, token);
            setActionMsg(`⚠️ ${result.detail}`);
            // Refresh trip detail to get updated status
            await fetchDetail(true);
            if (onPointsUpdate) onPointsUpdate();
        } catch (err) {
            setActionMsg(`❌ ${err.message}`);
        } finally {
            setActionLoading(false);
            setTimeout(() => setActionMsg(''), 3000);
        }
    };

    if (loading) {
        return (
            <div className="trip-detail-screen loading">
                <div className="spinner"></div>
                <p>Đang tải chi tiết chuyến đi...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="trip-detail-screen error">
                <h3>Lỗi</h3>
                <p>{error}</p>
                <button className="btn-back" onClick={onBack}>Quay lại</button>
            </div>
        );
    }

    if (!tripDetail) return null;

    // Nhóm các điểm dừng theo ngày
    const allStops = (tripDetail.stops || []);
    const stopsByDay = allStops.reduce((acc, stop) => {
        const day = stop.day_order;
        if (!acc[day]) acc[day] = [];
        acc[day].push(stop);
        return acc;
    }, {});

    // Find the first PENDING stop = "next" stop
    const sortedStops = [...allStops].sort((a, b) => a.stop_order - b.stop_order);
    const nextStop = sortedStops.find(s => s.status === 'PENDING' || s.status === 'VISITING');

    // Determine stop card color class
    const getStopColorClass = (stop) => {
        if (stop.status === 'COMPLETED') return 'stop-completed';    // green
        if (nextStop && stop.stop_id === nextStop.stop_id) return 'stop-next';  // orange
        return 'stop-default'; // blue
    };

    const handleCheckin = async (targetStop) => {
        // Guard: nếu đang xử lý thì không cho bấm nữa (tránh click đúp)
        if (!targetStop || checkinInProgress.current) return;
        checkinInProgress.current = true;
        setCheckinLoading(true);
        setCheckinMsg('');

        // Safety timeout: tự reset sau 12 giây nếu mọi thứ bị treo
        const safetyTimer = setTimeout(() => {
            if (checkinInProgress.current) {
                checkinInProgress.current = false;
                setCheckinLoading(false);
                setCheckinMsg('❌ Hết thời gian chờ. Vui lòng thử lại.');
            }
        }, 12000);

        const executeCheckinAPI = async (lat, lng) => {
            try {
                const token = localStorage.getItem('access_token');
                const checkedStopId = targetStop.stop_id;

                // Gửi tọa độ lên Backend (có thể null nếu fallback)
                const result = await checkinStop(checkedStopId, {
                    latitude: lat,
                    longitude: lng
                }, token);

                clearTimeout(safetyTimer);
                
                // Lấy điểm thưởng từ API (nếu có) hoặc từ thông tin trạm
                const earnedPoints = result.reward_points || targetStop.reward || 50;

                // Hiển thị hiệu ứng rương kho báu đang rung
                setRewardData({ 
                    points: earnedPoints, 
                    locationName: targetStop.location_name, 
                    stage: 'shaking' 
                });

                // Mở rương sau 1.5 giây
                setTimeout(() => {
                    setRewardData(prev => prev ? { ...prev, stage: 'open' } : null);
                }, 1500);

                // Đóng hiệu ứng sau 4.5 giây và trở về bản đồ
                setTimeout(() => {
                    setRewardData(null);
                    setCheckinMsg(''); // Xóa tin nhắn toast (nếu có)
                    
                    setSelectedStop(null); // Trở về map

                    // OPTIMISTIC UPDATE: Cập nhật state local ngay lập tức
                    setTripDetail(prev => {
                        if (!prev) return prev;
                        const updatedStops = prev.stops.map(s =>
                            s.stop_id === checkedStopId
                                ? { ...s, status: 'COMPLETED' }
                                : s
                        );
                        const allDone = updatedStops.every(s => s.status === 'COMPLETED');
                        return {
                            ...prev,
                            stops: updatedStops,
                            status: allDone ? 'COMPLETED' : prev.status
                        };
                    });
                    
                    // Mascot chúc mừng
                    setMascotMessage(`Chúc mừng bạn đã khám phá được địa điểm ${targetStop.location_name} trong hành trình du lịch của mình!`);

                    checkinInProgress.current = false;
                    setCheckinLoading(false);
                    if (onPointsUpdate) onPointsUpdate();
                    if (typeof refreshUser === 'function') {
                        refreshUser();
                    }
                }, 4500);

            } catch (err) {
                clearTimeout(safetyTimer);
                setCheckinMsg(`❌ ${err.message}`);
                checkinInProgress.current = false;
                setCheckinLoading(false);
            }
        };

        // 1. Lấy vị trí thực tế
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation({ lat: latitude, lng: longitude });
                executeCheckinAPI(latitude, longitude);
            },
            (error) => {
                // FALLBACK: Khi lỗi vị trí (như timeout trên máy tính), cho phép check-in không cần tọa độ
                console.warn("Lỗi lấy vị trí: ", error.message);
                if (window.confirm(`Không thể lấy vị trí tự động (${error.message}). Bạn có muốn tiếp tục Check-in bỏ qua xác thực vị trí không?`)) {
                    executeCheckinAPI(null, null);
                } else {
                    clearTimeout(safetyTimer);
                    checkinInProgress.current = false;
                    setCheckinLoading(false);
                    setCheckinMsg('❌ Đã hủy check-in');
                }
            },
            {
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 10000
            }
        );
    };

    const renderContent = () => {
        if (selectedStop) {
            const isCheckedIn = selectedStop.status === 'COMPLETED';

            return (
                <div className="trip-detail-screen location-detail-mode">
                    <div className="detail-header">
                        <button className="btn-back-icon" onClick={handleCloseDetail}>
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <h2>{selectedStop.location_name}</h2>
                </div>
                
                <div className="location-detail-content">
                    {/* Ảnh minh họa giả lập (mock image) */}
                    <div className="location-cover-image" style={{ 
                        backgroundImage: `url('https://images.unsplash.com/photo-1599839619722-39751411ea63?auto=format&fit=crop&w=800&q=80')` 
                    }}>
                        {isCheckedIn && (
                            <div className="status-badge checked-in-badge">
                                ✅ Đã Check-in
                            </div>
                        )}
                    </div>

                    <div className="location-info-card">
                        <div className="location-title-row">
                            <h3>{selectedStop.location_name}</h3>
                            <div className="rating-mock">
                                ⭐ 4.8 <span>(124 đánh giá)</span>
                            </div>
                        </div>
                        
                        <p className="location-desc-mock">
                            Một địa điểm tuyệt vời không thể bỏ qua trong hành trình của bạn. Nơi đây mang đậm dấu ấn văn hóa và lịch sử, hứa hẹn đem lại những trải nghiệm thú vị.
                        </p>

                        <div className="location-meta">
                            <span><i className="fas fa-clock"></i> Mở cửa: 08:00 - 17:00</span>
                            <span><i className="fas fa-ticket-alt"></i> Vé: Miễn phí</span>
                        </div>
                    </div>

                    <div className="location-map-section">
                        <h4>Bản đồ & Chỉ đường</h4>
                        <RouteMap 
                            stops={[selectedStop]} 
                            routes={[]} 
                            userLocation={userLocation}
                            user={user}
                            nextStop={selectedStop}
                            onStopClick={setSelectedStop}
                        />
                    </div>
                    
                    <div className="location-action-bar">
                        {isCheckedIn ? (
                            <button className="btn-checkin-tab btn-already-checked" disabled>
                                ✅ Bạn đã ghé thăm điểm này
                            </button>
                        ) : (
                            isTripOngoing && (
                                <button 
                                    className="btn-checkin-tab" 
                                    onClick={() => handleCheckin(selectedStop)}
                                    disabled={checkinLoading}
                                >
                                    {checkinLoading ? 'Đang xử lý...' : '📍 Xác nhận Check-in'}
                                </button>
                            )
                        )}
                        {checkinMsg && (
                            <div className="checkin-toast">{checkinMsg}</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="trip-detail-screen">
            <div className="detail-header">
                <button className="btn-back-icon" onClick={onBack}>
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h2>{tripDetail.name || "Chi tiết chuyến đi"}</h2>
                {/* Deviation status badge — click to toggle for demo */}
                {isTripOngoing && (
                    <div
                        className={`deviation-badge ${isDeviated ? 'deviated' : 'on-track'}`}
                        onClick={() => setIsDeviated(!isDeviated)}
                        title="Nhấn để chuyển trạng thái (demo)"
                    >
                        <span className="badge-dot"></span>
                        <span className="badge-text">{isDeviated ? 'Lệch hướng' : 'Đúng hướng'}</span>
                    </div>
                )}
            </div>

            {/* tripDetail.warning_message && (
                <div className="budget-warning-banner">
                    ⚠️ {tripDetail.warning_message}
                </div>
            ) */}

            {/* <div className="trip-summary">
                <div className="summary-item">
                    <span className="icon">💰</span>
                    <div>
                        <small>Ngân sách</small>
                        <strong>{new Intl.NumberFormat('vi-VN').format(tripDetail.total_budget)} {tripDetail.currency}</strong>
                    </div>
                </div>
                <div className="summary-item">
                    <span className="icon">⏱️</span>
                    <div>
                        <small>Thời gian</small>
                        <strong>{tripDetail.total_travel_time} phút</strong>
                    </div>
                </div>
                <div className="summary-item">
                    <span className="icon">📏</span>
                    <div>
                        <small>Khoảng cách</small>
                        <strong>{tripDetail.total_distance} km</strong>
                    </div>
                </div>
                <div className="summary-item points-summary">
                    <span className="icon">⭐</span>
                    <div>
                        <small>Điểm thưởng</small>
                        <strong>{(tripDetail.stops || []).reduce((acc, s) => acc + (s.reward || 0), 0)} pts</strong>
                    </div>
                </div>
            </div> */}

            {/* Trip action buttons — Hoàn thành / Hủy */}
            {isTripOngoing && (
                <div className="trip-action-section">
                    <button
                        className="btn-complete-trip"
                        onClick={handleCompleteTrip}
                        disabled={actionLoading}
                    >
                        {actionLoading ? '⏳ Đang xử lý...' : '✅ Hoàn thành lịch trình'}
                    </button>
                    <button
                        className="btn-cancel-trip"
                        onClick={handleCancelTrip}
                        disabled={actionLoading}
                    >
                        {actionLoading ? '⏳ Đang xử lý...' : '❌ Hủy chuyến đi'}
                    </button>
                </div>
            )}

            {actionMsg && (
                <div className="action-toast">{actionMsg}</div>
            )}

            {/* Color legend */}
            {/* <div className="color-legend">
                <div className="legend-item"><span className="legend-dot legend-blue"></span> Chưa đến</div>
                <div className="legend-item"><span className="legend-dot legend-orange"></span> Điểm tiếp theo</div>
                <div className="legend-item"><span className="legend-dot legend-green"></span> Đã check-in</div>
            </div> */}

            {/* Check-in button for next stop (Removed to favor Map interaction) */}
            
            {checkinMsg && (
                <div className="checkin-toast">{checkinMsg}</div>
            )}

            {/* Bản đồ Đảo (Island Map) thay thế RouteMap */}
            <div className="island-map-section" style={{ position: 'relative' }}>
                {/* <p className="map-instruction">Nhấn vào các công trình trên đảo để xem chi tiết.</p> */}
                <IslandMap
                    stops={allStops}
                    onBuildingClick={handleBuildingClick}
                />
                
                {/* Mascot Layer */}
                <Mascot message={mascotMessage} />
            </div>
        </div>
        );
    };

    return (
        <>
            {renderContent()}
            <div className={`cloud-transition-container ${cloudState}`}>
                <div className="cloud cloud-left"></div>
                <div className="cloud cloud-right"></div>
            </div>
            
            {/* Treasure Overlay */}
            <TreasureOverlay data={rewardData} />
        </>
    );
};

export default TripDetailScreen;
