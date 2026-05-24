import { Capacitor } from '@capacitor/core';
const explicitApiUrl = process.env.REACT_APP_API_URL;

// Tự động chuyển đổi giữa IP máy tính (cho thiết bị Native/Emulator) và localhost (cho Web)
const getApiBase = () => {
    // Luôn ưu tiên dùng URL được cấu hình trong file .env
    if (explicitApiUrl) return explicitApiUrl;

    if (Capacitor.isNativePlatform()) {
        // Trên thiết bị thật hoặc Emulator (Native App), bắt buộc phải có IP cố định.
        // Nếu chưa cấu hình trong .env, sẽ in ra cảnh báo và dùng IP dự phòng.
        console.warn("⚠️ CẢNH BÁO: Chưa cấu hình REACT_APP_API_URL trong file .env. App có thể không gọi được API!");
        return 'http://192.168.1.5:8000'; // IP fallback dự phòng
    } else {
        // Trên môi trường Web (trình duyệt PC hoặc Safari/Chrome trên điện thoại)
        // Nó sẽ tự động lấy đúng IP/domain mà người dùng đang truy cập
        const hostname = window.location.hostname || 'localhost';
        return `http://${hostname}:8000`;
    }
};

export const API_BASE = getApiBase();
export const WS_BASE = API_BASE.replace(/^http/, 'ws');
