# Implementation Plan: Mobile-Responsive Full Refactor — SmartTourismSystem Frontend

> **Mục tiêu**: Chuyển đổi frontend từ kiểu giả lập điện thoại cố định (390×844px, scale 0.8) sang responsive mobile-first thực sự, tối ưu cho điện thoại.
>
> **Phạm vi**: Full refactor — sửa container chính, tất cả CSS files, và chuyển inline styles trong components sang CSS classes.
>
> **Desktop behavior**: Giữ `max-width: 430px` + `margin: 0 auto` trên desktop để duy trì trải nghiệm mobile. Trên điện thoại thật, app chiếm full screen.

---

## Quy tắc chung cho người thực thi

1. **KHÔNG thay đổi logic/chức năng** — Chỉ thay đổi layout, styling, responsive behavior
2. **Giữ nguyên tất cả comments tiếng Việt** trong code
3. **Mobile-first**: Viết CSS cho mobile trước, dùng `@media (min-width: 768px)` cho desktop
4. **Safe area**: Sử dụng `env(safe-area-inset-*)` cho iPhone notch/home indicator
5. **Touch targets**: Tối thiểu 44×44px cho tất cả nút bấm (Apple HIG)
6. **Relative units**: Ưu tiên `%`, `vh`, `vw`, `rem` thay cho `px` cố định khi hợp lý
7. **Giữ nguyên màu sắc, font, visual design** — Chỉ sửa layout/sizing

---

## Phase 1: App Shell & Global Styles (ưu tiên cao nhất)

Đây là thay đổi quan trọng nhất, giải quyết vấn đề gốc.

---

### Step 1.1: Sửa `public/index.html`

**File**: `Frontend/public/index.html`

**Thay đổi viewport meta tag** (dòng 7) từ:
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```
Thành:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no, maximum-scale=1" />
```

**Thêm PWA meta tags** sau dòng `<meta name="theme-color">` (dòng 8):
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="mobile-web-app-capable" content="yes" />
```

---

### Step 1.2: Sửa `src/index.css` — Global responsive foundation

**File**: `Frontend/src/index.css`

**Thay toàn bộ nội dung** bằng:

```css
/* ===== GLOBAL RESET & RESPONSIVE FOUNDATION ===== */

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  width: 100%;
  overflow: hidden; /* App quản lý scroll riêng */
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f8f9fa;
}

#root {
  height: 100%;
  width: 100%;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

/* Ẩn scrollbar nhưng vẫn scroll được */
::-webkit-scrollbar {
  width: 0px;
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: transparent;
}

* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* Touch highlight disable cho mobile */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Cải thiện text rendering trên mobile */
input, textarea, select, button {
  font-family: inherit;
  font-size: 16px; /* Prevent iOS zoom on focus */
}
```

> **Lưu ý quan trọng**: `font-size: 16px` trên input/textarea ngăn iOS tự động zoom khi focus vào ô nhập liệu.

---

### Step 1.3: Sửa `src/App.css` — App container responsive

**File**: `Frontend/src/App.css`

**Thay toàn bộ nội dung** bằng:

```css
/* ===== APP CONTAINER — RESPONSIVE SHELL ===== */

/* Outer wrapper: Trên desktop hiển thị nền xám, trên mobile ẩn */
.app-outer {
  width: 100%;
  height: 100%;
  background-color: #e4e5e6;
  display: flex;
  justify-content: center;
  align-items: stretch; /* Quan trọng: stretch thay vì center */
}

/* Inner container: Full screen trên mobile, max-width trên desktop */
.app-container {
  width: 100%;
  height: 100%;
  background-color: #fff;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Desktop: giới hạn chiều rộng + thêm shadow để giống mobile preview */
@media (min-width: 768px) {
  .app-outer {
    align-items: center;
    padding: 10px 0;
  }
  
  .app-container {
    max-width: 430px;
    height: 100%;
    max-height: 932px; /* iPhone 15 Pro Max height */
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  }
}
```

---

### Step 1.4: Sửa `src/App.js` — Thay container wrapper

**File**: `Frontend/src/App.js`

**Thay đổi phần return JSX** (khoảng dòng 89-255).

**Hiện tại** (cần thay thế):
```jsx
return (
    <SocialQuestProvider user={currentUser?.user || currentUser}>
        <div style={{ backgroundColor: '#e4e5e6', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="app-container" style={{
                width: '390px',
                height: '844px',
                backgroundColor: '#fff',
                borderRadius: '40px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                position: 'relative',
                overflowY: 'auto',
                transform: 'scale(0.8)',
                transformOrigin: 'center',
                msOverflowStyle: 'none', scrollbarWidth: 'none'
            }}>
```

**Thay bằng**:
```jsx
return (
    <SocialQuestProvider user={currentUser?.user || currentUser}>
        <div className="app-outer">
            <div className="app-container">
```

**Và đóng tag cuối vẫn giữ nguyên**:
```jsx
            </div>
        </div>
    </SocialQuestProvider>
);
```

> **Kết quả mong đợi**: App chiếm full screen trên điện thoại, giữ max-width 430px trên desktop.

---

## Phase 2: Navigation & Bottom Bar

---

### Step 2.1: Sửa `src/components/MainTabs.css`

**File**: `Frontend/src/components/MainTabs.css`

Sửa các class sau (giữ nguyên phần Hidden Quest styles):

**`.main-layout`** — thay thành:
```css
.main-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
    background-color: #f8f9fa;
}
```
(Giữ nguyên, không cần sửa)

**`.content-area`** — sửa padding-bottom:
```css
.content-area {
    flex: 1;
    overflow-y: auto;
    padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px));
}
```

**`.bottom-nav`** — sửa:
```css
.bottom-nav {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: calc(70px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: #ffffff;
    border-top: 1px solid #f1f2f6;
    display: flex;
    justify-content: space-around;
    align-items: center;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
    border-radius: 0; /* Bỏ border-radius giả lập */
    z-index: 1000;
}
```

**`.nav-item`** — tăng touch target:
```css
.nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 20%;
    min-height: 44px; /* Touch target tối thiểu */
    min-width: 44px;
    color: #a4b0be;
    cursor: pointer;
    transition: all 0.3s ease;
    -webkit-tap-highlight-color: transparent;
}
```

---

### Step 2.2: Sửa inline styles trong `src/components/MainTabs.jsx`

**File**: `Frontend/src/components/MainTabs.jsx`

Nhiều sub-screens (LocationScreen, ProfileScreen, FriendsScreen, FavoritesScreen, GuestPlaceholder) trong file này dùng inline styles. Cần chuyển sang CSS classes.

**Thêm vào cuối `MainTabs.css`** các class mới:

```css
/* ===== INLINE STYLES → CSS CLASSES ===== */

/* Location Screen */
.location-screen {
    padding: 20px;
    background-color: #f8f9fa;
    min-height: 100%;
}

.location-screen h2 {
    margin-bottom: 20px;
    color: #2f3542;
}

.location-coords-card {
    background-color: white;
    padding: 15px;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    margin-top: 10px;
}

.location-coords-card p {
    margin: 0 0 5px 0;
    color: #747d8c;
    font-size: 14px;
}

.location-coords-row {
    display: flex;
    gap: 20px;
}

.location-loading {
    padding: 20px;
    text-align: center;
    color: #747d8c;
}

.location-tip-box {
    margin-top: 25px;
    padding: 15px;
    background: #e1f5fe;
    border-radius: 12px;
}

.location-tip-box h4 {
    margin: 0 0 10px 0;
    color: #01579b;
}

.location-tip-box p {
    margin: 0;
    font-size: 14px;
    color: #0277bd;
    line-height: 1.5;
}

/* Profile Screen */
.profile-screen {
    padding: 20px;
    background-color: #f8f9fa;
    min-height: 100%;
    padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px));
}

.profile-screen h2 {
    text-align: center;
    margin-bottom: 25px;
    color: #2f3542;
}

.profile-user-card {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    background-color: #fff;
    padding: 20px;
    border-radius: 16px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.profile-avatar {
    width: 65px;
    height: 65px;
    border-radius: 50%;
    object-fit: cover;
    margin-right: 15px;
}

.profile-name {
    margin: 0;
    font-size: 18px;
    color: #2f3542;
}

.profile-email {
    margin: 5px 0 0;
    color: #747d8c;
    font-size: 14px;
}

.profile-stats-card {
    display: flex;
    justify-content: space-around;
    align-items: center;
    background-color: #fff;
    padding: 20px 15px;
    border-radius: 16px;
    margin-bottom: 20px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.profile-stat-item {
    display: flex;
    align-items: center;
    gap: 12px;
}

.profile-stat-icon {
    font-size: 24px;
    padding: 10px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.profile-stat-label {
    color: #636e72;
    font-size: 12px;
    font-weight: 500;
}

.profile-divider {
    width: 1px;
    height: 40px;
    background-color: #dfe6e9;
}

.profile-social-card {
    background-color: #fff;
    padding: 20px;
    border-radius: 16px;
    margin-bottom: 30px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.profile-social-title {
    margin: 0 0 4px 0;
    color: #2d3436;
    font-size: 16px;
    font-weight: bold;
}

.profile-social-subtitle {
    font-size: 12px;
    color: #636e72;
}

.profile-social-icons {
    display: flex;
    gap: 12px;
}

.profile-social-icon {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
}

.profile-social-icon.linked {
    background-color: #e7f0fd;
    color: #1877f2;
    border: 1px solid #d1e3fb;
}

.profile-social-icon.unlinked {
    background-color: #f1f2f6;
    color: #a4b0be;
    font-size: 20px;
}

/* Achievements Section */
.achievements-card {
    background-color: #fff;
    padding: 20px;
    border-radius: 16px;
    margin-bottom: 20px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.achievements-title {
    margin: 0 0 15px 0;
    color: #2d3436;
    font-size: 16px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 8px;
}

.achievements-filter-row {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
}

.achievements-filter-btn {
    flex: 1;
    padding: 10px 6px;
    border-radius: 12px;
    border: none;
    font-weight: bold;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px; /* Touch target */
}

.achievements-filter-btn.active {
    background-color: #0abde3;
    color: #fff;
    box-shadow: 0 4px 10px rgba(10, 189, 227, 0.2);
}

.achievements-filter-btn.inactive {
    background-color: #f1f2f6;
    color: #576574;
}

.achievements-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.achievement-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 12px;
    border-radius: 12px;
}

.achievement-item.unlocked {
    background-color: #f1fcf4;
    border: 1px solid #d4edda;
}

.achievement-item.locked {
    background-color: #fafafa;
    border: 1px solid #f1f2f6;
    opacity: 0.85;
}

.achievement-icon {
    font-size: 28px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.achievement-icon.unlocked {
    background-color: #e8f8f5;
    box-shadow: 0 4px 8px rgba(46, 204, 113, 0.15);
}

.achievement-icon.locked {
    background-color: #e4e5e6;
}

.achievement-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0; /* Prevent flex overflow */
}

.achievement-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.achievement-name {
    color: #2d3436;
    font-size: 14px;
    font-weight: bold;
}

.achievement-badge {
    font-size: 11px;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 20px;
    white-space: nowrap;
}

.achievement-badge.unlocked {
    background-color: #2ecc71;
    color: #fff;
}

.achievement-badge.locked {
    background-color: #ffeaa7;
    color: #d63031;
}

.achievement-desc {
    font-size: 12px;
    color: #636e72;
    text-align: left;
}

.achievement-progress {
    margin-top: 5px;
}

.achievement-progress-header {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #b2bec3;
    margin-bottom: 2px;
}

.achievement-progress-bar {
    width: 100%;
    height: 6px;
    background-color: #dfe6e9;
    border-radius: 3px;
    overflow: hidden;
}

.achievement-progress-fill {
    height: 100%;
    background-color: #0abde3;
    border-radius: 3px;
}

.achievement-unlock-date {
    font-size: 11px;
    color: #2ecc71;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
}

/* Profile Menu Buttons */
.profile-menu-list {
    display: flex;
    flex-direction: column;
}

.profile-loading {
    text-align: center;
    padding: 10px;
    color: #747d8c;
}

.profile-empty {
    text-align: center;
    padding: 10px;
    color: #747d8c;
}

/* Guest Placeholder */
.guest-placeholder {
    padding: 40px 20px;
    text-align: center;
    margin-top: 10vh;
}

.guest-placeholder-icon {
    font-size: 60px;
    margin-bottom: 20px;
}

.guest-placeholder h2 {
    color: #2f3542;
    margin-bottom: 10px;
}

.guest-placeholder p {
    color: #747d8c;
    margin-bottom: 30px;
    line-height: 1.6;
}

.guest-login-btn {
    background: linear-gradient(135deg, #0abde3 0%, #22a6b3 100%);
    color: white;
    padding: 14px 30px;
    border-radius: 16px;
    border: none;
    font-weight: bold;
    font-size: 16px;
    cursor: pointer;
    box-shadow: 0 8px 20px rgba(10, 189, 227, 0.3);
    min-height: 48px; /* Touch target */
}

/* Logout button in profile */
.profile-logout-btn {
    background-color: #fff0f0 !important;
    border: 1px solid #ffcccc !important;
    margin-top: 10px;
}

.profile-logout-btn span.logout-text {
    font-weight: bold;
    color: #e84118;
}
```

**Sau đó sửa `MainTabs.jsx`**: Thay tất cả inline `style={{...}}` trong các sub-components (LocationScreen, ProfileScreen, FriendsScreen, FavoritesScreen, GuestPlaceholder) bằng các CSS class tương ứng ở trên. Giữ nguyên logic và JSX structure.

Ví dụ, `ProfileScreen` hiện tại:
```jsx
<div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '100px' }}>
```
Thay bằng:
```jsx
<div className="profile-screen">
```

Áp dụng tương tự cho tất cả inline styles trong file. Mapping cụ thể:

| Inline style hiện tại | CSS class mới |
|---|---|
| LocationScreen outer div | `.location-screen` |
| Tọa độ GPS card | `.location-coords-card` |
| Flex row lat/lng | `.location-coords-row` |
| "Đang xác định vị trí" | `.location-loading` |
| Mẹo nhỏ box | `.location-tip-box` |
| ProfileScreen outer div | `.profile-screen` |
| Avatar + tên card | `.profile-user-card` |
| Avatar img | `.profile-avatar` |
| Stats section | `.profile-stats-card` |
| Stat item | `.profile-stat-item` |
| Social card | `.profile-social-card` |
| Social icon circles | `.profile-social-icon.linked` / `.unlinked` |
| Achievements section | `.achievements-card` |
| Filter buttons | `.achievements-filter-btn.active` / `.inactive` |
| Achievement item | `.achievement-item.unlocked` / `.locked` |
| GuestPlaceholder outer | `.guest-placeholder` |
| Guest login button | `.guest-login-btn` |
| menuBtnStyle object | Sử dụng `.menu-btn` class đã có trong `Travel_trip.css` |

---

## Phase 3: Screen CSS Responsive Fixes

---

### Step 3.1: Sửa `src/screens/SplashScreen.css`

**Thay** `max-width: 480px` bằng `width: 100%`:
```css
.splash-container {
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height — tốt hơn trên mobile */
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(rgba(26, 86, 131, 0.8), rgba(18, 62, 97, 0.9)), url('https://images.unsplash.com/photo-1449034446853-66c86144b0ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80') center/cover;
}
```

---

### Step 3.2: Sửa `src/screens/WelcomeScreen.css`

Thay `.welcome-container`:
```css
.welcome-container {
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    padding: 24px;
    padding-top: calc(24px + env(safe-area-inset-top, 0px));
    box-sizing: border-box;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
```

Sửa `.collage` dùng responsive height:
```css
.collage {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 10px;
    position: relative;
    height: min(320px, 40vh); /* Responsive height */
}
```

Sửa `.btn-primary, .btn-outline` thêm touch target:
```css
.btn-primary, .btn-outline {
    width: 100%;
    padding: 16px;
    border-radius: 30px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
    min-height: 48px; /* Touch target */
}
```

---

### Step 3.3: Sửa `src/screens/Auth/LoginScreen.css`

**Thay toàn bộ**:
```css
.login-container {
    width: 100%;
    min-height: 100%;
    padding: 24px;
    padding-top: calc(40px + env(safe-area-inset-top, 0px));
    background-color: #f8f9fa;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
}

.login-title {
    text-align: center;
    color: #2c3e50;
    margin-bottom: 20px;
}

.login-input {
    width: 100%;
    padding: 14px;
    margin-bottom: 15px;
    border: 1px solid #ced4da;
    border-radius: 12px;
    box-sizing: border-box;
    font-size: 16px; /* Prevent iOS zoom */
    min-height: 48px; /* Touch target */
}

.login-button {
    width: 100%;
    padding: 14px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s;
    min-height: 48px; /* Touch target */
}

.login-button:hover {
    background-color: #0056b3;
}

.login-button:active {
    transform: scale(0.98);
}

.error-msg {
    color: #dc3545;
    text-align: center;
    margin-top: 10px;
}
```

**Cũng cần sửa `LoginScreen.js`**: Bỏ inline `style={{ padding: '20px', paddingTop: '40px' }}` trên `.login-container` div (vì đã có trong CSS):
```jsx
// Hiện tại:
<div className="login-container" style={{ padding: '20px', paddingTop: '40px' }}>
// Sửa thành:
<div className="login-container">
```

---

### Step 3.4: Sửa `src/screens/Auth/RegisterScreen.js`

File này không có CSS riêng, dùng inline styles. Kiểm tra file và áp dụng cùng pattern như LoginScreen — dùng `.login-container`, `.login-input`, `.login-button` classes nếu phù hợp.

---

### Step 3.5: Sửa `src/screens/Auth/ForgotPasswordScreen.js`

Tương tự RegisterScreen — kiểm tra và chuyển inline styles sang CSS classes chung.

---

### Step 3.6: Sửa `src/screens/Travel_trip.css`

Thay `.home-container`:
```css
.home-container {
    padding: 24px;
    padding-top: calc(24px + env(safe-area-inset-top, 0px));
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #fafbfc;
    min-height: 100%;
    width: 100%;
    box-sizing: border-box;
}
```
(Bỏ `max-width: 480px` và `margin: 0 auto` và `box-shadow`)

---

### Step 3.7: Sửa `src/screens/Travel_trip.js` inline styles

**File**: `Frontend/src/screens/Travel_trip.js`

Sticky header section (dòng 63-74) có inline styles. **Thêm vào `Travel_trip.css`**:

```css
/* Sticky Header */
.home-sticky-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background-color: #ffffff;
    padding-top: 20px;
    padding-bottom: 2px;
    margin-top: -20px;
    margin-left: -24px;
    margin-right: -24px;
    padding-left: 24px;
    padding-right: 10px;
}

/* Plan Banner */
.plan-banner {
    background: linear-gradient(135deg, #0abde3 0%, #22a6b3 100%);
    padding: 20px;
    border-radius: 20px;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    box-shadow: 0 8px 20px rgba(10, 189, 227, 0.3);
}

.plan-banner h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
}

.plan-banner p {
    margin: 5px 0 0;
    font-size: 14px;
    opacity: 0.9;
}

.plan-banner-btn {
    background: white;
    color: #0abde3;
    border: none;
    padding: 12px 18px;
    border-radius: 14px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    min-height: 44px;
    white-space: nowrap;
}

/* Enterprise Banner */
.enterprise-banner {
    background: linear-gradient(135deg, #f0932b 0%, #ffbe76 100%);
    padding: 20px;
    border-radius: 20px;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    box-shadow: 0 8px 20px rgba(240, 147, 43, 0.3);
}

/* Points badge inline */
.points-badge-inline {
    display: inline-flex;
    align-items: center;
    background: rgba(255, 244, 230, 0.8);
    padding: 4px 10px;
    border-radius: 10px;
    margin-top: 4px;
    border: 1px solid #ffeaa7;
}

.points-badge-inline span.pts-icon {
    font-size: 14px;
    margin-right: 5px;
}

.points-badge-inline span.pts-value {
    font-size: 13px;
    font-weight: bold;
    color: #f39c12;
}
```

**Sau đó sửa `Travel_trip.js`**: Thay inline styles bằng CSS classes tương ứng.

---

### Step 3.8: Sửa `src/screens/UserProfile.js` — Tạo CSS file mới

**Tạo file mới**: `Frontend/src/screens/UserProfile.css`

```css
/* ===== USER PROFILE SCREEN ===== */
.user-profile-screen {
    padding: 24px;
    padding-top: calc(24px + env(safe-area-inset-top, 0px));
    background-color: #fafbfc;
    min-height: 100%;
    box-sizing: border-box;
}

.user-profile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.user-profile-back-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: #576574;
    cursor: pointer;
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
}

.user-profile-edit-btn {
    background: #0abde3;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
    min-height: 44px;
}

.user-profile-title {
    color: #222f3e;
    margin-bottom: 10px;
    font-size: 24px;
    font-weight: 800;
}

.user-profile-points-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background-color: #fff4e6;
    padding: 15px 20px;
    border-radius: 16px;
    margin-bottom: 25px;
    box-shadow: 0 4px 12px rgba(243, 156, 18, 0.15);
    border: 1px solid #ffeaa7;
}

.user-profile-avatar-section {
    display: flex;
    justify-content: center;
    margin-bottom: 30px;
}

.user-profile-avatar-wrapper {
    position: relative;
}

.user-profile-avatar-img {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #0abde3;
}

.user-profile-avatar-edit-btn {
    position: absolute;
    bottom: 0;
    right: 0;
    background: #0abde3;
    color: white;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    cursor: pointer;
    min-height: 30px;
}

.user-profile-form {
    display: flex;
    flex-direction: column;
}

.user-profile-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 15px;
}

.user-profile-field label {
    font-size: 14px;
    font-weight: 600;
    color: #576574;
}

.user-profile-field input,
.user-profile-field select,
.user-profile-field textarea {
    padding: 12px;
    border-radius: 12px;
    border: 1px solid #c8d6e5;
    font-size: 16px; /* Prevent iOS zoom */
    min-height: 44px;
    box-sizing: border-box;
}

.user-profile-field textarea {
    resize: none;
}

.user-profile-field .view-value {
    padding: 12px;
    background-color: #f1f2f6;
    border-radius: 12px;
    color: #2d3436;
    min-height: 20px;
}

.user-profile-field-row {
    display: flex;
    gap: 10px;
}

.user-profile-field-row > div {
    flex: 1;
}

.user-profile-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

.user-profile-save-btn {
    flex: 1;
    background: #22a6b3;
    color: white;
    padding: 14px;
    border-radius: 12px;
    border: none;
    font-weight: bold;
    font-size: 16px;
    cursor: pointer;
    min-height: 48px;
}

.user-profile-cancel-btn {
    flex: 1;
    background: #ee5253;
    color: white;
    padding: 14px;
    border-radius: 12px;
    border: none;
    font-weight: bold;
    font-size: 16px;
    cursor: pointer;
    min-height: 48px;
}
```

**Sau đó sửa `UserProfile.js`**: 
1. Thêm `import './UserProfile.css';` ở đầu file
2. Thay tất cả inline styles bằng CSS classes tương ứng

---

## Phase 4: Trip & Component CSS Fixes

---

### Step 4.1: Sửa `src/screens/Trip/TripDetailScreen.css`

Thay đổi key:
- `.location-action-bar`: Thêm safe area padding:
```css
.location-action-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 15px 20px;
    padding-bottom: calc(15px + env(safe-area-inset-bottom, 0px));
    background: #fff;
    border-top: 1px solid #eee;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
    z-index: 100;
}
```

- `.cloud-transition-container`: Đã dùng `position: fixed` nên OK, nhưng check `z-index` đủ cao

---

### Step 4.2: Sửa `src/components/TripInput/TripInputForm.css`

Thêm touch-friendly sizing:
```css
.input-group input, .input-group select {
    padding: 14px 15px;
    border: 1.5px solid #c8d6e5;
    border-radius: 12px;
    font-size: 16px; /* Prevent iOS zoom */
    outline: none;
    transition: border-color 0.2s;
    min-height: 48px;
    box-sizing: border-box;
}

.tag-btn {
    padding: 10px 18px;
    border-radius: 20px;
    border: 1.5px solid #c8d6e5;
    background: transparent;
    color: #576574;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 44px; /* Touch target */
}

.btn-next {
    background: #222f3e;
    color: white;
    padding: 14px 24px;
    border-radius: 12px;
    border: none;
    font-weight: bold;
    width: 100%;
    cursor: pointer;
    min-height: 48px;
    font-size: 16px;
}

.btn-back {
    background: transparent;
    color: #576574;
    padding: 14px 24px;
    border: none;
    font-weight: bold;
    cursor: pointer;
    min-height: 48px;
    font-size: 16px;
}
```

---

### Step 4.3: Sửa `src/components/Leaderboard.css`

Sửa `.my-rank-sticky-card`:
```css
.my-rank-sticky-card {
    position: absolute;
    bottom: calc(60px + env(safe-area-inset-bottom, 0px));
    left: 0;
    right: 0;
    margin: 0 16px;
    /* ... giữ nguyên phần còn lại ... */
}
```

Sửa `.leaderboard-container` padding-bottom:
```css
.leaderboard-container {
    /* ... giữ nguyên ... */
    padding-bottom: calc(90px + env(safe-area-inset-bottom, 0px));
}
```

---

### Step 4.4: Sửa các Trip screen CSS còn lại

Kiểm tra và sửa nếu cần:
- `src/screens/Trip/PlanRecommendScreen.css` — bỏ max-width cố định nếu có
- `src/screens/Trip/HistoryScreen.css` — bỏ max-width cố định nếu có  
- `src/screens/Trip/LocationDetailScreen.css` — safe area cho action bar
- `src/screens/Trip/TaskDetail.css` — responsive card layout
- `src/screens/Trip/LocationTasks.css` — responsive layout

---

## Phase 5: PWA Enhancement

---

### Step 5.1: Cập nhật `public/manifest.json`

**File**: `Frontend/public/manifest.json`

Cập nhật để app có thể "Add to Home Screen":
```json
{
  "short_name": "SmartTour",
  "name": "Smart Tourism System",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0abde3",
  "background_color": "#ffffff"
}
```

Key changes:
- `"display": "standalone"` — App chạy không có thanh URL trình duyệt
- `"orientation": "portrait"` — Luôn dọc
- `"theme_color": "#0abde3"` — Màu chủ đạo của app

---

## Checklist tổng hợp cho người thực thi

- [ ] **Phase 1.1**: Sửa `public/index.html` — viewport meta + PWA tags
- [ ] **Phase 1.2**: Sửa `src/index.css` — global reset + responsive foundation
- [ ] **Phase 1.3**: Sửa `src/App.css` — responsive app container
- [ ] **Phase 1.4**: Sửa `src/App.js` — bỏ hardcoded container styles
- [ ] **Phase 2.1**: Sửa `src/components/MainTabs.css` — bottom nav + safe area
- [ ] **Phase 2.2**: Sửa `src/components/MainTabs.jsx` — inline → CSS classes (thêm classes vào MainTabs.css)
- [ ] **Phase 3.1**: Sửa `src/screens/SplashScreen.css`
- [ ] **Phase 3.2**: Sửa `src/screens/WelcomeScreen.css`
- [ ] **Phase 3.3**: Sửa `src/screens/Auth/LoginScreen.css` + `LoginScreen.js`
- [ ] **Phase 3.4**: Sửa `src/screens/Auth/RegisterScreen.js`
- [ ] **Phase 3.5**: Sửa `src/screens/Auth/ForgotPasswordScreen.js`
- [ ] **Phase 3.6**: Sửa `src/screens/Travel_trip.css`
- [ ] **Phase 3.7**: Sửa `src/screens/Travel_trip.js` inline → CSS classes
- [ ] **Phase 3.8**: Tạo `src/screens/UserProfile.css` + sửa `UserProfile.js`
- [ ] **Phase 4.1**: Sửa `src/screens/Trip/TripDetailScreen.css`
- [ ] **Phase 4.2**: Sửa `src/components/TripInput/TripInputForm.css`
- [ ] **Phase 4.3**: Sửa `src/components/Leaderboard.css`
- [ ] **Phase 4.4**: Kiểm tra các Trip screen CSS còn lại
- [ ] **Phase 5.1**: Cập nhật `public/manifest.json`

---

## Verification sau khi hoàn thành

1. **Chạy `npm start`** trong `Frontend/`
2. **Chrome DevTools** → Toggle Device Toolbar → Test trên:
   - iPhone 14 Pro (393×852)
   - iPhone SE (375×667) 
   - Galaxy S21 (360×800)
   - iPad (768×1024) — nên hiển thị centered
3. **Kiểm tra**:
   - [ ] App chiếm full screen, không có khung giả lập
   - [ ] Bottom nav ở đúng vị trí, không overlap content
   - [ ] Không có horizontal scroll
   - [ ] Input fields không bị iOS zoom khi focus
   - [ ] Tất cả nút bấm đủ lớn để chạm (44px+)
   - [ ] Modals/overlays hiển thị full screen
   - [ ] Splash → Welcome → Login flow hoạt động bình thường
   - [ ] Tất cả tabs hoạt động (Home, Location, Leaderboard, Friends, Favorites, Profile)
