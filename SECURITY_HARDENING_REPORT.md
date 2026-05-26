# Bao cao bao mat du lieu

Ngay thuc hien: 2026-05-26

## Ket luan ngan

Repo da duoc gia co cac diem rui ro cao nhat ve cau hinh, xac thuc, phan quyen va thao tac du lieu theo `user_id`. Sau cac thay doi nay, he thong an toan hon cho moi truong staging/production, nhung van can bo sung email/SMS provider, secure storage/cookie va audit/rate limit tap trung neu trien khai that.

## Da sua trong code

### 1. Khoa cau hinh production nguy hiem

File: `Backend/core/config.py`

- Them `ENVIRONMENT` de phan biet development/production.
- Them `CORS_ORIGINS` de cau hinh danh sach frontend domain bang bien moi truong.
- Production se bi chan khoi dong neu van dung `SECRET_KEY` mac dinh hoac `DATABASE_URL` local mac dinh.
- Them parser `cors_origins_list` de backend khong can hard-code CORS trong `main.py`.

### 2. Dong CORS mo toan bo domain

File: `Backend/main.py`

- Go bo `allow_origin_regex=".*"`.
- CORS chi chap nhan cac origin nam trong `settings.CORS_ORIGINS`.

Ly do: CORS mo toan bo domain lam website la co the goi API cua he thong, dac biet nguy hiem khi co token/cookie.

### 3. Khoa endpoint test tao user o production

File: `Backend/main.py`

- Endpoint `/test-create-user` chi con hoat dong khi `ENVIRONMENT=development`.
- Neu chay production, endpoint tra `404`.

### 4. Khong cho frontend tu chon role khi dang ky

File: `Backend/routers/auth.py`

- API `/api/auth/register` bo qua `role` do client gui len.
- User moi luon duoc tao voi `UserRole.USER`.

Ly do: Client khong duoc quyen tu gui `ADMIN` hoac `ENTERPRISE` khi tao tai khoan.

### 5. Hash refresh token truoc khi luu DB

File: `Backend/routers/auth.py`

- Login thuong da chuyen sang dung `crud_user.create_user_session`, ham nay hash refresh token truoc khi luu.
- Access token luu `role` dang string ro rang.
- Google login cung thong nhat `sub` la `user_id`, khong con dung email lam subject token.

Ly do: Neu database bi lo, refresh token plaintext co the bi dung de chiem phien dang nhap.

### 6. Sua logout refresh token

File: `Backend/routers/auth.py`

- Logout giai ma refresh token de lay `user_id`.
- Chi revoke session cua dung user.
- Token loi/het han/khong hop le tra `401`.

### 7. Them rate limit co ban cho auth

File: `Backend/routers/auth.py`

- Login: 5 lan / 5 phut / email.
- Forgot password: 3 lan / 15 phut / email.
- Reset password: 5 lan / 15 phut / email.

Day la rate limit in-memory, phu hop local/staging. Production nen chuyen sang Redis.

### 8. Khong in OTP ra terminal

File: `Backend/routers/auth.py`

- Bo viec ghi OTP ra log/terminal.
- Forgot password tra message chung de tranh user enumeration.
- OTP duoc sinh bang `secrets` thay vi `random`.

Luu y: Can cau hinh email/SMS provider that de gui OTP. Hien code da tranh lo OTP nhung chua co kenh gui that.

### 9. Bo co che admin hard-code tu nang quyen

File: `Backend/routers/admin.py`

- Go bo fallback theo email hard-code.
- Admin phai ton tai trong database va co role hop le.

Ly do: Co che tu cap admin theo email hard-code la cua hau trong production.

### 10. Khoa thao tac gamification theo user khac

File: `Backend/routers/gamification.py`

- Them xac thuc JWT cho cac API gamification nhay cam.
- Neu request co `user_id` khac voi `sub` trong token thi tra `403`.
- Ap dung cho claim newbie gift, daily attendance, nearby treasures, claim treasure, task list, start/cancel task va submit photo.

Ly do: Truoc do client co the gui UUID cua user khac de doc/sua du lieu gamification.

### 11. Giam ro ri token tren mobile

File: `Frontend/src/platform/storage.js`

- Tren native app, token luu trong Capacitor Preferences khong con bi dong bo nguoc vao `localStorage`.

Luu y: Web van dang dung `localStorage`. Production web nen chuyen sang HttpOnly Secure SameSite cookie.

## Viec da kiem tra

- Da chay kiem tra cu phap:

```bash
python3 -m py_compile Backend/core/config.py Backend/main.py Backend/routers/auth.py Backend/routers/admin.py Backend/routers/gamification.py
```

Ket qua: khong co loi cu phap.

## Can lam tiep neu deploy production

1. Tao `.env` rieng cho backend voi:
   - `ENVIRONMENT=production`
   - `SECRET_KEY` dai, ngau nhien, toi thieu 32 ky tu
   - `DATABASE_URL` that
   - `CORS_ORIGINS=https://domain-frontend-that`
   - `GOOGLE_API_KEY`, `GEMINI_API_KEY` neu dung

2. Them email/SMS provider cho forgot password. Hien OTP khong con bi lo log, nhung can kenh gui that.

3. Chuyen rate limit in-memory sang Redis de dung duoc khi chay nhieu process/server.

4. Chuyen token web sang HttpOnly Secure SameSite cookie thay vi `localStorage`.

5. Kiem tra ownership cho tat ca API con lai, dac biet trip, message, profile, location submission.

6. Them audit log cho admin action: update role, approve/reject enterprise, reset rank, grant point.

7. Tat HTTPS khi deploy, bat security headers va backup database dinh ky.

8. Chay dependency audit:

```bash
pip-audit
npm audit
```

## Cac file da thay doi

- `Backend/core/config.py`
- `Backend/main.py`
- `Backend/routers/auth.py`
- `Backend/routers/admin.py`
- `Backend/routers/gamification.py`
- `Frontend/src/platform/storage.js`

