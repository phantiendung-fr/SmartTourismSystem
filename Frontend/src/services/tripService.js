// Gọi API lấy gợi ý, lưu lộ trình.
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
const API_URL = `${API_BASE}/api/trips`;

export const getTripHistory = async (token) => {
    try {
        const response = await fetch(`${API_URL}/history`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error("Lỗi khi lấy lịch sử chuyến đi");
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const completeTrip = async (itineraryId, token) => {
    try {
        const response = await fetch(`${API_URL}/${itineraryId}/complete`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Lỗi khi hoàn thành chuyến đi");
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const createTrip = async (payload, token) => {
    try {
        const response = await fetch(`${API_URL}/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Lỗi khi tạo chuyến đi");
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const getTripDetail = async (itineraryId, token) => {
    try {
        // GET detail doesn't actually require token for backend logic right now, but good practice
        const response = await fetch(`${API_URL}/${itineraryId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error("Lỗi khi lấy chi tiết chuyến đi");
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};