//Gọi API login, register.
//Gọi API login, register.
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_URL = `${API_BASE}/api/auth`;

export const authService = {
    // 1. Đăng ký
    register: async (fullName, email, password, role) => {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: fullName, email: email, password: password, register_type: "EMAIL", role })
        });
        if (!response.ok) throw new Error('Đăng ký thất bại hoặc email đã tồn tại');
        return await response.json();
    },

    // 2. Đăng nhập (Gửi bằng JSON thay vì Form-Data)
    login: async (email, password) => {
        const realDeviceInfo = navigator.userAgent
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                email: email,            
                password: password, 
                device_id: realDeviceInfo  
            })
        });

        if (!response.ok) throw new Error('Sai email hoặc mật khẩu');
        
        const data = await response.json();
        
        // Lưu vé vào LocalStorage của trình duyệt
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        
        return data; // API của trả về luôn full_name và role
    },

    // 3. Đăng xuất
    logout: async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
            await fetch(`${API_URL}/logout`, {
                method: 'POST',
                headers: { 'Authorization-Refresh': refreshToken }
            });
        }
        // Xóa vé đi
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    },

    // 4. Lấy thông tin user hiện tại
    getCurrentUser: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return null;

        const response = await fetch(`${API_URL}/me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            // Nếu vé hết hạn, xóa luôn
            localStorage.removeItem('access_token');
            return null;
        }
        return await response.json();
    },

    // 5. Đăng nhập Google
    loginWithGoogle: async (googleToken) => {
        const response = await fetch(`${API_URL}/google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                token: googleToken,
                device_id: navigator.userAgent 
            })
        });

        if (!response.ok) throw new Error('Đăng nhập Google thất bại');
        
        const data = await response.json();
        
        // Lưu vé vào LocalStorage
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        
        return data;
    }
};