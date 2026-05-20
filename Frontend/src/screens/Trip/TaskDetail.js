import React, { useState, useEffect } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import './TaskDetail.css';

export const TaskDetail = ({ task, userId, itineraryId, onBack, onCompleteSuccess }) => {
  const { latitude, longitude, accuracy, distance, error, loading } = useGeolocation(
    task.target_latitude,
    task.target_longitude
  );

  const [progressId, setProgressId] = useState(task.progress_id);
  const [taskStatus, setTaskStatus] = useState(task.status);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  // Auto-start task if it has not been started yet
  useEffect(() => {
    const handleStartTask = async () => {
      try {
        setStarting(true);
        const response = await fetch(
          `http://127.0.0.1:8000/api/gamification/tasks/${task.task_id}/start?user_id=${userId}&itinerary_id=${itineraryId}`,
          { method: 'POST' }
        );
        if (!response.ok) throw new Error('Không thể đăng ký thực hiện thử thách này.');
        const data = await response.json();
        setProgressId(data.progress_id);
        setTaskStatus('IN_PROGRESS');
      } catch (err) {
        setSubmitError(err.message);
      } finally {
        setStarting(false);
      }
    };

    if (!hasAutoStarted && (taskStatus === 'NOT_STARTED' || taskStatus === 'CANCELLED')) {
      setHasAutoStarted(true);
      handleStartTask();
    }
  }, [task, userId, itineraryId, progressId, taskStatus, hasAutoStarted]);

  const handleCancelTask = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy thực hiện thử thách này không?')) return;
    try {
      setStarting(true);
      const response = await fetch(
        `http://127.0.0.1:8000/api/gamification/tasks/${task.task_id}/cancel?user_id=${userId}&itinerary_id=${itineraryId}`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Không thể hủy thực hiện thử thách này.');
      
      setTaskStatus('CANCELLED');
      alert('Đã hủy thử thách thành công!');
      onBack();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSubmitError(null);
    }
  };

  const handleCaptureAgain = () => {
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async () => {
    if (!imageFile || latitude === null || longitude === null || !progressId) return;
    setSubmitting(true);
    setSubmitError(null);

    const formData = new FormData();
    formData.append('progress_id', progressId);
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    formData.append('photo', imageFile);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/gamification/submissions/submit-photo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Xác thực hình ảnh không thành công từ máy chủ AI.');
      }

      setSuccessData(data);
      setShowSuccessModal(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessDone = () => {
    setShowSuccessModal(false);
    if (onCompleteSuccess) {
      onCompleteSuccess();
    }
  };

  const isWithinRadius = distance !== null && distance <= task.radius_meters;

  return (
    <div className="task-detail-screen-gami">
      {/* HEADER */}
      <div className="task-detail-header-gami">
        <button onClick={onBack} className="btn-back-gami">
          🡨 Quay lại
        </button>
        <span className="header-title-gami">🎮 ĐANG LÀM THỬ THÁCH</span>
      </div>

      {/* BODY SCREEN */}
      <div className="task-detail-body-gami">
        
        {/* TARGET CARD */}
        <div className="task-target-card">
          <div className="target-img-container">
            <img 
              src={task.reference_image_url || 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=600'} 
              alt={task.title} 
              className="target-img"
            />
            <div className="reward-overlay">
              ⭐ +{task.reward_exp} EXP
            </div>
          </div>
          <div className="target-info">
            <span className="diff-badge">{task.difficulty === 'EASY' ? '🟢 Dễ' : task.difficulty === 'MEDIUM' ? '🟡 Vừa' : '🔴 Khó'}</span>
            <h3>{task.title}</h3>
            <p className="task-desc">{task.description}</p>
            {taskStatus !== 'COMPLETED' && (
              <button 
                onClick={handleCancelTask} 
                className="btn-cancel-task-body-gami"
                disabled={starting || submitting}
              >
                ✕ Hủy nhiệm vụ này
              </button>
            )}
          </div>
        </div>

        {/* GPS STATE BOX */}
        <div className="gps-status-box">
          <div className="gps-status-header">
            <h4>📡 TRẠNG THÁI GPS THỜI GIAN THỰC</h4>
            {loading ? (
              <span className="gps-pill loading">Đang nạp sóng...</span>
            ) : (
              <span className={`gps-pill ${isWithinRadius ? 'valid' : 'invalid'}`}>
                {isWithinRadius ? 'Đã vào vị trí' : 'Ngoài bán kính'}
              </span>
            )}
          </div>

          {error ? (
            <div className="gps-error-alert">
              ⚠️ Không thể định vị thiết bị. Vui lòng mở quyền truy cập GPS cho ứng dụng. Lỗi: {error}
            </div>
          ) : (
            <div className="gps-grid-data">
              <div className="gps-stat-item">
                <span className="stat-label">Cự ly tới địa điểm</span>
                <span className="stat-value">
                  {distance !== null ? `${Math.round(distance)}m` : '---'}
                </span>
                <span className="stat-hint">Yêu cầu: ≤ {task.radius_meters}m</span>
              </div>
              <div className="gps-stat-item">
                <span className="stat-label">Độ sai số sóng GPS</span>
                <span className={`stat-value ${accuracy !== null && accuracy <= 15 ? 'good' : 'warning'}`}>
                  {accuracy !== null ? `±${Math.round(accuracy)}m` : '---'}
                </span>
                <span className="stat-hint">
                  {accuracy !== null && accuracy <= 15 ? '⚡ Độ chính xác xuất sắc' : '📡 Tín hiệu đang dò'}
                </span>
              </div>
            </div>
          )}

          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${task.target_latitude},${task.target_longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-navigate-gps"
          >
            🧭 Dẫn đường bằng Google Maps
          </a>
        </div>

        {/* INTERACTION AREA (CAMERA & UPLOAD) */}
        <div className="camera-interact-box">
          <h4>📷 BÁO CÁO HÌNH ẢNH</h4>
          
          {!previewUrl ? (
            <div className={`camera-dash-upload ${isWithinRadius ? 'unlocked' : 'locked'}`}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                disabled={!isWithinRadius}
                id="camera-input-trigger"
                className="hidden-file-input"
              />
              <label 
                htmlFor={isWithinRadius ? "camera-input-trigger" : ""}
                className="camera-upload-label"
              >
                <div className="camera-icon-circle">
                  📷
                </div>
                <h5>Chụp ảnh hiện vật / địa danh</h5>
                <p>
                  {isWithinRadius 
                    ? 'Nhấp để chụp ảnh. AI sẽ phân tích sự tương thích.' 
                    : `Hãy di chuyển lại gần thêm ${distance !== null ? Math.round(distance - task.radius_meters) : '---'}m để mở khóa Camera.`}
                </p>
              </label>
            </div>
          ) : (
            <div className="image-preview-card">
              <img src={previewUrl} alt="Ảnh chụp thực tế" className="preview-img" />
              <button className="btn-capture-again" onClick={handleCaptureAgain} disabled={submitting}>
                🔄 Chụp lại
              </button>
            </div>
          )}

          {submitError && (
            <div className="submit-error-banner">
              ⚠️ {submitError}
            </div>
          )}

          {previewUrl && (
            <button 
              className={`btn-submit-verification ${submitting ? 'loading' : ''}`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="mini-spinner" />
                  AI đang quét xác thực hình ảnh...
                </>
              ) : (
                '🚀 Nộp bài & Xác thực kết quả'
              )}
            </button>
          )}
        </div>
      </div>

      {/* CONGRATULATIONS SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="success-gami-modal">
          <div className="modal-card">
            <div className="modal-glow-back" />
            <div className="badge-3d-hexagon">
              🏆
            </div>
            <h2>THỬ THÁCH HOÀN THÀNH!</h2>
            <p className="success-congrats-msg">
              {successData?.message || 'Tuyệt vời! Bức ảnh của bạn đã vượt qua kiểm duyệt AI thành công!'}
            </p>

            <div className="score-reward-summary">
              <div className="reward-score-pill">
                <span className="score-label">EXP LỘ TRÌNH</span>
                <span className="score-val">+{successData?.exp_rewarded || task.reward_exp} EXP</span>
              </div>
              <div className="reward-score-pill">
                <span className="score-label">ĐỘ TƯƠNG ĐỒNG</span>
                <span className="score-val">{successData?.confidence_score}% 🔥</span>
              </div>
            </div>

            <div className="level-progression-bar">
              <div className="lvl-labels">
                <span>Cấp độ Lộ trình</span>
                <span>Cấp {successData?.new_level || 1}</span>
              </div>
              <div className="lvl-track-progress">
                <div 
                  className="lvl-fill-progress" 
                  style={{ width: `${Math.min(((successData?.new_itinerary_exp || 0) % 1000) / 10, 100)}%` }}
                />
              </div>
              <small className="lvl-exp-detail">
                {(successData?.new_itinerary_exp || 0) % 1000} / 1000 EXP tới cấp tiếp theo
              </small>
            </div>

            <button className="btn-close-modal-gami" onClick={handleSuccessDone}>
              Nhận phần thưởng và Quay về 🏁
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;
