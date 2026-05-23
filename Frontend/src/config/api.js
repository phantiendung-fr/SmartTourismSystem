import { Capacitor } from '@capacitor/core';
const explicitApiUrl = process.env.REACT_APP_API_URL;

// Tự động chuyển đổi giữa IP máy tính (cho thiết bị Native/Emulator) và localhost (cho Web)
const getApiBase = () => {
    if (explicitApiUrl) return explicitApiUrl;

    if (Capacitor.isNativePlatform()) {
        // Trên thiết bị thật hoặc Emulator, gọi API qua IP cố định của máy chủ
        return 'http://192.168.1.5:8000';
    } else {
        // Trên môi trường Web, tự động lấy hostname của trình duyệt (ví dụ: localhost)
        const hostname = window.location.hostname || 'localhost';
        return `http://${hostname}:8000`;
    }
};

export const API_BASE = getApiBase();
export const WS_BASE = API_BASE.replace(/^http/, 'ws');
