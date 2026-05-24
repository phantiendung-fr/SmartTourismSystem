# Implementation Plan: Web + APK Compatibility

## Mục tiêu

Sửa frontend để chạy ổn trong cả hai môi trường:

- Web dev bằng `npm start` trên máy tính, truy cập qua `http://localhost:3000` hoặc IP LAN như `http://192.168.x.x:3000`.
- Android APK build bằng Capacitor, gọi backend qua IP LAN được cấu hình trong `Frontend/.env`.

Không migrate sang native app hoàn toàn. Không đổi business logic. Tập trung vào platform compatibility, API config, quyền thiết bị, layout WebView/mobile, asset/runtime ổn định.

## Nguyên tắc bắt buộc

1. Không dùng `10.0.2.2`.
2. APK phải đọc backend từ `REACT_APP_API_URL` trong `Frontend/.env`.
3. Web dev vẫn chạy được khi không có `.env`, bằng cách tự suy ra backend từ host đang mở frontend.
4. Nếu đổi `.env`, phải build lại:

```bash
npm run build
npx cap sync android
```

5. Không sửa backend trừ khi cần bổ sung CORS hoặc hướng dẫn chạy bằng `--host 0.0.0.0`.
6. Sửa từng phase nhỏ và test lại sau mỗi phase, tránh refactor lớn một lần.

## Phase 1: Chuẩn Hóa API Config

File cần sửa:

- `Frontend/src/config/api.js`

Yêu cầu logic mới:

```js
import { Capacitor } from '@capacitor/core';

const explicitApiUrl = process.env.REACT_APP_API_URL;

const normalizeUrl = (url) => url?.replace(/\/$/, '');

const getApiBase = () => {
  if (explicitApiUrl) return normalizeUrl(explicitApiUrl);

  if (Capacitor.isNativePlatform()) {
    throw new Error(
      'Missing REACT_APP_API_URL. Native APK requires Frontend/.env with LAN backend URL.'
    );
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname || 'localhost';
  return `${protocol}//${hostname}:8000`;
};

export const API_BASE = getApiBase();
export const WS_BASE = API_BASE.replace(/^http/, 'ws');
```

Kết quả mong muốn:

- Web PC mở `http://localhost:3000` thì gọi `http://localhost:8000`.
- Web điện thoại mở `http://192.168.1.8:3000` thì gọi `http://192.168.1.8:8000`.
- APK bắt buộc dùng `.env`, ví dụ:

```env
REACT_APP_API_URL=http://192.168.1.8:8000
```

## Phase 2: Thêm File Env Mẫu

Tạo file:

- `Frontend/.env.example`

Nội dung:

```env
GENERATE_SOURCEMAP=false
CI=false

# Dùng khi build APK hoặc test native trên điện thoại thật.
# Đổi IP thành IPv4 của máy đang chạy Backend.
REACT_APP_API_URL=http://192.168.x.x:8000
```

Cập nhật:

- `Frontend/.gitignore`

Thêm:

```gitignore
.env
```

Lưu ý: `.env` thật không commit.

## Phase 3: Runtime Permission Cho GPS Và Camera

Cài thêm Capacitor plugins nếu chưa có:

```bash
npm install @capacitor/geolocation @capacitor/camera @capacitor/app @capacitor/preferences
npx cap sync android
```

Tạo các adapter:

- `Frontend/src/platform/location.js`
- `Frontend/src/platform/camera.js`
- `Frontend/src/platform/dialog.js`
- `Frontend/src/platform/storage.js`

Mục tiêu:

- Web dùng `navigator.geolocation`, `window.alert`, `window.confirm`, `localStorage`.
- APK dùng Capacitor Geolocation, Camera, App/Dialog fallback, Preferences.
- Không gọi trực tiếp browser API ở quá nhiều nơi nữa.

Các file cần replace dần:

- `Frontend/src/hooks/useGeolocation.js`
- `Frontend/src/components/MainTabs.jsx`
- `Frontend/src/screens/Trip/TripDetailScreen.js`
- `Frontend/src/screens/Trip/PlanRecommendScreen.js`
- `Frontend/src/components/HiddenQuest/ChestOpeningAnimation.jsx`
- `Frontend/src/screens/Trip/TaskDetail.js`

## Phase 4: Fix QR, Camera Và Photo Flow

File trọng tâm:

- `Frontend/src/screens/Trip/TaskDetail.js`

Việc cần làm:

1. Giữ `html5-qrcode` cho web.
2. Với APK, không để app phụ thuộc hoàn toàn vào browser camera nếu WebView lỗi.
3. Nếu chưa làm native scanner ngay, tối thiểu phải:
   - Hiển thị lỗi rõ khi camera bị từ chối.
   - Có nút nhập QR thủ công luôn hoạt động.
   - Không crash nếu scanner không mount được.
4. Với photo:
   - Sau khi dùng `URL.createObjectURL`, cleanup bằng `URL.revokeObjectURL`.
   - Khi không có quyền camera/file, hiển thị hướng dẫn thử lại.

## Phase 5: Sửa CSS Runtime Rõ Ràng

File:

- `Frontend/src/screens/Trip/TaskDetail.css`

Sửa CSS invalid:

```css
/* Sai */
border-b: 1px solid rgba(...);
object-cover: fill;

/* Đúng */
border-bottom: 1px solid rgba(...);
object-fit: cover;
```

Kiểm tra thêm các overlay dùng `position: fixed`:

- `Frontend/src/screens/Trip/TaskDetail.css`
- `Frontend/src/screens/Trip/TripDetailScreen.css`
- `Frontend/src/components/HiddenQuest/ChestOpeningAnimation.css`
- `Frontend/src/components/TreasureOverlay/TreasureOverlay.css`
- `Frontend/src/components/HiddenQuest/HiddenQuestDebug.css`
- `Frontend/src/components/HiddenQuest/EnterpriseEventForm.css`

Yêu cầu:

- Overlay nằm đúng viewport app.
- Có `safe-area-inset-*`.
- Không che nút Android navigation/home indicator.
- Không tràn sai khung khi chạy trong WebView.

## Phase 6: Chuẩn Hóa Leaflet Và Assets

Hiện trạng:

- `public/index.html` load Leaflet qua CDN.
- Một số component dùng `window.L`.
- Một số component khác dùng `import L from 'leaflet'`.

Việc cần làm:

1. Bỏ Leaflet CDN trong `Frontend/public/index.html`.
2. Tất cả map dùng thống nhất `import L from 'leaflet'`.
3. Sửa các file đang dùng `window.L`:
   - `Frontend/src/components/Map/MapComponent.js`
   - `Frontend/src/components/HiddenQuest/EnterpriseEventForm.jsx`
4. Giữ `import 'leaflet/dist/leaflet.css'` ở component map hoặc entry phù hợp.
5. Leaflet marker icon nên dùng asset local hoặc import từ package, không trỏ `https://unpkg.com/...`.
6. Với ảnh ngoài như Unsplash, Dicebear, Flaticon, cần có fallback local để APK không bị UI rỗng khi mạng yếu hoặc bị chặn.

## Phase 7: Android Back Button

File:

- `Frontend/src/App.js`

Yêu cầu:

- Nếu đang ở màn con thì Android back quay về màn trước.
- Nếu đang ở `main` thì confirm thoát app.
- Không để Android back thoát app bất ngờ khi đang ở:
  - `trip_detail`
  - `plan_recommend`
  - `location_detail`
  - `profile_edit`
  - `register_location`

Cách làm khuyến nghị:

- Thêm navigation stack nội bộ quanh `currentScreen`.
- Dùng Capacitor App back button listener.
- Chưa cần migrate toàn bộ sang React Router nếu muốn giữ scope nhỏ.

## Phase 8: Responsive Cleanup Cho Luồng Doanh Nghiệp

Các file còn nhiều inline style:

- `Frontend/src/components/EnterpriseTabs.js`
- `Frontend/src/components/EnterpriseDashboard.js`
- `Frontend/src/components/HiddenQuest/EnterpriseEventForm.jsx`

Việc cần làm:

1. Tách CSS riêng.
2. Bottom nav có safe-area giống `MainTabs`.
3. Content scroll riêng, không để bottom nav che nội dung.
4. Button tối thiểu 44px.
5. Form/modal dùng `max-height: calc(100dvh - safe-area)` và `overflow-y: auto`.

## Phase 9: Test Bắt Buộc

### Test backend

```bash
cd Backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Test web dev

```bash
cd Frontend
npm start
```

Kiểm tra:

- `http://localhost:3000`
- `http://<IP-LAN>:3000` từ điện thoại thật

### Test APK

Trước khi build APK, sửa `Frontend/.env`:

```env
REACT_APP_API_URL=http://<IP-LAN-CUA-MAY-CHAY-BACKEND>:8000
```

Sau đó:

```bash
cd Frontend
npm run build
npx cap sync android
npx cap open android
```

Checklist APK:

- Login/register gọi API được.
- Home load được.
- Tạo plan được.
- GPS xin quyền và lấy vị trí được.
- Check-in không treo.
- QR có fallback nhập tay.
- Chụp ảnh/upload không crash.
- Map render không trắng.
- Android back hoạt động đúng.
- APK trên máy thật gọi đúng IP trong `.env`.

## Thứ Tự Ưu Tiên

1. `api.js`, `.env.example`, `.gitignore`.
2. GPS adapter.
3. Camera/QR/photo fallback.
4. CSS invalid và overlay safe-area.
5. Leaflet bỏ CDN.
6. Android back button.
7. Enterprise responsive cleanup.

## Ghi Chú Hiện Trạng

- `npm run build` hiện tại build được.
- Build có warning ESLint, nhưng chưa phải blocker chính.
- Vấn đề chính nhiều khả năng là runtime/WebView/device API/network, không phải compile.
- File `implementation_plan_migrate_mobile_native.md` đã được áp một phần, nhưng plan mới này ưu tiên tương thích song song web dev và APK.
