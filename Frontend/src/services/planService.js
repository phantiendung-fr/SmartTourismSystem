const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const createPlanningSession = async (payload, token) => {
    try {
        const response = await fetch(`${API_BASE}/api/planning/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Lỗi khi tạo phiên lập kế hoạch");
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const getRecommendations = async (payload) => {
    try {
        const response = await fetch(`${API_BASE}/api/suggestions/recommend`, {
            method: 'POST',
            headers: {
                // Not requiring auth by backend currently, but good to add if needed
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Lỗi khi lấy gợi ý địa điểm");
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};
