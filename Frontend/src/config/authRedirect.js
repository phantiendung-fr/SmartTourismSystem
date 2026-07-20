const PRODUCTION_AUTH_REDIRECT_URL = 'https://smart-tourism-vietnam.vercel.app';

const isLocalHost = (hostname) => (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
);

export const getAuthRedirectUrl = () => {
    const { protocol, hostname, origin } = window.location;

    if (isLocalHost(hostname)) {
        return origin;
    }

    if (protocol !== 'https:') {
        return PRODUCTION_AUTH_REDIRECT_URL;
    }

    return PRODUCTION_AUTH_REDIRECT_URL;
};
