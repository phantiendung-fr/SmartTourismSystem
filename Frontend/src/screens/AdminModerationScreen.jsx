import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Check, X, ShieldAlert, AlertTriangle, ArrowLeft, Search, FileText, User, Mail, Phone, Calendar, TrendingUp, Gift, Users, Trash2, Award } from 'lucide-react';
import { API_BASE } from '../config/api';
import { storageGet } from '../platform/storage';
import './AdminModerationScreen.css';

export default function AdminModerationScreen({ user, onBack }) {
    const [activeTab, setActiveTab] = useState('enterprise'); // 'enterprise', 'location', 'users', 'stats', 'reports'
    
    // States for Enterprise Moderation
    const [pendingEnterprises, setPendingEnterprises] = useState([]);
    const [selectedEnterprise, setSelectedEnterprise] = useState(null);
    
    // States for Location Moderation
    const [locationSubmissions, setLocationSubmissions] = useState([]);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [submissionDetail, setSubmissionDetail] = useState(null);
    
    // States for User management
    const [usersList, setUsersList] = useState([]);
    const [grantAmount, setGrantAmount] = useState('');
    const [grantTargetId, setGrantTargetId] = useState(null);

    // States for Stats
    const [stats, setStats] = useState(null);

    // States for Reports
    const [reports, setReports] = useState([]);

    // General States
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectTarget, setRejectTarget] = useState(null); // { type: 'enterprise'|'location', id: string }

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await storageGet('access_token');
            if (!token) return;
            const headers = { Authorization: `Bearer ${token}` };

            if (activeTab === 'enterprise') {
                const res = await fetch(`${API_BASE}/api/admin/enterprises/pending`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setPendingEnterprises(data);
                }
                setSelectedEnterprise(null);
            } else if (activeTab === 'location') {
                const res = await fetch(`${API_BASE}/api/admin/location-submissions`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setLocationSubmissions(data);
                }
                setSelectedSubmission(null);
                setSubmissionDetail(null);
            } else if (activeTab === 'users') {
                const res = await fetch(`${API_BASE}/api/admin/users`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setUsersList(data);
                }
            } else if (activeTab === 'stats') {
                const res = await fetch(`${API_BASE}/api/admin/stats`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } else if (activeTab === 'reports') {
                const res = await fetch(`${API_BASE}/api/admin/social/reports`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setReports(data);
                }
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubmissionDetail = async (subId) => {
        setLoading(true);
        try {
            const token = await storageGet('access_token');
            const res = await fetch(`${API_BASE}/api/admin/location-submissions/${subId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSubmissionDetail(data);
            }
        } catch (error) {
            console.error('Error fetching submission detail:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveEnterprise = async (entId) => {
        if (!window.confirm('Xác nhận duyệt tài khoản doanh nghiệp này?')) return;
        setActionLoading(true);
        try {
            const token = await storageGet('access_token');
            const res = await fetch(`${API_BASE}/api/admin/enterprises/${entId}/approve`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Đã phê duyệt tài khoản doanh nghiệp thành công.');
                fetchData();
            }
        } catch (error) {
            console.error('Error approving enterprise:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectEnterprise = (entId) => {
        setRejectTarget({ type: 'enterprise', id: entId });
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleApproveLocation = async (subId) => {
        if (!window.confirm('Xác nhận phê duyệt đề xuất địa điểm này?')) return;
        setActionLoading(true);
        try {
            const token = await storageGet('access_token');
            const res = await fetch(`${API_BASE}/api/admin/location-submissions/${subId}/approve`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Đã phê duyệt địa điểm thành công.');
                fetchData();
            }
        } catch (error) {
            console.error('Error approving location:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectLocation = (subId) => {
        setRejectTarget({ type: 'location', id: subId });
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        if (!rejectReason.trim() || !rejectTarget) return;

        setActionLoading(true);
        try {
            const token = await storageGet('access_token');
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            };

            let url = '';
            if (rejectTarget.type === 'enterprise') {
                url = `${API_BASE}/api/admin/enterprises/${rejectTarget.id}/reject`;
            } else {
                url = `${API_BASE}/api/admin/location-submissions/${rejectTarget.id}/reject`;
            }

            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ reason: rejectReason })
            });

            if (res.ok) {
                alert('Từ chối yêu cầu thành công.');
                setShowRejectModal(false);
                setRejectTarget(null);
                setRejectReason('');
                fetchData();
            }
        } catch (error) {
            console.error('Error rejecting target:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleGrantPoints = async (e) => {
        e.preventDefault();
        if (!grantAmount || !grantTargetId) return;

        setActionLoading(true);
        try {
            const token = await storageGet('access_token');
            const res = await fetch(`${API_BASE}/api/admin/grant-points`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: grantTargetId,
                    amount: parseInt(grantAmount)
                })
            });
            if (res.ok) {
                alert(`Đã tặng ${grantAmount} điểm thành công!`);
                setGrantAmount('');
                setGrantTargetId(null);
                fetchData();
            }
        } catch (error) {
            console.error('Error granting points:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Xác nhận xóa bài viết vi phạm tiêu chuẩn cộng đồng?')) return;
        try {
            const token = await storageGet('access_token');
            const res = await fetch(`${API_BASE}/api/admin/social/posts/${postId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Đã xóa bài viết vi phạm.');
                fetchData();
            }
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    };

    const handleResetRanks = async () => {
        if (!window.confirm('CẢNH BÁO CỰC KỲ NGUY HIỂM: Bạn có muốn xóa sạch toàn bộ điểm số và rank xếp hạng của tất cả người dùng không?')) return;
        try {
            const token = await storageGet('access_token');
            const res = await fetch(`${API_BASE}/api/admin/reset-ranks`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Đã đặt lại toàn bộ hệ thống xếp hạng.');
                fetchData();
            }
        } catch (error) {
            console.error('Error resetting ranks:', error);
        }
    };

    return (
        <div className="admin-moderation-container">
            {/* Header */}
            <div className="admin-header-row">
                <button className="back-btn cartoon-card" onClick={onBack}>
                    <ArrowLeft size={16} />
                </button>
                <div className="admin-title-col">
                    <h1 className="admin-main-title">Bảng Quản Trị</h1>
                    <span className="admin-role-badge">Admin Mode</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="admin-tabs-row cartoon-card">
                <button className={`admin-tab-btn ${activeTab === 'enterprise' ? 'active' : ''}`} onClick={() => setActiveTab('enterprise')}>Doanh Nghiệp</button>
                <button className={`admin-tab-btn ${activeTab === 'location' ? 'active' : ''}`} onClick={() => setActiveTab('location')}>Địa Điểm</button>
                <button className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Thành Viên</button>
                <button className={`admin-tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Thống Kê</button>
                <button className={`admin-tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>Báo Cáo</button>
            </div>

            {/* Content Body */}
            <div className="admin-content-body">
                {loading ? (
                    <div className="admin-loading">
                        <div className="loader-hud"></div>
                        <p>Đang tải dữ liệu kiểm duyệt...</p>
                    </div>
                ) : activeTab === 'enterprise' ? (
                    // Enterprise Approval
                    selectedEnterprise ? (
                        <div className="details-view cartoon-card">
                            <div className="details-header">
                                <button className="btn-close-details" onClick={() => setSelectedEnterprise(null)}>✕ Đóng</button>
                                <h3>Thông Tin Đăng Ký Doanh Nghiệp</h3>
                            </div>
                            <div className="details-info-grid">
                                <div className="info-item"><span className="info-label">Tên cơ sở kinh doanh:</span> <strong>{selectedEnterprise.business_name}</strong></div>
                                <div className="info-item"><span className="info-label">Người đại diện liên hệ:</span> <strong>{selectedEnterprise.contact_person}</strong></div>
                                <div className="info-item"><span className="info-label">Email liên hệ:</span> <strong>{selectedEnterprise.contact_email}</strong></div>
                                <div className="info-item"><span className="info-label">Số điện thoại:</span> <strong>{selectedEnterprise.contact_phone}</strong></div>
                                <div className="info-item"><span className="info-label">Ngày gửi đăng ký:</span> <strong>{new Date(selectedEnterprise.created_at).toLocaleDateString('vi-VN')}</strong></div>
                            </div>
                            <div className="details-actions">
                                <button className="squishy-btn red" onClick={() => handleRejectEnterprise(selectedEnterprise.enterprise_id)} disabled={actionLoading}>Từ Chối</button>
                                <button className="squishy-btn green" onClick={() => handleApproveEnterprise(selectedEnterprise.enterprise_id)} disabled={actionLoading}>Phê Duyệt</button>
                            </div>
                        </div>
                    ) : pendingEnterprises.length === 0 ? (
                        <div className="empty-panel cartoon-card">
                            <Check size={48} className="empty-check-icon" />
                            <p>Không có hồ sơ doanh nghiệp nào chờ phê duyệt.</p>
                        </div>
                    ) : (
                        <div className="admin-list">
                            {pendingEnterprises.map(ent => (
                                <div key={ent.enterprise_id} className="list-item-card cartoon-card" onClick={() => setSelectedEnterprise(ent)}>
                                    <div className="list-item-info">
                                        <Building2 size={24} className="list-item-icon" />
                                        <div>
                                            <h4>{ent.business_name}</h4>
                                            <p>Người đại diện: {ent.contact_person}</p>
                                        </div>
                                    </div>
                                    <span className="arrow">›</span>
                                </div>
                            ))}
                        </div>
                    )
                ) : activeTab === 'location' ? (
                    // Location Submissions
                    selectedSubmission && submissionDetail ? (
                        <div className="details-view cartoon-card">
                            <div className="details-header">
                                <button className="btn-close-details" onClick={() => { setSelectedSubmission(null); setSubmissionDetail(null); }}>✕ Đóng</button>
                                <h3>Đề Xuất Địa Điểm</h3>
                            </div>
                            
                            {submissionDetail.duplicate_warnings && submissionDetail.duplicate_warnings.length > 0 && (
                                <div className="duplicate-warnings-box cartoon-card">
                                    <h4 className="warning-title"><AlertTriangle size={14} /> Cảnh báo địa điểm tương tự:</h4>
                                    {submissionDetail.duplicate_warnings.map((dup, i) => (
                                        <p key={i} className="warning-text">• <strong>{dup.location_name}</strong> - {dup.reasons.join(', ')}</p>
                                    ))}
                                </div>
                            )}

                            <div className="details-info-grid">
                                <div className="info-item"><span className="info-label">Tên địa điểm đề xuất:</span> <strong>{submissionDetail.pending_data.location_name}</strong></div>
                                <div className="info-item"><span className="info-label">Địa chỉ:</span> <strong>{submissionDetail.pending_data.address || 'Việt Nam'}</strong></div>
                                <div className="info-item"><span className="info-label">Tọa độ:</span> <strong>Lat: {submissionDetail.pending_data.latitude}, Lon: {submissionDetail.pending_data.longitude}</strong></div>
                                <div className="info-item"><span className="info-label">Loại đề xuất:</span> <strong className="tag-green">{submissionDetail.type}</strong></div>
                                <div className="info-item"><span className="info-label">Người đề xuất:</span> <strong>{submissionDetail.enterprise?.business_name || 'Doanh nghiệp'}</strong></div>
                            </div>
                            <div className="details-actions">
                                <button className="squishy-btn red" onClick={() => handleRejectLocation(submissionDetail.submission_id)} disabled={actionLoading}>Từ Chối</button>
                                <button className="squishy-btn green" onClick={() => handleApproveLocation(submissionDetail.submission_id)} disabled={actionLoading}>Phê Duyệt</button>
                            </div>
                        </div>
                    ) : locationSubmissions.length === 0 ? (
                        <div className="empty-panel cartoon-card">
                            <Check size={48} className="empty-check-icon" />
                            <p>Không có yêu cầu duyệt địa điểm nào đang chờ.</p>
                        </div>
                    ) : (
                        <div className="admin-list">
                            {locationSubmissions.map(sub => (
                                <div key={sub.submission_id} className="list-item-card cartoon-card" onClick={() => { setSelectedSubmission(sub); fetchSubmissionDetail(sub.submission_id); }}>
                                    <div className="list-item-info">
                                        <MapPin size={24} className="list-item-icon" />
                                        <div>
                                            <h4>{sub.location_name}</h4>
                                            <p>Doanh nghiệp: {sub.enterprise_name}</p>
                                        </div>
                                    </div>
                                    <span className="arrow">›</span>
                                </div>
                            ))}
                        </div>
                    )
                ) : activeTab === 'users' ? (
                    // Users list and Point rewards
                    <div className="users-tab-content">
                        {grantTargetId && (
                            <form onSubmit={handleGrantPoints} className="grant-points-form cartoon-card">
                                <h4>Tặng Điểm Cho Thành Viên</h4>
                                <input 
                                    type="number" 
                                    placeholder="Nhập số điểm cần tặng..." 
                                    value={grantAmount}
                                    onChange={(e) => setGrantAmount(e.target.value)}
                                    required
                                />
                                <div className="grant-actions">
                                    <button type="button" className="squishy-btn red" onClick={() => setGrantTargetId(null)}>Hủy</button>
                                    <button type="submit" className="squishy-btn green" disabled={actionLoading}>Xác Nhận</button>
                                </div>
                            </form>
                        )}
                        <div className="admin-list">
                            {usersList.map(u => (
                                <div key={u.id} className="user-item-card cartoon-card">
                                    <div className="user-item-main">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt="avatar" className="user-avatar" />
                                        <div>
                                            <h4>{u.name}</h4>
                                            <p className="user-email">{u.email}</p>
                                            <p className="user-points">Điểm tích lũy: <strong>{u.total_points}</strong> ({u.rank})</p>
                                        </div>
                                    </div>
                                    <button className="squishy-btn yellow grant-btn" onClick={() => setGrantTargetId(u.id)}>
                                        <Award size={14} style={{ marginRight: '4px' }} /> Tặng PTS
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeTab === 'stats' ? (
                    // Stats
                    stats && (
                        <div className="stats-tab-content">
                            <div className="stats-grid">
                                <div className="stat-card cartoon-card">
                                    <h4 className="stat-label">Tổng Số Thành Viên</h4>
                                    <p className="stat-value">{stats.total_users}</p>
                                </div>
                                <div className="stat-card cartoon-card">
                                    <h4 className="stat-label">Tổng Số Bài Viết</h4>
                                    <p className="stat-value">{stats.total_posts}</p>
                                </div>
                                <div className="stat-card cartoon-card">
                                    <h4 className="stat-label">Tổng Điểm Đã Tặng</h4>
                                    <p className="stat-value">{stats.total_points_awarded.toLocaleString()}</p>
                                </div>
                                <div className="stat-card cartoon-card">
                                    <h4 className="stat-label">Doanh Nghiệp Chờ Duyệt</h4>
                                    <p className="stat-value">{stats.pending_enterprises}</p>
                                </div>
                            </div>
                            
                            {user?.role === 'OWNER' && (
                                <div className="danger-zone-card cartoon-card text-center">
                                    <h3 className="danger-zone-title"><AlertTriangle size={20} /> Khu Vực Nguy Hiểm</h3>
                                    <p className="danger-desc">Hành động này sẽ đặt lại hoàn toàn thứ hạng, điểm và cấp của tất cả thành viên trên máy chủ.</p>
                                    <button className="squishy-btn red btn-reset-server" onClick={handleResetRanks}>Reset Toàn Bộ Server</button>
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    // Reports Moderation
                    reports.length === 0 ? (
                        <div className="empty-panel cartoon-card">
                            <Check size={48} className="empty-check-icon" />
                            <p>Không có báo cáo vi phạm nào.</p>
                        </div>
                    ) : (
                        <div className="admin-list">
                            {reports.map(rep => {
                                const isPostReport = rep.content.includes('Post ID:');
                                const postId = isPostReport ? rep.content.split('Post ID: ')[1]?.split(' |')[0] : null;
                                return (
                                    <div key={rep.feedback_id} className="report-item-card cartoon-card">
                                        <div className="report-info">
                                            <div className="report-header-row">
                                                <h4 className="report-type-badge">Báo cáo vi phạm</h4>
                                                <span className="report-date">{new Date(rep.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="report-reason">Nội dung báo cáo: "{rep.content}"</p>
                                        </div>
                                        {postId && (
                                            <button className="squishy-btn red delete-reported-btn" onClick={() => handleDeletePost(postId)}>
                                                <Trash2 size={14} style={{ marginRight: '4px' }} /> Xóa bài đăng
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>

            {/* Reject Reason Modal Dialog */}
            {showRejectModal && (
                <div className="modal-overlay">
                    <div className="modal-content cartoon-card">
                        <div className="modal-header">
                            <h3>Lý Do Từ Chối</h3>
                            <button className="btn-close" onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleRejectSubmit}>
                            <p className="report-warning-desc">Vui lòng cung cấp lý do từ chối cụ thể để thông báo cho doanh nghiệp:</p>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Ví dụ: Tài liệu không hợp lệ, hình ảnh không đúng tọa độ..."
                                className="post-input-text"
                                required
                            />
                            <div className="modal-actions-row">
                                <button type="button" className="squishy-btn red cancel-btn" onClick={() => { setShowRejectModal(false); setRejectTarget(null); }}>Hủy</button>
                                <button type="submit" className="squishy-btn green submit-btn" disabled={actionLoading}>Gửi Từ Chối</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
