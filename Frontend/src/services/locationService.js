// locationService.js
import { API_BASE } from '../config/api';
import { storageGet } from '../platform/storage';

const API_URL = `${API_BASE}/api/v1/locations`;

export const locationService = {
    registerLocation: async (locationData) => {
        // 1. Lấy token từ lớp storage tương thích web/native
        const token = await storageGet('access_token');
        if (!token) {
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }

        // 2. Gửi request kèm Token
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // <--- Chốt chặn bảo mật nằm ở đây!
            },
            body: JSON.stringify(locationData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Lỗi đăng ký địa điểm');
        }
        return await response.json();
    }
};
