import React from 'react';

const EnterpriseDashboard = ({ user }) => {
    // Lấy tên hiển thị (Ưu tiên tên doanh nghiệp, nếu không có thì dùng full_name)
    const displayName = user?.business_name || user?.full_name || 'Doanh nghiệp';

    // Dữ liệu giả lập (Mockup data) để giao diện trực quan
    const mockStats = { 
        views: '1,240', 
        rating: '4.8', 
        checkins: 342,
        revenue: '15.5M' // Triệu VNĐ
    };

    return (
        <div style={{ padding: '20px', paddingBottom: '80px' }}>
            {/* Header: Lời chào & Trạng thái */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '24px', fontWeight: 800 }}>Tổng quan</h2>
                    <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '14px' }}>
                        Xin chào, <strong style={{ color: '#e67e22' }}>{displayName}</strong>
                    </p>
                </div>
                <div style={{ 
                    background: '#e8f8f5', color: '#27ae60', padding: '6px 12px', 
                    borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(39, 174, 96, 0.1)'
                }}>
                    ✅ Đã xác minh
                </div>
            </div>

            {/* Thẻ Chỉ số (Metric Cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', border: '1px solid #f1f2f6' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>👁️</div>
                    <h3 style={{ margin: 0, fontSize: '22px', color: '#2c3e50' }}>{mockStats.views}</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>Lượt xem dịch vụ</p>
                </div>
                <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', border: '1px solid #f1f2f6' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>⭐</div>
                    <h3 style={{ margin: 0, fontSize: '22px', color: '#2c3e50' }}>{mockStats.rating}/5</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>Điểm đánh giá TB</p>
                </div>
                <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', border: '1px solid #f1f2f6' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📍</div>
                    <h3 style={{ margin: 0, fontSize: '22px', color: '#2c3e50' }}>{mockStats.checkins}</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>Lượt Check-in</p>
                </div>
                <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', border: '1px solid #f1f2f6' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>💰</div>
                    <h3 style={{ margin: 0, fontSize: '22px', color: '#2c3e50' }}>{mockStats.revenue}</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>Doanh thu ước tính</p>
                </div>
            </div>

            {/* Banner Quảng cáo (Ads Center) */}
            <div style={{ 
                background: 'linear-gradient(135deg, #f39c12, #e67e22)', 
                borderRadius: '15px', padding: '20px', color: '#fff', 
                marginBottom: '25px', position: 'relative', overflow: 'hidden',
                boxShadow: '0 8px 15px rgba(230, 126, 34, 0.2)'
            }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 800 }}>Tăng doanh thu x3! 🚀</h3>
                <p style={{ margin: '0 0 15px 0', fontSize: '13px', lineHeight: '1.5', opacity: 0.9 }}>
                    Tiếp cận thêm hàng ngàn khách du lịch bằng cách đẩy dịch vụ của bạn lên Trang chủ khám phá.
                </p>
                <button style={{ 
                    background: '#fff', color: '#d35400', border: 'none', 
                    padding: '10px 16px', borderRadius: '10px', fontWeight: 'bold', 
                    cursor: 'pointer', fontSize: '14px' 
                }}>
                    Tạo chiến dịch quảng cáo
                </button>
            </div>

            {/* Lịch sử Hoạt động / Tương tác mới nhất */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '18px', color: '#2c3e50', margin: 0, fontWeight: 800 }}>Tương tác mới nhất</h3>
                    <span style={{ fontSize: '13px', color: '#e67e22', cursor: 'pointer', fontWeight: 'bold' }}>Xem tất cả</span>
                </div>

                <div style={{ background: '#fff', borderRadius: '15px', padding: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', border: '1px solid #f1f2f6' }}>
                    {/* Item 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f1f2f6', paddingBottom: '15px' }}>
                        <div style={{ width: '45px', height: '45px', background: '#3498db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginRight: '12px', fontWeight: 'bold', fontSize: '16px' }}>
                            N
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '15px', color: '#2c3e50' }}>Nam Dương</p>
                            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#7f8c8d' }}>Vừa check-in tại <strong style={{color: '#2c3e50'}}>Khách sạn MTP</strong></p>
                        </div>
                        <span style={{ fontSize: '12px', color: '#bdc3c7' }}>10 p trước</span>
                    </div>

                    {/* Item 2 */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '45px', height: '45px', background: '#9b59b6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginRight: '12px', fontWeight: 'bold', fontSize: '16px' }}>
                            H
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '15px', color: '#2c3e50' }}>Hải Tú</p>
                            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#7f8c8d' }}>Đã để lại đánh giá 5 ⭐</p>
                        </div>
                        <span style={{ fontSize: '12px', color: '#bdc3c7' }}>1 giờ trước</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnterpriseDashboard;