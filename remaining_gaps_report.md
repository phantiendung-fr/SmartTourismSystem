# Báo Cáo Tổng Hợp: Những Gì Còn Thiếu So Với Repo Incoming-Changes

> Sau khi đã bổ sung **Chức năng 4 (Proxy Bản đồ & Thời tiết)** và **Chức năng 5 (Gamification & Cửa hàng đổi quà)**, bản báo cáo này liệt kê chi tiết những thành phần vẫn còn khác biệt hoặc chưa đồng bộ giữa repo hiện tại và `incoming-changes`.

---

## Tóm Tắt Trạng Thái 5 Chức Năng Gốc

| # | Chức năng | Trạng thái | Ghi chú |
|---|-----------|-----------|---------|
| 1 | Hệ thống Kiểm duyệt Admin | ✅ Đã hoàn thành | Backend + Frontend đã tích hợp |
| 2 | Mạng xã hội & Cộng đồng | ✅ Đã hoàn thành | Social Feed, Chat, Bạn bè đầy đủ |
| 3 | Ghép đôi Bạn đồng hành | ✅ Đã hoàn thành | Companion Finder tích hợp |
| 4 | Proxy Bản đồ & Thời tiết | ✅ Đã hoàn thành | Geocoding, Search, Weather proxy |
| 5 | Gamification & Cửa hàng đổi quà | ✅ Đã hoàn thành | Milestones, Vouchers, Ambassador |

> [!NOTE]
> Tất cả 5 chức năng chính từ `missing_features_analysis.md` đã được bổ sung. Phần dưới đây liệt kê các chi tiết **ngoài 5 chức năng chính** mà repo `incoming-changes` có nhưng repo hiện tại chưa có hoặc triển khai khác biệt.

---

## A. BACKEND — Các Thành Phần Khác Biệt Còn Lại

### A1. Router `explore.py` — Thiếu 2 endpoint phụ

| Endpoint | Incoming-changes | Repo hiện tại | Trạng thái |
|----------|-----------------|---------------|-----------|
| `GET /geocode/reverse` | ✅ | ✅ | ✅ Đã có |
| `GET /geocode/search` | ✅ | ✅ | ✅ Đã có |
| `GET /weather` | ✅ | ✅ | ✅ Đã có |
| `GET /cities` | ✅ Trending cities | ❌ | ⚠️ Thiếu |
| `GET /recommend` | ✅ Smart location scoring | ❌ | ⚠️ Thiếu |

> [!IMPORTANT]
> **`GET /cities`** — Trả về danh sách thành phố trending dựa trên dữ liệu check-in thực tế (dynamic trending).
> **`GET /recommend`** — Gợi ý địa điểm thông minh dựa trên `city_id`, `budget`, `tags` với thuật toán `score_location` từ `core/algorithms.py`.

**Phụ thuộc thiếu:**
- File `core/algorithms.py` (29KB) — chứa hàm `score_location()` tính điểm phù hợp giữa ngân sách + sở thích người dùng vs. giá & tags địa điểm.
- File `crud/trip_repository.py` — chứa hàm `get_trending_destinations()`.

---

### A2. Router `enterprise.py` — Thiếu chức năng Doanh nghiệp Đề xuất Địa điểm

| Endpoint | Incoming-changes | Repo hiện tại | Trạng thái |
|----------|-----------------|---------------|-----------|
| `POST /register` | ✅ | ✅ `/register-profile` | ✅ Tương đương |
| `POST /verify/{id}` | ✅ | ✅ `/{id}/verify` | ✅ Tương đương |
| `GET /pending` | ✅ | ❌ | ⚠️ Thiếu |
| `POST /locations/submit` | ✅ Đề xuất tạo địa điểm | ❌ | ⚠️ Thiếu |
| `PUT /locations/{id}/submit` | ✅ Đề xuất cập nhật | ❌ | ⚠️ Thiếu |
| `DELETE /locations/{id}/submit` | ✅ Yêu cầu xóa | ❌ | ⚠️ Thiếu |
| `GET /my-submissions` | ✅ Xem yêu cầu kiểm duyệt | ❌ | ⚠️ Thiếu |
| `GET /my-locations` | ✅ Xem địa điểm đã hoạt động | ❌ | ⚠️ Thiếu |

> [!WARNING]
> Đây là luồng **Enterprise tự đề xuất tạo/sửa/xóa địa điểm** → Admin duyệt. Repo hiện tại chỉ có phần Admin duyệt (`admin.py`) nhưng chưa có phần Enterprise gửi yêu cầu.

---

### A3. Router `trips.py` — Incoming-changes có riêng, repo hiện tại dùng `api/trips.py`

| Endpoint | Incoming-changes | Repo hiện tại | Trạng thái |
|----------|-----------------|---------------|-----------|
| `POST /plan` | ✅ | ✅ `api/trips.py` | ✅ Có (khác structure) |
| `POST /save` | ✅ | ✅ | ✅ |
| `GET /my-trips` | ✅ | ✅ | ✅ |
| `GET /{itinerary_id}` | ✅ | ✅ | ✅ |
| `PUT /{itinerary_id}/start` | ✅ | ✅ | ✅ |
| `PUT /{itinerary_id}/complete` | ✅ | ✅ | ✅ |
| `POST /checkin/{stop_id}` | ✅ | ✅ | ✅ |
| `POST /track` | ✅ GPS breadcrumbs | ✅ | ✅ |
| `POST /validate-route` | ✅ Kiểm tra lệch lộ trình | ❌ | ⚠️ Thiếu |

> [!NOTE]
> **`POST /validate-route`** — Kiểm tra GPS hiện tại có lệch khỏi tuyến đường đã lên kế hoạch không. Ghi log vào bảng `deviation_logs` nếu lệch quá ngưỡng.

---

### A4. Services Layer — Thiếu hoàn toàn

| Service | Incoming-changes | Repo hiện tại | Mô tả |
|---------|-----------------|---------------|-------|
| `services/ai_verification.py` | ✅ (12.8KB) | ❌ | Xác thực ảnh AI cho check-in và nhiệm vụ |
| `services/notification_service.py` | ✅ (4.8KB) | ❌ | Hệ thống thông báo push/in-app |

> [!IMPORTANT]
> **AI Verification** — Dùng AI model (hoặc API) để xác minh ảnh check-in có thực sự tại địa điểm đó không (chống gian lận gamification).
> **Notification Service** — Gửi thông báo khi có lời mời kết bạn, comment, like, hoàn thành nhiệm vụ, v.v.

---

### A5. Core Utilities — Thiếu một số module

| Module | Incoming-changes | Repo hiện tại | Mô tả |
|--------|-----------------|---------------|-------|
| `core/algorithms.py` | ✅ (29KB) | ❌ | Thuật toán scoring, recommendation, matching |
| `core/geocoding.py` | ✅ | ❌ (logic inline) | Helper geocoding riêng |
| `core/weather.py` | ✅ | ❌ (logic inline) | Helper weather riêng |
| `core/spatial_logic.py` | ✅ | ❌ | Tính toán khoảng cách, bán kính, phát hiện trùng lặp |
| `core/redis_locks.py` | ✅ | ❌ | Distributed locking (dùng Redis) |
| `core/security.py` | ✅ | ✅ (khác cách) | JWT/JWKS utilities |

> [!NOTE]
> `core/algorithms.py` là module quan trọng nhất — chứa logic `score_location()`, `match_companions()`, và các thuật toán gợi ý. Repo hiện tại triển khai một phần inline trong các router tương ứng.

---

### A6. Scripts & Migration — Thiếu công cụ vận hành

| Script | Incoming-changes | Repo hiện tại | Mô tả |
|--------|-----------------|---------------|-------|
| `scripts/seed_data.py` | ✅ (36KB) | ✅ (nhỏ hơn) | Seed data đầy đủ hơn |
| `scripts/create_admin.py` | ✅ | ❌ | Tạo tài khoản admin từ CLI |
| `scripts/apply_migration.py` | ✅ | ❌ | Chạy migration tự động |
| `scripts/migrate_gamification.sql` | ✅ | ❌ | SQL migration cho gamification |
| `scripts/migrate_moderation.py` | ✅ | ❌ | Migration cho admin moderation |
| `scripts/rebalance_gamify.py` | ✅ | ❌ | Cân bằng lại điểm thưởng |
| `create_admin_user.py` | ✅ | ❌ | Script tạo admin user ban đầu |

---

### A7. Database Models — Thiếu một vài model phụ

| Model | Incoming-changes | Repo hiện tại | Trạng thái |
|-------|-----------------|---------------|-----------|
| `BadgeModel` / `badges` | ✅ | ❌ | ⚠️ Thiếu (dùng Achievements thay thế) |
| `UserBadgeModel` / `user_badges` | ✅ | ❌ | ⚠️ Thiếu |
| `UserAchievementProgress` | ✅ (tracking progress) | ❌ | ⚠️ Thiếu — theo dõi tiến trình mở khóa thành tựu |

> [!NOTE]
> Repo hiện tại dùng `Achievements` + `UserAchievements` đơn giản hơn. Incoming-changes có thêm `Badges` (icon-based) và `UserAchievementProgress` (tiến trình chi tiết từng thành tựu). Đây là sự khác biệt về thiết kế, **không bắt buộc phải đồng bộ** vì repo gamified đã có hệ thống `Milestones` thay thế.

---

## B. FRONTEND — Các Thành Phần Khác Biệt Còn Lại

### B1. Kiến Trúc Cơ Bản

| Đặc điểm | Incoming-changes | Repo hiện tại |
|-----------|-----------------|---------------|
| Framework | Next.js + TypeScript (.tsx) | React SPA + JavaScript (.jsx/.js) |
| Styling | TailwindCSS + shadcn/ui | Vanilla CSS + Custom components |
| Routing | Next.js App Router | React SPA tabs/screens |

> [!IMPORTANT]
> Hai repo dùng **kiến trúc frontend hoàn toàn khác nhau**. Không thể copy trực tiếp `.tsx` sang `.jsx`. Mọi tính năng đều phải được viết lại theo pattern gamified hiện có.

### B2. Màn hình Frontend — So sánh chi tiết

| Màn hình | Incoming-changes | Repo hiện tại | Trạng thái |
|----------|-----------------|---------------|-----------|
| AuthScreen | ✅ `AuthScreen.tsx` | ✅ (trong App.js) | ✅ Tương đương |
| AIPlanningScreen | ✅ `AIPlanningScreen.tsx` (105KB) | ✅ `MainTabs.jsx` tab "Lên Kế Hoạch" | ✅ Tương đương |
| GamificationScreen | ✅ `GamificationScreen.tsx` (104KB) | ✅ `MainTabs.jsx` gamified tabs | ✅ Tương đương (khác style) |
| ProfileScreen | ✅ `ProfileScreen.tsx` (141KB) | ✅ `MainTabs.jsx` tab "Hồ Sơ" | ✅ Tương đương |
| SocialFeedScreen | ✅ `SocialFeedScreen.tsx` (56KB) | ✅ `SocialFeedScreen.jsx` (27KB) | ⚠️ Có nhưng nhỏ hơn |
| FindCompanionsScreen | ✅ `FindCompanionsScreen.tsx` (12KB) | ✅ `FindCompanionsScreen.jsx` (11KB) | ✅ Tương đương |
| AdminModerationScreen | ✅ `AdminModerationScreen.tsx` (29KB) | ✅ (trong MainTabs.jsx) | ✅ Tương đương |
| EnterpriseDashboardScreen | ✅ `EnterpriseDashboardScreen.tsx` (32KB) | ✅ `EnterpriseDashboard.js` (4KB) | ⚠️ Rất nhỏ hơn |
| TrackingScreen | ✅ `TrackingScreen.tsx` (24KB) | ✅ (trong MainTabs.jsx) | ✅ Tương đương |
| ChatScreen | ✅ (trong SocialFeedScreen) | ✅ `ChatScreen.jsx` (11KB) | ✅ Tương đương |

### B3. Tính năng Frontend cụ thể còn thiếu / nhỏ hơn

#### Enterprise Dashboard (Bảng điều khiển Doanh nghiệp)
| Tính năng | Incoming-changes | Repo hiện tại |
|-----------|-----------------|---------------|
| Đăng ký doanh nghiệp | ✅ | ✅ |
| Xem trạng thái duyệt | ✅ | ✅ |
| **Đề xuất tạo địa điểm mới** | ✅ Form đầy đủ | ❌ |
| **Đề xuất cập nhật địa điểm** | ✅ | ❌ |
| **Yêu cầu xóa địa điểm** | ✅ | ❌ |
| **Xem danh sách submissions** | ✅ | ❌ |
| **Xem địa điểm đang hoạt động** | ✅ | ❌ |

> [!WARNING]
> `EnterpriseDashboard.js` hiện tại chỉ 4KB — chỉ có phần đăng ký hồ sơ cơ bản. Incoming-changes có 32KB — bao gồm luồng quản lý địa điểm đầy đủ cho doanh nghiệp.

#### Social Feed — Chênh lệch tính năng
| Tính năng | Incoming-changes | Repo hiện tại |
|-----------|-----------------|---------------|
| Xem bài viết, like, comment, save | ✅ | ✅ |
| Đăng bài kèm ảnh + tag location | ✅ | ✅ |
| Thay đổi quyền riêng tư bài viết | ✅ | ✅ |
| Xóa bài viết | ✅ | ✅ |
| Báo cáo vi phạm | ✅ | ✅ |
| **Zoom ảnh nâng cao (Modal)** | ✅ Lightbox zoom | ⚠️ Cơ bản |
| **Xem bài viết đã lưu** | ✅ Tab riêng | ⚠️ Có API nhưng UI chưa rõ |

---

## C. CẤU HÌNH & HẠ TẦNG

| Thành phần | Incoming-changes | Repo hiện tại | Trạng thái |
|-----------|-----------------|---------------|-----------|
| `.env` cấu hình đầy đủ | ✅ (API keys, Redis, etc.) | ⚠️ Cơ bản | ⚠️ Thiếu một số key |
| Redis dependency | ✅ (cho locks & caching) | ❌ | Không bắt buộc |
| Capacitor config | ✅ | ✅ | ✅ |

---

## D. TÓM TẮT THEO MỨC ĐỘ ƯU TIÊN

### 🔴 Ưu tiên cao (Ảnh hưởng chức năng chính)

| # | Thiếu | Mô tả | Độ phức tạp |
|---|-------|-------|-------------|
| 1 | Enterprise Location Submission Flow | Doanh nghiệp đề xuất tạo/sửa/xóa địa điểm — cả Backend + Frontend | 🔶 Trung bình |
| 2 | `POST /validate-route` | Phát hiện lệch lộ trình real-time | 🟢 Thấp |

### 🟡 Ưu tiên trung bình (Tăng trải nghiệm)

| # | Thiếu | Mô tả | Độ phức tạp |
|---|-------|-------|-------------|
| 3 | `GET /cities` + `GET /recommend` | Gợi ý thành phố trending + scoring địa điểm thông minh | 🔶 Trung bình |
| 4 | `services/ai_verification.py` | Xác thực ảnh AI cho anti-cheat gamification | 🔴 Cao |
| 5 | `services/notification_service.py` | Thông báo push/in-app | 🔶 Trung bình |
| 6 | `core/algorithms.py` | Module thuật toán tập trung | 🔶 Trung bình |

### 🟢 Ưu tiên thấp (Công cụ hỗ trợ / DevOps)

| # | Thiếu | Mô tả | Độ phức tạp |
|---|-------|-------|-------------|
| 7 | Scripts CLI (create_admin, migrations) | Công cụ quản trị từ dòng lệnh | 🟢 Thấp |
| 8 | Badge system (riêng biệt Achievements) | Hệ thống huy hiệu phụ | 🟢 Thấp |
| 9 | Lightbox zoom ảnh nâng cao | Modal zoom ảnh trong Social Feed | 🟢 Thấp |
| 10 | Redis distributed locks | Chống race condition khi redeem voucher | 🔶 Trung bình |

---

## E. KẾT LUẬN

Sau khi hoàn thành cả 5 chức năng chính, repo hiện tại đã **cover ~85-90%** tính năng của `incoming-changes`. Những phần còn thiếu chủ yếu là:

1. **Luồng Enterprise quản lý địa điểm** — Đây là phần thiếu lớn nhất về mặt business logic.
2. **Module thuật toán & AI** — `core/algorithms.py` và `services/ai_verification.py` tăng chất lượng gợi ý và chống gian lận.
3. **Công cụ DevOps** — Scripts migration, CLI tools — hữu ích nhưng không ảnh hưởng trực tiếp đến người dùng cuối.

> [!TIP]
> Nếu muốn tiếp tục bổ sung, nên ưu tiên theo thứ tự: **Enterprise Location Flow** → **validate-route** → **cities/recommend** → **notifications** → các công cụ còn lại.
