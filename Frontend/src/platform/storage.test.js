import { storageGet, storageRemove, storageSet } from './storage';

jest.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => false,
    },
}));

jest.mock('@capacitor/preferences', () => ({
    Preferences: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
    },
}));

describe('web storage fallback', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    test('stores and removes values in the browser', async () => {
        await storageSet('storage-test-key', 'saved-value');

        expect(await storageGet('storage-test-key')).toBe('saved-value');

        await storageRemove('storage-test-key');

        expect(await storageGet('storage-test-key')).toBeNull();
    });

    test('keeps working when iOS web storage throws', async () => {
        const getSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('Blocked', 'SecurityError');
        });
        const setSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('Blocked', 'SecurityError');
        });
        const removeSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new DOMException('Blocked', 'SecurityError');
        });

        await storageSet('ios-pwa-storage-key', 'favorite-location');

        expect(await storageGet('ios-pwa-storage-key')).toBe('favorite-location');

        await storageRemove('ios-pwa-storage-key');

        expect(await storageGet('ios-pwa-storage-key')).toBeNull();

        getSpy.mockRestore();
        setSpy.mockRestore();
        removeSpy.mockRestore();
    });
});
