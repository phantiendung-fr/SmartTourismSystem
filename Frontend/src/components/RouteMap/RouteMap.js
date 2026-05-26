import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Map, CloudFog, Sun, MapPin } from 'lucide-react';
import './RouteMap.css';

// Feature 2: Player Avatar (GIỮ NGUYÊN CODE CỦA BẠN)
import { createPlayerAvatarIcon } from '../PlayerAvatar/PlayerAvatar';

// Feature 3: Fog of War (GIỮ NGUYÊN CODE CỦA BẠN)
import { createFogLayer } from '../FogOfWar/FogOfWar';

// --- Fix Leaflet default icon issue with bundlers ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// --- Decode Google/OSRM encoded polyline ---
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

const RouteMap = ({ stops = [], routes = [], hiddenTasks = [], userLocation = null, user = null, onHiddenTaskClick = null }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    
    // State quản lý Sương Mù của bạn
    const [fogEnabled, setFogEnabled] = useState(true);

    // Layer Groups
    const routeLayerRef = useRef(null);
    const hiddenTasksLayerRef = useRef(null);
    const userLayerRef = useRef(null);
    const fogLayerRef = useRef(null); // Ref để chứa layer sương mù

    // =========================================================================
    // 1. KHỞI TẠO BẢN ĐỒ VÀ VẼ LỘ TRÌNH TĨNH
    // =========================================================================
    useEffect(() => {
        if (stops.length === 0 || !mapRef.current) return;

        if (!mapInstance.current) {
            const startLat = parseFloat(stops[0].latitude);
            const startLng = parseFloat(stops[0].longitude);

            mapInstance.current = L.map(mapRef.current, {
                zoomControl: true,
                attributionControl: false,
                zoomAnimation: false,
                fadeAnimation: false,
                markerZoomAnimation: false
            }).setView([startLat, startLng], 14);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);

            routeLayerRef.current = L.layerGroup().addTo(mapInstance.current);
            hiddenTasksLayerRef.current = L.layerGroup().addTo(mapInstance.current);
            userLayerRef.current = L.layerGroup().addTo(mapInstance.current);
        }

        const routeLayer = routeLayerRef.current;
        routeLayer.clearLayers();
        const bounds = [];

        stops.forEach((stop, index) => {
            const lat = parseFloat(stop.latitude);
            const lng = parseFloat(stop.longitude);
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
            mapInstance.current.fitBounds(bounds, { padding: [40, 40], animate: false });
        }
        
        setTimeout(() => { if (mapInstance.current) mapInstance.current.invalidateSize(); }, 200);

    }, [stops, routes]);

    // Cleanup map on unmount
    useEffect(() => {
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    // =========================================================================
    // 2. VẼ RƯƠNG BÁU KHỔNG LỒ (Tích hợp logic của mình vào đây)
    // =========================================================================
    useEffect(() => {
        if (!mapInstance.current || !hiddenTasksLayerRef.current) return;

        const tasksLayer = hiddenTasksLayerRef.current;
        tasksLayer.clearLayers(); 

        hiddenTasks.forEach((task) => {
            const lat = parseFloat(task.latitude);
            const lng = parseFloat(task.longitude);
            
            if (isNaN(lat) || isNaN(lng)) return;

            let svgHtml = '';
            let glowColor = '#7f8c8d'; 
            let rarityText = 'Thường';

            if (task.task_type === 'CHEST') {
                switch(task.rarity) {
                    case 'LEGENDARY': glowColor = '#f1c40f'; rarityText = 'Thần Thoại'; break;
                    case 'EPIC': glowColor = '#9b59b6'; rarityText = 'Chí Tôn'; break;
                    case 'RARE': glowColor = '#3498db'; rarityText = 'Hiếm'; break;
                    default: glowColor = '#95a5a6'; rarityText = 'Phổ Biến';
                }
                svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 24 24" fill="${glowColor}33" stroke="${glowColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C12 3 12 8 12 8s0-5 4.5-5a2.5 2.5 0 0 1 0 5z"/></svg>`;
            } else {
                glowColor = '#e74c3c'; rarityText = 'Sự Kiện';
                svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 24 24" fill="${glowColor}33" stroke="${glowColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
            }

            const taskMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'hidden-task-large-marker-leaflet-fix',
                    html: `
                        <div class="large-chest-marker-container">
                            <div class="large-chest-glow" style="background: ${glowColor};"></div>
                            <span class="large-chest-icon" style="display: flex; align-items: center; justify-content: center; width: 90px; height: 90px;">${svgHtml}</span>
                        </div>
                    `,
                    iconSize: [90, 90],
                    iconAnchor: [45, 90]
                })
            });

            taskMarker.bindPopup(`
                <div style="text-align:center; font-family:'Inter', sans-serif;">
                    <strong style="color:${glowColor}; font-size:14px;">${task.title || 'Phần thưởng ẩn'}</strong><br/>
                    <small>Độ hiếm: ${rarityText}</small><br/>
                    <p style="margin:8px 0 0; font-size:11px; color:#aaa; font-style:italic;">Lại gần dưới 5m để mở!</p>
                </div>
            `);

            taskMarker.on('click', () => { if (onHiddenTaskClick) onHiddenTaskClick(task); });
            taskMarker.addTo(tasksLayer);
        });

        mapInstance.current.invalidateSize();
    }, [hiddenTasks, onHiddenTaskClick]);

    // =========================================================================
    // 3. VẼ AVATAR NGƯỜI DÙNG (Giữ nguyên logic createPlayerAvatarIcon của bạn)
    // =========================================================================
    useEffect(() => {
        if (!mapInstance.current || !userLayerRef.current) return;
        const userLayer = userLayerRef.current;
        userLayer.clearLayers();

        if (userLocation && typeof userLocation.lat !== 'undefined' && typeof userLocation.lng !== 'undefined') {
            const userMarker = L.marker([userLocation.lat, userLocation.lng], {
                // Gọi hàm khởi tạo Avatar của bạn
                icon: createPlayerAvatarIcon(user)
            });
            userMarker.bindPopup('<b style="color:#e74c3c">Vị trí của bạn</b>');
            userMarker.addTo(userLayer);
        }
    }, [userLocation, user]);

    // =========================================================================
    // 4. QUẢN LÝ SƯƠNG MÙ (Giữ nguyên logic createFogLayer của bạn)
    // =========================================================================
    useEffect(() => {
        if (!mapInstance.current) return;
        
        // Xóa sương mù cũ nếu có
        if (fogLayerRef.current) {
            mapInstance.current.removeLayer(fogLayerRef.current);
            fogLayerRef.current = null;
        }

        // Vẽ lại sương mù dựa trên vị trí user
        if (fogEnabled && userLocation) {
            fogLayerRef.current = createFogLayer(mapInstance.current, userLocation);
        }
    }, [fogEnabled, userLocation]);

    if (stops.length === 0) return null;

    return (
        <div className="route-map-container" style={{ width: '100%', marginBottom: '20px' }}>
            <div className="route-map-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Map size={20} style={{ color: '#2d3436' }} />
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#2d3436', fontWeight: 'bold' }}>Bản đồ lộ trình</h3>
                </div>
                
                {/* NÚT BẬT TẮT SƯƠNG MÙ CỦA BẠN */}
                <button 
                    onClick={() => setFogEnabled(!fogEnabled)}
                    className="btn-toggle-fog"
                    title="Bật/Tắt Sương Mù"
                    style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                >
                    {fogEnabled ? <CloudFog size={22} color="#7f8c8d" /> : <Sun size={22} color="#f1c40f" />}
                </button>
            </div>
            
            <div className="route-map-wrapper" style={{ height: '380px', width: '100%', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', background: '#e0e0e0' }}>
                <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
            </div>
            
            <div className="route-map-footer" style={{ marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {routes.length > 0 && (
                    <span className="legend-hint" style={{ fontSize: '12px', color: '#b2bec3', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} /> Nhấn vào đường đi hoặc rương báu để tương tác
                    </span>
                )}
            </div>
            
            <style>{`
                /* Container cho Rương lớn */
                .large-chest-marker-container {
                    position: relative; display: flex; align-items: center; justify-content: center;
                    width: 90px; height: 90px; /* Tăng lên 90px */
                    cursor: pointer; transform: translateY(-10%); 
                }

                /* Vòng hào quang phát sáng Pulse lớn */
                .large-chest-glow {
                    position: absolute; 
                    width: 90px; height: 90px; /* Tăng lên 90px */
                    border-radius: 50%; opacity: 0.5;
                    animation: pulse-glow-ring-large 2s infinite ease-in-out; z-index: 1;
                }

                /* Biểu tượng Emoji lớn */
                .large-chest-icon {
                    font-size: 70px; /* Tăng từ 45px lên 70px */
                    z-index: 2; position: relative;
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
                    animation: float-chest-large 3s infinite ease-in-out;
                }

                /* Animations */
                @keyframes pulse-glow-ring-large {
                    0% { transform: scale(0.6); opacity: 0.7; }
                    50% { transform: scale(1.3); opacity: 0.1; }
                    100% { transform: scale(0.6); opacity: 0.7; }
                }
                @keyframes float-chest-large {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                /* Kill Leaflet Default DivIcon styles */
                .hidden-task-large-marker-leaflet-fix {
                    background: transparent !important; border: none !important;
                }
            `}</style>
        </div>
    );
};

export default RouteMap;
