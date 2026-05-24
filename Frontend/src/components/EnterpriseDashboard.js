import React from 'react';
import './EnterpriseDashboard.css';

const EnterpriseDashboard = ({ user }) => {
    const displayName = user?.business_name || user?.full_name || 'Doanh nghiệp';
    const mockStats = {
        views: '1,240',
        rating: '4.8',
        checkins: 342,
        revenue: '15.5M',
    };

    return (
        <div className="enterprise-dashboard">
            <div className="enterprise-dashboard-header">
                <div>
                    <h2>Tổng quan</h2>
                    <p>
                        Xin chào, <strong>{displayName}</strong>
                    </p>
                </div>
                <span className="enterprise-verified-badge">✅ Đã xác minh</span>
            </div>

            <div className="enterprise-stats-grid">
                <div className="enterprise-stat-card">
                    <span className="enterprise-stat-icon">👁️</span>
                    <h3>{mockStats.views}</h3>
                    <p>Lượt xem dịch vụ</p>
                </div>
                <div className="enterprise-stat-card">
                    <span className="enterprise-stat-icon">⭐</span>
                    <h3>{mockStats.rating}/5</h3>
                    <p>Điểm đánh giá TB</p>
                </div>
                <div className="enterprise-stat-card">
                    <span className="enterprise-stat-icon">📍</span>
                    <h3>{mockStats.checkins}</h3>
                    <p>Lượt Check-in</p>
                </div>
                <div className="enterprise-stat-card">
                    <span className="enterprise-stat-icon">💰</span>
                    <h3>{mockStats.revenue}</h3>
                    <p>Doanh thu ước tính</p>
                </div>
            </div>

            <section className="enterprise-promo-banner">
                <h3>Tăng doanh thu x3!</h3>
                <p>
                    Tiếp cận thêm hàng ngàn khách du lịch bằng cách đẩy dịch vụ của bạn lên Trang chủ khám phá.
                </p>
                <button type="button">Tạo chiến dịch quảng cáo</button>
            </section>

            <section className="enterprise-activity-section">
                <div className="enterprise-activity-header">
                    <h3>Tương tác mới nhất</h3>
                    <span>Xem tất cả</span>
                </div>

                <div className="enterprise-activity-list">
                    <article className="enterprise-activity-item">
                        <div className="enterprise-avatar enterprise-avatar-blue">N</div>
                        <div className="enterprise-activity-content">
                            <p className="enterprise-activity-name">Nam Dương</p>
                            <p className="enterprise-activity-desc">Vừa check-in tại <strong>Khách sạn MTP</strong></p>
                        </div>
                        <time>10p trước</time>
                    </article>

                    <article className="enterprise-activity-item">
                        <div className="enterprise-avatar enterprise-avatar-purple">H</div>
                        <div className="enterprise-activity-content">
                            <p className="enterprise-activity-name">Hải Tú</p>
                            <p className="enterprise-activity-desc">Đã để lại đánh giá 5 sao</p>
                        </div>
                        <time>1 giờ trước</time>
                    </article>
                </div>
            </section>
        </div>
    );
};

export default EnterpriseDashboard;
