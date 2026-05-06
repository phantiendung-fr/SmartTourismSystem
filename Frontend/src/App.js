import React, { useState } from 'react';
import SplashScreen from './screens/SplashScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import RegisterScreen from './screens/Auth/RegisterScreen'; 
import LoginScreen from './screens/Auth/LoginScreen';
import Traveltrip from './screens/Travel_trip'; 

import TripInputForm from './components/TripInput/TripInputForm';

function App() {
  const [currentScreen, setCurrentScreen] = useState('splash'); 
  const [isGuest, setIsGuest] = useState(false); // Thêm biến theo dõi Chế độ khách

  const [currentUser, setCurrentUser] = useState(null);

  const handleLogout = () => {
    // Xóa token trong localStorage (nếu có lưu)
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Reset lại các trạng thái về ban đầu
    setCurrentUser(null);
    setIsGuest(false);
    
    // Đưa người dùng về màn hình Welcome (hoặc Login tùy bạn chọn)
    setCurrentScreen('welcome'); 
  };

  return (
    <div style={{ backgroundColor: '#e4e5e6', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: '390px', height: '844px', backgroundColor: '#fff', borderRadius: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden', position: 'relative', overflowY: 'auto' }}>
        
        {currentScreen === 'splash' && <SplashScreen onFinish={() => setCurrentScreen('welcome')} />}

        {currentScreen === 'welcome' && (
            <WelcomeScreen 
                onSignIn={() => setCurrentScreen('login')} 
                onCreateAccount={() => setCurrentScreen('register')}
                onSkip={() => {
                    setIsGuest(true); // Bấm Skip thì đánh dấu là Khách
                    setCurrentScreen('home');
                }} 
            />
        )}

        {/* Truyền thêm các nút Back và Chuyển trang cho Login */}
        {currentScreen === 'login' && (
            <LoginScreen 
                onBack={() => setCurrentScreen('welcome')}
                onSwitchToRegister={() => setCurrentScreen('register')}
                // 2. Hứng dữ liệu (userData) từ màn hình Login truyền lên
                onLoginSuccess={(userData) => {
                    setIsGuest(false);
                    setCurrentUser(userData); // Cất vào hộp
                    setCurrentScreen('home');
                }}
            />
        )}

        {/* Truyền thêm các nút Back và Chuyển trang cho Register */}
        {currentScreen === 'register' && (
            <RegisterScreen 
                onBack={() => setCurrentScreen('welcome')}
                onSwitchToLogin={() => setCurrentScreen('login')}
            />
        )}

        {currentScreen === 'home' && (
            <Traveltrip 
                isGuest={isGuest} 
                user={currentUser} // 3. Giao cái hộp đó cho Trang chủ
                onRequireLogin={() => setCurrentScreen('login')} 
                onLogout={handleLogout}
                onOpenPlan={() => setCurrentScreen('plan')}
            />
        )}
        
        {currentScreen === 'plan' && (
            <TripInputForm 
                onSubmitPlan={(collectedData) => {
                    // Khi hoàn thành Bước 3 của Form, cục data sẽ chạy về đây!
                    console.log("✈️ DỮ LIỆU ĐẦU VÀO ĐÃ THU THẬP:", collectedData);
                    alert("Đã gom xong tham số chuyến đi! Mở F12 (Console) để xem nhé.");
                    
                    // Thu thập xong thì đẩy người dùng về lại màn hình chính 
                    setCurrentScreen('home'); 
                }}
            />
        )}
      </div>
    </div>
  );
}

export default App;