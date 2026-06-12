const mockStore = new Map();

jest.mock('../config/api', () => ({
    API_BASE: 'https://api.test',
}));

jest.mock('../platform/storage', () => ({
    storageGet: jest.fn(),
    storageSet: jest.fn(),
    storageRemove: jest.fn(),
}));

const { storageGet, storageRemove, storageSet } = require('../platform/storage');
const {
    getFavoriteLocations,
    toggleFavoriteLocation,
} = require('./locationFavoriteService');

const userId = '4f5cb840-a80a-4a8e-a25d-a2256c28c849';
const location = {
    location_id: 'cc559fd6-178e-48d4-bf2a-2b4f9a97dff1',
    location_name: 'Chợ Bến Thành',
    address: 'Quận 1',
};

const createToken = () => {
    const payload = window.btoa(JSON.stringify({ sub: userId }));
    return `header.${payload}.signature`;
};

const jsonResponse = (body, ok = true) => Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
});

describe('location favorite synchronization', () => {
    beforeEach(() => {
        mockStore.clear();
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        storageGet.mockImplementation(async (key) => mockStore.get(key) ?? null);
        storageSet.mockImplementation(async (key, value) => {
            mockStore.set(key, value);
        });
        storageRemove.mockImplementation(async (key) => {
            mockStore.delete(key);
        });
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('imports legacy local favorites into the account on first sync', async () => {
        mockStore.set('access_token', createToken());
        mockStore.set('favorite_locations', JSON.stringify([location]));
        global.fetch.mockImplementation(() => jsonResponse({
            user_id: userId,
            favorites: [location],
        }));

        const favorites = await getFavoriteLocations();

        expect(favorites).toHaveLength(1);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.test/api/v1/locations/favorites/sync',
            expect.objectContaining({ method: 'POST' }),
        );
        const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(requestBody.add_location_ids).toEqual([location.location_id]);
        expect(mockStore.get(`favorite_locations_migrated:${userId}`)).toBe('true');
        expect(mockStore.has('favorite_locations')).toBe(false);
    });

    test('queues a local change when the server is offline', async () => {
        mockStore.set('access_token', createToken());
        mockStore.set(`favorite_locations_migrated:${userId}`, 'true');
        mockStore.set(`favorite_locations:${userId}`, '[]');
        global.fetch.mockRejectedValue(new Error('offline'));

        const saved = await toggleFavoriteLocation(location);

        expect(saved).toBe(true);
        expect(JSON.parse(mockStore.get(`favorite_locations:${userId}`))).toEqual([
            expect.objectContaining({ location_id: location.location_id }),
        ]);
        expect(JSON.parse(mockStore.get(`favorite_location_pending:${userId}`))).toEqual({
            [location.location_id]: 'add',
        });
    });
});
