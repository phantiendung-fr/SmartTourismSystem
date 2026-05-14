import React, { useEffect, useRef, useState } from 'react';

const MapComponent = ({ stops = [], userLocation = null }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersLayer = useRef(null);
    const [libLoaded, setLibLoaded] = useState(!!window.L);

    // Kiểm tra thư viện Leaflet có sẵn hay chưa
    useEffect(() => {
        if (!window.L) {
            const interval = setInterval(() => {
                if (window.L) {
                    setLibLoaded(true);
                    clearInterval(interval);
                }
            }, 500);
            return () => clearInterval(interval);
        }
    }, []);

    useEffect(() => {
        if (!libLoaded || !mapRef.current || !window.L) return;

        // Khởi tạo bản đồ nếu chưa có
        if (!mapInstance.current) {
            const centerLat = stops.length > 0 ? parseFloat(stops[0].latitude) : 21.0285;
            const centerLng = stops.length > 0 ? parseFloat(stops[0].longitude) : 105.8542;

            mapInstance.current = window.L.map(mapRef.current).setView([centerLat, centerLng], 13);

            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(mapInstance.current);

            markersLayer.current = window.L.layerGroup().addTo(mapInstance.current);
            
            // Fix lỗi hiển thị khi container thay đổi kích thước
            setTimeout(() => {
                mapInstance.current.invalidateSize();
            }, 400);
        }

        // Cập nhật markers
        if (mapInstance.current && markersLayer.current) {
            markersLayer.current.clearLayers();
            const bounds = [];

            // 1. Thêm các điểm dừng
            // Tìm điểm "tiếp theo" (điểm chưa xong đầu tiên)
            const nextStop = stops.find(s => s.status === 'PENDING' || s.status === 'VISITING');

            stops.forEach((stop, index) => {
                if (!stop.latitude || !stop.longitude) return;
                
                const lat = parseFloat(stop.latitude);
                const lng = parseFloat(stop.longitude);

                // Xác định màu sắc marker
                let markerColor = '#2196F3'; // Mặc định: Xanh dương
                if (stop.status === 'COMPLETED') {
                    markerColor = '#4CAF50'; // Đã xong: Xanh lá
                } else if (nextStop && stop.stop_id === nextStop.stop_id) {
                    markerColor = '#FF9800'; // Điểm tiếp theo: Màu Cam
                }
                
                window.L.marker([lat, lng], {
                    icon: window.L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background-color: ${markerColor}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; font-weight: bold; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${index + 1}</div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    })
                })
                .bindPopup(`<b>${stop.location_name}</b><br/>${stop.arrival_time ? 'Đến: ' + stop.arrival_time.slice(0, 5) : ''}`)
                .addTo(markersLayer.current);
                
                bounds.push([lat, lng]);
            });

            // 2. Thêm vị trí người dùng
            if (userLocation && userLocation.lat && userLocation.lng) {
                window.L.marker([userLocation.lat, userLocation.lng], {
                    icon: window.L.divIcon({
                        className: 'user-icon',
                        html: `<div style="background-color: #F44336; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(244, 67, 54, 0.6); position: relative;">
                                <div style="position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px; border-radius: 50%; border: 2px solid #F44336; animation: pulse 2s infinite;"></div>
                               </div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                })
                .bindPopup("Vị trí của bạn")
                .addTo(markersLayer.current);
                
                bounds.push([userLocation.lat, userLocation.lng]);
            }

            if (bounds.length > 0) {
                mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
            }
        }
    }, [libLoaded, stops, userLocation]);

    return (
        <div style={{ 
            height: '350px', 
            width: '100%', 
            marginBottom: '25px', 
            position: 'relative',
            background: '#e0e0e0',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
            {!libLoaded && (
                <div style={{ 
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(255,255,255,0.8)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000 
                }}>
                    <div className="map-loader">Đang tải dữ liệu bản đồ...</div>
                </div>
            )}
        </div>
    );
};

export default MapComponent;
