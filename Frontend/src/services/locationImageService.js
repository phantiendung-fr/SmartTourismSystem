import { API_BASE } from '../config/api';

const normalizeImages = (images, source) => (
    Array.isArray(images)
        ? images
            .filter(image => image?.url)
            .map(image => ({ ...image, source }))
        : []
);

export const getLocationFallbackImages = async (locationId) => {
    if (!locationId) return [];

    try {
        const databaseResponse = await fetch(
            `${API_BASE}/api/v1/locations/${locationId}/images`
        );
        if (databaseResponse.ok) {
            const databaseImages = normalizeImages(await databaseResponse.json(), 'database');
            if (databaseImages.length > 0) return databaseImages;
        }
    } catch (error) {
        console.error('Lỗi tải ảnh địa điểm:', error);
    }

    try {
        const externalResponse = await fetch(
            `${API_BASE}/api/v1/locations/${locationId}/external-images`
        );
        if (!externalResponse.ok) return [];

        const data = await externalResponse.json();
        return data?.eligible ? normalizeImages(data.images, 'external') : [];
    } catch (error) {
        console.error('Lỗi tìm ảnh Wikimedia Commons:', error);
        return [];
    }
};
