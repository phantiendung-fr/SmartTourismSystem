import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteMap.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function decodePolyline(encoded) {
    const points = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
        let shift = 0, result = 0, byte;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);

        shift = 0; result = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);
        points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
}

// BỔ SUNG THÊM PROP: userLocation
const RouteMap = ({ stops = [], routes = [], hiddenTasks = [], userLocation = null, onHiddenTaskClick = null }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    
    // Thêm Layer thứ 3 dành riêng cho Vị trí người dùng
    const routeLayerRef = useRef(null);
    const hiddenTasksLayerRef = useRef(null);
    const userLayerRef = useRef(null);

    // 1. VẼ LỘ TRÌNH TĨNH
    useEffect(() => {
        if (stops.length === 0 || !mapRef.current) return;

        if (!mapInstance.current) {
            const startLat = parseFloat(stops[0].latitude);
            const startLng = parseFloat(stops[0].longitude);

            const map = L.map(mapRef.current, {
                zoomControl: true,
                attributionControl: false
            }).setView([startLat, startLng], 14);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

            routeLayerRef.current = L.layerGroup().addTo(map);
            hiddenTasksLayerRef.current = L.layerGroup().addTo(map);
            userLayerRef.current = L.layerGroup().addTo(map); // Khởi tạo layer vị trí

            mapInstance.current = map;
        }

        const routeLayer = routeLayerRef.current;
        routeLayer.clearLayers(); 
        const bounds = [];

        stops.forEach((stop, index) => {
            const lat = parseFloat(stop.latitude);
            const lng = parseFloat(stop.longitude);
            if (isNaN(lat) || isNaN(lng)) return;
            
            bounds.push([lat, lng]);

            const stopMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'custom-stop-icon',
                    html: `<div style="background:#1976d2;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${index + 1}</div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            });
            stopMarker.bindPopup(`<b>${stop.location_name || 'Trạm dừng'}</b>`);
            stopMarker.addTo(routeLayer);
        });

        routes.forEach((route) => {
            if (route.polyline_data) {
                const coordinates = decodePolyline(route.polyline_data);
                const polyline = L.polyline(coordinates, { color: '#2196f3', weight: 5, opacity: 0.75 });
                polyline.bindPopup(`<b>Khoảng cách:</b> ${route.distance} km<br/><b>Thời gian:</b> ${route.travel_time} phút`);
                polyline.addTo(routeLayer);
            }
        });

        if (bounds.length > 0) {
            mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
        }
        
        setTimeout(() => { if (mapInstance.current) mapInstance.current.invalidateSize(); }, 200);
    }, [stops, routes]);

    // 2. VẼ RƯƠNG ẨN
    useEffect(() => {
        if (!mapInstance.current || !hiddenTasksLayerRef.current) return;

        const tasksLayer = hiddenTasksLayerRef.current;
        tasksLayer.clearLayers(); 

        hiddenTasks.forEach((task) => {
            const lat = parseFloat(task.latitude);
            const lng = parseFloat(task.longitude);
            if (isNaN(lat) || isNaN(lng)) return;

            let emojiIcon = '📦'; 
            let glowColor = '#7f8c8d'; 

            if (task.task_type === 'CHEST') {
                if (task.rarity === 'LEGENDARY') { emojiIcon = '🏆'; glowColor = '#f1c40f'; }
                else if (task.rarity === 'EPIC') { emojiIcon = '👑'; glowColor = '#9b59b6'; }
                else if (task.rarity === 'RARE') { emojiIcon = '💎'; glowColor = '#3498db'; }
            } else {
                emojiIcon = '🔮'; 
                glowColor = '#e74c3c';
            }

            const taskMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'hidden-task-marker-wrapper',
                    html: `
                        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; cursor: pointer;">
                            <div style="position: absolute; width: 32px; height: 32px; background: ${glowColor}; opacity: 0.4; border-radius: 50%; animation: pulse-glow-ring 2s infinite ease-in-out;"></div>
                            <span style="font-size: 26px; z-index: 2; position: relative;">${emojiIcon}</span>
                        </div>
                    `,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                })
            });

            taskMarker.bindPopup(`<div style="text-align:center;"><strong>${task.title}</strong><br/><small>${task.rarity}</small></div>`);
            taskMarker.on('click', () => { if (onHiddenTaskClick) onHiddenTaskClick(task); });
            taskMarker.addTo(tasksLayer);
        });
        mapInstance.current.invalidateSize();
    }, [hiddenTasks, onHiddenTaskClick]);

    // =========================================================================
    // 3. VẼ CHẤM ĐỎ VỊ TRÍ NGƯỜI DÙNG
    // =========================================================================
    useEffect(() => {
        if (!mapInstance.current || !userLayerRef.current) return;
        const userLayer = userLayerRef.current;
        userLayer.clearLayers();

        if (userLocation && typeof userLocation.lat !== 'undefined' && typeof userLocation.lng !== 'undefined') {
            const userMarker = L.marker([userLocation.lat, userLocation.lng], {
                icon: L.divIcon({
                    className: 'user-location-marker',
                    html: `<div style="background:#e74c3c; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(231,76,60,0.8); animation: pulse-red 1.5s infinite;"></div>`,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                })
            });
            userMarker.bindPopup('<b style="color:#e74c3c">📍 Vị trí của bạn</b>');
            userMarker.addTo(userLayer);
        }
    }, [userLocation]);

    if (stops.length === 0) return null;

    return (
        <div className="route-map-container" style={{ width: '100%', marginBottom: '20px' }}>
            <div className="route-map-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span className="map-icon" style={{ fontSize: '20px' }}>🗺️</span>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#2d3436', fontWeight: 'bold' }}>Bản đồ lộ trình</h3>
            </div>
            
            <div className="route-map-wrapper" style={{ height: '380px', width: '100%', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', background: '#e0e0e0' }}>
                <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
            </div>
            
            {routes.length > 0 && (
                <div className="route-map-legend" style={{ marginTop: '8px', textAlign: 'center' }}>
                    <span className="legend-hint" style={{ fontSize: '12px', color: '#b2bec3' }}>📍 Nhấn vào đường đi hoặc rương báu để tương tác</span>
                </div>
            )}
            
            <style>{`
                @keyframes pulse-glow-ring {
                    0% { transform: scale(0.6); opacity: 0.6; }
                    50% { transform: scale(1.3); opacity: 0.1; }
                    100% { transform: scale(0.6); opacity: 0.6; }
                }
                /* Bổ sung hiệu ứng tỏa sóng đỏ cho user */
                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7); }
                    70% { box-shadow: 0 0 0 15px rgba(231, 76, 60, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
                }
            `}</style>
        </div>
    );
};

export default RouteMap;