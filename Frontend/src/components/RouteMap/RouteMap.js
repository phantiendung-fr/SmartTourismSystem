import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteMap.css';

// Feature 2: Player Avatar
import { createPlayerAvatarIcon } from '../PlayerAvatar/PlayerAvatar';

// Feature 3: Fog of War
import { createFogLayer } from '../FogOfWar/FogOfWar';

// --- Fix Leaflet default icon issue with bundlers ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// --- Decode Google/OSRM encoded polyline (Algorithm from Google) ---
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

// --- Màu sắc cho các route theo ngày ---
const DAY_COLORS = ['#6C5CE7', '#00B894', '#E17055', '#0984E3', '#FDCB6E', '#E84393'];

// --- Custom icon cho marker ---
function createStopIcon(order, status) {
    const bgColor = status === 'COMPLETED' ? '#00b894' :
                    status === 'VISITING'  ? '#f39c12' : '#0984e3';
    return L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pin" style="background:${bgColor}"><span>${order}</span></div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -45],
    });
}

// --- Feature 1: Tính khoảng cách giữa 2 tọa độ (Haversine formula) ---
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // bán kính Trái Đất (mét)
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Format khoảng cách cho hiển thị
 */
function formatDistance(meters) {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
}

const RouteMap = ({ stops = [], routes = [], userLocation = null, user = null, nextStop = null }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const userMarkerRef = useRef(null);
    const fogLayerRef = useRef(null);
    const checkinCirclesRef = useRef([]);
    const userLineRef = useRef(null);
    const distanceBadgeRef = useRef(null);

    // Feature 3: Fog toggle — mặc định BẬT, người dùng có thể tắt
    const [fogEnabled, setFogEnabled] = useState(true);

    // useEffect 1: Khởi tạo map + vẽ routes/stops (CHỈ khi stops hoặc routes thay đổi)
    useEffect(() => {
        if (!mapRef.current || stops.length === 0) return;

        // Destroy previous map if it exists
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
            userMarkerRef.current = null;
            fogLayerRef.current = null;
            checkinCirclesRef.current = [];
            userLineRef.current = null;
            distanceBadgeRef.current = null;
        }

        // --- Init map ---
        const map = L.map(mapRef.current, {
            zoomControl: true,
            attributionControl: true,
        });
        mapInstanceRef.current = map;

        // OpenStreetMap tiles (miễn phí)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(map);

        const allLatLngs = [];

        // --- Vẽ routes (polyline) ---
        routes.forEach((route) => {
            // Tìm stop tương ứng để lấy day_order cho màu
            const fromStop = stops.find(s => s.stop_id === route.from_stop_id);
            const dayIndex = fromStop ? (fromStop.day_order || 1) - 1 : 0;
            const color = DAY_COLORS[dayIndex % DAY_COLORS.length];

            let routeCoords;
            try {
                routeCoords = decodePolyline(route.polyline_data);
            } catch (e) {
                // Fallback: nếu polyline không decode được, vẽ đường thẳng
                const toStop = stops.find(s => s.stop_id === route.to_stop_id);
                if (fromStop && toStop) {
                    routeCoords = [
                        [parseFloat(fromStop.latitude), parseFloat(fromStop.longitude)],
                        [parseFloat(toStop.latitude), parseFloat(toStop.longitude)]
                    ];
                } else {
                    return;
                }
            }

            if (routeCoords.length > 0) {
                const polyline = L.polyline(routeCoords, {
                    color: color,
                    weight: 4,
                    opacity: 0.8,
                    dashArray: null,
                    lineJoin: 'round',
                });
                polyline.addTo(map);

                // Popup hiển thị thông tin route
                const midIdx = Math.floor(routeCoords.length / 2);
                const midPoint = routeCoords[midIdx];
                L.popup({ closeButton: false, autoClose: true, className: 'route-popup' })
                    .setLatLng(midPoint)
                    .setContent(`<b>${route.distance} km</b> · ${route.travel_time} phút`);
                
                // Nhấn vào route sẽ hiện popup
                polyline.on('click', (e) => {
                    L.popup({ className: 'route-popup' })
                        .setLatLng(e.latlng)
                        .setContent(`<b>${route.distance} km</b> · ${route.travel_time} phút`)
                        .openOn(map);
                });

                routeCoords.forEach(c => allLatLngs.push(c));
            }
        });

        // --- Vẽ markers cho các trạm dừng ---
        stops.forEach((stop) => {
            const lat = parseFloat(stop.latitude);
            const lng = parseFloat(stop.longitude);
            if (isNaN(lat) || isNaN(lng)) return;

            const icon = createStopIcon(stop.stop_order, stop.status);
            const marker = L.marker([lat, lng], { icon }).addTo(map);

            const priceStr = stop.min_price
                ? `${new Intl.NumberFormat('vi-VN').format(stop.min_price)}đ`
                : '';

            marker.bindPopup(`
                <div class="stop-popup">
                    <strong>${stop.location_name}</strong><br/>
                    <span>🕐 ${stop.arrival_time?.slice(0, 5)} - ${stop.departure_time?.slice(0, 5)}</span>
                    ${priceStr ? `<br/><span>💰 ${priceStr}</span>` : ''}
                    ${stop.status === 'COMPLETED' ? '<br/><span style="color:#00b894">✅ Đã check-in</span>' : ''}
                </div>
            `);

            allLatLngs.push([lat, lng]);

            // ===== Feature 1: Vòng tròn bán kính check-in =====
            const checkinRadius = stop.checkin_radius || 100; // mét
            const circleColor = stop.status === 'COMPLETED' ? '#00b894' :
                                stop.status === 'VISITING'  ? '#f39c12' : '#0984e3';
            
            const circle = L.circle([lat, lng], {
                radius: checkinRadius,
                color: circleColor,
                fillColor: circleColor,
                fillOpacity: stop.status === 'COMPLETED' ? 0.08 : 0.12,
                weight: stop.status === 'COMPLETED' ? 1 : 1.5,
                dashArray: stop.status === 'COMPLETED' ? null : '6 4',
                className: 'checkin-radius-circle',
            }).addTo(map);

            circle.bindTooltip(`Bán kính check-in: ${checkinRadius}m`, {
                direction: 'bottom',
                className: 'checkin-radius-tooltip',
                opacity: 0.8,
            });

            checkinCirclesRef.current.push(circle);
        });

        // ===== Feature 3: Fog of War (chỉ thêm nếu fog đang bật) =====
        if (fogEnabled) {
            const fogLayer = createFogLayer(stops, null);
            fogLayer.addTo(map);
            fogLayerRef.current = fogLayer;
        }

        // --- Auto zoom để thấy toàn bộ route ---
        if (allLatLngs.length > 0) {
            const bounds = L.latLngBounds(allLatLngs);
            map.fitBounds(bounds, { padding: [40, 40] });
        }

        // Cleanup
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                userMarkerRef.current = null;
                fogLayerRef.current = null;
                checkinCirclesRef.current = [];
                userLineRef.current = null;
                distanceBadgeRef.current = null;
            }
        };
    }, [stops, routes]);

    // useEffect 2: Cập nhật vị trí user RIÊNG BIỆT (không destroy map)
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        // Xóa marker cũ nếu có
        if (userMarkerRef.current) {
            userMarkerRef.current.remove();
            userMarkerRef.current = null;
        }

        // Xóa đường nối cũ
        if (userLineRef.current) {
            userLineRef.current.remove();
            userLineRef.current = null;
        }

        // Xóa distance badge cũ
        if (distanceBadgeRef.current) {
            distanceBadgeRef.current.remove();
            distanceBadgeRef.current = null;
        }

        // Thêm marker mới nếu có vị trí user
        if (userLocation && userLocation.lat && userLocation.lng) {
            // ===== Feature 2: Player Avatar thay vì chấm đỏ =====
            const avatarIcon = createPlayerAvatarIcon(user);
            userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { 
                icon: avatarIcon,
                zIndexOffset: 1000, // Đảm bảo avatar luôn trên cùng
            })
                .bindPopup(`
                    <div class="player-popup">
                        <strong>📍 ${user?.full_name || 'Vị trí của bạn'}</strong><br/>
                        <small>${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}</small>
                    </div>
                `)
                .addTo(map);

            // ===== Feature 1: Đường nối dashed từ user → next stop =====
            if (nextStop) {
                const nextLat = parseFloat(nextStop.latitude);
                const nextLng = parseFloat(nextStop.longitude);
                if (!isNaN(nextLat) && !isNaN(nextLng)) {
                    // Vẽ đường nối dashed
                    userLineRef.current = L.polyline(
                        [[userLocation.lat, userLocation.lng], [nextLat, nextLng]],
                        {
                            color: '#f39c12',
                            weight: 2.5,
                            dashArray: '8 6',
                            opacity: 0.7,
                            className: 'user-to-next-line',
                        }
                    ).addTo(map);

                    // Tính khoảng cách
                    const distance = haversineDistance(
                        userLocation.lat, userLocation.lng,
                        nextLat, nextLng
                    );

                    // Hiển thị badge khoảng cách ở giữa đường nối
                    const midLat = (userLocation.lat + nextLat) / 2;
                    const midLng = (userLocation.lng + nextLng) / 2;
                    
                    distanceBadgeRef.current = L.marker([midLat, midLng], {
                        icon: L.divIcon({
                            className: 'distance-badge-container',
                            html: `<div class="distance-badge">
                                        <span class="distance-icon">🏃</span>
                                        <span class="distance-value">${formatDistance(distance)}</span>
                                   </div>`,
                            iconSize: [90, 30],
                            iconAnchor: [45, 15],
                        }),
                        interactive: false,
                    }).addTo(map);
                }
            }

            // ===== Feature 3: Cập nhật fog quanh user =====
            if (fogLayerRef.current) {
                fogLayerRef.current.updateUserLocation(userLocation);
            }
        }
    }, [userLocation, user, nextStop]);

    // useEffect 3: Cập nhật fog khi stops thay đổi status (check-in mới)
    useEffect(() => {
        if (fogLayerRef.current) {
            fogLayerRef.current.updateStops(stops);
        }
    }, [stops]);

    // useEffect 4: Bật/tắt fog layer khi toggle
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (fogEnabled) {
            // Bật fog: tạo layer mới nếu chưa có
            if (!fogLayerRef.current) {
                const fogLayer = createFogLayer(stops, userLocation);
                fogLayer.addTo(map);
                fogLayerRef.current = fogLayer;
            }
        } else {
            // Tắt fog: xóa layer
            if (fogLayerRef.current) {
                fogLayerRef.current.remove();
                fogLayerRef.current = null;
            }
        }
    }, [fogEnabled]);

    if (stops.length === 0) return null;

    // Đếm số điểm đã completed
    const completedCount = stops.filter(s => s.status === 'COMPLETED').length;
    const totalCount = stops.length;
    const explorationPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div className="route-map-container">
            <div className="route-map-header">
                <span className="map-icon">🗺️</span>
                <h3>Bản đồ lộ trình</h3>
                {/* Feature 3: Thanh tiến trình khám phá + Toggle fog */}
                {fogEnabled && (
                    <div className="exploration-badge">
                        <span className="exploration-icon">🔍</span>
                        <span className="exploration-text">{explorationPercent}%</span>
                    </div>
                )}
                <button
                    className={`fog-toggle-btn ${fogEnabled ? 'fog-on' : 'fog-off'}`}
                    onClick={() => setFogEnabled(prev => !prev)}
                    title={fogEnabled ? 'Tắt sương mù' : 'Bật sương mù'}
                >
                    {fogEnabled ? '🌫️' : '☀️'}
                </button>
            </div>
            <div className="route-map-wrapper">
                <div ref={mapRef} className="route-map" />
            </div>
            <div className="route-map-footer">
                {routes.length > 0 && (
                    <span className="legend-hint">📍 Nhấn vào đường để xem khoảng cách & thời gian</span>
                )}
                {/* Feature 3: Fog legend (chỉ hiện khi fog bật) */}
                {fogEnabled && (
                    <div className="fog-legend">
                        <span className="fog-legend-item">
                            <span className="fog-dot fog-dot-hidden"></span> Đã khám phá
                        </span>
                        <span className="fog-legend-item">
                            <span className="fog-dot fog-dot-fog"></span> Chưa khám phá
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteMap;
