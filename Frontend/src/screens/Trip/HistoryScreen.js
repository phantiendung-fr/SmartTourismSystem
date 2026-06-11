import React, { useEffect, useState } from 'react';
import { getTripHistory } from '../../services/tripService';
import { storageGet } from '../../platform/storage';
import { 
    ArrowLeft, Filter, Calendar, Search, CheckCircle2, 
    XCircle, RefreshCw, Wallet
} from 'lucide-react';
import HistoryDetail from './HistoryDetail';
import './HistoryScreen.css';

export const parseTripDate = (dateValue) => {
    if (!dateValue) return null;

    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const toLocalDateInputValue = (dateValue) => {
    const date = parseTripDate(dateValue);
    if (!date) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDateInputValue = (value) => {
    if (!value) return 'dd/mm/yyyy';

    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
};

const HistoryScreen = ({ onBack }) => {
    const [history, setHistory] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTripId, setSelectedTripId] = useState(null);

    // States cho bộ lọc
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = await storageGet('access_token');
                if (token) {
                    const data = await getTripHistory(token);
                    const historyItems = Array.isArray(data) ? data : [];
                    setHistory(historyItems);
                    setFilteredHistory(historyItems);
                }
            } catch {
                setHistory([]);
                setFilteredHistory([]);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    // Logic lọc dữ liệu
    useEffect(() => {
        let result = [...history];

        if (filterStatus !== 'ALL') {
            if (filterStatus === 'ONGOING') {
                result = result.filter(item => item.status === 'DRAFT' || item.status === 'CONFIRMED');
            } else {
                result = result.filter(item => item.status === filterStatus);
            }
        }

        if (filterDate) {
            result = result.filter(item => toLocalDateInputValue(item.create_at) === filterDate);
        }

        setFilteredHistory(result);
    }, [filterStatus, filterDate, history]);

    const formatDate = (dateString) => {
        const date = parseTripDate(dateString);
        if (!date) return 'Không rõ ngày';

        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (selectedTripId) {
        return <HistoryDetail
            itineraryId={selectedTripId}
            onBack={() => setSelectedTripId(null)}
        />;
    }

    return (
        <div className="history-container">
            <div className="history-header">
                <button className="history-back-btn" onClick={onBack} aria-label="Quay lại" title="Quay lại">
                    <ArrowLeft size={20} />
                </button>
                <h1>Lịch sử hành trình</h1>
            </div>

            {/* Thanh bộ lọc mới */}
            <div className="filter-bar">
                <div className="filter-group">
                    <label htmlFor="history-status-filter" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Filter size={16} /> Trạng thái
                    </label>
                    <select
                        id="history-status-filter"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="filter-select"
                    >
                        <option value="ALL">Tất cả</option>
                        <option value="ONGOING">Đang diễn ra</option>
                        <option value="COMPLETED">Hoàn thành</option>
                        <option value="CANCELLED">Đã hủy</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="history-date-filter" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={16} /> Chọn ngày
                    </label>
                    <div className="date-input-wrapper">
                        <span className="compact-date-value">{formatDateInputValue(filterDate)}</span>
                        <input
                            id="history-date-filter"
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="filter-date"
                        />
                        {filterDate && (
                            <button
                                type="button"
                                className="clear-date"
                                onClick={() => setFilterDate('')}
                                aria-label="Xóa ngày đã chọn"
                            >
                                &times;
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Đang tải lịch sử...</p>
                </div>
            ) : filteredHistory.length === 0 ? (
                <div className="empty-state">
                    <Search size={32} style={{ marginBottom: '10px', color: '#a4b0be' }} />
                    <p>Không tìm thấy hành trình nào khớp với bộ lọc.</p>
                    {(filterStatus !== 'ALL' || filterDate !== '') && (
                        <button className="reset-filter-btn" onClick={() => { setFilterStatus('ALL'); setFilterDate(''); }}>
                            Xóa bộ lọc
                        </button>
                    )}
                </div>
            ) : (
                <div className="history-list">
                    {filteredHistory.map((item) => (
                        <div
                            key={item.itinerary_id}
                            className="history-card"
                            onClick={() => setSelectedTripId(item.itinerary_id)}
                        >
                            <div className="card-status" data-status={item.status === 'DRAFT' || item.status === 'CONFIRMED' ? 'ONGOING' : item.status} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {item.status === 'COMPLETED' ? (
                                    <CheckCircle2 size={14} />
                                ) : item.status === 'CANCELLED' ? (
                                    <XCircle size={14} />
                                ) : (
                                    <RefreshCw size={14} />
                                )}
                            </div>
                            <div className="card-info">
                                <h3>{item.name || 'Hành trình không tên'}</h3>
                                <p className="card-date" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Calendar size={14} /> {formatDate(item.create_at)}
                                </p>
                                <div className="card-stats">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Wallet size={14} /> {new Intl.NumberFormat('vi-VN').format(item.total_budget)} đ
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
