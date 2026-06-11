import { API_BASE } from '../config/api';

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
