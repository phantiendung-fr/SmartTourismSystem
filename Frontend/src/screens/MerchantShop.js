import React, { useState } from 'react';

const MerchantShop = ({ user, onBack }) => {
    const [purchased, setPurchased] = useState([]);
    
    // Fake data for now since the backend API for quests/vouchers isn't fully implemented yet
    const vouchers = [
        { id: 1, title: 'Voucher -20% Highland Coffee', cost: 150, image: '☕' },
        { id: 2, title: 'Vé vào cổng Dinh Độc Lập', cost: 300, image: '🏛️' },
        { id: 3, title: 'Buffet Khách sạn 5 sao', cost: 1500, image: '🏨' },
        { id: 4, title: 'Mảnh ghép Áo choàng phiêu lưu', cost: 50, image: '🧩' },
    ];

    const handleBuy = (item) => {
        // In a real app, you would call an API: purchaseVoucher(item.id, user.id)
        if (user.points_balance < item.cost) {
            alert('Bạn không đủ 🪙 để đổi vật phẩm này!');
            return;
        }
        
        if (window.confirm(`Bạn có chắc muốn đổi ${item.cost} 🪙 lấy ${item.title} không?`)) {
            // Deduct points locally for demo
            user.points_balance -= item.cost;
            setPurchased([...purchased, item.id]);
            alert(`🎉 Chúc mừng! Bạn đã nhận được ${item.title}`);
        }
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#2f3542', minHeight: '100vh', color: '#f1f2f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button 
                    onClick={onBack}
                    style={{ background: 'none', border: 'none', color: '#fbc531', fontSize: '24px', cursor: 'pointer', marginRight: '15px' }}
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h2 style={{ margin: 0, color: '#fbc531' }}>Quầy Thương Nhân (NPC)</h2>
            </div>
            
            <div style={{ 
                backgroundColor: '#1e272e', 
                padding: '15px', 
                borderRadius: '12px', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px',
                border: '1px solid #57606f'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#a4b0be' }}>Túi đồ của bạn</h3>
                    <p style={{ margin: '5px 0 0', fontSize: '14px' }}>Số dư hiện tại:</p>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>
                    🪙 {user?.points_balance || 0}
                </div>
            </div>
            
            <h3 style={{ borderBottom: '2px solid #57606f', paddingBottom: '10px', marginBottom: '20px' }}>Vật phẩm có sẵn</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                {vouchers.map(item => {
                    const isPurchased = purchased.includes(item.id);
                    return (
                        <div key={item.id} style={{ 
                            backgroundColor: '#57606f', 
                            padding: '15px', 
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ fontSize: '32px', background: '#2f3542', padding: '10px', borderRadius: '12px' }}>
                                    {item.image}
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px', color: '#ffffff' }}>{item.title}</h4>
                                    <p style={{ margin: '5px 0 0', color: '#ffa502', fontWeight: 'bold' }}>{item.cost} 🪙</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleBuy(item)}
                                disabled={isPurchased}
                                style={{ 
                                    background: isPurchased ? '#2f3542' : '#2ed573', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '8px 16px', 
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: isPurchased ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isPurchased ? 'Đã đổi' : 'Đổi ngay'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MerchantShop;
