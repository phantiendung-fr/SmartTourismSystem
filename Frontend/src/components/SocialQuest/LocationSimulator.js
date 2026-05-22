import React, { useState } from 'react';
import { useSocialQuest } from './SocialQuestProvider';

const LocationSimulator = () => {
    const { sendLocation, questState } = useSocialQuest();
    
    // Tọa độ mặc định
    const [lat, setLat] = useState(10.772461);
    const [lng, setLng] = useState(106.698055);

    const handleSend = () => {
        if (sendLocation) {
            sendLocation(lat, lng);
            console.log(`📍 Đã bắn tọa độ lên Server: ${lat}, ${lng}`);
        }
    };

    return (
        <div style={{
            position: 'absolute', 
            bottom: '100px', /* SỬA TỪ 20px THÀNH 100px ĐỂ NÉ THANH BOTTOM TAB */
            right: '20px', 
            zIndex: 9999,    /* TĂNG Z-INDEX LÊN ĐỂ LUÔN NẰM TRÊN CÙNG */
            background: 'rgba(0,0,0,0.8)', color: 'white', padding: '15px', borderRadius: '12px',
            width: '180px', fontSize: '13px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
        }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#2ecc71', textAlign: 'center' }}>🛰️ DEV: MOCK GPS</h4>
            
            <div style={{ marginBottom: '8px' }}>
                <label style={{color: '#aaa', fontSize: '11px'}}>Vĩ độ (Latitude):</label>
                <input 
                    type="number" step="0.0001" value={lat} 
                    onChange={e => setLat(parseFloat(e.target.value))} 
                    style={inputStyle} 
                />
            </div>
            
            <div style={{ marginBottom: '12px' }}>
                <label style={{color: '#aaa', fontSize: '11px'}}>Kinh độ (Longitude):</label>
                <input 
                    type="number" step="0.0001" value={lng} 
                    onChange={e => setLng(parseFloat(e.target.value))} 
                    style={inputStyle} 
                />
            </div>
            
            {/* ĐÃ XÓA DISABLED ĐỂ NÚT LUÔN BẤM ĐƯỢC */}
            <button 
                onClick={handleSend} 
                style={{
                    ...btnStyle, 
                    background: '#e74c3c',
                    cursor: 'pointer'
                }} 
            >
                🚀 Phát Tín Hiệu
            </button>
        </div>
    );
};

// CSS tĩnh
const inputStyle = { 
    width: '100%', padding: '6px', boxSizing: 'border-box', 
    background: '#2c3e50', color: 'white', border: '1px solid #34495e', 
    borderRadius: '4px', marginTop: '4px', outline: 'none'
};
const btnStyle = { 
    width: '100%', padding: '8px', color: 'white', border: 'none', 
    borderRadius: '6px', fontWeight: 'bold', transition: '0.2s' 
};

export default LocationSimulator;