import React, { useState, useEffect } from 'react';
import './LocationTasks.css';

// Rich local mock data to guarantee beautiful visual presentation for Hanoi landmarks
const LOCATION_MOCK_METADATA = {
  'Hoàng thành Thăng Long': {
    image: 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?w=800&auto=format&fit=crop&q=80',
    description: 'Quần thể di tích lịch sử hoàng cung gắn liền với lịch sử phát triển của Thăng Long - Đông Đô - Hà Nội, được UNESCO công nhận là di sản văn hóa thế giới với hàng ngàn năm lịch sử.',
    category: '🏛️ Di sản Lịch sử',
    rating: '⭐ 4.8 (1,240 đánh giá)'
  },
  'Văn Miếu - Quốc Tử Giám': {
    image: 'https://images.unsplash.com/photo-1571471898518-92f7f315896a?w=800&auto=format&fit=crop&q=80',
    description: 'Trường đại học đầu tiên của Việt Nam, biểu tượng cho nền hiếu học, truyền thống tôn sư trọng đạo và tinh hoa tri thức khoa bảng nước nhà qua nhiều triều đại phong kiến.',
    category: '🏮 Văn hóa & Giáo dục',
    rating: '⭐ 4.9 (2,150 đánh giá)'
  },
  'Nhà tù Hỏa Lò': {
    image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=800&auto=format&fit=crop&q=80',
    description: 'Di tích lịch sử hào hùng minh chứng cho tinh thần kiên trung, bất khuất của các chiến sĩ cách mạng Việt Nam trong thời kỳ kháng chiến, một địa danh vô cùng xúc động.',
    category: '✊ Lịch sử Cách mạng',
    rating: '⭐ 4.9 (1,860 đánh giá)'
  },
  'Hồ Hoàn Kiếm': {
    image: 'https://images.unsplash.com/photo-1509060464153-4466739f78d0?w=800&auto=format&fit=crop&q=80',
    description: 'Trái tim của thủ đô Hà Nội, gắn liền với truyền thuyết trả gươm thần cho Rùa Vàng, một thắng cảnh thơ mộng biểu tượng cho khát vọng hòa bình của dân tộc.',
    category: '🌳 Thắng cảnh Thiên nhiên',
    rating: '⭐ 4.7 (3,400 đánh giá)'
  },
  'Phố Cổ Hà Nội': {
    image: 'https://images.unsplash.com/photo-1555921015-5532091f6026?w=800&auto=format&fit=crop&q=80',
    description: 'Khu vực đô thị cổ kính với 36 phố phường nhộn nhịp, lưu giữ những mái ngói rêu phong cổ điển cùng nét văn hóa ẩm thực đường phố độc đáo quyến rũ du khách năm châu.',
    category: '🍜 Phố cổ & Ẩm thực',
    rating: '⭐ 4.6 (2,890 đánh giá)'
  }
};

const DEFAULT_METADATA = {
  image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=800&auto=format&fit=crop&q=80',
  description: 'Một địa danh du lịch tuyệt vời nằm trong lộ trình khám phá văn hóa và lịch sử. Nơi đây hứa hẹn sẽ đem lại cho bạn những trải nghiệm tham quan đáng nhớ cùng các thử thách nhận EXP hấp dẫn.',
  category: '📍 Điểm dừng chân',
  rating: '⭐ 4.5 (Đánh giá chung)'
};

export const LocationTasks = ({ locationId, locationName, itineraryId, userId, onClose, onSelectTask }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Retrieve mock or database metadata for this location
  const locationMeta = LOCATION_MOCK_METADATA[locationName] || DEFAULT_METADATA;

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        // Calls the FastAPI gamification router get_location_tasks endpoint
        const response = await fetch(
          `http://127.0.0.1:8000/api/gamification/locations/${locationId}/tasks?itinerary_id=${itineraryId}&user_id=${userId}`
        );
        if (!response.ok) {
          throw new Error('Không thể lấy danh sách nhiệm vụ của địa điểm này.');
        }
        const data = await response.json();
        setTasks(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (locationId && itineraryId && userId) {
      fetchTasks();
    }
  }, [locationId, itineraryId, userId]);

  return (
    <div className="location-tasks-drawer">
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-content">
        <div className="drawer-handle" />
        
        <div className="drawer-header">
          <div className="header-info">
            <span className="location-tag">📍 THÔNG TIN ĐỊA ĐIỂM</span>
            <h3>{locationName}</h3>
          </div>
          <button className="btn-close-drawer" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          
          {/* PORTRAIT LOCATION INFO WINDOW */}
          <div className="location-info-section">
            <div className="hero-img-container">
              <img 
                src={locationMeta.image} 
                alt={locationName} 
                className="location-hero-img"
              />
              <div className="location-category-badge">
                {locationMeta.category}
              </div>
            </div>
            <div className="location-meta-content">
              <p className="location-description">{locationMeta.description}</p>
              <div className="location-rating-row">
                <span className="location-rating">{locationMeta.rating}</span>
                <span className="location-open-status">🟢 Đang hoạt động</span>
              </div>
            </div>
          </div>

          <div className="divider-line" />

          {/* TASKS SECTION */}
          <h4 className="tasks-section-title">🎯 THỬ THÁCH GAMIFICATION</h4>
          <p className="drawer-intro">
            Thực hiện các thử thách dưới đây để xác thực lịch trình và nhận EXP thăng cấp lộ trình! 🎮
          </p>

          {loading && (
            <div className="drawer-loading">
              <div className="spinner" />
              <p>Đang tìm kiếm nhiệm vụ...</p>
            </div>
          )}

          {error && (
            <div className="drawer-error">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && tasks.length === 0 && (
            <div className="drawer-empty">
              <span>📭</span>
              <p>Không có nhiệm vụ nào khả dụng tại địa điểm này lúc này.</p>
            </div>
          )}

          {!loading && !error && tasks.length > 0 && (
            <div className="tasks-list">
              {tasks.map((task) => (
                <div 
                  key={task.task_id} 
                  className={`task-card-item ${task.status.toLowerCase()}`}
                  onClick={() => task.status !== 'COMPLETED' && onSelectTask(task)}
                >
                  <div className="task-card-main-row">
                    <div className="task-checkbox-container">
                      {task.status === 'COMPLETED' && <span className="task-status-indicator completed" title="Đã hoàn thành">✅</span>}
                      {task.status === 'CANCELLED' && <span className="task-status-indicator cancelled" title="Đã hủy / Bỏ qua">❌</span>}
                      {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && <span className="task-status-indicator unchecked" title="Chưa làm">⬜</span>}
                    </div>
                    
                    <div className="task-card-details">
                      <div className="task-item-header">
                        <div className="task-badge-reward">
                          ⭐ +{task.reward_exp} EXP
                        </div>
                        <span className={`difficulty-badge ${task.difficulty.toLowerCase()}`}>
                          {task.difficulty === 'EASY' ? '🟢 Dễ' : task.difficulty === 'MEDIUM' ? '🟡 Vừa' : '🔴 Khó'}
                        </span>
                      </div>

                      <h4 className="task-item-title">{task.title}</h4>
                      <p className="task-item-desc">{task.description}</p>
                      
                      <div className="task-item-footer">
                        <span className="task-radius">Bán kính: {task.radius_meters}m</span>
                        <span className={`task-status-text ${task.status.toLowerCase()}`}>
                          {task.status === 'COMPLETED' && '✅ Đã hoàn thành'}
                          {task.status === 'CANCELLED' && '❌ Đã hủy (Nhấp để làm lại) 🡢'}
                          {task.status === 'IN_PROGRESS' && '🏃 Tiếp tục thử thách 🡢'}
                          {task.status === 'NOT_STARTED' && '🎮 Bắt đầu làm nhiệm vụ 🡢'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationTasks;
