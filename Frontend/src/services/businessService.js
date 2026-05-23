// src/services/businessService.js
import { API_BASE } from '../config/api';

const BASE_URL = `${API_BASE}/api`;

// Hàm lấy Token từ localStorage để làm "Giấy thông hành"
const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Gắn token vào Header
    };
};

export const businessService = {
    // Gọi API Đăng ký địa điểm
    registerLocation: async (locationData) => {
        const response = await fetch(`${BASE_URL}/v1/locations/register`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(locationData)
        });
        
        // Nếu Backend chê lỗi (Ví dụ: 400, 401, 403, 422)
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Lỗi khi tạo địa điểm. Vui lòng kiểm tra lại!');
        }
        
        // Nếu thành công (201 Created)
        return await response.json();
    }
};
