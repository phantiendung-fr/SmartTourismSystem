import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Bookmark, Send, MapPin, Flag, Image as ImageIcon, X, AlertTriangle, Plus, MoreHorizontal, Trash2, Locate } from 'lucide-react';
import { API_BASE } from '../config/api';
import { storageGet } from '../platform/storage';
import { getCurrentPosition } from '../platform/location';
import { showAlert, showConfirm } from '../platform/dialog';
import './SocialFeedScreen.css';

const isIosStandalone = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.navigator.standalone === true
        || window.matchMedia?.('(display-mode: standalone)').matches;

    return isIos && isStandalone;
};


const parseBackendDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string') {
        const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
        const normalized = hasTimezone ? value : `${value}Z`;
        const parsed = new Date(normalized);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const formatCommentDateTime = (value) => {
    const parsed = parseBackendDate(value);
    if (!parsed) return 'Khong ro thoi gian';
    return parsed.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

export default function SocialFeedScreen({ user, onRequireLogin, onOpenProfile }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [likedPosts, setLikedPosts] = useState(new Set());
    const [savedPosts, setSavedPosts] = useState(new Set());
    
    // Comments Drawer
    const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    
    // Create Post Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [postCaption, setPostCaption] = useState('');
    const [imagePreviews, setImagePreviews] = useState([]);
    const [postLocation, setPostLocation] = useState('');
    const [privacyStatus, setPrivacyStatus] = useState('PUBLIC');
    const [isLocating, setIsLocating] = useState(false);
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);
    const [postMenuId, setPostMenuId] = useState(null);

    // Report Post Modal
    const [reportPostId, setReportPostId] = useState(null);
    const [reportReason, setReportReason] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const [keyboardViewport, setKeyboardViewport] = useState({
        height: null,
        offsetTop: 0,
        visible: false
    });
    const commentInputRef = useRef(null);

    useEffect(() => {
        if (!activeCommentsPostId) return undefined;

        const visualViewport = window.visualViewport;
        let animationFrame;

        const syncViewport = () => {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = window.requestAnimationFrame(() => {
                const height = Math.round(visualViewport?.height || window.innerHeight);
                const offsetTop = Math.round(visualViewport?.offsetTop || 0);
                const inputFocused = document.activeElement === commentInputRef.current;
                const visible = inputFocused;

                setKeyboardViewport((current) => (
                    current.height === height
                    && current.offsetTop === offsetTop
                    && current.visible === visible
                        ? current
                        : { height, offsetTop, visible }
                ));
            });
        };

        syncViewport();
        window.addEventListener('resize', syncViewport);
        window.addEventListener('focusin', syncViewport);
        window.addEventListener('focusout', syncViewport);
        visualViewport?.addEventListener('resize', syncViewport);
        visualViewport?.addEventListener('scroll', syncViewport);

        return () => {
            window.cancelAnimationFrame(animationFrame);
            window.removeEventListener('resize', syncViewport);
            window.removeEventListener('focusin', syncViewport);
            window.removeEventListener('focusout', syncViewport);
            visualViewport?.removeEventListener('resize', syncViewport);
            visualViewport?.removeEventListener('scroll', syncViewport);
            setKeyboardViewport({ height: null, offsetTop: 0, visible: false });
        };
    }, [activeCommentsPostId]);

    useEffect(() => {
        const root = document.documentElement;
        const iosStandaloneActive = Boolean(activeCommentsPostId) && isIosStandalone();

        root.classList.toggle('comments-active', Boolean(activeCommentsPostId));
        root.classList.toggle('comments-ios-standalone-active', iosStandaloneActive);

        if (activeCommentsPostId && keyboardViewport.height !== null) {
            root.style.setProperty('--comments-visual-height', `${keyboardViewport.height}px`);
            root.style.setProperty('--comments-visual-offset-top', `${keyboardViewport.offsetTop}px`);
        } else {
            root.style.removeProperty('--comments-visual-height');
            root.style.removeProperty('--comments-visual-offset-top');
        }

        if (activeCommentsPostId && keyboardViewport.visible) {
            root.classList.add('comments-keyboard-visible');
        } else {
            root.classList.remove('comments-keyboard-visible');
        }
        return undefined;
    }, [keyboardViewport, activeCommentsPostId]);

    useEffect(() => () => {
        const root = document.documentElement;
        root.classList.remove('comments-active');
        root.classList.remove('comments-ios-standalone-active');
        root.classList.remove('comments-keyboard-visible');
        root.style.removeProperty('--comments-visual-height');
        root.style.removeProperty('--comments-visual-offset-top');
    }, []);


    useEffect(() => {
        fetchPosts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const currentUserId = String(user?.user_id || user?.id || '');
    const currentUserProfile = {
        full_name: user?.profile?.full_name || user?.full_name || user?.name || 'Traveler',
        avatar_url: user?.profile?.avatar_url || user?.avatar_url || null,
        total_points: user?.profile?.total_points || user?.total_points || 0
    };

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const token = await storageGet('access_token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await fetch(`${API_BASE}/api/social/posts`, { headers });
            if (res.ok) {
                const data = await res.json();
                setPosts(data);

                // Use inline user_liked / user_saved from API (optimized backend)
                if (data.length > 0 && 'user_liked' in data[0]) {
                    const likedIds = new Set(data.filter(p => p.user_liked).map(p => p.post_id));
                    const savedIds = new Set(data.filter(p => p.user_saved).map(p => p.post_id));
                    setLikedPosts(likedIds);
                    setSavedPosts(savedIds);
                } else if (token && user) {
                    // Fallback: fetch saved posts separately (backward compat)
                    const savedRes = await fetch(`${API_BASE}/api/social/saved-posts`, { headers });
                    if (savedRes.ok) {
                        const savedData = await savedRes.json();
                        const savedIds = new Set(savedData.map(p => p.post_id));
                        setSavedPosts(savedIds);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (postId) => {
        if (!user) {
            onRequireLogin();
            return;
        }

        const token = await storageGet('access_token');
        if (!token) return;

        // Optimistic UI update
        const isLiked = likedPosts.has(postId);
        const updatedLiked = new Set(likedPosts);
        if (isLiked) {
            updatedLiked.delete(postId);
        } else {
            updatedLiked.add(postId);
        }
        setLikedPosts(updatedLiked);

        setPosts(prev => prev.map(p => {
            if (p.post_id === postId) {
                return {
                    ...p,
                    likes_count: isLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1
                };
            }
            return p;
        }));

        try {
            const res = await fetch(`${API_BASE}/api/social/like/${postId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPosts(prev => prev.map(p => {
                    if (p.post_id === postId) {
                        return { ...p, likes_count: data.likes_count };
                    }
                    return p;
                }));
            } else {
                // Rollback if request fails
                setLikedPosts(likedPosts);
                setPosts(prev => prev.map(p => {
                    if (p.post_id === postId) {
                        return {
                            ...p,
                            likes_count: isLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1)
                        };
                    }
                    return p;
                }));
                showAlert('Thao tác thích bài viết thất bại.');
            }
        } catch (error) {
            console.error('Error liking post:', error);
            // Rollback if request throws error
            setLikedPosts(likedPosts);
            setPosts(prev => prev.map(p => {
                if (p.post_id === postId) {
                    return {
                        ...p,
                        likes_count: isLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1)
                    };
                }
                return p;
            }));
        }
    };

    const handleSave = async (postId) => {
        if (!user) {
            onRequireLogin();
            return;
        }

        const token = await storageGet('access_token');
        if (!token) return;

        const isSaved = savedPosts.has(postId);
        const updatedSaved = new Set(savedPosts);
        if (isSaved) {
            updatedSaved.delete(postId);
        } else {
            updatedSaved.add(postId);
        }
        setSavedPosts(updatedSaved);

        try {
            const res = await fetch(`${API_BASE}/api/social/save/${postId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const nowSaved = data.action === 'saved';
                const finalSaved = new Set(savedPosts);
                if (nowSaved) {
                    finalSaved.add(postId);
                } else {
                    finalSaved.delete(postId);
                }
                setSavedPosts(finalSaved);
            } else {
                // Rollback
                setSavedPosts(savedPosts);
                showAlert('Thao tác lưu bài viết thất bại.');
            }
        } catch (error) {
            console.error('Error saving post:', error);
            // Rollback
            setSavedPosts(savedPosts);
        }
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        
        // Kiểm tra xem có file nào là HEIC/HEIF không
        const hasHeic = files.some(file => 
            file.name.toLowerCase().endsWith('.heic') || 
            file.name.toLowerCase().endsWith('.heif') ||
            file.type === 'image/heic' || 
            file.type === 'image/heif'
        );
        
        let heic2anyFunc = null;
        if (hasHeic) {
            try {
                // Tải thư viện heic2any động từ CDN nếu chưa có
                if (!window.heic2any) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/heic2any/dist/heic2any.min.js';
                        script.onload = () => resolve();
                        script.onerror = (err) => reject(err);
                        document.head.appendChild(script);
                    });
                }
                heic2anyFunc = window.heic2any;
            } catch (error) {
                console.error('Không thể tải thư viện heic2any:', error);
            }
        }

        const filesToProcess = files.slice(0, 4 - imagePreviews.length);
        
        for (const file of filesToProcess) {
            let finalFile = file;
            const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                           file.name.toLowerCase().endsWith('.heif') ||
                           file.type === 'image/heic' || 
                           file.type === 'image/heif';
                           
            if (isHeic && heic2anyFunc) {
                try {
                    const convertedBlob = await heic2anyFunc({
                        blob: file,
                        toType: 'image/jpeg',
                        quality: 0.7
                    });
                    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                    finalFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
                        type: 'image/jpeg'
                    });
                } catch (err) {
                    console.error('Lỗi chuyển đổi ảnh HEIC:', err);
                }
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result]);
            };
            reader.readAsDataURL(finalFile);
        }
    };

    const handleLocate = () => {
        setIsLocating(true);
        getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
            .then(async (pos) => {
                try {
                    const res = await fetch(`${API_BASE}/api/discovery/geocode/reverse?lat=${pos.latitude}&lon=${pos.longitude}`);
                    if (res.ok) {
                        const data = await res.json();
                        setPostLocation(data.address?.city || data.address?.state || data.address?.country || 'Việt Nam');
                    }
                } catch (error) {
                    console.error('Error reverse geocoding:', error);
                } finally {
                    setIsLocating(false);
                }
            })
            .catch((error) => {
                console.error('Geolocation error:', error);
                setIsLocating(false);
            });
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!postCaption.trim()) return;

        // Optimistic: add temp post to top of feed immediately
        const tempPostId = `temp-${Date.now()}`;
        const optimisticPost = {
            post_id: tempPostId,
            user_id: currentUserId,
            caption: postCaption,
            image_url: imagePreviews.join('|'),
            location_name: postLocation,
            privacy_status: privacyStatus,
            likes_count: 0,
            comments_count: 0,
            created_at: new Date().toISOString(),
            is_pending: true,
            profiles: currentUserProfile
        };

        setPosts(prev => [optimisticPost, ...prev]);
        setPostCaption('');
        setImagePreviews([]);
        setPostLocation('');
        setIsCreateOpen(false);

        setIsSubmittingPost(true);
        try {
            const token = await storageGet('access_token');
            const res = await fetch(`${API_BASE}/api/social/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    caption: optimisticPost.caption,
                    image_url: optimisticPost.image_url,
                    location_name: optimisticPost.location_name,
                    privacy_status: optimisticPost.privacy_status
                })
            });

            if (res.ok) {
                const created = await res.json();
                // Replace temp post with real one
                setPosts(prev => prev.map(p =>
                    p.post_id === tempPostId
                        ? { ...optimisticPost, ...created, post_id: created.post_id || tempPostId, is_pending: false, profiles: optimisticPost.profiles }
                        : p
                ));
            } else {
                // Remove optimistic post on failure
                setPosts(prev => prev.filter(p => p.post_id !== tempPostId));
                await showAlert('Đăng bài viết thất bại.');
            }
        } catch (error) {
            setPosts(prev => prev.filter(p => p.post_id !== tempPostId));
            await showAlert('Đăng bài viết thất bại: ' + error.message);
        } finally {
            setIsSubmittingPost(false);
        }
    };

    const handleOpenComments = async (postId) => {
        setActiveCommentsPostId(postId);
        setComments([]);
        try {
            const res = await fetch(`${API_BASE}/api/social/comments/${postId}`);
            if (res.ok) {
                const data = await res.json();
                const sorted = [...data].sort((a, b) => {
                    const timeA = parseBackendDate(a.created_at)?.getTime() || 0;
                    const timeB = parseBackendDate(b.created_at)?.getTime() || 0;
                    return timeB - timeA;
                });
                setComments(sorted);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        const content = commentText.trim();
        if (!content || !activeCommentsPostId) return;

        if (!user) {
            onRequireLogin();
            return;
        }

        const postId = activeCommentsPostId;
        const optimisticCommentId = `temp-${Date.now()}`;
        const optimisticComment = {
            comment_id: optimisticCommentId,
            user_id: currentUserId,
            content,
            created_at: new Date().toISOString(),
            profiles: currentUserProfile,
            is_pending: true
        };

        setCommentText('');
        setComments(prev => [optimisticComment, ...prev]);
        setPosts(prev => prev.map(p => (
            p.post_id === postId
                ? { ...p, comments_count: (p.comments_count || 0) + 1 }
                : p
        )));

        setSubmittingComment(true);
        try {
            const token = await storageGet('access_token');
            const res = await fetch(`${API_BASE}/api/social/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    post_id: postId,
                    content
                })
            });

            if (res.ok) {
                const createdComment = await res.json();
                setComments(prev => prev.map(comment => {
                    if (comment.comment_id !== optimisticCommentId) return comment;
                    return {
                        ...comment,
                        ...createdComment,
                        profiles: createdComment.profiles || comment.profiles,
                        is_pending: false
                    };
                }));
            } else {
                setComments(prev => prev.filter(comment => comment.comment_id !== optimisticCommentId));
                setPosts(prev => prev.map(p => (
                    p.post_id === postId
                        ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) }
                        : p
                )));
                const errorData = await res.json().catch(() => ({}));
                await showAlert(errorData.detail || 'Không thể gửi bình luận.');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            setComments(prev => prev.filter(comment => comment.comment_id !== optimisticCommentId));
            setPosts(prev => prev.map(p => (
                p.post_id === postId
                    ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) }
                    : p
            )));
            await showAlert('Không thể gửi bình luận. Vui lòng thử lại.');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        const confirmed = await showConfirm('Bạn có muốn xóa bình luận này không?');
        if (!confirmed) return;
        try {
            const token = await storageGet('access_token');
            const res = await fetch(`${API_BASE}/api/social/comments/${commentId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                // Refresh comments list
                handleOpenComments(activeCommentsPostId);
                // Decrement local comments count
                setPosts(prev => prev.map(p => {
                    if (p.post_id === activeCommentsPostId) {
                        return { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) };
                    }
                    return p;
                }));
            } else {
                const data = await res.json();
                await showAlert(data.detail || 'Không thể xóa bình luận.');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    const handleDeletePost = async (postId) => {
        const confirmed = await showConfirm('Xóa bài đăng này? Lượt thích, bình luận và lượt lưu liên quan cũng sẽ bị xóa. Thao tác này không thể hoàn tác.');
        if (!confirmed) return;
        try {
            const token = await storageGet('access_token');
            const res = await fetch(`${API_BASE}/api/social/posts/${postId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setPosts(prev => prev.filter(p => p.post_id !== postId));
                setPostMenuId(null);
            } else {
                const data = await res.json().catch(() => ({}));
                await showAlert(data.detail || 'Không thể xóa bài đăng.');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            await showAlert('Không thể xóa bài đăng. Vui lòng thử lại sau.');
        }
    };

    const handleReportPost = async (e) => {
        e.preventDefault();
        if (!reportReason.trim() || !reportPostId) return;

        setIsSubmittingReport(true);
        try {
            const token = await storageGet('access_token');
            const res = await fetch(`${API_BASE}/api/social/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    post_id: reportPostId,
                    reason: reportReason
                })
            });
            if (res.ok) {
                await showAlert('Báo cáo bài viết thành công. Quản trị viên sẽ xem xét.');
                setReportPostId(null);
                setReportReason('');
            }
        } catch (error) {
            console.error('Error reporting post:', error);
        } finally {
            setIsSubmittingReport(false);
        }
    };

    return (
        <div className="social-feed-container">
            {/* Top Bar */}
            <div className="social-feed-header">
                <h1 className="feed-title">Bản Tin Du Lịch</h1>
                {user && (
                    <button className="squishy-btn green feed-create-btn" onClick={() => setIsCreateOpen(true)}>
                        <Plus size={16} style={{ marginRight: '6px' }} /> Đăng Bài
                    </button>
                )}
            </div>

            {/* Posts Area */}
            {loading ? (
                <div className="posts-list">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="post-card cartoon-card skeleton-post">
                            <div className="post-card-header">
                                <div className="author-info">
                                    <div className="skeleton-avatar skeleton-pulse" />
                                    <div>
                                        <div className="skeleton-line skeleton-pulse" style={{ width: '120px', height: '12px' }} />
                                        <div className="skeleton-line skeleton-pulse" style={{ width: '80px', height: '10px', marginTop: '6px' }} />
                                    </div>
                                </div>
                            </div>
                            <div className="post-card-body">
                                <div className="skeleton-line skeleton-pulse" style={{ width: '100%', height: '14px' }} />
                                <div className="skeleton-line skeleton-pulse" style={{ width: '75%', height: '14px', marginTop: '8px' }} />
                                <div className="skeleton-image skeleton-pulse" style={{ marginTop: '12px' }} />
                            </div>
                            <div className="post-card-footer">
                                <div className="skeleton-line skeleton-pulse" style={{ width: '50px', height: '16px' }} />
                                <div className="skeleton-line skeleton-pulse" style={{ width: '50px', height: '16px' }} />
                                <div className="skeleton-line skeleton-pulse" style={{ width: '50px', height: '16px' }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : posts.length === 0 ? (
                <div className="feed-empty cartoon-card">
                    <AlertTriangle size={48} className="empty-icon" />
                    <h2>Bảng tin trống!</h2>
                    <p>Hãy là thám hiểm gia đầu tiên chia sẻ hành trình của bạn.</p>
                </div>
            ) : (
                <div className="posts-list">
                    {posts.map(post => {
                        const isMe = user && post.user_id === (user.user_id || user.id);
                        return (
                            <div key={post.post_id} className={`post-card cartoon-card ${post.is_pending ? 'pending-post' : ''}`}>
                                {/* Header */}
                                <div className="post-card-header">
                                    <div className="author-info">
                                        <img 
                                            src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.profiles?.full_name || 'Traveler'}`} 
                                            alt="avatar" 
                                            className="author-avatar" 
                                        />
                                        <div>
                                            <h4 className="author-name">{post.profiles?.full_name || 'Thám hiểm gia'}</h4>
                                            <div className="post-meta">
                                                <span className="post-date">{new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
                                                {post.location_name && (
                                                    <span className="post-location">
                                                        <MapPin size={10} className="meta-icon" /> {post.location_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="post-options">
                                        <button className="btn-menu" onClick={() => setPostMenuId(postMenuId === post.post_id ? null : post.post_id)}>
                                            <MoreHorizontal size={18} />
                                        </button>
                                        {postMenuId === post.post_id && (
                                            <div className="post-dropdown-menu cartoon-card">
                                                {isMe ? (
                                                    <button className="dropdown-item red" onClick={() => handleDeletePost(post.post_id)}>
                                                        <Trash2 size={12} /> Xóa bài đăng
                                                    </button>
                                                ) : (
                                                    <button className="dropdown-item orange" onClick={() => { setReportPostId(post.post_id); setPostMenuId(null); }}>
                                                        <Flag size={12} /> Báo cáo bài viết
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="post-card-body">
                                    <p className="post-caption">{post.caption}</p>
                                    {post.image_url && (
                                        <div className="post-images-grid">
                                            {(post.image_url.includes('|') ? post.image_url.split('|') : (post.image_url.startsWith('data:image') ? [post.image_url] : post.image_url.split(','))).map((url, i) => (
                                                <img key={i} src={url} alt="post preview" className="post-image" />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer (Actions) */}
                                <div className="post-card-footer">
                                    <button 
                                        className={`post-action-btn ${likedPosts.has(post.post_id) ? 'active-like' : ''}`}
                                        onClick={() => handleLike(post.post_id)}
                                    >
                                        <Heart size={16} fill={likedPosts.has(post.post_id) ? '#ff4757' : 'none'} />
                                        <span>{post.likes_count || 0}</span>
                                    </button>
                                    <button 
                                        className="post-action-btn"
                                        onClick={() => handleOpenComments(post.post_id)}
                                    >
                                        <MessageCircle size={16} />
                                        <span>{post.comments_count || 0}</span>
                                    </button>
                                    <button 
                                        className={`post-action-btn ${savedPosts.has(post.post_id) ? 'active-save' : ''}`}
                                        onClick={() => handleSave(post.post_id)}
                                    >
                                        <Bookmark size={16} fill={savedPosts.has(post.post_id) ? '#9b59b6' : 'none'} />
                                        <span>{savedPosts.has(post.post_id) ? 'Đã lưu' : 'Lưu'}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Post Modal */}
            {isCreateOpen && (
                <div className="modal-overlay">
                    <div className="modal-content cartoon-card">
                        <div className="modal-header">
                            <h3>Chia Sẻ Hành Trình</h3>
                            <button className="btn-close" onClick={() => setIsCreateOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreatePost}>
                            <textarea 
                                value={postCaption}
                                onChange={(e) => setPostCaption(e.target.value)}
                                placeholder="Có gì thú vị trong hành trình hôm nay của bạn?"
                                className="post-input-text"
                                required
                            />
                            
                            {imagePreviews.length > 0 && (
                                <div className="images-preview-row">
                                    {imagePreviews.map((src, i) => (
                                        <div key={i} className="preview-img-container">
                                            <img src={src} alt="preview" className="preview-img" />
                                            <button 
                                                type="button" 
                                                className="btn-remove-preview"
                                                onClick={() => setImagePreviews(prev => prev.filter((_, idx) => idx !== i))}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="form-actions-row">
                                <label className="squishy-btn yellow upload-label">
                                    <ImageIcon size={16} style={{ marginRight: '6px' }} /> Ảnh
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                                <button type="button" className="squishy-btn blue locate-btn" onClick={handleLocate} disabled={isLocating}>
                                    <Locate size={16} style={{ marginRight: '6px' }} /> {isLocating ? 'Định vị...' : 'Vị trí'}
                                </button>
                            </div>

                            {postLocation && (
                                <div className="tag-location-display">
                                    <MapPin size={12} /> {postLocation}
                                    <button type="button" className="remove-loc" onClick={() => setPostLocation('')}>✕</button>
                                </div>
                            )}

                            <div className="privacy-select-row">
                                <label>Quyền riêng tư:</label>
                                <select value={privacyStatus} onChange={(e) => setPrivacyStatus(e.target.value)}>
                                    <option value="PUBLIC">Công khai</option>
                                    <option value="FRIENDS">Bạn bè</option>
                                    <option value="PRIVATE">Chỉ mình tôi</option>
                                </select>
                            </div>

                            <button type="submit" className="squishy-btn green submit-post-btn" disabled={isSubmittingPost}>
                                {isSubmittingPost ? 'Đang Đăng...' : 'Đăng Bài Viết'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Comments Drawer */}
            {activeCommentsPostId && (
                <div className={`modal-overlay comments-modal-overlay ${isIosStandalone() ? 'ios-standalone-comments' : ''} ${keyboardViewport.visible ? 'keyboard-visible' : ''}`}>
                    <div className="comments-drawer-content cartoon-card">
                        <div className="modal-header">
                            <h3>Bình Luận</h3>
                            <button className="btn-close" onClick={() => setActiveCommentsPostId(null)}><X size={20} /></button>
                        </div>
                        <div className="comments-list">
                            {comments.length === 0 ? (
                                <p className="comments-empty">Chưa có bình luận nào. Hãy bình luận đầu tiên!</p>
                            ) : (
                                comments.map(comment => {
                                    const activePost = posts.find(p => p.post_id === activeCommentsPostId);
                                    const isPostOwner = activePost && user && (activePost.user_id === (user.user_id || user.id));
                                    const isCommentOwner = user && (comment.user_id === (user.user_id || user.id));
                                    const canDelete = !comment.is_pending && (isPostOwner || isCommentOwner);
                                    return (
                                        <div key={comment.comment_id} className="comment-item">
                                            <img 
                                                src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.profiles?.full_name || 'Visitor'}`} 
                                                alt="avatar" 
                                                className="comment-avatar"
                                            />
                                            <div className="comment-bubble cartoon-card">
                                                <div className="comment-bubble-header">
                                                    <span className="commenter-name">{comment.profiles?.full_name || 'Traveler'}</span>
                                                    <div className="comment-meta-right">
                                                        <span className="comment-time">{formatCommentDateTime(comment.created_at)}</span>
                                                        {canDelete && (
                                                            <button 
                                                                className="btn-delete-comment" 
                                                                onClick={() => handleDeleteComment(comment.comment_id)}
                                                                title="Xóa bình luận"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="comment-text-content">{comment.content}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {user && (
                            <form onSubmit={handleAddComment} className="add-comment-form">
                                <input 
                                    ref={commentInputRef}
                                    type="text" 
                                    placeholder="Viết bình luận..." 
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    required
                                />
                                <button type="submit" className="squishy-btn blue send-comment-btn" disabled={submittingComment}>
                                    {submittingComment ? (
                                        <span className="comment-send-spinner" aria-hidden="true" />
                                    ) : (
                                        <Send size={14} />
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {reportPostId && (
                <div className="modal-overlay">
                    <div className="modal-content cartoon-card text-center">
                        <div className="modal-header">
                            <h3>Báo Cáo Vi Phạm</h3>
                            <button className="btn-close" onClick={() => setReportPostId(null)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleReportPost}>
                            <p className="report-warning-desc">Vui lòng cung cấp lý do báo cáo bài viết vi phạm tiêu chuẩn cộng đồng:</p>
                            <textarea
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                placeholder="Ví dụ: Nội dung phản cảm, hình ảnh thô tục, spam..."
                                className="post-input-text"
                                required
                            />
                            <div className="modal-actions-row">
                                <button type="button" className="squishy-btn red report-cancel-btn" onClick={() => setReportPostId(null)}>Hủy</button>
                                <button type="submit" className="squishy-btn green report-submit-btn" disabled={isSubmittingReport}>
                                    {isSubmittingReport ? 'Đang gửi...' : 'Báo Cáo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
