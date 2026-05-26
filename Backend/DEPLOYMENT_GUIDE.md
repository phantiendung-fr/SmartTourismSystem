# Hướng Dẫn Đóng Gói Docker & Triển Khai Backend Lên Render

Tài liệu này hướng dẫn bạn cách đóng gói ứng dụng FastAPI Backend của dự án **Du Lịch Thông Minh Việt Nam** bằng Docker và triển khai nó lên nền tảng **Render**.

---

## 1. Cấu trúc các file Docker đã tạo
Hệ thống đã tạo sẵn 2 file quan trọng trong thư mục [Backend](file:///home/hieu/Downloads/SmartTourismSystem/Backend/):
1. **[Dockerfile](file:///home/hieu/Downloads/SmartTourismSystem/Backend/Dockerfile)**: Sử dụng kỹ thuật *Multi-stage build* giúp giảm dung lượng ảnh (image) tối đa và tăng tính bảo mật (loại bỏ các công cụ build dư thừa ở production).
2. **[.dockerignore](file:///home/hieu/Downloads/SmartTourismSystem/Backend/.dockerignore)**: Bỏ qua các file không cần thiết khi build như `.git`, `venv`, `__pycache__`, và các file `.env` để bảo mật thông tin.

---

## 2. Kiểm tra và Chạy thử Docker ở Local
Để kiểm tra xem Dockerfile hoạt động ổn định hay không, bạn hãy thực hiện các bước sau trên máy cá nhân:

### Bước 2.1: Build Docker Image
Di chuyển vào thư mục `Backend` và chạy lệnh build:
```bash
cd Backend
docker build -t smart-tourism-backend:latest .
```

### Bước 2.2: Chạy Container ở Local
Chạy Docker container kết hợp truyền file `.env` hiện tại của bạn vào môi trường:
```bash
docker run -d --name smart-backend-container -p 8000:8000 --env-file .env smart-tourism-backend:latest
```

*Lưu ý:*
- Cổng `8000` của máy host sẽ được map vào cổng `8000` của container.
- Bạn có thể kiểm tra log của container bằng lệnh: `docker logs -f smart-backend-container`.
- Truy cập `http://localhost:8000/docs` hoặc `http://localhost:8000/health` để kiểm tra backend.

---

## 3. Triển Khai lên Render qua GitHub (Khuyên dùng)
Cách đơn giản nhất để triển khai trên Render là liên kết trực tiếp kho lưu trữ GitHub của bạn. Render sẽ tự động build lại mỗi khi bạn push code mới.

### Bước 3.1: Chuẩn bị Git
Đảm bảo mã nguồn của bạn (bao gồm thư mục `Backend` có chứa `Dockerfile` và `.dockerignore`) đã được đẩy lên một repository trên **GitHub** hoặc **GitLab** (ở chế độ Public hoặc Private).

### Bước 3.2: Tạo Web Service mới trên Render
1. Truy cập vào dashboard của [Render](https://dashboard.render.com/) và đăng nhập.
2. Nhấn nút **New +** và chọn **Web Service**.
3. Chọn **Build and deploy from a Git repository**, sau đó kết nối với tài khoản GitHub và chọn repository chứa dự án của bạn.

### Bước 3.3: Cấu hình Web Service
Trong trang cấu hình chi tiết, điền các thông tin sau:
- **Name**: Tên dịch vụ của bạn (Ví dụ: `smart-tourism-backend`).
- **Region**: Chọn khu vực gần Việt Nam nhất (Ví dụ: `Singapore` hoặc `Oregon`).
- **Branch**: Chọn nhánh chứa code chính thức (Ví dụ: `main` hoặc `master`).
- **Root Directory**: Nhập `Backend` (Đây là thư mục chứa code backend và Dockerfile của bạn).
- **Runtime**: Chọn **Docker** (Render sẽ tự động phát hiện `Dockerfile` trong thư mục Root Directory này).
- **Instance Type**: Chọn gói phù hợp (Gói **Free** là đủ để thử nghiệm).

### Bước 3.4: Cấu hình Environment Variables (Biến môi trường)
Kéo xuống phần **Environment Variables** và thêm các khóa cấu hình bắt buộc cho chế độ Production (dựa vào cấu hình trong `core/config.py`):

| Key | Value (Ví dụ) | Ghi chú |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production` | Bắt buộc để kích hoạt các kiểm tra bảo mật. |
| `REQUIRE_HTTPS` | `true` | Bắt buộc ở chế độ production trên Render (Render tự động cung cấp SSL/HTTPS). |
| `DATABASE_URL` | `postgresql://postgres:your_supabase_password@db.xxxxxx.supabase.co:6543/postgres` | Đường dẫn kết nối database Supabase của bạn. |
| `SECRET_KEY` | *[Một chuỗi ngẫu nhiên dài hơn 32 ký tự]* | Sử dụng để mã hóa JWT token bảo mật. |
| `CORS_ORIGINS` | `https://your-frontend.onrender.com,http://localhost:3000` | Địa chỉ frontend được phép gọi API (phân tách bằng dấu phẩy). |
| `TRUSTED_HOSTS` | `*.onrender.com,localhost` | Các domain được chấp nhận truy cập. |

> [!IMPORTANT]
> - Do cài đặt kiểm tra bảo mật nghiêm ngặt trong `core/config.py`: Nếu `ENVIRONMENT` là `production`, hệ thống sẽ chặn khởi động nếu bạn không cung cấp đầy đủ `DATABASE_URL` bên ngoài (không dùng localhost) và `SECRET_KEY` bảo mật chất lượng cao.
> - Render sẽ tự động gán biến môi trường `PORT` và container sẽ khởi động đúng cổng này nhờ câu lệnh: `CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]` mà chúng tôi đã thiết lập sẵn trong `Dockerfile`.

---

## 4. Kiểm tra Sau Khi Triển Khai
Sau khi Render build xong (trạng thái chuyển sang **Live**):
1. Copy đường dẫn URL do Render cung cấp (Ví dụ: `https://smart-tourism-backend.onrender.com`).
2. Mở trình duyệt và truy cập:
   - `https://smart-tourism-backend.onrender.com/` (Phải nhận được JSON trả về dạng `{"status": "ok", ...}`).
   - `https://smart-tourism-backend.onrender.com/health` (Trả về `{"status": "healthy"}`).
   - `https://smart-tourism-backend.onrender.com/docs` để xem giao diện tài liệu API Swagger.
