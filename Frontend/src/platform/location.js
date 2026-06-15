import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const isIosWebApp = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.navigator.standalone === true
        || window.matchMedia?.('(display-mode: standalone)').matches;

    return isIos && isStandalone;
};

const toLocationError = (error) => {
    let message = error?.message || 'Không thể lấy dữ liệu GPS.';

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
        message = 'Định vị GPS trên iPhone chỉ hoạt động khi ứng dụng được mở bằng HTTPS.';
    } else if (Number(error?.code) === 1) {
        message = isIosWebApp()
            ? 'iOS đang chặn quyền vị trí. Mở Cài đặt > Quyền riêng tư & Bảo mật > Dịch vụ định vị, chọn Smart Tourism hoặc Safari và cho phép khi dùng ứng dụng.'
            : 'Quyền vị trí đang bị chặn. Hãy cho phép ứng dụng truy cập vị trí trong cài đặt trình duyệt.';
    } else if (Number(error?.code) === 2) {
        message = 'Không xác định được vị trí. Hãy bật Dịch vụ định vị/GPS rồi thử lại.';
    } else if (Number(error?.code) === 3) {
        message = 'GPS phản hồi quá lâu. Hãy kiểm tra Dịch vụ định vị rồi thử lại.';
    }

    const locationError = new Error(message);
    locationError.code = error?.code;
    return locationError;
};

const normalizePosition = (position) => {
    if (!position?.coords) return null;
    return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
        altitude: position.coords.altitude ?? null,
        heading: position.coords.heading ?? null,
        speed: position.coords.speed ?? null,
        timestamp: position.timestamp ?? Date.now(),
        raw: position,
    };
};

const browserGetCurrentPosition = (options = {}) =>
    new Promise((resolve, reject) => {
        if (!navigator?.geolocation) {
            reject(new Error('Trình duyệt không hỗ trợ định vị GPS.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

const browserWatchPosition = (onSuccess, onError, options = {}) => {
    if (!navigator?.geolocation) {
        onError?.(new Error('Trình duyệt không hỗ trợ định vị GPS.'));
        return null;
    }

    return navigator.geolocation.watchPosition(
        (position) => {
            const normalized = normalizePosition(position);
            if (normalized) onSuccess?.(normalized, position);
        },
        (error) => onError?.(toLocationError(error), error),
        options
    );
};

export const getCurrentPosition = async (options = {}) => {
    if (Capacitor.isNativePlatform()) {
        try {
            const nativePosition = await Geolocation.getCurrentPosition(options);
            const normalized = normalizePosition(nativePosition);
            if (!normalized) throw new Error('Không nhận được dữ liệu GPS từ thiết bị.');
            return normalized;
        } catch (nativeError) {
            try {
                const webPosition = await browserGetCurrentPosition(options);
                const normalized = normalizePosition(webPosition);
                if (!normalized) throw new Error('Không nhận được dữ liệu GPS.');
                return normalized;
            } catch (webError) {
                throw toLocationError(nativeError?.message ? nativeError : webError);
            }
        }
    }

    try {
        const webPosition = await browserGetCurrentPosition(options);
        const normalized = normalizePosition(webPosition);
        if (!normalized) throw new Error('Không nhận được dữ liệu GPS.');
        return normalized;
    } catch (webError) {
        throw toLocationError(webError);
    }
};

export const requestLocationPermission = async (options = {}) => {
    if (Capacitor.isNativePlatform()) {
        try {
            const currentPermission = await Geolocation.checkPermissions();
            const alreadyGranted = currentPermission?.location === 'granted'
                || currentPermission?.coarseLocation === 'granted';

            if (!alreadyGranted) {
                const requestedPermission = await Geolocation.requestPermissions();
                const granted = requestedPermission?.location === 'granted'
                    || requestedPermission?.coarseLocation === 'granted';

                if (!granted) {
                    throw Object.assign(new Error('Quyền vị trí bị từ chối.'), { code: 1 });
                }
            }
        } catch (permissionError) {
            throw toLocationError(permissionError);
        }
    }

    return getCurrentPosition(options);
};

export const startWatchingPosition = ({ onSuccess, onError, options = {} }) => {
    let webWatchId = null;
    let nativeWatchId = null;
    let stopped = false;

    const stop = () => {
        stopped = true;

        if (webWatchId !== null && navigator?.geolocation) {
            navigator.geolocation.clearWatch(webWatchId);
            webWatchId = null;
        }

        if (nativeWatchId !== null) {
            Geolocation.clearWatch({ id: nativeWatchId }).catch(() => {});
            nativeWatchId = null;
        }
    };

    const startBrowserWatch = () => {
        webWatchId = browserWatchPosition(onSuccess, onError, options);
    };

    if (Capacitor.isNativePlatform()) {
        Geolocation.watchPosition(options, (position, error) => {
            if (stopped) return;

            if (error) {
                onError?.(toLocationError(error), error);
                return;
            }

            const normalized = normalizePosition(position);
            if (normalized) onSuccess?.(normalized, position);
        })
            .then((id) => {
                nativeWatchId = id;
                if (stopped && nativeWatchId !== null) {
                    Geolocation.clearWatch({ id: nativeWatchId }).catch(() => {});
                    nativeWatchId = null;
                }
            })
            .catch(() => {
                if (!stopped) startBrowserWatch();
            });
    } else {
        startBrowserWatch();
    }

    return stop;
};
