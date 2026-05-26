import React, { useState, useEffect } from 'react';
import { getTripHistory } from '../services/tripService';
import { storageGet } from '../platform/storage';
import { API_BASE } from '../config/api';
import { Clock, Gamepad2, ArrowRight } from 'lucide-react';
import Mascot from '../components/Mascot/Mascot';
import './Travel_trip.css';

const HomeTravel = ({ isGuest, onRequireLogin, user, onLogout, onOpenPlan, onOpenLocationRegister, onOpenProfileEdit, onOpenHistory, onOpenTripDetail }) => {
    const [ongoingTrips, setOngoingTrips] = useState([]);
    const [loadingTrips, setLoadingTrips] = useState(false);
    const [topPlayers, setTopPlayers] = useState([]);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    
    // Mascot state
    const [mascotMessage] = useState([
        "Chào mừng nhà thám hiểm! Sẵn sàng vượt ải chưa?",
        "Nhấn vào nút 'BẮT ĐẦU ⚔️' bên dưới để mở bản đồ thám hiểm mới!",
        "Check-in bằng định vị GPS và chụp ảnh gửi cho AI của tôi để nhận Rương báu nhé!"
    ]);

    // Local state for daily quests completion (simulation)
    const [dailyQuests, setDailyQuests] = useState([
        { id: 1, text: "📍 Check-in GPS tại 1 địa điểm", reward: "+150 EXP", done: false },
        { id: 2, text: "📸 Gửi ảnh kiểm định AI thành công", reward: "+250 EXP", done: false },
        { id: 3, text: "🧠 Hoàn thành 1 câu đố ở trạm dừng", reward: "+100 EXP", done: false }
    ]);

    const toggleQuest = (id) => {
        setDailyQuests(prev => prev.map(q => q.id === id ? { ...q, done: !q.done } : q));
    };



    useEffect(() => {
        const fetchOngoingTrips = async () => {
            if (isGuest || !user) return;
            const token = await storageGet('access_token');
            if (!token) return;

            setLoadingTrips(true);
            try {
                const data = await getTripHistory(token);
                const ongoing = data.filter(item => item.status === 'DRAFT' || item.status === 'CONFIRMED');
                setOngoingTrips(ongoing);
            } catch (err) {
                console.error("Lỗi lấy lịch trình:", err);
            } finally {
                setLoadingTrips(false);
            }
        };

        const fetchTopPlayers = async () => {
            setLoadingPlayers(true);
            try {
                const response = await fetch(`${API_BASE}/api/leaderboard?category=global`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success' && data.leaderboard) {
                        // Lấy 3 người chơi cao nhất
                        setTopPlayers(data.leaderboard.slice(0, 3));
                    }
                }
            } catch (err) {
                console.error("Lỗi lấy top BXH:", err);
            } finally {
                setLoadingPlayers(false);
            }
        };

        fetchOngoingTrips();
        fetchTopPlayers();
    }, [isGuest, user]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const adventureZones = [
        {
            id: 1, title: "Vịnh Hạ Long", difficulty: "EASY", difficultyText: "Dễ 🟢",
            xp: "+500 EXP", coins: "+200 Xu", rating: "4.8",
            image: "https://images.unsplash.com/photo-1528127269322-539801943592?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
        },
        {
            id: 2, title: "Ruộng Bậc Thang", difficulty: "MEDIUM", difficultyText: "Trung bình 🟡",
            xp: "+750 EXP", coins: "+350 Xu", rating: "4.9",
            image: "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
        },
        {
            id: 3, title: "Phố Cổ Hội An", difficulty: "EASY", difficultyText: "Dễ 🟢",
            xp: "+400 EXP", coins: "+150 Xu", rating: "4.7",
            image: "https://images.unsplash.com/photo-1555921015-5532091f6026?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
        }
    ];

    return (
        <div className="home-container">
            {/* SCROLL CONTENT */}
            <div className="home-scroll-content">
                {/* Banner Bắt Đầu Chiến Dịch */}
                <div className="plan-banner">
                    <div className="banner-left">
                        <h3>CHIẾN DỊCH MỚI</h3>
                        <p>Thiết lập lộ trình thám hiểm & làm nhiệm vụ ngay!</p>
                    </div>
                    <button
                        onClick={isGuest ? onRequireLogin : onOpenPlan}
                        className="plan-banner-btn squishy-btn"
                    >
                        BẮT ĐẦU ⚔️
                    </button>
                </div>

                {/* Ải Đang Chinh Phục (Ongoing trip) */}
                {!isGuest && loadingTrips && (
                    <div className="inline-loading">
                        <Clock size={16} className="animate-spin" /> Đang kiểm tra rương ải...
                    </div>
                )}
                
                {!isGuest && ongoingTrips.length > 0 && (
                    <div className="ongoing-section">
                        <div className="section-title">Ải Đang Chinh Phục</div>
                        <div className="ongoing-trips-list">
                            {ongoingTrips.map(trip => (
                                <div
                                    key={trip.itinerary_id}
                                    className="ongoing-trip-card"
                                    onClick={() => onOpenTripDetail && onOpenTripDetail(trip.itinerary_id)}
                                >
                                    <div className="card-status ongoing">
                                        <Gamepad2 size={12} /> Đang leo ải
                                    </div>
                                    <div className="card-info">
                                        <h3 className="ongoing-trip-title">{trip.name || 'Hành trình không tên'}</h3>
                                        <p className="ongoing-trip-meta">
                                            Ngày kích hoạt: {formatDate(trip.create_at)}
                                        </p>
                                        <div className="ongoing-trip-stats">
                                            <span>🗺️ {trip.total_distance} km</span>
                                            <span>🪙 {new Intl.NumberFormat('vi-VN').format(trip.total_budget)} đ</span>
                                        </div>
                                    </div>
                                    <div className="enter-dungeon-action">
                                        <button className="enter-btn squishy-btn green">
                                            VÀO ẢI 🎮
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Nhiệm Vụ Hằng Ngày (Daily Quests Board) */}
                <div className="daily-quests-card">
                    <h3 className="board-title">📜 NHIỆM VỤ HẰNG NGÀY</h3>
                    <div className="quests-list">
                        {dailyQuests.map((quest) => (
                            <div 
                                key={quest.id} 
                                className={`quest-item-row ${quest.done ? 'quest-done' : ''}`}
                                onClick={() => toggleQuest(quest.id)}
                            >
                                <div className="checkbox-cartoon">
                                    {quest.done ? '✓' : ''}
                                </div>
                                <div className="quest-text-content">
                                    <span className="quest-label">{quest.text}</span>
                                    <span className="quest-reward">{quest.reward}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bảng Xếp Hạng Thu Nhỏ (Mini Leaderboard) */}
                <div className="mini-leaderboard-card">
                    <div className="section-title">
                        <span>🏆 BẢNG VINH DANH</span>
                    </div>
                    {loadingPlayers ? (
                        <div className="inline-loading">Đang cập nhật thứ hạng...</div>
                    ) : topPlayers.length === 0 ? (
                        <div className="empty-players">Đang đợi các nhà thám hiểm đột phá...</div>
                    ) : (
                        <div className="podium-preview">
                            {topPlayers.map((player, idx) => (
                                <div key={player.user_id || idx} className={`podium-row place-${idx + 1}`}>
                                    <div className="place-medal">
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                    </div>
                                    <img 
                                        src={player.avatar_url || '/mascot.png'} 
                                        alt={player.full_name} 
                                        className="player-podium-avatar"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = '/mascot.png';
                                        }}
                                    />
                                    <div className="player-podium-name">{player.full_name}</div>
                                    <div className="player-podium-points">{player.total_points} xu</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Các Ải Thám Hiểm (Adventure Zones) */}
                <div className="section-title">Vùng Đất Thám Hiểm</div>
                <div className="card-scroller">
                    {adventureZones.map((zone) => (
                        <div className="tour-card cartoon-card" key={zone.id}>
                            <div className="zone-difficulty-badge">
                                {zone.difficultyText}
                            </div>
                            <img src={zone.image} alt={zone.title} className="tour-image" />
                            <h3 className="tour-title">{zone.title}</h3>
                            
                            <div className="zone-rewards-row">
                                <span className="reward-item-badge star">⭐️ {zone.xp}</span>
                                <span className="reward-item-badge coin">🪙 {zone.coins}</span>
                            </div>
                            
                            <div className="tour-footer">
                                <div className="tour-rating">⭐️ {zone.rating}</div>
                                <button onClick={isGuest ? onRequireLogin : onOpenPlan} className="explore-zone-btn squishy-btn yellow">
                                    ĐI <ArrowRight size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mascot Advisor layer */}
            <Mascot message={mascotMessage} />
        </div>
    );
};

export default HomeTravel;
