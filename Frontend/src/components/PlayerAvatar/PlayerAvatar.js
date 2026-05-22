/**
 * PlayerAvatar.js
 * Tạo Leaflet DivIcon cho avatar người chơi trên bản đồ.
 * Sử dụng cùng hệ thống avatar DiceBear Adventurer như Leaderboard.
 */
import L from 'leaflet';
import './PlayerAvatar.css';

/**
 * Lấy URL avatar (giống logic getAvatarSrc ở Leaderboard)
 * @param {Object} user - user object chứa avatar_url, full_name
 * @returns {string} URL avatar
 */
export function getAvatarUrl(user) {
    if (user?.avatar_url) return user.avatar_url;
    const name = user?.full_name || 'Player';
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
}

/**
 * Tạo Leaflet DivIcon cho player avatar
 * @param {Object} user - { full_name, avatar_url }
 * @returns {L.DivIcon}
 */
export function createPlayerAvatarIcon(user) {
    const avatarUrl = getAvatarUrl(user);
    const displayName = user?.full_name || 'Bạn';
    // Cắt tên nếu quá dài
    const shortName = displayName.length > 12 ? displayName.substring(0, 12) + '…' : displayName;

    return L.divIcon({
        className: 'player-avatar-container',
        html: `
            <div class="player-avatar-marker">
                <div class="player-avatar-ring">
                    <div class="player-avatar-pulse"></div>
                    <img 
                        class="player-avatar-img" 
                        src="${avatarUrl}" 
                        alt="${displayName}"
                        onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=fallback'"
                    />
                </div>
                <div class="player-avatar-pointer"></div>
                <div class="player-avatar-name">${shortName}</div>
            </div>
        `,
        iconSize: [50, 70],
        iconAnchor: [25, 60],
        popupAnchor: [0, -65],
    });
}
