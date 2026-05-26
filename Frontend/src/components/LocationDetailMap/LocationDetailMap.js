import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationDetailMap.css';

const LocationDetailMap = ({ stop, userLocation }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const layersRef = useRef(null);

    // 1. Initialize map once on mount
    useEffect(() => {
        if (!mapRef.current) return;

        const map = L.map(mapRef.current, {
            zoomControl: true,
            attributionControl: true,
            zoomAnimation: false,
            fadeAnimation: false,
            markerZoomAnimation: false
        });
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 18,
        }).addTo(map);

        layersRef.current = L.layerGroup().addTo(map);

        setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 300);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            layersRef.current = null;
        };
    }, []);

    // 2. Draw content whenever stop or userLocation changes
    useEffect(() => {
        const map = mapInstanceRef.current;
        const layers = layersRef.current;
        if (!map || !layers || !stop) return;

        layers.clearLayers();
        const bounds = [];

        const lat = parseFloat(stop.latitude);
        const lng = parseFloat(stop.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
            const stopIcon = L.divIcon({
                className: 'detail-stop-icon',
                html: `<div style="background-color: #E17055; width: 24px; height: 24px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            L.marker([lat, lng], { icon: stopIcon }).bindPopup(`<b>${stop.location_name}</b>`).addTo(layers);
            bounds.push([lat, lng]);
        }

        if (userLocation && userLocation.lat && userLocation.lng) {
            const userIcon = L.divIcon({
                className: 'detail-user-icon',
                html: `<div style="background-color: #0984E3; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(9,132,227,0.6);"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).bindPopup('Vị trí của bạn').addTo(layers);
            bounds.push([userLocation.lat, userLocation.lng]);

            // Draw line
            if (!isNaN(lat) && !isNaN(lng)) {
                L.polyline([[userLocation.lat, userLocation.lng], [lat, lng]], {
                    color: '#0984E3',
                    weight: 4,
                    dashArray: '10, 10',
                    opacity: 0.8
                }).addTo(layers);
            }
        }

        if (bounds.length > 0) {
            map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 15, animate: false });
        }
    }, [stop, userLocation]);

    return (
        <div className="location-detail-map-wrapper">
            <div ref={mapRef} className="location-detail-map" />
        </div>
    );
};

export default LocationDetailMap;
