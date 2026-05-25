import { Capacitor } from '@capacitor/core';

const explicitApiUrl = process.env.REACT_APP_API_URL;

const normalizeUrl = (url) => url?.replace(/\/$/, '');

const getApiBase = () => {
    if (explicitApiUrl) return normalizeUrl(explicitApiUrl);

    if (Capacitor.isNativePlatform()) {
        throw new Error(
            'Missing REACT_APP_API_URL. Native APK requires Frontend/.env with LAN backend URL.'
        );
    }

    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:8000`;
};

export const API_BASE = getApiBase();
export const WS_BASE = API_BASE.replace(/^http/, 'ws');
