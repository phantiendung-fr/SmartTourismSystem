import React, { useState, useEffect } from 'react';
import { getTripDetail } from '../../services/tripService';
import './TripDetailScreen.css';

const TripDetailScreen = ({ itineraryId, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tripDetail, setTripDetail] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('access_token');
                const data = await getTripDetail(itineraryId, token);
                setTripDetail(data);
            } catch (err) {
                setError(err.message || "Không thể tải chi tiết chuyến đi");
            } finally {
                setLoading(false);
            }
        };

        if (itineraryId) {
            fetchDetail();
        }
    }, [itineraryId]);

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
    const stopsByDay = (tripDetail.stops || []).reduce((acc, stop) => {
        const day = stop.day_order;
        if (!acc[day]) acc[day] = [];
        acc[day].push(stop);
        return acc;
    }, {});

    return (
        <div className="trip-detail-screen">
            <div className="detail-header">
                <button className="btn-back-icon" onClick={onBack}>⬅️</button>
                <h2>{tripDetail.name || "Chi tiết chuyến đi"}</h2>
            </div>
            
            <div className="trip-summary">
                <div className="summary-item">
                    <span className="icon">💰</span>
                    <div>
                        <small>Ngân sách</small>
                        <strong>{tripDetail.total_budget} {tripDetail.currency}</strong>
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
            </div>

            <div className="trip-itinerary">
                <h3>Lịch trình chi tiết</h3>
                {Object.keys(stopsByDay).sort().map(day => (
                    <div key={day} className="day-group">
                        <div className="day-header">
                            Ngày {day} 
                            <span className="day-date">({stopsByDay[day][0]?.travel_date})</span>
                        </div>
                        <div className="timeline">
                            {stopsByDay[day].sort((a,b) => a.stop_order - b.stop_order).map(stop => (
                                <div key={stop.stop_id} className="timeline-item">
                                    <div className="time-col">
                                        <div className="time">{stop.arrival_time?.slice(0, 5)}</div>
                                        <div className="line"></div>
                                    </div>
                                    <div className="content-col">
                                        <div className="stop-card">
                                            <h4>{stop.location_name}</h4>
                                            <p>Khởi hành: {stop.departure_time?.slice(0, 5)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TripDetailScreen;
