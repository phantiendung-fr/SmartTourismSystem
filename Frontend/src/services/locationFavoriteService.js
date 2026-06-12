import { API_BASE } from '../config/api';
import { storageGet, storageRemove, storageSet } from '../platform/storage';

const LEGACY_STORAGE_KEY = 'favorite_locations';
const CACHE_KEY_PREFIX = 'favorite_locations:';
const MIGRATED_KEY_PREFIX = 'favorite_locations_migrated:';
const PENDING_KEY_PREFIX = 'favorite_location_pending:';
export const FAVORITE_LOCATIONS_CHANGED = 'favoriteLocationsChanged';

const parseFavorites = (value) => {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const getLocationId = (location) => String(location?.location_id || location?.id || '');

const parseObject = (value) => {
    try {
        const parsed = JSON.parse(value || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
};

const decodeTokenUserId = (token) => {
    try {
        const encodedPayload = token?.split('.')[1];
        if (!encodedPayload) return null;
        const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
        const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
        const payload = JSON.parse(window.atob(normalized));
        return String(payload.user_id || payload.sub || '');
    } catch {
        return null;
    }
};

const accountKey = (prefix, userId) => `${prefix}${userId}`;

const normalizeFavorite = (location) => ({
    ...location,
    location_id: location.location_id || location.id,
    location_name: location.location_name || location.name || 'Địa điểm',
    address: location.address || location.city_name || 'Việt Nam',
    image_url: location.image_url || location.cover_image || location.image || location.thumbnail_url || null,
    latitude: location.latitude ?? location.lat ?? null,
    longitude: location.longitude ?? location.lng ?? null,
    score: location.score ?? null,
});

const saveAccountCache = async (userId, favorites) => {
    if (!userId) return;
    await storageSet(accountKey(CACHE_KEY_PREFIX, userId), JSON.stringify(favorites));
};

const readLocalFavorites = async (userId) => {
    if (userId) {
        const accountFavorites = parseFavorites(await storageGet(accountKey(CACHE_KEY_PREFIX, userId)));
        if (accountFavorites.length > 0) return accountFavorites;
    }
    return parseFavorites(await storageGet(LEGACY_STORAGE_KEY));
};

const dispatchFavoritesChanged = (favorites) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(FAVORITE_LOCATIONS_CHANGED, { detail: favorites }));
    }
};

const requestFavorites = async (token) => {
    const response = await fetch(`${API_BASE}/api/v1/locations/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Không thể đồng bộ địa điểm yêu thích.');
    return data;
};

const requestSync = async (token, addLocationIds, removeLocationIds) => {
    const response = await fetch(`${API_BASE}/api/v1/locations/favorites/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            add_location_ids: addLocationIds,
            remove_location_ids: removeLocationIds,
        }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Không thể đồng bộ địa điểm yêu thích.');
    return data;
};

const synchronizeFavorites = async (token, hintedUserId, localFavorites) => {
    let userId = hintedUserId;
    let serverData = null;

    if (!userId) {
        serverData = await requestFavorites(token);
        userId = String(serverData.user_id || '');
    }
    if (!userId) throw new Error('Không xác định được tài khoản để đồng bộ yêu thích.');

    const migratedKey = accountKey(MIGRATED_KEY_PREFIX, userId);
    const pendingKey = accountKey(PENDING_KEY_PREFIX, userId);
    const migrated = await storageGet(migratedKey);
    const pending = parseObject(await storageGet(pendingKey));
    const addIds = new Set();
    const removeIds = new Set();

    Object.entries(pending).forEach(([locationId, action]) => {
        if (action === 'remove') removeIds.add(locationId);
        if (action === 'add') addIds.add(locationId);
    });

    if (migrated !== 'true') {
        localFavorites.forEach((location) => {
            const locationId = getLocationId(location);
            if (locationId) addIds.add(locationId);
        });
    }

    removeIds.forEach((locationId) => addIds.delete(locationId));

    if (addIds.size > 0 || removeIds.size > 0 || migrated !== 'true') {
        serverData = await requestSync(token, [...addIds], [...removeIds]);
    } else if (!serverData) {
        serverData = await requestFavorites(token);
    }

    const favorites = Array.isArray(serverData.favorites)
        ? serverData.favorites.map(normalizeFavorite)
        : [];
    await Promise.all([
        saveAccountCache(userId, favorites),
        storageSet(migratedKey, 'true'),
        storageRemove(pendingKey),
        migrated !== 'true' ? storageRemove(LEGACY_STORAGE_KEY) : Promise.resolve(),
    ]);
    return { userId, favorites };
};

const queueOperation = async (userId, locationId, action) => {
    if (!userId) return;
    const pendingKey = accountKey(PENDING_KEY_PREFIX, userId);
    const pending = parseObject(await storageGet(pendingKey));
    pending[locationId] = action;
    await storageSet(pendingKey, JSON.stringify(pending));
};

export const getFavoriteLocations = async () => {
    const token = await storageGet('access_token');
    const userId = decodeTokenUserId(token);
    const localFavorites = await readLocalFavorites(userId);
    if (!token) return localFavorites;

    try {
        const synced = await synchronizeFavorites(token, userId, localFavorites);
        return synced.favorites;
    } catch (error) {
        console.warn('Không thể đồng bộ địa điểm yêu thích, đang dùng dữ liệu trên thiết bị:', error);
        return localFavorites;
    }
};

export const isFavoriteLocation = async (location) => {
    const locationId = getLocationId(location);
    if (!locationId) return false;
    const favorites = await getFavoriteLocations();
    return favorites.some((item) => getLocationId(item) === locationId);
};

export const toggleFavoriteLocation = async (location) => {
    const locationId = getLocationId(location);
    if (!locationId) throw new Error('Địa điểm chưa có mã để lưu yêu thích.');

    const favorites = await getFavoriteLocations();
    const existingIndex = favorites.findIndex((item) => getLocationId(item) === locationId);
    const isFavorite = existingIndex === -1;
    const nextFavorites = isFavorite
        ? [normalizeFavorite(location), ...favorites]
        : favorites.filter((_, index) => index !== existingIndex);

    const token = await storageGet('access_token');
    const userId = decodeTokenUserId(token);

    if (userId) {
        await Promise.all([
            saveAccountCache(userId, nextFavorites),
            queueOperation(userId, locationId, isFavorite ? 'add' : 'remove'),
        ]);
    } else {
        await storageSet(LEGACY_STORAGE_KEY, JSON.stringify(nextFavorites));
    }
    dispatchFavoritesChanged(nextFavorites);

    if (token) {
        try {
            const synced = await synchronizeFavorites(token, userId, nextFavorites);
            dispatchFavoritesChanged(synced.favorites);
        } catch (error) {
            console.warn('Thay đổi yêu thích đang chờ đồng bộ:', error);
        }
    }

    return isFavorite;
};
