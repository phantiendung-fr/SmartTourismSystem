import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Camera, HelpCircle, Image, MapPin, QrCode, Tag } from 'lucide-react';
import { API_BASE } from '../../config/api';
import { businessService } from '../../services/businessService';
import { getCurrentPosition } from '../../platform/location';
import './LocationRegister.css';

const splitLines = (value) => (
    value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
);

const formatTimeValue = (value) => {
    if (!value) return '00:00';
    return value.substring(0, 5);
};

const LocationRegister = ({ onBack, onSubmitted }) => {
    const [cities, setCities] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [formData, setFormData] = useState({
        location_name: '',
        address: '',
        latitude: '',
        longitude: '',
        city_id: '',
        open_time: '08:00',
        close_time: '22:00',
        min_price: '',
        max_price: '',
        currency: 'VND',
        category_ids: [],
        tag_ids: [],
        image_urls_text: '',
        photo_task_title: '',
        photo_task_description: '',
        reference_image_url: '',
        photo_reward_exp: 100,
        photo_radius_meters: 80,
        qa_question: '',
        qa_option_a: '',
        qa_option_b: '',
        qa_option_c: '',
        qa_option_d: '',
        qa_correct_answer: 'A',
        qa_difficulty: 'easy',
        qa_reward_exp: 30,
        qa_reward_coin: 15,
        qr_reward_exp: 50,
        qr_reward_coin: 25,
        qr_valid_days: 365,
    });

    const [loadingRefs, setLoadingRefs] = useState(true);
    const [viewportHeight, setViewportHeight] = useState(null);

    useEffect(() => {
        const visualViewport = window.visualViewport;
        if (!visualViewport) return undefined;

        const handleResize = () => {
            setViewportHeight(Math.round(visualViewport.height));
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        visualViewport.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            visualViewport.removeEventListener('resize', handleResize);
        };
    }, []);
    const [loadingGps, setLoadingGps] = useState(false);
    const [gpsMessage, setGpsMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        let active = true;
        const loadReferences = async () => {
            setLoadingRefs(true);
            try {
                const [cityRes, categoryRes, tagRes] = await Promise.all([
                    fetch(`${API_BASE}/api/reference/cities`),
                    fetch(`${API_BASE}/api/reference/categories`),
                    fetch(`${API_BASE}/api/reference/tags`),
                ]);
                const [cityData, categoryData, tagData] = await Promise.all([
                    cityRes.json(),
                    categoryRes.json(),
                    tagRes.json(),
                ]);
                if (!active) return;

                setCities(Array.isArray(cityData) ? cityData : []);
                setCategories(Array.isArray(categoryData) ? categoryData : []);
                setTags(Array.isArray(tagData) ? tagData : []);
                setFormData((current) => ({
                    ...current,
                    city_id: current.city_id || cityData?.[0]?.city_id || '',
                    category_ids: current.category_ids.length ? current.category_ids : (categoryData?.[0]?.category_id ? [categoryData[0].category_id] : []),
                    tag_ids: current.tag_ids.length ? current.tag_ids : tagData?.slice(0, 2).map((tag) => tag.tag_id) || [],
                }));
            } catch (error) {
                if (active) {
                    setMessage({ type: 'error', text: 'Không thể tải thành phố, danh mục hoặc tag. Vui lòng thử lại.' });
                }
            } finally {
                if (active) setLoadingRefs(false);
            }
        };
        loadReferences();
        return () => { active = false; };
    }, []);

    const fillCurrentGps = useCallback(async ({ silent = false } = {}) => {
        setLoadingGps(true);
        if (!silent) setGpsMessage('');
        try {
            const position = await getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000,
            });
            setFormData((current) => ({
                ...current,
                latitude: Number(position.latitude).toFixed(6),
                longitude: Number(position.longitude).toFixed(6),
            }));
            setGpsMessage(`Đã lấy GPS hiện tại${position.accuracy ? `, sai số khoảng ${Math.round(position.accuracy)}m` : ''}.`);
        } catch (error) {
            setGpsMessage('Không lấy được GPS tự động. Bạn có thể nhập tọa độ thủ công.');
        } finally {
            setLoadingGps(false);
        }
    }, []);

    useEffect(() => {
        fillCurrentGps({ silent: true });
    }, [fillCurrentGps]);

    const imageUrls = useMemo(() => splitLines(formData.image_urls_text), [formData.image_urls_text]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
    };

    const toggleNumberListValue = (field, value) => {
        const numericValue = Number(value);
        setFormData((current) => {
            const exists = current[field].includes(numericValue);
            return {
                ...current,
                [field]: exists
                    ? current[field].filter((item) => item !== numericValue)
                    : [...current[field], numericValue],
            };
        });
    };

    const validateForm = () => {
        if (!formData.city_id) return 'Vui lòng chọn thành phố.';
        if (formData.latitude === '' || formData.longitude === '') return 'Vui lòng nhập hoặc lấy GPS của địa điểm.';
        const lat = Number(formData.latitude);
        const lng = Number(formData.longitude);
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) return 'Vĩ độ GPS phải nằm trong khoảng -90 đến 90.';
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) return 'Kinh độ GPS phải nằm trong khoảng -180 đến 180.';
        if (!formData.category_ids.length) return 'Vui lòng chọn ít nhất một danh mục.';
        if (!formData.tag_ids.length) return 'Vui lòng chọn ít nhất một tag.';
        if (!imageUrls.length) return 'Vui lòng nhập ít nhất một URL ảnh địa điểm.';
        if (!formData.reference_image_url.trim()) return 'Vui lòng nhập ảnh mẫu cho nhiệm vụ chụp ảnh.';
        if (!formData.photo_task_title.trim()) return 'Vui lòng nhập tiêu đề nhiệm vụ chụp ảnh.';
        if (!formData.qa_question.trim()) return 'Vui lòng nhập câu hỏi nhiệm vụ.';
        if (![formData.qa_option_a, formData.qa_option_b, formData.qa_option_c, formData.qa_option_d].every((value) => value.trim())) {
            return 'Vui lòng nhập đủ 4 đáp án cho câu hỏi.';
        }
        if (Number(formData.max_price) < Number(formData.min_price)) return 'Giá cao nhất phải lớn hơn hoặc bằng giá thấp nhất.';
        return '';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage({ type: '', text: '' });

        const validationError = validateForm();
        if (validationError) {
            setMessage({ type: 'error', text: validationError });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                location_name: formData.location_name.trim(),
                address: formData.address.trim(),
                latitude: Number(formData.latitude),
                longitude: Number(formData.longitude),
                city_id: Number(formData.city_id),
                open_time: `${formData.open_time}:00`,
                close_time: `${formData.close_time}:00`,
                min_price: Number(formData.min_price),
                max_price: Number(formData.max_price),
                currency: formData.currency,
                category_ids: formData.category_ids,
                tag_ids: formData.tag_ids,
                image_urls: imageUrls,
                photo_task_title: formData.photo_task_title.trim(),
                photo_task_description: formData.photo_task_description.trim(),
                reference_image_url: formData.reference_image_url.trim(),
                photo_reward_exp: Number(formData.photo_reward_exp),
                photo_radius_meters: Number(formData.photo_radius_meters),
                qa_question: formData.qa_question.trim(),
                qa_option_a: formData.qa_option_a.trim(),
                qa_option_b: formData.qa_option_b.trim(),
                qa_option_c: formData.qa_option_c.trim(),
                qa_option_d: formData.qa_option_d.trim(),
                qa_correct_answer: formData.qa_correct_answer,
                qa_difficulty: formData.qa_difficulty,
                qa_reward_exp: Number(formData.qa_reward_exp),
                qa_reward_coin: Number(formData.qa_reward_coin),
                qr_reward_exp: Number(formData.qr_reward_exp),
                qr_reward_coin: Number(formData.qr_reward_coin),
                qr_valid_days: Number(formData.qr_valid_days),
            };

            const response = await businessService.registerLocation(payload);
            const submissionSuffix = response.submission_id ? ` Mã yêu cầu: ${response.submission_id}` : '';
            const successText = `${response.message || 'Đã gửi yêu cầu, chờ admin duyệt.'}${submissionSuffix}`;
            setMessage({ type: 'success', text: successText });
            if (onSubmitted) {
                onSubmitted({ ...response, message: successText });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const containerStyle = viewportHeight ? {
        height: `${viewportHeight}px`,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 'auto'
    } : undefined;

    return (
        <div className="register-container" style={containerStyle}>
            {onBack && (
                <button type="button" onClick={onBack} className="register-back-btn">
                    <ArrowLeft size={16} /> Quay lại
                </button>
            )}

            <h2 className="register-title">Đăng Ký Địa Điểm Kinh Doanh</h2>

            {message.text && (
                <div className={`alert-message ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <h3 className="form-section-title"><MapPin size={18} /> Thông tin địa điểm</h3>

                <div className="form-group">
                    <label className="form-label">Tên địa điểm</label>
                    <input type="text" name="location_name" required value={formData.location_name} onChange={handleChange} className="form-control" />
                </div>

                <div className="form-group">
                    <label className="form-label">Địa chỉ</label>
                    <input type="text" name="address" required value={formData.address} onChange={handleChange} className="form-control" />
                </div>

                <div className="gps-panel">
                    <div className="gps-panel-header">
                        <div>
                            <strong>GPS địa điểm</strong>
                            <span>Điền sẵn theo vị trí hiện tại, doanh nghiệp có thể chỉnh lại.</span>
                        </div>
                        <button type="button" className="gps-btn" onClick={() => fillCurrentGps()} disabled={loadingGps}>
                            {loadingGps ? 'Đang lấy...' : 'Lấy GPS hiện tại'}
                        </button>
                    </div>
                    <div className="grid-2-cols">
                        <div className="form-group">
                            <label className="form-label">Vĩ độ latitude</label>
                            <input type="number" step="0.000001" name="latitude" required value={formData.latitude} onChange={handleChange} className="form-control" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Kinh độ longitude</label>
                            <input type="number" step="0.000001" name="longitude" required value={formData.longitude} onChange={handleChange} className="form-control" />
                        </div>
                    </div>
                    {gpsMessage && <small className="form-help">{gpsMessage}</small>}
                </div>

                <div className="form-group">
                    <label className="form-label">Thành phố</label>
                    <select name="city_id" required value={formData.city_id} onChange={handleChange} className="form-control" disabled={loadingRefs}>
                        {cities.length === 0 && <option value="">Đang tải thành phố...</option>}
                        {cities.map((city) => (
                            <option key={city.city_id} value={city.city_id}>{city.city_name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid-2-cols">
                    <div className="form-group">
                        <label className="form-label">Giờ mở cửa</label>
                        <div className="register-compact-time">
                            <span>{formatTimeValue(formData.open_time)}</span>
                            <input type="time" name="open_time" required value={formData.open_time} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Giờ đóng cửa</label>
                        <div className="register-compact-time">
                            <span>{formatTimeValue(formData.close_time)}</span>
                            <input type="time" name="close_time" required value={formData.close_time} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Giá thấp nhất</label>
                        <input type="number" name="min_price" required min="0" value={formData.min_price} onChange={handleChange} className="form-control" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Giá cao nhất</label>
                        <input type="number" name="max_price" required min="0" value={formData.max_price} onChange={handleChange} className="form-control" />
                    </div>
                </div>

                <h3 className="form-section-title"><Tag size={18} /> Phân loại & gợi ý</h3>

                <div className="form-group">
                    <label className="form-label">Danh mục</label>
                    <div className="choice-grid">
                        {categories.map((category) => (
                            <label key={category.category_id} className="choice-pill">
                                <input
                                    type="checkbox"
                                    checked={formData.category_ids.includes(category.category_id)}
                                    onChange={() => toggleNumberListValue('category_ids', category.category_id)}
                                />
                                {category.category_name}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Tag sở thích</label>
                    <div className="choice-grid">
                        {tags.map((tag) => (
                            <label key={tag.tag_id} className="choice-pill">
                                <input
                                    type="checkbox"
                                    checked={formData.tag_ids.includes(tag.tag_id)}
                                    onChange={() => toggleNumberListValue('tag_ids', tag.tag_id)}
                                />
                                {tag.tag_name}
                            </label>
                        ))}
                    </div>
                </div>

                <h3 className="form-section-title"><Image size={18} /> Ảnh địa điểm</h3>

                <div className="form-group">
                    <label className="form-label">URL ảnh, mỗi dòng một ảnh</label>
                    <textarea name="image_urls_text" required rows={4} value={formData.image_urls_text} onChange={handleChange} className="form-control" />
                    <small className="form-help">Đã nhập {imageUrls.length} ảnh.</small>
                </div>

                <h3 className="form-section-title"><Camera size={18} /> Nhiệm vụ ảnh</h3>

                <div className="form-group">
                    <label className="form-label">Tiêu đề nhiệm vụ</label>
                    <input type="text" name="photo_task_title" required value={formData.photo_task_title} onChange={handleChange} className="form-control" />
                </div>
                <div className="form-group">
                    <label className="form-label">Mô tả nhiệm vụ</label>
                    <textarea name="photo_task_description" rows={3} value={formData.photo_task_description} onChange={handleChange} className="form-control" />
                </div>
                <div className="form-group">
                    <label className="form-label">URL ảnh mẫu để AI đối chiếu</label>
                    <input type="url" name="reference_image_url" required value={formData.reference_image_url} onChange={handleChange} className="form-control" />
                </div>
                <div className="grid-2-cols">
                    <div className="form-group">
                        <label className="form-label">EXP nhiệm vụ ảnh</label>
                        <input type="number" name="photo_reward_exp" min="0" value={formData.photo_reward_exp} onChange={handleChange} className="form-control" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Bán kính GPS</label>
                        <input type="number" name="photo_radius_meters" min="1" value={formData.photo_radius_meters} onChange={handleChange} className="form-control" />
                    </div>
                </div>

                <h3 className="form-section-title"><HelpCircle size={18} /> Câu hỏi tại địa điểm</h3>

                <div className="form-group">
                    <label className="form-label">Câu hỏi</label>
                    <textarea name="qa_question" required rows={3} value={formData.qa_question} onChange={handleChange} className="form-control" />
                </div>
                <div className="grid-2-cols">
                    {['a', 'b', 'c', 'd'].map((letter) => (
                        <div className="form-group" key={letter}>
                            <label className="form-label">Đáp án {letter.toUpperCase()}</label>
                            <input type="text" name={`qa_option_${letter}`} required value={formData[`qa_option_${letter}`]} onChange={handleChange} className="form-control" />
                        </div>
                    ))}
                    <div className="form-group">
                        <label className="form-label">Đáp án đúng</label>
                        <select name="qa_correct_answer" value={formData.qa_correct_answer} onChange={handleChange} className="form-control">
                            {['A', 'B', 'C', 'D'].map((letter) => <option key={letter} value={letter}>{letter}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Độ khó</label>
                        <select name="qa_difficulty" value={formData.qa_difficulty} onChange={handleChange} className="form-control">
                            <option value="easy">Dễ</option>
                            <option value="medium">Trung bình</option>
                            <option value="hard">Khó</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">EXP QA</label>
                        <input type="number" name="qa_reward_exp" min="0" value={formData.qa_reward_exp} onChange={handleChange} className="form-control" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Xu QA</label>
                        <input type="number" name="qa_reward_coin" min="0" value={formData.qa_reward_coin} onChange={handleChange} className="form-control" />
                    </div>
                </div>

                <h3 className="form-section-title"><QrCode size={18} /> QR do server cấp</h3>

                <div className="grid-2-cols">
                    <div className="form-group">
                        <label className="form-label">EXP QR</label>
                        <input type="number" name="qr_reward_exp" min="0" value={formData.qr_reward_exp} onChange={handleChange} className="form-control" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Xu QR</label>
                        <input type="number" name="qr_reward_coin" min="0" value={formData.qr_reward_coin} onChange={handleChange} className="form-control" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Số ngày hiệu lực</label>
                        <input type="number" name="qr_valid_days" min="1" value={formData.qr_valid_days} onChange={handleChange} className="form-control" />
                    </div>
                </div>

                <button type="submit" disabled={loading || loadingRefs} className="submit-btn">
                    {loading ? 'Đang gửi yêu cầu...' : 'Đăng Ký Địa Điểm'}
                </button>
            </form>
        </div>
    );
};

export default LocationRegister;
