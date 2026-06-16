import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from '@react-oauth/google';
import L from 'leaflet';

// Suppress cross-origin / third-party script errors from crashing React's dev error overlay
if (process.env.NODE_ENV === 'development') {
  const scriptErrorRegex = /Script error/i;
  const resizeObserverErrorRegex = /ResizeObserver loop completed with undelivered notifications/i;

  window.addEventListener('error', (e) => {
    if (scriptErrorRegex.test(e.message) || resizeObserverErrorRegex.test(e.message)) {
      e.stopImmediatePropagation();
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason?.message || '';
    if (scriptErrorRegex.test(msg) || resizeObserverErrorRegex.test(msg)) {
      e.stopImmediatePropagation();
    }
  });
}

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
if (window.location.protocol === 'http:' && !isLocalHost) {
  window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`);
}

const syncAppViewportHeight = () => {
  const viewportHeight = Math.max(
    window.innerHeight || 0,
    document.documentElement.clientHeight || 0
  );
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  let appHeight = viewportHeight;

  if (isStandalone && window.screen) {
    const isPortrait = window.innerHeight >= window.innerWidth;
    const screenHeight = isPortrait
      ? Math.max(window.screen.width, window.screen.height)
      : Math.min(window.screen.width, window.screen.height);
    appHeight = Math.max(appHeight, screenHeight);
  }

  document.documentElement.style.setProperty('--app-height', `${Math.round(appHeight)}px`);
};

syncAppViewportHeight();
window.addEventListener('resize', syncAppViewportHeight);
window.addEventListener('orientationchange', syncAppViewportHeight);

// Safeguard Leaflet against race conditions during unmounting transitions
if (L && L.DomUtil) {
  const originalGetPosition = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el) {
    if (!el) {
      return L.point(0, 0);
    }
    return originalGetPosition(el);
  };

  const originalSetPosition = L.DomUtil.setPosition;
  L.DomUtil.setPosition = function (el, point) {
    if (el) {
      originalSetPosition(el, point);
    }
  };
}

if (L && L.Map) {
  const originalGetMapPanePos = L.Map.prototype._getMapPanePos;
  L.Map.prototype._getMapPanePos = function () {
    if (!this._mapPane) {
      return L.point(0, 0);
    }
    return originalGetMapPanePos.call(this);
  };

  const originalSetView = L.Map.prototype.setView;
  L.Map.prototype.setView = function (...args) {
    if (!this._mapPane) {
      return this;
    }
    return originalSetView.apply(this, args);
  };

  const originalResetView = L.Map.prototype._resetView;
  L.Map.prototype._resetView = function (...args) {
    if (!this._mapPane) {
      return this;
    }
    return originalResetView.apply(this, args);
  };
}


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="(Thay thế bằng Client ID của nhóm)">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
