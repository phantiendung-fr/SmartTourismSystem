Phân tích thiết kế chức năng Voucher cho Hệ thống Du lịch
Dựa trên mô hình hệ thống của bạn:
•	Có các địa điểm du lịch được hệ thống tạo sẵn.
•	Có các doanh nghiệp đăng ký và quản lý địa điểm riêng của họ.
•	Người dùng có thể nhận và sử dụng voucher.
•	Voucher cần tiếp tục xuất hiện theo từng chiến dịch mới, không bị mất vĩnh viễn khi voucher cũ hết hạn.
________________________________________
1. Mục tiêu thiết kế
Hệ thống phải hỗ trợ:
✅ Voucher cho địa điểm có sẵn của hệ thống
✅ Voucher cho địa điểm do doanh nghiệp quản lý
✅ Người dùng lưu voucher vào kho voucher cá nhân
✅ Theo dõi trạng thái voucher
✅ Tự động hết hạn voucher
✅ Tạo nhiều đợt voucher khác nhau cho cùng một địa điểm
✅ Dễ mở rộng sang khách sạn, nhà hàng, tour du lịch
________________________________________
2. Phân loại địa điểm
Địa điểm hệ thống
Ví dụ:
•	Hồ Xuân Hương
•	Vịnh Hạ Long
Được tạo bởi Admin.
Không thuộc doanh nghiệp nào.
________________________________________
Địa điểm doanh nghiệp
Ví dụ:
•	Khu du lịch ABC
•	Nhà hàng XYZ
•	Khách sạn DEF
Được doanh nghiệp đăng ký.
Có chủ sở hữu.
________________________________________
3. Phân loại Voucher
Voucher hệ thống
Do Admin tạo.
Áp dụng cho địa điểm hệ thống.
Ví dụ:
Giảm 15% vé tham quan
Tặng quà lưu niệm
Miễn phí vé trẻ em
________________________________________
Voucher doanh nghiệp
Do doanh nghiệp tạo.
Áp dụng cho địa điểm doanh nghiệp quản lý.
Ví dụ:
Giảm 20% buffet
Giảm 10% giá phòng
________________________________________
4. Thiết kế Database
Bảng Location
Location
(
    location_id PK,
    location_name,
    description,

    location_type
)
location_type
SYSTEM
BUSINESS
________________________________________
Bảng Business
Business
(
    business_id PK,
    business_name,
    email,
    phone
)
________________________________________
Bảng Voucher
Voucher
(
    voucher_id PK,
    business_id FK NULL,
    voucher_type,
    code,
    title,
    description,
    discount_type,
    discount_value,
    start_date,
    end_date,
    quantity,
    remaining_quantity,

    -- [CÁC TRƯỜNG BỔ SUNG ĐỂ BẢO VỆ NGHIỆP VỤ & GAMIFICATION] --
    max_per_user,      -- (Mới) Giới hạn số lượng mã tối đa 1 người dùng được nhận
    exp_cost,          -- (Mới) Chi phí EXP để đổi voucher (mặc định = 0)
    coin_cost,         -- (Mới) Chi phí Coin để đổi voucher (mặc định = 0)
    
    status,
    created_at
)
Các Ràng buộc dữ liệu (Database Constraints) cần thiết lập:
•	Logic giảm giá: Nếu discount_type = PERCENT (Giảm theo %), thì giá trị discount_value bắt buộc phải nằm trong khoảng: 0 < discount_value <= 100.
•	Logic thời gian: Ngày kết thúc end_date bắt buộc phải lớn hơn hoặc bằng ngày bắt đầu start_date.
________________________________________
voucher_type
SYSTEM
BUSINESS
________________________________________
discount_type
PERCENT
FIXED
________________________________________
status
ACTIVE
EXPIRED
DISABLED
________________________________________
5. Liên kết Voucher và Địa điểm
Một voucher có thể áp dụng cho nhiều địa điểm.
Một địa điểm có thể có nhiều voucher.
=> Quan hệ N-N.
________________________________________
Bảng Voucher_Location
Voucher_Location
(
    voucher_id FK,
    location_id FK,

    PRIMARY KEY(voucher_id, location_id)
)
Ví dụ:
Voucher SUMMER2026
    ↓
Đà Lạt View
    ↓
Hồ Xuân Hương
    ↓
Thác Datanla
________________________________________
6. Kho lưu trữ Voucher của người dùng
Khi người dùng nhấn:
Nhận voucher
không sử dụng ngay.
Voucher được lưu vào kho cá nhân.
________________________________________
Bảng User_Voucher
User_Voucher
(
    user_voucher_id PK,

    user_id FK,
    voucher_id FK,

    collected_at,

    used_at,

    status
)
________________________________________
status
COLLECTED
USED
EXPIRED
________________________________________
7. Luồng nghiệp vụ
Luồng 1 - Admin tạo Voucher hệ thống
Admin
    ↓
Tạo voucher
    ↓
Chọn địa điểm hệ thống
    ↓
Lưu Voucher
    ↓
Hiển thị cho người dùng
________________________________________
Luồng 2 - Doanh nghiệp tạo Voucher
Doanh nghiệp
    ↓
Đăng nhập
    ↓
Tạo voucher
    ↓
Chọn địa điểm họ quản lý
    ↓
Lưu voucher
________________________________________
Luồng 3 - Người dùng nhận Voucher
Xem địa điểm
    ↓
Thấy voucher & Hiển thị điều kiện nhận:
    + Nếu (exp_cost = 0 VÀ coin_cost = 0): Hiện chữ "Nhận miễn phí"
    + Nếu (exp_cost > 0 VÀ coin_cost > 0): Hiện chữ "Đổi mã mất [exp_cost] EXP và [coin_cost] Coin"
    + Nếu (chỉ 1 trường > 0): Chỉ hiển thị trường đó (VD: "Đổi mã mất 400 EXP" hoặc "Đổi mã mất 30 Coin")
    ↓
Nhấn nút "Nhận" / "Đổi Voucher"
    ↓
Hệ thống xử lý an toàn (Chống Spam Click / Race Condition):
    (1) Khóa giao dịch (Redis Lock hoặc SQL Row-level lock) cho voucher_id này.
    (2) Kiểm tra User_Voucher: Số lượng user đã nhận < max_per_user? (Chống bào mã)
    (3) Kiểm tra Voucher: remaining_quantity > 0? (Chống phát lố số lượng)
    (4) Kiểm tra số dư EXP và Coin của User có đủ không?
    (5) Trừ điểm EXP/Coin của User (nếu voucher có thu phí).
    (6) Giảm remaining_quantity của Voucher đi 1.
    ↓
Tạo bản ghi trong bảng User_Voucher (Lưu vào ví cá nhân)
    ↓
Giải phóng khóa giao dịch (Unlock)
    ↓
Trả về kết quả "Thành công" cho người dùng.________________________________________
Luồng 4 - Sử dụng Voucher
Đặt tour / đặt dịch vụ
    ↓
Chọn voucher
    ↓
Kiểm tra:
        còn hạn?
        còn số lượng?
        đã dùng?
    ↓
Áp dụng giảm giá
    ↓
Đánh dấu USED
________________________________________
8. Xử lý khi Voucher hết hạn
Không xóa voucher.
Chỉ đổi:
ACTIVE
    ↓
EXPIRED
________________________________________
Ví dụ:
Voucher tháng 6
hết hạn:
EXPIRED
Admin hoặc doanh nghiệp tạo tiếp:
Voucher tháng 7
Địa điểm vẫn tiếp tục có voucher mới.
________________________________________
9. Giao diện đề xuất
Trang chi tiết địa điểm
Hồ Xuân Hương
⭐  4.8

🎁 VOUCHER HIỆN CÓ:

[Giảm 15% vé tham quan]
- Điều kiện: Miễn phí
- Còn lại: 50/100 mã
-> Nút: [Nhận voucher]

[Giảm 20% Buffet Nhà hàng ABC]
- Điều kiện: Mất 500 EXP và 30 Coin
- Còn lại: 15/50 mã
-> Nút: [Đổi voucher 💎]

[Tặng quà lưu niệm móc khóa]
- Điều kiện: Mất 400 EXP
- Còn lại: 120/200 mã
-> Nút: [Đổi voucher 💎]________________________________________
Kho voucher của người dùng
Ví voucher của tôi

------------------

Giảm 15% vé tham quan
Hết hạn: 30/06/2026

------------------

Tặng quà lưu niệm
Hết hạn: 10/07/2026
________________________________________
10. Mở rộng tương lai
Để tránh phải sửa database sau này, nên thiết kế Voucher áp dụng được cho nhiều loại đối tượng.
Thêm:
Voucher_Target
(
    voucher_id,
    target_type,
    target_id
)
target_type
LOCATION
HOTEL
RESTAURANT
TOUR
EVENT
Khi đó:
Voucher
    ↓
Voucher_Target
    ↓
Địa điểm
    ↓
Khách sạn
    ↓
Tour
    ↓
Nhà hàng
Đây là hướng thiết kế linh hoạt nhất nếu dự án của bạn còn phát triển thêm các chức năng đặt tour, khách sạn, nhà hàng hoặc sự kiện trong tương lai.
________________________________________
Kiến trúc khuyến nghị để code
Business
    1 ----- N Voucher

Location
    N ----- N Voucher

User
    1 ----- N User_Voucher

Voucher
    1 ----- N User_Voucher
Các bảng cốt lõi nên triển khai trước:
Location
Business
Voucher
Voucher_Location
User_Voucher
Sau khi hoàn thiện chức năng voucher cho địa điểm, mới cân nhắc nâng cấp sang mô hình Voucher_Target tổng quát nếu hệ thống bắt đầu có khách sạn, tour hoặc nhà hàng.



