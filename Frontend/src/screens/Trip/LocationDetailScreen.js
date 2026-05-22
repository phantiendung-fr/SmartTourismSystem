import React from 'react';
import './LocationDetailScreen.css';

const LocationDetailScreen = ({ location, onBack }) => {
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

                <div className="section">
                    <h3 className="section-title">Nearby Luxuries</h3>
                    <div className="luxuries-list">
                        <div className="luxury-item">
                            <div className="lux-icon"><i className="fas fa-utensils"></i></div>
                            <span>Food</span>
                        </div>
                        <div className="luxury-item active">
                            <div className="lux-icon"><i className="fas fa-bed"></i></div>
                            <span>Hotels</span>
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
