import React, { useState, useEffect } from 'react';
import { Heart, X, MapPin, Compass, AlertTriangle, Check, Sparkles } from 'lucide-react';
import { API_BASE } from '../config/api';
import { storageGet } from '../platform/storage';
import { showAlert } from '../platform/dialog';
import './FindCompanionsScreen.css';
import './SocialFeedScreen.css';

export default function FindCompanionsScreen({ user, onRequireLogin }) {
    const [activeTab, setActiveTab] = useState('discover'); // 'discover' or 'pending'
    const [companions, setCompanions] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [rejectedIds, setRejectedIds] = useState(new Set());
    const [acceptedIds, setAcceptedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const promises = [fetchCompanionsData()];
                if (user) promises.push(fetchPendingData());
                await Promise.all(promises);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user]);

    const fetchCompanionsData = async () => {
        try {
            const token = await storageGet('access_token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await fetch(`${API_BASE}/api/social/companions`, { headers });
            if (res.ok) {
                const data = await res.json();
                setCompanions(data);
            }
        } catch (error) {
            console.error('Error fetching companions:', error);
        }
    };

    const fetchPendingData = async () => {
        try {
            const token = await storageGet('access_token');
            if (!token) return;
            const res = await fetch(`${API_BASE}/api/social/friend-requests/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPendingRequests(data);
            }
        } catch (error) {
            console.error('Error fetching pending friend requests:', error);
        }
    };

    const handleAction = async (id, action) => {
        if (!user) {
            onRequireLogin();
            return;
        }

        if (action === 'accept') {
            setActionLoading(true);
            try {
                const token = await storageGet('access_token');
                const res = await fetch(`${API_BASE}/api/social/friend-request`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ friend_id: id })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'ACCEPTED') {
                        showAlert(`Ghép đôi thành công! Bạn và ${currentCompanion?.name || 'đối phương'} đã trở thành bạn bè.`);
                    } else {
                        showAlert(`Đã gửi lời mời kết bạn đến ${currentCompanion?.name || 'đối phương'}!`);
                    }
                    setAcceptedIds(prev => new Set([...prev, id]));
                }
            } catch (error) {
                console.error('Error sending friend request:', error);
            } finally {
                setActionLoading(false);
            }
        } else {
            // Reject just filters it locally for the session
            setRejectedIds(prev => new Set([...prev, id]));
        }
    };

    const handleRespondRequest = async (requestId, respondAction) => {
        setActionLoading(true);
        try {
            const token = await storageGet('access_token');
            const res = await fetch(`${API_BASE}/api/social/friend-requests/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    friendship_id: requestId,
                    action: respondAction // 'ACCEPT' or 'REJECT'
                })
            });
            if (res.ok) {
                setPendingRequests(prev => prev.filter(r => r.friendship_id !== requestId));
                // Refresh companions list since friendship state changed
                fetchCompanionsData();
            }
        } catch (error) {
            console.error('Error responding to friend request:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const visibleCompanions = companions.filter(
        c => !rejectedIds.has(c.id) && !acceptedIds.has(c.id)
    );
    const currentCompanion = visibleCompanions[0];

    return (
        <div className="find-companions-container">
            {/* Header */}
            <div className="matching-header">
                <div>
                    <h1 className="matching-title">Bạn Đồng Hành</h1>
                    <p className="matching-subtitle">Tìm kiếm các thám hiểm gia có chung điểm đến</p>
                </div>
                <div className="matching-header-icon">
                    <Compass size={24} className="spin-compass" />
                </div>
            </div>

            {/* Custom Tabs */}
            <div className="tabs-row cartoon-card">
                <button 
                    onClick={() => setActiveTab('discover')}
                    className={`tab-btn ${activeTab === 'discover' ? 'active-tab' : ''}`}
                >
                    Khám Phá
                </button>
                <button 
                    onClick={() => setActiveTab('pending')}
                    className={`tab-btn ${activeTab === 'pending' ? 'active-tab' : ''}`}
                >
                    Lời Mời Kết Bạn ({pendingRequests.length})
                </button>
            </div>

            {activeTab === 'discover' ? (
                <div className="discover-area">
                    {loading ? (
                        <div className="match-card cartoon-card skeleton-companion-card">
                            <div className="skeleton-companion-avatar skeleton-pulse" />
                            <div className="skeleton-line skeleton-pulse" style={{ width: '60%', height: '18px' }} />
                            <div className="skeleton-line skeleton-pulse" style={{ width: '40%', height: '14px' }} />
                            <div className="skeleton-line skeleton-pulse" style={{ width: '80%', height: '12px', marginTop: '8px' }} />
                        </div>
                    ) : currentCompanion ? (
                        <div className="match-card cartoon-card">
                            <div className="match-image-wrapper">
                                <img 
                                    src={currentCompanion.avatar} 
                                    alt={currentCompanion.name} 
                                    className="match-avatar" 
                                />
                                <div className="match-percentage-badge">
                                    <Sparkles size={12} style={{ color: '#fff' }} /> {currentCompanion.matchPercentage}% Hợp nhau
                                </div>
                            </div>

                            <div className="match-info">
                                <h2 className="match-name">{currentCompanion.name}, {currentCompanion.age || 22}</h2>
                                <div className="match-location-row">
                                    <MapPin size={14} className="loc-pin-icon" />
                                    <span>{currentCompanion.location}</span>
                                </div>
                                <p className="match-bio">"{currentCompanion.bio}"</p>
                            </div>

                            {/* squishy tinder buttons */}
                            <div className="tinder-actions">
                                <button 
                                    onClick={() => handleAction(currentCompanion.id, 'reject')}
                                    className="squishy-btn red action-swipe-btn"
                                    disabled={actionLoading}
                                >
                                    <X size={24} strokeWidth={3} />
                                </button>
                                <button 
                                    onClick={() => handleAction(currentCompanion.id, 'accept')}
                                    className="squishy-btn green action-swipe-btn"
                                    disabled={actionLoading}
                                >
                                    <Heart size={24} fill="#fff" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-companions cartoon-card text-center">
                            <Compass size={48} className="empty-icon" />
                            <h2>Hết lượt gợi ý!</h2>
                            <p>Hãy quay lại sau để tìm thêm thám hiểm gia mới nhé.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="pending-area">
                    {pendingRequests.length === 0 ? (
                        <div className="empty-pending cartoon-card text-center">
                            <AlertTriangle size={36} className="empty-icon-warning" />
                            <p>Không có lời mời kết bạn nào đang chờ phản hồi.</p>
                        </div>
                    ) : (
                        <div className="pending-list">
                            {pendingRequests.map(req => (
                                <div key={req.friendship_id} className="pending-card cartoon-card">
                                    <div className="pending-card-info">
                                        <img src={req.avatar} alt={req.name} className="pending-avatar" />
                                        <div>
                                            <h4 className="pending-name">{req.name}</h4>
                                            <p className="pending-time">Gửi lúc {new Date(req.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="pending-actions">
                                        <button 
                                            onClick={() => handleRespondRequest(req.friendship_id, 'REJECT')}
                                            className="squishy-btn red respond-btn"
                                            disabled={actionLoading}
                                        >
                                            <X size={14} /> Từ chối
                                        </button>
                                        <button 
                                            onClick={() => handleRespondRequest(req.friendship_id, 'ACCEPT')}
                                            className="squishy-btn green respond-btn"
                                            disabled={actionLoading}
                                        >
                                            <Check size={14} /> Chấp nhận
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
