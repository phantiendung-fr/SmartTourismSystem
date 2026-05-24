# Hướng dẫn Khởi chạy & Kiểm thử Mobile toàn tập

Tài liệu này tổng hợp các bước từ A-Z để một thành viên mới trong team (khi clone project này về máy) có thể cài đặt, chạy server (Backend & Frontend) và test giao diện trên điện thoại thực tế.

---

## Phần 1: Hướng dẫn Khởi chạy Ứng dụng trên Máy tính

Để test được trên điện thoại, bạn bắt buộc phải khởi chạy thành công cả Backend và Frontend trên máy tính trước.

### 1. Khởi chạy Backend (Python / FastAPI)
Backend phải được thiết lập để lắng nghe mọi kết nối trong mạng LAN (qua `0.0.0.0`) thay vì chỉ `localhost`, thì điện thoại mới có thể gọi API được.

1. Mở Terminal (CMD/PowerShell).
2. Di chuyển vào thư mục Backend:
   ```bash
   cd Backend
   ```
3. Cài đặt các thư viện cần thiết (nếu chưa cài):
   ```bash
   pip install -r requirements.txt
   ```
4. Khởi chạy server Backend:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *(Cờ `--host 0.0.0.0` rất quan trọng, nó cho phép các thiết bị khác trong cùng mạng Wi-Fi gọi được API).*

### 2. Khởi chạy Frontend (React JS)
1. Mở một cửa sổ Terminal mới.
2. Di chuyển vào thư mục Frontend:
   ```bash
   cd Frontend
   ```
3. Cài đặt thư viện:
   ```bash
   npm install
   ```
4. Khởi chạy web server:
   ```bash
   npm start
   ```
5. Đợi một lát, Terminal sẽ in ra các địa chỉ để truy cập. Hãy chú ý dòng **"On Your Network"** (ví dụ: `http://192.168.1.5:3000`). Đây chính là **IP máy tính của bạn**, hãy nhớ số IP này để dùng cho các bước dưới.

---

## Phần 2: Cấu hình IP cho App (Rất quan trọng khi chạy App Native)

Trước đây, ứng dụng gán cứng IP `192.168.1.5`. Tuy nhiên hiện tại code đã được thiết kế lại để tự động linh hoạt hơn.

- **Khi test bằng Trình duyệt Web (Cả trên PC và Điện thoại):**
  **Bạn KHÔNG CẦN cấu hình gì cả!** Code sẽ tự động bắt theo địa chỉ IP mà bạn đang truy cập. Nếu bạn vào `http://192.168.1.100:3000`, Frontend sẽ tự động gọi Backend theo `http://192.168.1.100:8000`.

- **Khi build ra file App cài đặt (APK cho Android / IPA cho iOS):**
  App Native cài thẳng vào điện thoại sẽ không tự lấy IP động được. Lập trình viên cần tự khai báo IP máy tính của họ vào file biến môi trường:
  1. Tạo hoặc mở file `.env` ở thư mục `Frontend`.
  2. Điền chính xác IP máy tính của bạn (đã lấy ở Bước 2 phần Frontend) vào biến sau:
     ```env
     REACT_APP_API_URL=http://<IP_MÁY_CỦA_BẠN>:8000
     ```
  3. Lưu file lại. Sau đó mới chạy lệnh build (`npm run build` và `npx cap sync`).

---

## Phần 3: Cách Test trên Điện thoại (Nhanh nhất, không cần Build)
Cách này phù hợp nhất khi đang code giao diện (cần thấy thay đổi tức thì) và áp dụng được cho **cả Android và iOS**.

1. Đảm bảo **Điện thoại** và **Máy tính** đang kết nối chung mạng Wi-Fi.
2. **Nếu Tường lửa (Windows Firewall) đang bật:** Có thể điện thoại sẽ báo lỗi không tải được trang. Hãy vào *Windows Security -> Firewall & network protection -> Private network -> Tạm tắt Microsoft Defender Firewall (Off)*.
3. Cầm điện thoại lên, mở trình duyệt (Safari với iOS hoặc Chrome với Android).
4. Truy cập địa chỉ IP lấy từ Terminal Frontend (ví dụ: `http://192.168.1.5:3000`).
5. **(Bắt buộc để giống app thật 100%):** 
   - **iOS (Safari):** Chọn nút "Chia sẻ" ở viền dưới -> Chọn **"Add to Home Screen"** (Thêm vào MH chính).
   - **Android (Chrome):** Chọn nút 3 chấm góc phải trên -> Chọn **"Add to Home screen"**.
6. Thoát ra màn hình chính điện thoại, mở Icon app vừa được tạo. 
   👉 App sẽ chạy tràn viền (Fullscreen), hiển thị rõ vùng bị lẹm của tai thỏ, Dynamic Island, hoàn toàn giống như một App tải từ Store! Bạn đổi code trên máy tính, app tự động tải lại ngay.

---

## Phần 4: Cách Test bằng việc Build File Cài đặt (APK)
Nếu muốn build thành 1 app độc lập để gửi file cài đặt cho sếp hoặc QA/Tester mà không cần họ phải chung mạng Wi-Fi lúc build (nhưng Backend vẫn phải được đưa lên server online, hoặc họ đến công ty xài chung Wi-Fi):

1. Đảm bảo bạn đã điền đúng `REACT_APP_API_URL` trong file `.env` như Phần 2 hướng dẫn.
2. Tại Terminal thư mục `Frontend`, chạy lệnh build code web và đồng bộ qua native:
   ```bash
   npm run build
   npx cap sync
   ```
3. Mở mã nguồn Android bằng phần mềm Android Studio (máy bạn cần cài sẵn phần mềm này):
   ```bash
   npx cap open android
   ```
4. Đợi một lát cho Gradle chạy đồng bộ. Trên menu trên cùng của Android Studio, chọn **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
5. Sau khi thành công, góc dưới bên phải màn hình sẽ có thông báo. Ấn vào **locate** để mở thư mục chứa file `app-debug.apk`.
6. Gửi file APK này (qua Zalo, Telegram, Google Drive...) cho người khác tải về và cài đặt trực tiếp trên điện thoại Android của họ.
