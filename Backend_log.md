# 🚀 Auth Module - Hệ thống Xác thực & Phân quyền (Travel App)

Hệ thống quản lý định danh người dùng toàn diện, xử lý toàn bộ luồng tạo tài khoản, đăng nhập, bảo mật phiên làm việc và phân quyền truy cập cho đồ án Travel App.

## 🛠 Nền tảng công nghệ
* **Backend:** FastAPI, SQLAlchemy ORM, PostgreSQL (Supabase).
* **Bảo mật:** Bcrypt (Hash Password), JWT (Mã hóa phân quyền HS256).
* **Frontend:** React Native (Expo), Axios, Context API, AsyncStorage.

---

## 📦 Kiến trúc & Tính năng hoàn thiện

### 1. Luồng Đăng ký (Register)
* Validate dữ liệu đầu vào (định dạng email, độ dài mật khẩu).
* Kiểm tra email trùng lặp trực tiếp từ CSDL.
* Tự động băm (hash) mật khẩu bằng thuật toán `bcrypt` trước khi đẩy dữ liệu lên Supabase.
* Phân quyền mặc định (`role = "user"`) và trạng thái kích hoạt (`status = "active"`).

### 2. Luồng Đăng nhập (Login)
* Xác thực thông tin qua email và mật khẩu đã hash.
* Cấp phát đồng thời **Access Token** (hạn 60 phút) và **Refresh Token** (hạn 7 ngày).
* Lưu trữ thông tin phiên đăng nhập (Session) xuống database để quản lý thiết bị.

### 3. Hệ thống Phân quyền (Authorization)
* Token được đính kèm vào Header của mọi request (`Authorization: Bearer <token>`).
* Xây dựng Dependency `verify_token` trong FastAPI để tự động chặn các API yêu cầu quyền đăng nhập (Ví dụ: endpoint `/api/auth/me`).
* Cấu trúc Token chứa thông tin `role` hỗ trợ mở rộng logic Admin/User sau này.

### 4. Luồng Đăng xuất (Logout)
* API tiếp nhận Refresh Token và thay đổi trạng thái `is_revoked = True` trên Supabase.
* Frontend tự động xóa sạch dữ liệu Token khỏi bộ nhớ cục bộ (RAM và AsyncStorage), đưa người dùng về luồng khách (Guest).

---

## 🚀 Hướng dẫn chạy & Cài đặt môi trường

### Cấu hình Backend
1. Cài đặt các thư viện lõi: 
   `pip install fastapi uvicorn sqlalchemy pydantic email-validator passlib bcrypt PyJWT psycopg2-binary`
2. Đảm bảo đã cập nhật chuỗi kết nối Supabase của nhóm vào file `database.py`.
3. Khởi chạy Server: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
4. Kiểm thử API qua Swagger: `http://127.0.0.1:8000/docs`

### Cấu hình Frontend
1. Cập nhật địa chỉ `BASE_URL` trỏ về IPv4 máy tính tại `src/services/api.js`.
2. Cài đặt các module quản lý trạng thái và UI:
   `npm install axios @react-native-async-storage/async-storage @react-navigation/native @react-navigation/stack`
3. Chạy ứng dụng: `npx expo start`