import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/api';
import { storageGet } from '../platform/storage';
import { Trophy, Crown, AlertTriangle, MapPin, Compass, Star } from 'lucide-react';
import './Leaderboard.css';

const Leaderboard = () => {
    // State quản lý lọc bảng xếp hạng
    const [category, setCategory] = useState('global'); // 'global', 'region', 'tier'
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedTier, setSelectedTier] = useState('Gold');
    
    // State chứa dữ liệu từ API
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [myRank, setMyRank] = useState(null);
    const [availableRegions, setAvailableRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // List các phân hạng (Tiers) có sẵn để làm bộ lọc
    const availableTiers = [
        { name: 'Bronze', label: 'Đồng (Lv 1 - 5)' },
        { name: 'Silver', label: 'Bạc (Lv 6 - 15)' },
        { name: 'Gold', label: 'Vàng (Lv 16 - 30)' },
        { name: 'Platinum', label: 'Bạch Kim (Lv 31 - 50)' },
        { name: 'Diamond', label: 'Kim Cương (Lv 51+)' }
    ];

    // Hàm lấy dữ liệu từ Backend API
    const fetchLeaderboard = async () => {
        setLoading(true);
        setError(null);
        try {
            // Xây dựng Query URL
            let url = `${API_BASE}/api/leaderboard?category=${category}`;
            if (category === 'region' && selectedRegion) {
                url += `&region_name=${encodeURIComponent(selectedRegion)}`;
            } else if (category === 'tier') {
                url += `&tier_name=${selectedTier}`;
            }

            const token = await storageGet('access_token');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url, { headers });
            if (!response.ok) {
                throw new Error('Không thể tải dữ liệu bảng xếp hạng');
            }

            const data = await response.json();
            if (data.status === 'success') {
                setLeaderboardData(data.leaderboard || []);
                setMyRank(data.my_rank);
                setAvailableRegions(data.available_regions || []);
                
                // Thiết lập region mặc định nếu chưa chọn
                if (category === 'region' && !selectedRegion && data.region_name) {
                    setSelectedRegion(data.region_name);
                }
            } else {
                throw new Error(data.message || 'Lỗi không xác định');
            }
        } catch (err) {
            console.error('Lỗi khi tải bảng xếp hạng:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Gọi API mỗi khi category, region hoặc tier thay đổi
    useEffect(() => {
        fetchLeaderboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category, selectedRegion, selectedTier]);

    // Phân tách Top 3 (cho bục vinh quang) và phần còn lại
    const topThree = leaderboardData.slice(0, 3);
    const remainingUsers = leaderboardData.slice(3);

    // Xác định bục vinh quang theo thứ tự hiển thị: Hạng 2 (Trái) - Hạng 1 (Giữa) - Hạng 3 (Phải)
    const firstPlace = topThree.find(u => u.rank === 1);
    const secondPlace = topThree.find(u => u.rank === 2);
    const thirdPlace = topThree.find(u => u.rank === 3);

    // Hàm lấy ảnh avatar mặc định bằng chữ cái đầu nếu không có ảnh
    const getAvatarSrc = (user) => {
        if (user.avatar_url) return user.avatar_url;
        // Sử dụng ảnh placeholder đẹp mắt dựa trên tên
        return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.full_name)}`;
    };

    return (
        <div className="leaderboard-container">
            {/* Header: Tiêu đề & Chọn danh mục */}
            <div className="leaderboard-header">
                <h2 className="leaderboard-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={22} style={{ color: '#f1c40f' }} /> Bảng Xếp Hạng Check-in
                </h2>
                <div className="category-tabs">
                    <button 
                        className={`tab-btn ${category === 'global' ? 'active' : ''}`}
                        onClick={() => { setCategory('global'); setSelectedRegion(''); }}
                    >
                        Toàn cầu
                    </button>
                    <button 
                        className={`tab-btn ${category === 'region' ? 'active' : ''}`}
                        onClick={() => setCategory('region')}
                    >
                        Khu vực
                    </button>
                    <button 
                        className={`tab-btn ${category === 'tier' ? 'active' : ''}`}
                        onClick={() => setCategory('tier')}
                    >
                        Phân hạng
                    </button>
                </div>
            </div>

            {/* Bộ lọc mở rộng dựa trên Tab được chọn */}
            {category === 'region' && (
                <div className="filter-container">
                    <span className="filter-label">Chọn khu vực:</span>
                    <select 
                        className="filter-select"
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                    >
                        {availableRegions.map((reg) => (
                            <option key={reg} value={reg}>{reg}</option>
                        ))}
                    </select>
                </div>
            )}

            {category === 'tier' && (
                <div className="filter-container">
                    <span className="filter-label">Chọn phân hạng:</span>
                    <select 
                        className="filter-select"
                        value={selectedTier}
                        onChange={(e) => setSelectedTier(e.target.value)}
                    >
                        {availableTiers.map((t) => (
                            <option key={t.name} value={t.name}>{t.label}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Trạng thái Loading */}
            {loading && (
                <div className="loaderboard-loading">
                    <div className="spinner"></div>
                    <p>Đang tính toán thứ hạng...</p>
                </div>
            )}

            {/* Lỗi tải dữ liệu */}
            {error && !loading && (
                <div className="leaderboard-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <AlertTriangle size={32} style={{ color: '#e67e22', marginBottom: '8px' }} />
                    <p>{error}</p>
                    <button onClick={fetchLeaderboard} style={{ marginTop: '10px', padding: '8px 16px', background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Thử lại</button>
                </div>
            )}

            {/* Danh sách bảng xếp hạng khi đã load xong */}
            {!loading && !error && (
                <>
                    {leaderboardData.length === 0 ? (
                        <div className="leaderboard-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Compass size={40} style={{ color: '#a4b0be', marginBottom: '8px' }} />
                            <p>Chưa có ai check-in tại danh mục này.</p>
                            <p style={{ fontSize: '12px', color: '#a4b0be', marginTop: '5px' }}>Bắt đầu đi du lịch để tích lũy điểm thưởng nhé!</p>
                        </div>
                    ) : (
                        <>
                            {/* Bục vinh quang (Podium) cho Top 3 người dẫn đầu */}
                            {topThree.length > 0 && (
                                <div className="podium-container">
                                    {/* HẠNG 2 (BÊN TRÁI) */}
                                    {secondPlace ? (
                                        <div className="podium-item second-place">
                                            <div className="podium-avatar-wrapper">
                                                <img src={getAvatarSrc(secondPlace)} alt={secondPlace.full_name} className="podium-avatar" />
                                                <span className="podium-rank-badge">2</span>
                                            </div>
                                            <div className="podium-column">
                                                <span className="podium-name">{secondPlace.full_name}</span>
                                                <span className="podium-pts">{secondPlace.total_points} pts</span>
                                            </div>
                                        </div>
                                    ) : <div style={{ width: '31%' }}></div>}

                                    {/* HẠNG 1 (Ở GIỮA) */}
                                    {firstPlace ? (
                                        <div className="podium-item first-place">
                                            <div className="podium-avatar-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Crown size={22} style={{ color: '#f1c40f', marginBottom: '2px' }} />
                                                <img src={getAvatarSrc(firstPlace)} alt={firstPlace.full_name} className="podium-avatar" />
                                                <span className="podium-rank-badge">1</span>
                                            </div>
                                            <div className="podium-column">
                                                <span className="podium-name">{firstPlace.full_name}</span>
                                                <span className="podium-pts">{firstPlace.total_points} pts</span>
                                            </div>
                                        </div>
                                    ) : <div style={{ width: '31%' }}></div>}

                                    {/* HẠNG 3 (BÊN PHẢI) */}
                                    {thirdPlace ? (
                                        <div className="podium-item third-place">
                                            <div className="podium-avatar-wrapper">
                                                <img src={getAvatarSrc(thirdPlace)} alt={thirdPlace.full_name} className="podium-avatar" />
                                                <span className="podium-rank-badge">3</span>
                                            </div>
                                            <div className="podium-column">
                                                <span className="podium-name">{thirdPlace.full_name}</span>
                                                <span className="podium-pts">{thirdPlace.total_points} pts</span>
                                            </div>
                                        </div>
                                    ) : <div style={{ width: '31%' }}></div>}
                                </div>
                            )}

                            {/* Danh sách xếp hạng từ Hạng 4 trở xuống */}
                            {remainingUsers.length > 0 && (
                                <div className="leaderboard-list">
                                    {remainingUsers.map((item) => (
                                        <div className="leaderboard-item" key={item.user_id}>
                                            <div className="item-rank">{item.rank}</div>
                                            <div className="item-avatar-wrapper">
                                                <img src={getAvatarSrc(item)} alt={item.full_name} className="item-avatar" />
                                            </div>
                                            <div className="item-details">
                                                <span className="item-name">{item.full_name}</span>
                                                <div className="item-meta">
                                                    <span className="tier-badge" style={{ backgroundColor: `${item.tier_color}22`, color: item.tier_color, border: `1px solid ${item.tier_color}` }}>
                                                        {item.tier_vi}
                                                    </span>
                                                    <span>•</span>
                                                    <span><Star size={12} style={{ display: 'inline' }} /> Lv {item.level}</span>
                                                    <span>•</span>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><MapPin size={12} /> {item.base_location}</span>
                                                </div>
                                            </div>
                                            <div className="item-points">
                                                <span className="pts-value">{item.total_points}</span>
                                                <span className="pts-label">pts</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Card hiển thị thứ hạng của tôi (Cố định ở dưới cùng) */}
            {!loading && myRank && (
                <div className="my-rank-sticky-card">
                    <div className="my-rank-left">
                        <div className="my-rank-number">
                            {myRank.rank}
                        </div>
                        <img 
                            src={getAvatarSrc(myRank)} 
                            alt="My avatar" 
                            className="my-rank-avatar" 
                        />
                        <div>
                            <h4 className="my-rank-name">{myRank.full_name} (Bạn)</h4>
                            <div className="my-rank-tier">
                                <span>{myRank.tier_vi}</span>
                                <span>•</span>
                                <span><Star size={12} style={{ display: 'inline' }} /> Cấp {myRank.level}</span>
                                <span>•</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><MapPin size={12} /> {myRank.base_location}</span>
                            </div>
                        </div>
                    </div>
                    <div className="my-rank-points">
                        <div className="my-rank-pts-value">{myRank.total_points}</div>
                        <div className="my-rank-pts-lbl">pts</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
