import React, { useState } from 'react';
import EnterpriseDashboard from './EnterpriseDashboard';
import './EnterpriseTabs.css';

const EnterpriseTabs = ({ user, onLogout, onOpenLocationRegister, onOpenProfileEdit }) => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const mockServices = [
        { id: 1, name: 'Khách sạn MTP Luxury', status: 'ACTIVE', views: 850 },
        { id: 2, name: 'Tour Dĩ An - Bình Dương', status: 'PENDING', views: 0 },
    ];

    return (
        <div className="enterprise-layout">
            <div className="enterprise-content">
                {activeTab === 'dashboard' && (
                    <EnterpriseDashboard user={user} />
                )}

                {activeTab === 'services' && (
                    <section className="enterprise-services">
                        <header className="enterprise-services-header">
                            <h2>Dịch vụ của bạn</h2>
                            <button type="button" onClick={onOpenLocationRegister}>
                                + Đăng mới
                            </button>
                        </header>

                        <div className="enterprise-services-list">
                            {mockServices.map((service) => (
                                <article key={service.id} className="enterprise-service-card">
                                    <div className="enterprise-service-top">
                                        <h3>{service.name}</h3>
                                        <span className={service.status === 'ACTIVE' ? 'service-badge-active' : 'service-badge-pending'}>
                                            {service.status === 'ACTIVE' ? 'ĐANG HIỂN THỊ' : 'CHỜ DUYỆT'}
                                        </span>
                                    </div>
                                    <div className="enterprise-service-bottom">
                                        <span>👁️ {service.views} lượt xem</span>
                                        <button type="button">✏️ Sửa</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <nav className="enterprise-bottom-nav" aria-label="Enterprise navigation">
                <button
                    type="button"
                    className={activeTab === 'dashboard' ? 'active' : ''}
                    onClick={() => setActiveTab('dashboard')}
                >
                    <span>📊</span>
                    <small>Tổng quan</small>
                </button>
                <button
                    type="button"
                    className={activeTab === 'services' ? 'active' : ''}
                    onClick={() => setActiveTab('services')}
                >
                    <span>🛍️</span>
                    <small>Quản lý</small>
                </button>
                <button type="button" onClick={onOpenProfileEdit}>
                    <span>⚙️</span>
                    <small>Cài đặt</small>
                </button>
                <button type="button" className="logout" onClick={onLogout}>
                    <span>🚪</span>
                    <small>Đăng xuất</small>
                </button>
            </nav>
        </div>
    );
};

export default EnterpriseTabs;
