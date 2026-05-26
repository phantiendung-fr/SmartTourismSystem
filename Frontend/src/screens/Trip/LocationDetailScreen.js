import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';
import './LocationDetailScreen.css';

const LocationDetailScreen = ({ location, onBack }) => {
    const [ambassadors, setAmbassadors] = useState([]);
    const [loadingAmbassadors, setLoadingAmbassadors] = useState(false);

    useEffect(() => {
        if (location?.location_id) {
            const fetchAmbassadors = async () => {
                setLoadingAmbassadors(true);
                try {
                    const res = await fetch(`${API_BASE}/api/social/locations/${location.location_id}/ambassador`);
                    if (res.ok) {
                        const data = await res.json();
                        setAmbassadors(data);
                    }
                } catch (err) {
                    console.error("Lỗi khi tải Đại sứ địa phương:", err);
                } finally {
                    setLoadingAmbassadors(false);
                }
            };
            fetchAmbassadors();
        }
    }, [location?.location_id]);

    // Nếu location bị null (do lỗi nào đó), trở về an toàn
    if (!location) {
        return (
            <div className="location-detail-container">
                <button onClick={onBack}>Quay lại</button>
                <p>Không có dữ liệu địa điểm</p>
            </div>
        );
    }

    // Mock data dựa trên thiết kế
    const mockImage = "https://images.unsplash.com/photo-1542640244-7e672d6cb466?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; // Hình ảnh cầu Nine Arches Bridge hoặc tương tự
    const mockRating = "4.5";
    const mockLocation = location.address || "Sri Lanka"; // Fallback
    const mockDesc = "The Nine Arch Bridge also called the Bridge in the Sky, is a viaduct bridge in Sri Lanka and one of the best examples of colonial-era railway construction in the country.";

    return (
        <div className="location-detail-container">
            {/* Image Banner */}
            <div className="detail-banner" style={{ backgroundImage: `url(${location.image_url || mockImage})` }}>
                <div className="banner-overlay">
                    <button className="banner-btn back-btn" onClick={onBack}>
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <button className="banner-btn fav-btn">
                        <i className="far fa-heart"></i>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="detail-content">
                <div className="header-info">
                    <h2 className="loc-title">{location.location_name}</h2>
                    <div className="loc-meta">
                        <span className="loc-address">
                            <i className="fas fa-map-marker-alt" style={{ color: '#0abde3', marginRight: '5px' }}></i>
                            {mockLocation}
                        </span>
                        <span className="loc-rating">
                            <span style={{ color: '#f39c12', marginRight: '4px' }}>▲</span> 
                            {location.score ? Number(location.score).toFixed(1) : mockRating}
                        </span>
                    </div>
                </div>

                <div className="desc-section">
                    <p className="loc-desc">
                        {location.description || mockDesc}
                        <span className="read-more"> .. Read more</span>
                    </p>
                </div>

                <button className="btn-directions">
                    <i className="fas fa-directions" style={{ marginRight: '8px' }}></i> Directions
                </button>

                {/* Local Ambassadors Section */}
                <div className="section" style={{
                    border: '2.5px solid #2c3e50',
                    borderRadius: '16px',
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    boxShadow: '0 4px 0 #2c3e50',
                    marginBottom: '20px'
                }}>
                    <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#2c3e50' }}>
                        👑 Đại sứ địa phương
                    </h3>
                    {loadingAmbassadors ? (
                        <div style={{ fontSize: '12px', color: '#7f8c8d', textAlign: 'center', padding: '10px' }}>Đang tải danh sách Đại sứ...</div>
                    ) : ambassadors.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '12px', color: '#747d8c', fontSize: '12px', fontWeight: 'bold' }}>
                            <span>Chưa có Đại sứ địa phương ở đây! 🗺️</span>
                            <p style={{ fontSize: '10px', color: '#95a5a6', fontWeight: 'normal', marginTop: '4px' }}>
                                Hãy là người check-in đầu tiên để chiếm lĩnh danh hiệu này!
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {ambassadors.map((amb, index) => {
                                const medalEmojis = ['🥇', '🥈', '🥉', '🎖️', '🎖️'];
                                return (
                                    <div 
                                        key={amb.user_id} 
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 10px',
                                            backgroundColor: '#ffffff',
                                            border: '2px solid #2c3e50',
                                            borderRadius: '12px',
                                            boxShadow: '0 2px 0 #2c3e50'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{medalEmojis[index] || '🎖️'}</span>
                                            <img 
                                                src={amb.avatar} 
                                                alt={amb.name} 
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    border: '1.5px solid #2c3e50'
                                                }}
                                            />
                                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#2c3e50' }}>{amb.name}</span>
                                        </div>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            color: '#3498db',
                                            backgroundColor: '#eaf2f8',
                                            padding: '3px 8px',
                                            borderRadius: '8px',
                                            border: '1px solid #a9cce3'
                                        }}>
                                            {amb.checkin_count} check-in
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="section">
                    <h3 className="section-title">Nearby Luxuries</h3>
                    <div className="luxuries-list">
                        <div className="luxury-item">
                            <div className="lux-icon"><i className="fas fa-utensils"></i></div>
                            <span>Food</span>
                        </div>
                        <div className="luxury-item active">
                            <div className="luxury-item active">
                                <div className="lux-icon"><i className="fas fa-bed"></i></div>
                                <span>Hotels</span>
                            </div>
                        </div>
                        <div className="luxury-item">
                            <div className="lux-icon"><i className="fas fa-coffee"></i></div>
                            <span>Coffee</span>
                        </div>
                    </div>
                </div>

                <div className="section" style={{ paddingBottom: '80px' }}>
                    <h3 className="section-title">Rating & Reviews</h3>
                    <div className="review-card">
                        <div className="review-header">
                            <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=50&q=80" alt="User" className="reviewer-avatar" />
                            <div className="reviewer-info">
                                <h4 className="reviewer-name">Courtney Henry</h4>
                                <div className="review-meta">
                                    <span className="stars">★★★★★</span>
                                    <span className="review-time">2 mins ago</span>
                                </div>
                            </div>
                            <button className="btn-options"><i className="fas fa-ellipsis-v"></i></button>
                        </div>
                        <p className="review-text">
                            Consequat velit qui adipisicing sunt do reprehenderit ad laborum tempor ullamco exercitation. Ullamco
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Fixed Button */}
            <div className="bottom-fixed-bar">
                <button className="btn-write-review">Write Review</button>
            </div>
        </div>
    );
};

export default LocationDetailScreen;
