import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const DB_NAME = 'smart-tourism-storage';
const DB_VERSION = 1;
const STORE_NAME = 'key-value';
const memoryStorage = new Map();
let databasePromise;

const getLocalValue = (key) => {
    try {
        return typeof window !== 'undefined' && window.localStorage
            ? window.localStorage.getItem(key)
            : null;
    } catch {
        return null;
    }
};

const setLocalValue = (key, value) => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return false;
        window.localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
};

const removeLocalValue = (key) => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return false;
        window.localStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
};

const getDatabase = () => {
    if (databasePromise) return databasePromise;
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);

    databasePromise = new Promise((resolve) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                    request.result.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
            request.onblocked = () => resolve(null);
        } catch {
            resolve(null);
        }
    });

    return databasePromise;
};

const getIndexedValue = async (key) => {
    const database = await getDatabase();
    if (!database) return null;

    return new Promise((resolve) => {
        try {
            const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
};

const setIndexedValue = async (key, value) => {
    const database = await getDatabase();
    if (!database) return;

    await new Promise((resolve) => {
        try {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            transaction.objectStore(STORE_NAME).put(value, key);
            transaction.oncomplete = resolve;
            transaction.onerror = resolve;
            transaction.onabort = resolve;
        } catch {
            resolve();
        }
    });
};

const removeIndexedValue = async (key) => {
    const database = await getDatabase();
    if (!database) return;

    await new Promise((resolve) => {
        try {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            transaction.objectStore(STORE_NAME).delete(key);
            transaction.oncomplete = resolve;
            transaction.onerror = resolve;
            transaction.onabort = resolve;
        } catch {
            resolve();
        }
    });
};

const getWebValue = async (key) => {
    const localValue = getLocalValue(key);
    if (localValue !== null) {
        memoryStorage.set(key, localValue);
        return localValue;
    }

    const indexedValue = await getIndexedValue(key);
    if (indexedValue !== null) {
        memoryStorage.set(key, indexedValue);
        setLocalValue(key, indexedValue);
        return indexedValue;
    }

    return memoryStorage.get(key) ?? null;
};

const setWebValue = async (key, value) => {
    memoryStorage.set(key, value);
    setLocalValue(key, value);
    await setIndexedValue(key, value);
};

const removeWebValue = async (key) => {
    memoryStorage.delete(key);
    removeLocalValue(key);
    await removeIndexedValue(key);
};

export const storageGet = async (key) => {
    if (Capacitor.isNativePlatform()) {
        try {
            const { value } = await Preferences.get({ key });
            if (value !== null && value !== undefined) {
                return value;
            }
            return getWebValue(key);
        } catch (error) {
            return getWebValue(key);
        }
    }

    return getWebValue(key);
};

export const storageSet = async (key, value) => {
    if (Capacitor.isNativePlatform()) {
        try {
            await Preferences.set({ key, value });
            return;
        } catch (error) {
            // Fallback to localStorage on web runtime or when plugin is unavailable.
        }
    }

    await setWebValue(key, value);
};

export const storageRemove = async (key) => {
    if (Capacitor.isNativePlatform()) {
        try {
            await Preferences.remove({ key });
            await removeWebValue(key);
            return;
        } catch (error) {
            // Fallback to localStorage on web runtime or when plugin is unavailable.
        }
    }

    await removeWebValue(key);
};
