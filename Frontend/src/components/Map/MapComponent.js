import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapComponent = ({ stops = [], userLocation = null, hiddenTasks = [], onHiddenTaskClick = null }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersLayer = useRef(null);

    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;

        const centerLat = stops.length > 0 ? parseFloat(stops[0].latitude) : 21.0285;
        const centerLng = stops.length > 0 ? parseFloat(stops[0].longitude) : 105.8542;

        mapInstance.current = L.map(mapRef.current).setView([centerLat, centerLng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
        }).addTo(mapInstance.current);

        markersLayer.current = L.layerGroup().addTo(mapInstance.current);

        setTimeout(() => {
            mapInstance.current?.invalidateSize();
        }, 400);

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
            markersLayer.current = null;
        };
    }, [stops]);

    useEffect(() => {
        if (!mapInstance.current || !markersLayer.current) return;

        markersLayer.current.clearLayers();
        const bounds = [];
        const nextStop = stops.find((stop) => stop.status === 'PENDING' || stop.status === 'VISITING');

        stops.forEach((stop, index) => {
            if (!stop.latitude || !stop.longitude) return;

            const lat = parseFloat(stop.latitude);
            const lng = parseFloat(stop.longitude);
            if (Number.isNaN(lat) || Number.isNaN(lng)) return;

            let markerColor = '#2196F3';
            if (stop.status === 'COMPLETED') markerColor = '#4CAF50';
            else if (nextStop && stop.stop_id === nextStop.stop_id) markerColor = '#FF9800';

            L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color:${markerColor};color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;font-weight:bold;font-size:12px;box-shadow:0 2px 5px rgba(0,0,0,0.3);">${index + 1}</div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                }),
            })
                .bindPopup(`<b>${stop.location_name}</b><br/>${stop.arrival_time ? `Đến: ${stop.arrival_time.slice(0, 5)}` : ''}`)
                .addTo(markersLayer.current);

            bounds.push([lat, lng]);
        });

        if (userLocation?.lat && userLocation?.lng) {
            L.marker([userLocation.lat, userLocation.lng], {
                icon: L.divIcon({
                    className: 'user-icon',
                    html: `<div style="background-color:#F44336;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(244,67,54,0.6);position:relative;"><div style="position:absolute;top:-2px;left:-2px;right:-2px;bottom:-2px;border-radius:50%;border:2px solid #F44336;animation:pulse 2s infinite;"></div></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                }),
            })
                .bindPopup('Vị trí của bạn')
                .addTo(markersLayer.current);

            bounds.push([userLocation.lat, userLocation.lng]);
        }

        hiddenTasks.forEach((task) => {
            if (!task.latitude || !task.longitude) return;

            const lat = parseFloat(task.latitude);
            const lng = parseFloat(task.longitude);
            if (Number.isNaN(lat) || Number.isNaN(lng)) return;

            const rarityColors = {
                COMMON: '#7f8c8d',
                RARE: '#2980b9',
                EPIC: '#8e44ad',
                LEGENDARY: '#f1c40f',
            };
            const color = rarityColors[task.rarity] || '#7f8c8d';

            let emoji = '🎁';
            let label = 'Rương kho báu';
            if (task.task_type === 'DYNAMIC_QUEST') {
                emoji = '🔮';
                label = 'Sự kiện đặc biệt';
            }

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'hidden-task-icon',
                    html: `<div class="glowing-chest" style="background-color:${color};border:2px solid white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 12px ${color};cursor:pointer;animation:float-effect 2s infinite ease-in-out;position:relative;">${emoji}<div style="position:absolute;width:40px;height:40px;border-radius:50%;border:2px dashed ${color};top:-6px;left:-6px;animation:spin-circle 8s infinite linear;"></div></div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                }),
            });

            marker.bindPopup(`<b>${task.title || label}</b><br/><small>${task.rarity} - Click để xem!</small>`);
            marker.on('click', () => {
                if (onHiddenTaskClick) onHiddenTaskClick(task);
            });
            marker.addTo(markersLayer.current);
            bounds.push([lat, lng]);
        });

        if (bounds.length > 0) {
            mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
        }
    }, [stops, userLocation, hiddenTasks, onHiddenTaskClick]);

    return (
        <div
            style={{
                height: '350px',
                width: '100%',
                marginBottom: '25px',
                position: 'relative',
                background: '#e0e0e0',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
        >
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
        </div>
    );
};

export default MapComponent;
