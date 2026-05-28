import React, { useState } from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';
import './TutorialScreen.css';

const TutorialScreen = ({ onFinish }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        {
            title: "Chào mừng đến với Smart Tourism",
            description: "Khám phá các địa điểm du lịch tuyệt vời một cách thông minh và tiện lợi nhất. Hệ thống của chúng tôi sẽ giúp bạn lên kế hoạch chuyến đi hoàn hảo.",
            icon: "🌍"
        },
        {
            title: "Tạo lịch trình tự động",
            description: "Chỉ cần nhập sở thích và thời gian của bạn, hệ thống thông minh sẽ tự động tạo ra một lịch trình chi tiết từng giờ với các địa điểm nổi bật.",
            icon: "🤖"
        },
        {
            title: "Thực hiện nhiệm vụ & Tích điểm",
            description: "Đến các địa điểm tham quan, quét mã QR và hoàn thành các nhiệm vụ thú vị để nhận điểm thưởng. Đổi điểm lấy các phần quà hấp dẫn!",
            icon: "🎁"
        }
    ];

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onFinish();
        }
    };

    return (
        <div className="tutorial-container">
            <div className="tutorial-card">
                <div className="tutorial-icon-wrapper">
                    <span className="tutorial-icon">{steps[currentStep].icon}</span>
                </div>
                
                <h2 className="tutorial-title">{steps[currentStep].title}</h2>
                <p className="tutorial-desc">{steps[currentStep].description}</p>
                
                <div className="tutorial-dots">
                    {steps.map((_, index) => (
                        <div 
                            key={index} 
                            className={`tutorial-dot ${index === currentStep ? 'active' : ''}`}
                            onClick={() => setCurrentStep(index)}
                        />
                    ))}
                </div>

                <button className="tutorial-btn" onClick={nextStep}>
                    {currentStep === steps.length - 1 ? (
                        <>Bắt đầu khám phá <CheckCircle size={18} /></>
                    ) : (
                        <>Tiếp tục <ArrowRight size={18} /></>
                    )}
                </button>
            </div>
        </div>
    );
};

export default TutorialScreen;
