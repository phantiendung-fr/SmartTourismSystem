# Smart Tourism System

**Smart Tourism System** là hệ thống hỗ trợ du lịch thông minh toàn diện, tích hợp nền tảng Web và ứng dụng di động Native (Android/iOS). Hệ thống cung cấp các giải pháp gợi ý địa điểm, lập kế hoạch hành trình du lịch, cơ chế tương tác trò chơi hóa (Gamification) thông qua các nhiệm vụ thực tế và check-in GPS nhằm nâng cao trải nghiệm của du khách.

---

## 🚀 Công Nghệ Sử Dụng (Tech Stack)

### 💻 Frontend & Mobile
*   **Framework:** React SPA (React 19)
*   **Mobile Wrapper:** Capacitor 8 (Đóng gói ứng dụng sang Android / iOS)
*   **Bản đồ:** Leaflet & OpenStreetMap (Hiển thị bản đồ, tương tác vị trí)
*   **Quản lý giao diện:** CSS Vanilla thiết kế hiện đại, responsive, hỗ trợ Dark Mode và âm thanh nền sinh động (BGM/SFX).

### ⚙️ Backend & Database
*   **API Framework:** FastAPI (Python 3.9+)
*   **Database:** PostgreSQL (triển khai qua Supabase)
*   **Cache & Realtime:** Redis & WebSockets
*   **Xác thực (Auth):** Supabase Auth (Hỗ trợ xác thực Email OTP và đăng nhập mạng xã hội qua Google OAuth).

---

## ✨ Tính Năng Nổi Bật

1.  **Đa nền tảng (Web & Mobile APK):** Chạy mượt mà trên trình duyệt web và thiết bị di động. Đăng nhập Google OAuth tự động điều hướng trở lại Native App (Deep Linking) bằng cấu hình in-app browser.
2.  **Lập kế hoạch hành trình du lịch:** Tự động đề xuất địa điểm dựa trên ngân sách và sở thích của người dùng, phân chia lịch trình chi tiết theo từng ngày.
3.  **Tương tác Trò chơi hóa (Gamification - Social Quest):**
    *   Tự động giả lập hoặc nhận dữ liệu vị trí GPS thực tế.
    *   Thực hiện check-in địa điểm trong bán kính cho phép.
    *   Tham gia các chiến dịch và nhiệm vụ ẩn để tích lũy điểm thưởng.
4.  **Dashboard cho Doanh nghiệp (Enterprise):** Đăng ký địa điểm kinh doanh, cập nhật voucher khuyến mãi và theo dõi thống kê số liệu.
5.  **Hệ thống Quản trị (Admin Moderation):** Duyệt các yêu cầu đăng ký địa điểm và kiểm soát hệ thống.

---

## 🛠️ Hướng Dẫn Cài Đặt (Lần Đầu)

### Yêu cầu hệ thống
*   Node.js (v18.x trở lên)
*   Python (v3.9 trở lên)
*   Docker & Docker Desktop (Nếu muốn chạy DB và Redis qua Container)

### 1. Cấu hình Backend (FastAPI)
1.  Di chuyển vào thư mục Backend:
    ```bash
    cd Backend
    ```
2.  Tạo môi trường ảo (Virtual Environment):
    ```bash
    python -m venv venv
    ```
3.  Kích hoạt môi trường ảo:
    *   **Windows (PowerShell):** `.\venv\Scripts\activate`
    *   **macOS/Linux:** `source venv/bin/activate`
4.  Cài đặt các thư viện cần thiết:
    ```bash
    pip install -r requirements.txt
    ```
5.  Tạo file cấu hình môi trường `.env` trong thư mục `Backend` (sao chép từ `.env.example`) và điền các thông số kết nối Database (Supabase URL, Anon Key, Redis URL...).

### 2. Cấu hình Frontend (React)
1.  Di chuyển vào thư mục Frontend:
    ```bash
    cd ../Frontend
    ```
2.  Cài đặt các thư viện phụ thuộc:
    ```bash
    npm install
    ```
3.  Thiết lập file `.env` nếu cần tinh chỉnh cấu hình API.

---

## 🖥️ Hướng Dẫn Chạy Ứng Dụng

### Cách 1: Chạy tự động bằng file Script (Khuyên dùng cho Windows)
Từ thư mục gốc của dự án, mở PowerShell và chạy lệnh:
```powershell
.\run.ps1
```
*Script sẽ tự động kiểm tra giải phóng cổng 3000 & 8000, kích hoạt môi trường ảo, khởi động song song Backend và Frontend trên hai cửa sổ/tab riêng biệt và tự động mở trình duyệt.*

### Cách 2: Chạy thủ công từng bước

#### Bước 1: Khởi chạy API Backend
Mở Terminal 1 và di chuyển vào thư mục `Backend`:
```bash
.\venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*Tài liệu API tự động (Swagger UI) sẽ hoạt động tại: [http://localhost:8000/docs](http://localhost:8000/docs)*

#### Bước 2: Khởi chạy Frontend
Mở Terminal 2 và di chuyển vào thư mục `Frontend`:
```bash
npm start
```
*Ứng dụng Web chạy tại: [http://localhost:3000](http://localhost:3000)*

---

## 📱 Hướng Dẫn Đóng Gói Ứng Dụng Di Động (APK Android)

Hệ thống đã được thiết lập sẵn Custom Scheme Deep Linking (`smarttourism://callback`) phục vụ cho Google OAuth. Để build file APK:

### 1. Build mã nguồn React
Trong thư mục `Frontend`, chạy lệnh build sản phẩm web tĩnh:
```powershell
$env:CI="false"; npx react-scripts build
```

### 2. Đồng bộ hóa với dự án Capacitor Android
Đồng bộ các file tĩnh sang thư mục Android gốc:
```powershell
npx cap sync
```

### 3. Cấu hình trên Supabase Dashboard
Truy cập vào **Supabase Dashboard -> Project Settings -> Auth -> URL Configuration** và thêm vào ô **Redirect URLs**:
```text
smarttourism://callback
```

### 4. Build APK qua Android Studio
1.  Mở **Android Studio** và chọn **Open** thư mục `Frontend/android`.
2.  Đợi Gradle chạy đồng bộ hoàn tất.
3.  Chọn menu **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.
4.  Khi build xong, nhấn **locate** ở bảng thông báo để lấy file `app-debug.apk` và cài đặt lên máy để trải nghiệm.
