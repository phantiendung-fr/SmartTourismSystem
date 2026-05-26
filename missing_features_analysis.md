# Bản Phân Tích Chức Năng Bị Thiếu (Missing Features Analysis)

Tài liệu này so sánh cấu trúc mã nguồn hiện tại trong repository (`Frontend` và `Backend` chính) với các thay đổi trong thư mục `incoming-changes` để liệt kê chi tiết các chức năng bị thiếu.

---

## 1. HỆ THỐNG KIỂM DUYỆT ADMIN (Admin Moderation Portal)
Hệ thống quản trị và kiểm duyệt dành cho Admin bị thiếu hoàn toàn ở cả Backend và Frontend.

### Backend:
* **Router bị thiếu:** `routers/admin.py` chưa được tích hợp vào `Backend/main.py`.
* **Database Models bị thiếu:** `VerificationLog`, `LocationSubmission`, `LocationVerificationLog` chưa được khai báo trong file `Backend/models.py`.
* **Các Endpoints bị thiếu:**
  * **Quản lý người dùng:** `/api/admin/users`, `/api/admin/update-role/{target_user_id}` (Nâng cấp/Hạ cấp vai trò người dùng).
  * **Thống kê & Vận hành:** `/api/admin/stats` (Thống kê lượng user, post, điểm thưởng, doanh nghiệp), `/api/admin/reset-ranks` (Reset bảng xếp hạng server), `/api/admin/grant-points` (Tặng điểm thủ công cho user).
  * **Kiểm duyệt bài viết mạng xã hội:** `/api/admin/social/posts/{post_id}` (Xóa bài đăng vi phạm), `/api/admin/social/reports` (Xem báo cáo vi phạm).
  * **Cấu hình phần thưởng:** `/api/admin/rewards/vouchers` (Tạo voucher mới), `/api/admin/rewards/quests` (Tạo nhiệm vụ khám phá mới).
  * **Phê duyệt doanh nghiệp:** `/api/admin/enterprises/pending`, `/api/admin/enterprises/{enterprise_id}/approve` và `/reject` (Xem thông tin, duyệt hoặc từ chối yêu cầu đăng ký kinh doanh).
  * **Phê duyệt địa điểm đề xuất:** `/api/admin/location-submissions`, `/api/admin/location-submissions/{submission_id}`, `/api/admin/location-submissions/{submission_id}/approve` và `/reject` (So sánh dữ liệu thay đổi cũ/mới, tự động cảnh báo trùng lặp địa lý/tên gọi trong bán kính 50m).

### Frontend:
* Màn hình [AdminModerationScreen.tsx](file:///home/hieu/Downloads/SmartTourismSystem/incoming-changes/Frontend/components/smart-tourism/screens/AdminModerationScreen.tsx) chưa được chuyển đổi sang React SPA chính.
* Chưa cấu hình phân quyền giao diện: Khi tài khoản có role `ADMIN` đăng nhập, hệ thống chưa tự động chuyển hướng và hiển thị Tab Kiểm duyệt Admin trên thanh Navigation.

---

## 2. MẠNG XÃ HỘI & CỘNG ĐỒNG (Social Feed & Chat)
Phần giao diện Mạng xã hội của bạn mới chỉ là một trang tĩnh giữ chỗ (placeholder) và chưa có bất kỳ logic xử lý dữ liệu nào từ Backend.

### Backend:
* **Router bị thiếu:** `routers/community.py` chưa được định nghĩa và đăng ký trong `Backend/main.py`.
* **Database Models bị thiếu:** `SocialPost`, `PostLike`, `PostComment`, `PostSave`, `Friendship`, `ChatMessage` chưa có trong file `Backend/models.py`.
* **Các Endpoints bị thiếu:**
  * **Bảng tin & Bài viết:** `/api/social/posts` (Xem bài đăng cộng đồng, tạo bài đăng mới kèm ảnh Base64 & gắn thẻ vị trí), `/api/social/my-posts`, `/api/social/saved-posts`, `/api/social/posts/{post_id}/privacy` (Thiết lập bài viết Công khai / Bạn bè / Chỉ mình tôi).
  * **Tương tác:** `/api/social/like/{post_id}`, `/api/social/comment` (Bình luận), `/api/social/comments/{post_id}`, `/api/social/save/{post_id}` (Lưu bài viết), `/api/social/report` (Báo cáo bài viết).
  * **Bạn bè:** `/api/social/friend-request` (Gửi kết bạn), `/api/social/friend-requests/pending` (Danh sách lời mời), `/api/social/friend-requests/respond` (Chấp nhận/từ chối kết bạn).
  * **Nhắn tin trực tiếp (Chat):** `/api/social/messages` (Gửi tin nhắn), `/api/social/messages/{target_user_id}` (Lịch sử cuộc trò chuyện).

### Frontend:
* Giao diện mạng xã hội [SocialFeedScreen.tsx](file:///home/hieu/Downloads/SmartTourismSystem/incoming-changes/Frontend/components/smart-tourism/screens/SocialFeedScreen.tsx) chưa được tích hợp vào Tab "Bạn bè & Cộng đồng" trong `MainTabs.jsx`.
* Thiếu các tính năng:
  * Đăng bài viết mới (kèm tải ảnh base64, tìm kiếm địa điểm để check-in/tag).
  * Modal hiển thị và viết bình luận dưới bài viết.
  * Modal Zoom ảnh nâng cao, thay đổi quyền riêng tư của bài viết, xóa bài viết và báo cáo vi phạm.
  * Giao diện Nhắn tin (Chat) trực tiếp với bạn bè.

---

## 3. GHÉP ĐÔI BẠN ĐỒNG HÀNH (Companion Finder)
Tính năng giúp kết nối những người đi du lịch có cùng sở thích.

### Backend:
* **Endpoint bị thiếu:** `/api/social/companions` trong router community. Đây là thuật toán so sánh điểm tương đồng (Match Percentage) dựa trên: Thành phố muốn đến, Mức ngân sách mong muốn, và các Tag sở thích du lịch giống nhau.

### Frontend:
* Màn hình [FindCompanionsScreen.tsx](file:///home/hieu/Downloads/SmartTourismSystem/incoming-changes/Frontend/components/smart-tourism/screens/FindCompanionsScreen.tsx) chưa được tích hợp vào tab Ghép đôi. Giao diện tinder-card vuốt trái/phải chấp nhận hoặc từ chối ghép đôi và xem mức độ tương thích (%) chưa hoạt động.

---

## 4. PROXY BẢN ĐỒ & THỜI TIẾT (Geocoding & Weather Proxies)
Để tránh lỗi chặn tên miền (CORS) trên điện thoại và hạn chế lượt gọi (Rate-limit) trực tiếp từ client.

### Backend:
* **Router bị thiếu:** `routers/explore.py` chưa được tích hợp.
* **Các Endpoints bị thiếu:**
  * `/api/discovery/geocode/reverse` (Proxy Nominatim OSM để dịch từ GPS lat/lon sang địa chỉ chữ Tiếng Việt: Xã, Huyện, Tỉnh).
  * `/api/discovery/geocode/search` (Proxy tìm kiếm địa chỉ Nominatim kết hợp tìm nhanh dữ liệu POI từ DB của app và ưu tiên tìm quanh toạ độ GPS của user trong bán kính 50km).
  * `/api/discovery/weather` (Proxy lấy thông tin thời tiết hiện tại).

### Frontend:
* Các màn hình bản đồ/tracking của Frontend hiện tại chưa gọi qua các proxy này mà đang dùng giả lập hoặc gọi trực tiếp, dễ gây lỗi kết nối khi đóng gói Capacitor Mobile.

---

## 5. GAMIFICATION & CỬA HÀNG ĐỔI QUÀ (Rewards & Shop)
Phần game hóa của chúng ta chưa đồng bộ đầy đủ các thử thách và voucher ưu đãi từ đối tác kinh doanh.

### Backend:
* **Database Models bị thiếu:** `Milestone` (Cột mốc), `UserMilestone` (Huy hiệu người dùng), `DiscoveryPrompt` (Nhiệm vụ tuần), `UserPrompt` (Tiến trình nhiệm vụ), `Privilege` (Voucher doanh nghiệp), `UserPrivilege` (Lịch sử đổi voucher), `LocalAmbassador` (Đại sứ địa phương).
* **Các Endpoints bị thiếu:**
  * `/api/social/rewards` (Lấy danh sách huy hiệu đã mở khóa, danh sách voucher đổi quà, nhiệm vụ tuần).
  * `/api/social/leaderboard` (Bảng xếp hạng tổng sắp điểm tích lũy của toàn bộ người chơi).

### Frontend:
* Màn hình Profile và Gamification hiện tại chưa hỗ trợ Tab đổi voucher bằng điểm (`Privileges`), Tab theo dõi nhiệm vụ khám phá (`Discovery Prompts`) và hiển thị bảng xếp hạng Ambassador của từng địa điểm cụ thể.
