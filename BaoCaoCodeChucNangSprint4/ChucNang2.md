# Báo Cáo Tổng Hợp: Chức Năng Gợi Ý Địa Điểm, Xây Dựng & Theo Dõi Lộ Trình

Báo cáo này liệt kê chi tiết các thay đổi, các hàm (functions) đã được xây dựng và nguyên lý hoạt động của các thuật toán được áp dụng cho Chức năng số 2.

---

## 0. Công Tác Chuẩn Bị (Hạ Tầng & Cơ Sở Dữ Liệu)
*Những thay đổi này không trực tiếp là tính năng cuối, nhưng là nền tảng bắt buộc để 3 chức năng chính bên dưới có thể hoạt động và giao tiếp với nhau.*

*   **`requirements.txt`**: Bổ sung thư viện (`fastapi`, `sqlalchemy`, `pydantic`...) để xây dựng API và làm việc với CSDL.
*   **`Backend/database.py` & `main.py`**: Thiết lập kết nối cơ sở dữ liệu (sẵn sàng chuyển đổi giữa SQLite/Supabase) và khởi tạo ứng dụng FastAPI.
*   **`Backend/models.py` (Database Models):** Định nghĩa cấu trúc 3 bảng SQL: `Location` (kho dữ liệu điểm đến), `Trip` (quản lý chuyến đi) và `TripStop` (quản lý các trạm dừng trong chuyến đi).
*   **`Backend/schemas.py` (API Validation):** Định nghĩa quy tắc (Pydantic schemas) để kiểm tra chặt chẽ dữ liệu mà Client gửi lên (Request) và định dạng dữ liệu trả về (Response).
*   **`Backend/dummy_data/seed_data.py`**: Nạp tự động 20 địa điểm có thật (Đà Nẵng, Hội An) với tọa độ và thông tin thực tế để các thuật toán gợi ý và tính khoảng cách có dữ liệu chính xác để xử lý.

---

## 1. Chức Năng Gợi Ý Địa Điểm
**Mục tiêu:** Dựa vào tham số đầu vào (thành phố, ngân sách, sở thích) để đề xuất danh sách địa điểm phù hợp nhất.

*   **Tầng API (`Backend/api/locations.py`):**
    *   **Endpoint:** `POST /api/suggestions/recommend`
    *   **Nhiệm vụ:** Tiếp nhận request, gọi xuống tầng DB lấy địa điểm, gọi thuật toán chấm điểm và sắp xếp trả về.
*   **Tầng DB (`Backend/crud/crud_trip.py`):**
    *   **Function:** `get_locations_by_city(db, city)` - Truy vấn lọc thô địa điểm theo thành phố.
*   **Tầng Thuật Toán (`Backend/core/algorithms.py`):**
    *   **Function: `score_location()`**
        *   *Quy tắc:* Lọc bỏ hoàn toàn (Ràng buộc cứng) nếu độ đắt đỏ của địa điểm (`cost_level`) lớn hơn ngân sách của user (`budget_level`). Nếu thỏa mãn, tiến hành chấm điểm (Ràng buộc mềm).
    *   **Function: `compute_tag_similarity()`**
        *   *Thuật toán áp dụng:* **Jaccard Similarity** (Độ tương đồng Jaccard).
        *   *Công thức:* `J(A, B) = |A ∩ B| / |A ∪ B|`
            *(Số lượng tag trùng khớp chia cho tổng số tag duy nhất của cả 2 tập).*
        *   *Mô tả:* Hàm này tính toán mức độ giống nhau giữa danh sách sở thích của người dùng (Tập A) và danh sách tag đặc trưng của địa điểm (Tập B). Kết quả trả về là một tỷ lệ từ `0.0` (không có sở thích nào khớp) đến `1.0` (khớp hoàn hảo mọi sở thích). Điểm này chiếm trọng số lớn trong tổng điểm xếp hạng địa điểm.

---

## 2. Chức Năng Xây Dựng Lộ Trình
**Mục tiêu:** Chuyển đổi các địa điểm người dùng đã chọn thành một chuyến đi hoàn chỉnh, lưu trữ trạng thái và tính toán thời gian đi lại.

*   **Tầng API (`Backend/api/trips.py`):**
    *   **Endpoints:**
        *   `POST /api/trips/create`: Tạo lộ trình từ danh sách ID địa điểm.
        *   `GET /api/trips/{trip_id}`: Xem chi tiết lộ trình.
        *   `PUT /api/trips/{trip_id}/start` | `complete` | `cancel`: Cập nhật vòng đời chuyến đi.
    *   **Nhiệm vụ:** Validate các ID địa điểm, giữ nguyên thứ tự sắp xếp của user, gọi hàm tính tổng thời gian và lưu CSDL.
*   **Tầng DB (`Backend/crud/crud_trip.py`):**
    *   **Functions:** `create_trip()`, `create_trip_stops()`, `update_trip_status()`. Thực thi các lệnh INSERT/UPDATE dữ liệu lộ trình.
*   **Tầng Thuật Toán (`Backend/core/algorithms.py`):**
    *   **Function: `haversine()`**
        *   *Thuật toán áp dụng:* **Haversine Formula** (Công thức Haversine).
        *   *Công thức:*
            `a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)`
            `c = 2 * atan2(√a, √(1−a))`
            `Khoảng cách d = R * c` *(Với R = 6371km là bán kính Trái Đất)*.
        *   *Mô tả:* Do Trái Đất là hình cầu, không thể tính khoảng cách bằng hình học phẳng thông thường. Thuật toán Haversine nhận 2 cặp tọa độ GPS (Vĩ độ - Kinh độ) và trả về "khoảng cách chim bay" (đại vòng) chính xác giữa 2 điểm.
    *   **Function: `estimate_travel_time()`**
        *   *Mô tả:* Sử dụng hàm `haversine` để lấy khoảng cách, sau đó chia cho tốc độ trung bình (giả định 40km/h trong đô thị) để trả về thời gian ước tính (tính bằng phút) cần thiết để di chuyển giữa các trạm dừng, phục vụ cho việc lập kế hoạch thời gian.

---

## 3. Chức Năng Theo Dõi Tiến Độ
**Mục tiêu:** Quản lý hành trình di chuyển thực tế của user dựa trên các trạm dừng đã định, đảm bảo user thực sự đến nơi mới được check-in.

*   **Tầng API (`Backend/api/trips.py`):**
    *   **Endpoints:**
        *   `GET /api/trips/{trip_id}/progress`: Trả về tiến độ (Tỷ lệ %, danh sách các trạm còn lại).
        *   `POST /api/trips/{trip_id}/checkin/{stop_id}`: API Check-in với 3 lớp xác thực nghiêm ngặt.
*   **Tầng DB (`Backend/crud/crud_trip.py`):**
    *   **Function:** `mark_stop_completed()` - Đánh dấu `is_completed = True` và ghi nhận thời gian `checked_in_at` vào bảng `TripStop`.
*   **Tầng Thuật Toán (`Backend/core/algorithms.py`):**
    *   **Function: `check_within_radius()`**
        *   *Mô tả:* Triển khai tính năng **Geofencing (Hàng rào địa lý)**. Hàm này sử dụng lại công thức `haversine()` bên trên để đo khoảng cách từ tọa độ GPS hiện tại của người dùng (do Client gửi lên) tới tọa độ thực tế của trạm dừng.
        *   *Quy tắc Check-in:* API chỉ chấp nhận lệnh check-in nếu khoảng cách này **nhỏ hơn hoặc bằng bán kính cho phép (mặc định 100m = 0.1km)**. Nếu lớn hơn, API sẽ từ chối và báo lỗi khoảng cách cụ thể cho người dùng (Ví dụ: *"Bạn cách trạm 350m, cần ở trong phạm vi 100m"*).

---

## 4. Ghi Chú Tích Hợp & Ranh Giới Module (Phòng Tránh Conflict)
*Phần này liệt kê các ranh giới để Hieu và các thành viên khác trong nhóm (đặc biệt là người làm Chức năng 3 - Planning chi tiết, Chức năng 4 - Tối ưu và Chức năng 5 - Tracking GPS) phối hợp trơn tru, tận dụng lại code của nhau mà không bị đụng độ (conflict).*

*   **Với Chức năng 3 (Lên planning chi tiết - Phân bổ lịch trình theo ngày/giờ):**
    *   *Tình trạng:* Hieu đã làm phần "khung móng" (Tạo `Trip`, tạo danh sách `TripStop` ban đầu, ước lượng tổng thời gian).
    *   *Hướng phối hợp:* Người làm chức năng 3 KHÔNG cần tạo lại các bảng DB hay viết lại API tạo chuyến đi. Họ sẽ viết thêm các API để phân bổ và cập nhật thời gian cụ thể (`arrival_time`, `departure_time`) vào các bản ghi `TripStop` mà hàm `create_trip_stops()` của Hieu đã sinh ra sẵn.
*   **Với Chức năng 4 (Tối ưu lộ trình - Thuật toán TSP):**
    *   *Tình trạng:* Hiện tại API `POST /api/trips/create` của Hieu đang giữ nguyên thứ tự địa điểm mà người dùng chọn.
    *   *Hướng phối hợp:* Người làm chức năng 4 sẽ **tái sử dụng** hàm `haversine()` và `estimate_travel_time()` của Hieu làm nền tảng tính toán khoảng cách (Objective Function) cho thuật toán Tối ưu của họ. Khi họ áp dụng thuật toán xong, họ chỉ cần đảo lại thứ tự mảng `location_ids` trước khi truyền vào tầng CRUD của Hieu.
*   **Với Chức năng 5 (Tracking - GPS Real-time & Ghi log di chuyển):**
    *   *Tình trạng:* Hieu đã dọn dẹp sạch sẽ toàn bộ code liên quan đến GPS Tracking liên tục (như đã phân tích ở trên). Tính năng của Hieu chỉ giải quyết việc "Kiểm soát tiến độ & Check-in".
    *   *Hướng phối hợp:* Người làm chức năng 5 sẽ tự định nghĩa thêm bảng `TrackingLog` nối với `trip_id`. Họ có thể **tái sử dụng** thuật toán `haversine()` của Hieu để viết thuật toán đo độ lệch chuẩn và phát hiện chệch hướng (Off-route detection).
*   **Về hạ tầng chung (Database, Models, Schemas, Main):**
    *   Hieu đã setup sẵn "bộ khung" (`database.py`, kiến trúc thư mục). Mọi người không cần mất công khởi tạo lại dự án.
    *   Khi họ thêm chức năng, họ chỉ việc: khai báo thêm class Bảng mới vào cuối file `models.py`, khai báo Schema mới vào `schemas.py` và đăng ký thêm `app.include_router(...)` vào `main.py`. Cấu trúc này đảm bảo ai làm việc ở vùng của người đó, rất ít khi xảy ra xung đột (conflict) Git.

---

## 5. Những Thay Đổi Cần Thực Hiện Khi Tích Hợp Thực Tế
*Code hiện tại là phần "khung xương" đã hoạt động hoàn chỉnh khi chạy độc lập. Tuy nhiên, khi ghép nối với code của các thành viên khác hoặc khi yêu cầu/stack được xác định rõ hơn, các file sau sẽ cần được chỉnh sửa.*

### 5.1. Khi Database được xác định rõ (VD: chuyển sang Supabase/PostgreSQL)

| File cần sửa | Sửa gì | Chi tiết |
|---|---|---|
| `database.py` | Thay chuỗi kết nối | Đổi `DATABASE_URL` từ `sqlite+aiosqlite:///...` sang `postgresql+asyncpg://...` hoặc Supabase connection string. |
| `requirements.txt` | Đổi driver DB | Thay `aiosqlite` bằng `asyncpg` (cho PostgreSQL) hoặc thêm `supabase-py` (nếu dùng Supabase client). |
| `crud/crud_trip.py` | Có thể cần sửa nếu dùng Supabase client | Nếu nhóm quyết định dùng Supabase REST client thay vì SQLAlchemy, toàn bộ hàm trong file này sẽ phải viết lại (thay các câu `select(...)` của SQLAlchemy bằng lệnh gọi `supabase.table(...).select(...)`). Nếu vẫn giữ SQLAlchemy thì **không cần sửa gì**. |
| `models.py` | Có thể bỏ nếu dùng Supabase client | Nếu dùng Supabase REST, việc tạo bảng sẽ thực hiện trên Supabase Dashboard, file `models.py` sẽ không còn cần thiết. |

### 5.2. Khi có Module Xác Thực Người Dùng (Auth/JWT)

| File cần sửa | Sửa gì | Chi tiết |
|---|---|---|
| `api/trips.py` | Bỏ `user_id` khỏi request body | Hiện tại, `user_id` đang được client tự gửi trong body (thiếu bảo mật). Khi có JWT, sẽ đổi sang lấy `user_id` từ token đã giải mã, ví dụ: `current_user = Depends(get_current_user)`. |
| `api/locations.py` | Tương tự | Endpoint gợi ý địa điểm hiện không yêu cầu đăng nhập, khi có Auth có thể thêm middleware bảo vệ. |
| `schemas.py` | Xóa trường `user_id` | Các schema `CreateItineraryRequest`, `CheckInRequest` sẽ loại bỏ trường `user_id` vì thông tin này sẽ được lấy tự động từ JWT. |

### 5.3. Khi có Module Input Processing (Xử lý đầu vào NLP)

| File cần sửa | Sửa gì | Chi tiết |
|---|---|---|
| `api/locations.py` | Thay đổi nguồn dữ liệu đầu vào | Hiện tại, endpoint nhận tham số đã chuẩn hóa (JSON có `city`, `budget_level`, `preferred_tags`). Khi có module NLP, module đó sẽ chuyển đổi câu nói tự nhiên (VD: *"Tôi muốn đi biển ở Đà Nẵng, ngân sách tầm trung"*) thành JSON format này rồi gọi API của bạn. **Code logic của bạn không cần sửa**, chỉ cần đảm bảo format đầu vào khớp. |
| `schemas.py` | Có thể mở rộng `SuggestionRequest` | Nếu module NLP trả về thêm thông tin (VD: `trip_pace`, `travel_style`), cần bổ sung thêm trường vào schema. |

### 5.4. Khi có Module Tối Ưu (Chức năng 4) gắn vào

| File cần sửa | Sửa gì | Chi tiết |
|---|---|---|
| `api/trips.py` | Thêm bước gọi thuật toán tối ưu | Trong hàm `create_itinerary()`, trước khi gọi `create_trip_stops()`, sẽ thêm một bước: `optimized_ids = optimize_route(location_ids)` để sắp xếp lại thứ tự trạm cho tối ưu quãng đường. |
| `core/algorithms.py` | Không cần sửa, chỉ cần thêm | Người làm chức năng 4 sẽ **thêm** hàm mới (VD: `optimize_route()`) vào file này, gọi lại `haversine()` đã có sẵn. Các hàm hiện tại giữ nguyên. |

### 5.5. Khi có Dữ Liệu Thật (Thay thế dummy data)

| File cần sửa | Sửa gì | Chi tiết |
|---|---|---|
| `dummy_data/seed_data.py` | Thay thế hoặc vô hiệu hóa | File này chỉ phục vụ mục đích phát triển và demo. Khi nhóm có nguồn dữ liệu thật (từ API Google Places, Foursquare, hoặc dataset du lịch), file này sẽ bị thay thế hoặc bỏ đi. |
| `main.py` | Tắt auto-seed | Bỏ/comment đoạn code tự động gọi `seed_data()` khi khởi động server. |

### 5.6. Tóm tắt mức độ ảnh hưởng theo file

| File | Thay đổi nhỏ (tweak) | Thay đổi lớn (rewrite) | Không cần sửa |
|---|---|---|---|
| `core/algorithms.py` | | | ✅ Giữ nguyên, chỉ được thêm vào |
| `api/locations.py` | ✅ Sửa khi có Auth | | |
| `api/trips.py` | ✅ Sửa khi có Auth, thêm bước tối ưu | | |
| `crud/crud_trip.py` | | ⚠️ Rewrite nếu bỏ SQLAlchemy | ✅ Nếu vẫn giữ SQLAlchemy |
| `schemas.py` | ✅ Bỏ `user_id`, thêm trường mới | | |
| `database.py` | ✅ Đổi connection string | ⚠️ Rewrite nếu bỏ SQLAlchemy | |
| `models.py` | | ⚠️ Bỏ nếu dùng Supabase client | ✅ Nếu vẫn giữ SQLAlchemy |
| `dummy_data/seed_data.py` | | ⚠️ Thay thế khi có data thật | |

> **Kết luận:** File `core/algorithms.py` (chứa toàn bộ thuật toán Haversine, Jaccard, Scoring) là file ổn định nhất, hầu như không bao giờ cần sửa. Các file còn lại đều đã được thiết kế theo kiến trúc phân tầng nên khi cần thay đổi, chỉ sửa đúng tầng bị ảnh hưởng mà không lan sang các tầng khác.
