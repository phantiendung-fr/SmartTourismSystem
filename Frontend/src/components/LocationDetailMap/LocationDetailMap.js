import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationDetailMap.css';

const LocationDetailMap = ({ stop, userLocation }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current || !stop) return;

        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const map = L.map(mapRef.current, {
            zoomControl: true,
            attributionControl: true,
        });
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 18,
        }).addTo(map);

        const lat = parseFloat(stop.latitude);
        const lng = parseFloat(stop.longitude);
        const bounds = [];

        if (!isNaN(lat) && !isNaN(lng)) {
            const stopIcon = L.divIcon({
                className: 'detail-stop-icon',
                html: `<div style="background-color: #E17055; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 12px;">📍</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            L.marker([lat, lng], { icon: stopIcon }).bindPopup(`<b>${stop.location_name}</b>`).addTo(map);
            bounds.push([lat, lng]);
        }

        if (userLocation && userLocation.lat && userLocation.lng) {
            const userIcon = L.divIcon({
                className: 'detail-user-icon',
                html: `<div style="background-color: #0984E3; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(9,132,227,0.6);"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).bindPopup('Vị trí của bạn').addTo(map);
            bounds.push([userLocation.lat, userLocation.lng]);

            // Draw line
            if (!isNaN(lat) && !isNaN(lng)) {
                L.polyline([[userLocation.lat, userLocation.lng], [lat, lng]], {
                    color: '#0984E3',
                    weight: 4,
                    dashArray: '10, 10',
                    opacity: 0.8
                }).addTo(map);
            }
        }

        if (bounds.length > 0) {
            map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 15 });
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [stop, userLocation]);

    return (
        <div className="location-detail-map-wrapper">
            <div ref={mapRef} className="location-detail-map" />
        </div>
    );
};

export default LocationDetailMap;
