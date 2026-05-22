import React from 'react';
import './TreasureOverlay.css';

const TreasureOverlay = ({ data }) => {
    if (!data) return null;

    const { points, locationName, stage } = data;

    return (
        <div className="treasure-overlay">
            <div className={`treasure-chest ${stage}`}>
                <div className="chest-emoji">{stage === 'open' ? '💎' : '🧰'}</div>
            </div>
            
            {stage === 'open' && (
                <div className="reward-text show">
                    <p>Chúc mừng bạn đã check-in thành công!</p>
                    <p className="location-name">{locationName}</p>
                    <div className="points-earned">+{points} Điểm thưởng</div>
                </div>
            )}
        </div>
    );
};

export default TreasureOverlay;
