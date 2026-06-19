// src/services/businessService.js
import { API_BASE } from '../config/api';
import { storageGet } from '../platform/storage';

const BASE_URL = `${API_BASE}/api`;

const formatApiErrorDetail = (detail) => {
    if (!detail) return '';

    if (typeof detail === 'string') return detail;

    if (Array.isArray(detail)) {
        return detail
            .map((item) => {
                if (typeof item === 'string') return item;
                if (!item || typeof item !== 'object') return String(item);

                const field = Array.isArray(item.loc)
                    ? item.loc.filter((part) => part !== 'body').join('.')
                    : '';
                const message = item.msg || item.message || JSON.stringify(item);
                return field ? `${field}: ${message}` : message;
            })
            .join('\n');
    }

    if (typeof detail === 'object') {
        return detail.message || detail.msg || JSON.stringify(detail);
    }

    return String(detail);
};

// Hàm lấy token từ storage tương thích web/native để làm "Giấy thông hành"
const getAuthHeaders = async () => {
    const token = await storageGet('access_token');
    if (!token) {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
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
            headers: await getAuthHeaders(),
            body: JSON.stringify(locationData)
        });
        
        // Nếu Backend chê lỗi (Ví dụ: 400, 401, 403, 422)
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(formatApiErrorDetail(err.detail) || err.message || 'Lỗi khi tạo địa điểm. Vui lòng kiểm tra lại!');
        }
        
        // Nếu thành công (201 Created)
        return await response.json();
    }
};
