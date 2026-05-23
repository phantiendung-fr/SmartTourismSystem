// locationService.js
import { API_BASE } from '../config/api';

const API_URL = `${API_BASE}/api/v1/locations`;

export const locationService = {
    registerLocation: async (locationData) => {
        // 1. Lấy token từ nơi bạn đã lưu lúc Login
        const token = localStorage.getItem('access_token'); 

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
