import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from '@react-oauth/google';
import L from 'leaflet';

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
