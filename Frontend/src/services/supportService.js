import { API_BASE } from '../config/api';
import { storageGet } from '../platform/storage';

export const sendSupportMessage = async (message, history = []) => {
    const response = await fetch(`${API_BASE}/api/support/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, history }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.detail || 'Không thể kết nối trợ lý hỗ trợ.');
    }

    return data;
};

export const createSupportTicket = async (feedbackType, content) => {
    const token = await storageGet('access_token');
    if (!token) {
        throw new Error('Vui lòng đăng nhập để gửi yêu cầu hỗ trợ.');
    }

    const response = await fetch(`${API_BASE}/api/support/tickets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ feedback_type: feedbackType, content }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.detail || 'Không thể gửi yêu cầu hỗ trợ.');
    }

    return data;
};

export const listSupportTickets = async () => {
    const token = await storageGet('access_token');
    if (!token) {
        throw new Error('Vui lòng đăng nhập để xem lịch sử hỗ trợ.');
    }

    const response = await fetch(`${API_BASE}/api/support/tickets`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    const data = await response.json().catch(() => ([]));
    if (!response.ok) {
        throw new Error(data.detail || 'Không thể tải danh sách hỗ trợ.');
    }

    return data;
};

