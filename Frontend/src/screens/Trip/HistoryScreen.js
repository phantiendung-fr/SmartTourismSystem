import React, { useEffect, useState } from 'react';
import { getTripHistory } from '../../services/tripService';
import './HistoryScreen.css';

const HistoryScreen = ({ onBack }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                const data = await getTripHistory(token);
                setHistory(data);
            }
            setLoading(false);
        };
        fetchHistory();
    }, []);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <div className="history-container">
            <div className="history-header">
                <button className="back-btn" onClick={onBack}>
                    <i className="fas fa-chevron-left"></i>
                </button>
                <h1>Lịch sử hành trình</h1>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Đang tải lịch sử...</p>
                </div>
            ) : history.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-route"></i>
                    <p>Bạn chưa có hành trình nào hoàn thành.</p>
                </div>
            ) : (
                <div className="history-list">
                    {history.map((item) => (
                        <div key={item.itinerary_id} className="history-card">
                            <div className="card-status" data-status={item.status}>
                                {item.status === 'COMPLETED' ? 'Hoàn thành' : 'Đã hủy'}
                            </div>
                            <div className="card-info">
                                <h3>{item.name || 'Hành trình không tên'}</h3>
                                <p className="card-date">
                                    <i className="far fa-calendar-alt"></i> {formatDate(item.create_at)}
                                </p>
                                <div className="card-stats">
                                    <span>
                                        <i className="fas fa-map-marker-alt"></i> {item.total_distance} km
                                    </span>
                                    <span>
                                        <i className="fas fa-wallet"></i> {new Intl.NumberFormat('vi-VN').format(item.total_budget)} đ
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistoryScreen;