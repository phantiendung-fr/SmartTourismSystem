/**
 * FogOfWar.js
 * Tạo lớp sương mù trên Leaflet map, phủ toàn bộ bản đồ.
 * Các điểm đã check-in (COMPLETED) sẽ "đục lỗ" trong fog.
 * Sử dụng SVG overlay với CSS mask.
 */
import L from 'leaflet';
import './FogOfWar.css';

/**
 * Tạo custom Leaflet layer cho Fog of War
 */
const FogLayer = L.Layer.extend({
    options: {
        fogColor: 'rgba(20, 20, 40, 0.55)',     // Màu fog — xanh đen mờ
        revealRadius: 150,                        // Bán kính lỗ mặc định (px tại zoom hiện tại)
        revealRadiusCompleted: 200,               // Bán kính lỗ khi completed (to hơn)
        transitionDuration: '0.8s',               // Thời gian animation fog tan
        userRevealRadius: 80,                     // Bán kính reveal quanh user
    },

    initialize: function (stops, userLocation, options) {
        L.Util.setOptions(this, options);
        this._stops = stops || [];
        this._userLocation = userLocation;
        this._svgEl = null;
    },

    onAdd: function (map) {
        this._map = map;

        // Tạo SVG element phủ toàn bộ map container
        const container = map.getContainer();
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'fog-overlay-svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '450';
        svg.style.transition = `opacity ${this.options.transitionDuration} ease`;

        this._svgEl = svg;
        container.appendChild(svg);

        // Vẽ fog ban đầu
        this._updateFog();

        // Cập nhật fog khi map di chuyển hoặc zoom
        map.on('moveend zoomend', this._updateFog, this);

        return this;
    },

    onRemove: function (map) {
        if (this._svgEl && this._svgEl.parentNode) {
            this._svgEl.parentNode.removeChild(this._svgEl);
        }
        map.off('moveend zoomend', this._updateFog, this);
        return this;
    },

    /**
     * Cập nhật data stops (khi check-in mới)
     */
    updateStops: function (stops) {
        this._stops = stops || [];
        this._updateFog();
    },

    /**
     * Cập nhật vị trí user
     */
    updateUserLocation: function (userLocation) {
        this._userLocation = userLocation;
        this._updateFog();
    },

    /**
     * Vẽ lại fog SVG
     */
    _updateFog: function () {
        if (!this._map || !this._svgEl) return;

        const map = this._map;
        const size = map.getSize();
        const svg = this._svgEl;

        // Clear SVG content
        svg.innerHTML = '';
        svg.setAttribute('viewBox', `0 0 ${size.x} ${size.y}`);

        // Tạo defs cho mask
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

        // Mask: trắng = hiển thị fog, đen = ẩn fog (đục lỗ)
        const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
        mask.setAttribute('id', 'fog-mask');

        // Nền trắng toàn bộ (fog phủ hết)
        const maskBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        maskBg.setAttribute('x', '0');
        maskBg.setAttribute('y', '0');
        maskBg.setAttribute('width', size.x);
        maskBg.setAttribute('height', size.y);
        maskBg.setAttribute('fill', 'white');
        mask.appendChild(maskBg);

        // Đục lỗ tại vị trí user (nếu có)
        if (this._userLocation && this._userLocation.lat && this._userLocation.lng) {
            const userPoint = map.latLngToContainerPoint([this._userLocation.lat, this._userLocation.lng]);

            // Gradient radial cho lỗ user — mềm ở viền
            const userGradId = 'user-reveal-grad';
            const userGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
            userGrad.setAttribute('id', userGradId);
            const userStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            userStop1.setAttribute('offset', '0%');
            userStop1.setAttribute('stop-color', 'black');
            userStop1.setAttribute('stop-opacity', '1');
            const userStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            userStop2.setAttribute('offset', '70%');
            userStop2.setAttribute('stop-color', 'black');
            userStop2.setAttribute('stop-opacity', '0.8');
            const userStop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            userStop3.setAttribute('offset', '100%');
            userStop3.setAttribute('stop-color', 'white');
            userStop3.setAttribute('stop-opacity', '1');
            userGrad.appendChild(userStop1);
            userGrad.appendChild(userStop2);
            userGrad.appendChild(userStop3);
            defs.appendChild(userGrad);

            const userCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            userCircle.setAttribute('cx', userPoint.x);
            userCircle.setAttribute('cy', userPoint.y);
            userCircle.setAttribute('r', this.options.userRevealRadius);
            userCircle.setAttribute('fill', `url(#${userGradId})`);
            mask.appendChild(userCircle);
        }

        // Đục lỗ tại các điểm đã COMPLETED
        this._stops.forEach((stop, index) => {
            if (stop.status !== 'COMPLETED') return;

            const lat = parseFloat(stop.latitude);
            const lng = parseFloat(stop.longitude);
            if (isNaN(lat) || isNaN(lng)) return;

            const point = map.latLngToContainerPoint([lat, lng]);
            const radius = this.options.revealRadiusCompleted;

            // Gradient radial cho lỗ — viền mềm
            const gradId = `reveal-grad-${index}`;
            const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
            gradient.setAttribute('id', gradId);

            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('stop-color', 'black');
            stop1.setAttribute('stop-opacity', '1');

            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop2.setAttribute('offset', '60%');
            stop2.setAttribute('stop-color', 'black');
            stop2.setAttribute('stop-opacity', '0.9');

            const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop3.setAttribute('offset', '100%');
            stop3.setAttribute('stop-color', 'white');
            stop3.setAttribute('stop-opacity', '1');

            gradient.appendChild(stop1);
            gradient.appendChild(stop2);
            gradient.appendChild(stop3);
            defs.appendChild(gradient);

            // Lỗ tròn
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', radius);
            circle.setAttribute('fill', `url(#${gradId})`);
            circle.style.transition = `r ${this.options.transitionDuration} ease-out`;
            mask.appendChild(circle);
        });

        // Lỗ nhỏ hơn tại các điểm PENDING (tạo hiệu ứng "khe hở lờ mờ")
        this._stops.forEach((stop, index) => {
            if (stop.status === 'COMPLETED') return;

            const lat = parseFloat(stop.latitude);
            const lng = parseFloat(stop.longitude);
            if (isNaN(lat) || isNaN(lng)) return;

            const point = map.latLngToContainerPoint([lat, lng]);
            const radius = this.options.revealRadius * 0.3; // Lỗ nhỏ để thấy marker

            const gradId = `pending-grad-${index}`;
            const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
            gradient.setAttribute('id', gradId);

            const s1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            s1.setAttribute('offset', '0%');
            s1.setAttribute('stop-color', 'black');
            s1.setAttribute('stop-opacity', '0.6');

            const s2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            s2.setAttribute('offset', '100%');
            s2.setAttribute('stop-color', 'white');
            s2.setAttribute('stop-opacity', '1');

            gradient.appendChild(s1);
            gradient.appendChild(s2);
            defs.appendChild(gradient);

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', radius);
            circle.setAttribute('fill', `url(#${gradId})`);
            mask.appendChild(circle);
        });

        defs.appendChild(mask);
        svg.appendChild(defs);

        // Vẽ fog rectangle với mask
        const fogRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        fogRect.setAttribute('x', '0');
        fogRect.setAttribute('y', '0');
        fogRect.setAttribute('width', size.x);
        fogRect.setAttribute('height', size.y);
        fogRect.setAttribute('fill', this.options.fogColor);
        fogRect.setAttribute('mask', 'url(#fog-mask)');
        svg.appendChild(fogRect);
    }
});

/**
 * Factory function để tạo FogLayer
 * @param {Array} stops - danh sách stops với status
 * @param {Object} userLocation - { lat, lng }
 * @param {Object} options - tùy chỉnh
 * @returns {FogLayer}
 */
export function createFogLayer(stops, userLocation, options) {
    return new FogLayer(stops, userLocation, options);
}
