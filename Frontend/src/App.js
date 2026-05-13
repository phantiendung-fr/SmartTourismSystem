import React, { useState } from 'react';
import SplashScreen from './screens/SplashScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import RegisterScreen from './screens/Auth/RegisterScreen'; 
import LoginScreen from './screens/Auth/LoginScreen';
import ForgotPasswordScreen from './screens/Auth/ForgotPasswordScreen';
// import Traveltrip from './screens/Travel_trip'; 

import TripInputForm from './components/TripInput/TripInputForm';
import LocationRegister from './components/LocationRegister/LocationRegister';
import MainTabs from './components/MainTabs';

import Userprofile from './screens/UserProfile';

import HistoryScreen from './screens/Trip/HistoryScreen';
import PlanRecommendScreen from './screens/Trip/PlanRecommendScreen';
import TripDetailScreen from './screens/Trip/TripDetailScreen';


function App() {
  const [currentScreen, setCurrentScreen] = useState('splash'); 
  const [isGuest, setIsGuest] = useState(false); // Thêm biến theo dõi Chế độ khách

  const [currentUser, setCurrentUser] = useState(null);
  const [planPayload, setPlanPayload] = useState(null);
  const [currentItineraryId, setCurrentItineraryId] = useState(null);

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
      <div style={{
        width: '390px', 
        height: '844px', 
        backgroundColor: '#fff', 
        borderRadius: '40px', 
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)', 
        overflow: 'hidden', 
        position: 'relative', 
        overflowY: 'auto',
        transform: 'scale(0.8)', 
        transformOrigin: 'center',
        msOverflowStyle: 'none', scrollbarWidth: 'none'
        }}>
        
        {currentScreen === 'splash' && <SplashScreen onFinish={() => setCurrentScreen('welcome')} />}

        {currentScreen === 'welcome' && (
            <WelcomeScreen 
                onSignIn={() => setCurrentScreen('login')} 
                onCreateAccount={() => setCurrentScreen('register')}
                onSkip={() => {
                    setIsGuest(true); // Bấm Skip thì đánh dấu là Khách
                    setCurrentScreen('main');
                }} 
            />
        )}

        {/* Truyền thêm các nút Back và Chuyển trang cho Login */}
        {currentScreen === 'login' && (
            <LoginScreen 
                onBack={() => setCurrentScreen('welcome')}
                onSwitchToRegister={() => setCurrentScreen('register')}
                onForgotPassword={() => setCurrentScreen('forgot_password')}
                // 2. Hứng dữ liệu (userData) từ màn hình Login truyền lên
                onLoginSuccess={(userData) => {
                    setIsGuest(false);
                    setCurrentUser(userData); // Cất vào hộp
                    setCurrentScreen('main');
                }}
            />
        )}
        {currentScreen === 'forgot_password' && (
            <ForgotPasswordScreen 
                onBack={() => setCurrentScreen('login')}
                onSwitchToLogin={() => setCurrentScreen('login')}
            />
        )}

        {/* Truyền thêm các nút Back và Chuyển trang cho Register */}
        {currentScreen === 'register' && (
            <RegisterScreen 
                onBack={() => setCurrentScreen('welcome')}
                onSwitchToLogin={() => setCurrentScreen('login')}
            />
        )}

        {currentScreen === 'main' && (
            <MainTabs 
                user={currentUser} 
                isGuest={isGuest}
                onRequireLogin={() => setCurrentScreen('login')}
                onLogout={handleLogout}
                onOpenPlan={() => setCurrentScreen('plan')}

                onOpenLocationRegister={() => setCurrentScreen('register_location')}
                onOpenProfileEdit={() => setCurrentScreen('profile_edit')}
                onOpenHistory={() => setCurrentScreen('history')}
            />
        )}

        {currentScreen === 'history' && (
            <HistoryScreen 
                onBack={() => setCurrentScreen('main')}
            />
        )}
        
        {currentScreen === 'profile_edit' && (
            <Userprofile 
                user={currentUser}
                onBack={() => setCurrentScreen('main')} // Quay lại màn hình chính
            />
        )}

        {currentScreen === 'plan' && (
            isGuest || !currentUser ? (
                (() => { setCurrentScreen('login'); return null; })()
            ) : (
                <TripInputForm 
                    onSubmitPlan={(collectedData) => {
                        setPlanPayload(collectedData);
                        setCurrentScreen('plan_recommend');
                    }}
                />
            )
        )}

        {currentScreen === 'plan_recommend' && (
            <PlanRecommendScreen 
                planPayload={planPayload}
                onBack={() => setCurrentScreen('plan')}
                onTripCreated={(itineraryId) => {
                    setCurrentItineraryId(itineraryId);
                    setCurrentScreen('trip_detail');
                }}
            />
        )}

        {currentScreen === 'trip_detail' && (
            <TripDetailScreen 
                itineraryId={currentItineraryId}
                onBack={() => setCurrentScreen('main')}
            />
        )}

        {currentScreen === 'register_location' && (
            <LocationRegister 
                // Truyền hàm onBack để form có nút quay lại trang chủ
                onBack={() => setCurrentScreen('main')} 
            />
        )}

      </div>
    </div>
  );
}

export default App;