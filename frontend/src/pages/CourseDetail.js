import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import Reviews from '../components/Reviews';

export default function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [activeTab, setActiveTab] = useState('videos');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const loadData = useCallback(async () => {
    try {
      const [courseRes] = await Promise.all([api.get(`/courses/${slug}`)]);
      setCourse(courseRes.data);

      // Always load videos (preview videos available to everyone)
      const videosRes = await api.get(`/courses/${slug}/videos`);
      setVideos(videosRes.data);

      if (user) {
        const enrollRes = await api.get(`/courses/${slug}/enrollment`);
        setEnrollment(enrollRes.data);
        const firstUnlocked = videosRes.data.find(v => !v.locked);
        if (firstUnlocked) setActiveVideo(firstUnlocked);
      } else {
        // For non-authenticated users, show first preview video
        const firstPreview = videosRes.data.find(v => !v.locked);
        if (firstPreview) setActiveVideo(firstPreview);
      }
    } finally {
      setLoading(false);
    }
  }, [slug, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEnroll = async () => {
    if (!user) { navigate('/login'); return; }

    setEnrolling(true);
    try {
      await api.post('/payments/enroll', { course_id: course.id });
      showToast('Enrollment request submitted! Waiting for admin approval.');
      loadData();
    } catch (e) {
      showToast(e.response?.data?.error || 'Something went wrong', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  const handleVideoSelect = (video) => {
    if (video.locked) {
      showToast('Please enroll to watch this video', 'error');
      return;
    }
    setActiveVideo(video);
  };

  const markWatched = async (videoId) => {
    if (!user) return;
    try { await api.post(`/courses/${slug}/videos/${videoId}/progress`, { watched: true, progress_seconds: 0 }); }
    catch { }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!course) return null;

  // Access requires explicit enrollment with approval (even free courses)
  const hasAccess = enrollment?.enrolled && enrollment?.is_approved;
  // Preview access is available to everyone (including non-authenticated users)
  const trackIcon = { devops: '⚙️', cloud: '☁️', sysadmin: '🖥️' }[course.track_slug] || '📚';
  const trackColor = course.track_color || '#3b82f6';

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Course Header */}
      <div className="page-header" style={{ borderLeft: `4px solid ${trackColor}` }}>
        <div className="page-header-inner">
          <div className="breadcrumb">
            <Link to="/">Home</Link> / <Link to="/courses">Courses</Link>
            {course.track_slug && <> / <Link to={`/tracks/${course.track_slug}`}>{course.track_title}</Link></>}
            / {course.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
              <span style={{ fontSize: '2.5rem' }}>{trackIcon}</span>
              <div>
                <h1 style={{ marginBottom: '8px' }}>{course.title}</h1>
                <p style={{ marginBottom: '12px' }}>{course.description}</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span className={`badge badge-${course.is_free ? 'free' : 'paid'}`}>{course.is_free ? 'Free Course' : `$${course.price}`}</span>
                  <span className={`badge badge-${course.level}`}>{course.level}</span>
                  <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>⏱ {course.duration_hours}h</span>
                  <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>🎬 {course.videos?.length || 0} videos</span>
                  <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>✅ {course.tasks?.length || 0} tasks</span>
                  <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>⭐ {course.avg_rating ? course.avg_rating.toFixed(1) : 'N/A'}</span>
                </div>
              </div>
            </div>
            {/* Enroll Button */}
            {user && !enrollment?.enrolled && (
              <button
                className="btn-primary"
                style={{ padding: '12px 28px', fontSize: '1rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling ? 'Processing...' : '🎓 Enroll Now'}
              </button>
            )}
            {!user && (
              <Link
                to="/login"
                className="btn-primary"
                style={{ padding: '12px 28px', fontSize: '1rem', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                🔐 Login to Enroll
              </Link>
            )}
            {user && enrollment?.enrolled && !enrollment?.is_approved && (
              <div style={{ padding: '12px 20px', background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', borderRadius: 'var(--radius)', color: '#f59e0b', fontWeight: 600, flexShrink: 0 }}>
                ⏳ Enrollment Pending Approval
              </div>
            )}
            {user && enrollment?.enrolled && enrollment?.is_approved && (
              <div style={{ padding: '12px 20px', background: 'rgba(16,185,129,0.1)', border: '1px solid var(--accent-green)', borderRadius: 'var(--radius)', color: 'var(--accent-green)', fontWeight: 600, flexShrink: 0 }}>
                ✅ Enrolled
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section">
        {/* Tabs */}
        <div className="tabs">
          <button className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveTab('videos')}>🎬 Videos</button>
          <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>✅ Tasks ({course.tasks?.length || 0})</button>
          <button className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>⭐ Reviews ({course.review_count || 0})</button>
          {hasAccess && (
            <button className={`tab-btn ${activeTab === 'certificate' ? 'active' : ''}`} onClick={() => setActiveTab('certificate')}>🎓 Certificate</button>
          )}
        </div>

        {activeTab === 'videos' && (
          <div>
            {!user ? (
              /* ── Not logged in ─────────────────────────────── */
              <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔐</div>
                <h3 style={{ marginBottom: '8px' }}>Login to Watch Full Course</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Create a free account to access full course content</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <Link to="/login" className="btn-primary">Login</Link>
                  <Link to="/register" className="btn-secondary">Register</Link>
                </div>
              </div>

            ) : enrollment?.enrolled && !enrollment?.is_approved ? (
              /* ── Enrolled but waiting for admin approval ───── */
              <div style={{
                textAlign: 'center', padding: '60px 24px',
                background: 'var(--bg-card)', borderRadius: 'var(--radius)',
                border: '1px solid var(--yellow-border)',
              }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>⏳</div>
                <h3 style={{ marginBottom: '10px', fontFamily: 'var(--font-display)' }}>
                  Enrollment Pending Approval
                </h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.7 }}>
                  Your enrollment request has been submitted successfully.
                  The instructor will review and approve it shortly — you'll get full access once approved.
                </p>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '12px 24px', borderRadius: 'var(--radius)',
                  background: 'var(--yellow-light)', border: '1px solid var(--yellow-border)',
                  color: 'var(--yellow)', fontWeight: 700, fontSize: '0.9rem',
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yellow)', animation: 'pulse 1.5s infinite' }} />
                  Waiting for admin approval
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 16 }}>
                  You can watch the free preview video below while you wait.
                </p>
              </div>

            ) : !enrollment?.enrolled ? (
              /* ── Not enrolled yet ──────────────────────────── */
              <div style={{
                textAlign: 'center', padding: '60px 24px',
                background: 'var(--bg-card)', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
                <h3 style={{ marginBottom: '8px' }}>Enroll to Watch All Videos</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  {course.is_free
                    ? 'This course is free — enroll now and get instant access after approval.'
                    : `Enroll for $${course.price} to get full access to all videos and tasks.`}
                </p>
                <button className="btn-primary" style={{ padding: '12px 32px' }} onClick={handleEnroll} disabled={enrolling}>
                  {enrolling ? 'Submitting…' : '🎓 Enroll Now'}
                </button>
              </div>

            ) : (
              <div className="video-section">
                {/* Player */}
                <div>
                  {activeVideo ? (
                    activeVideo.locked ? (
                      <div className="video-locked">
                        <div className="lock-icon">🔒</div>
                        <h3>This video is locked</h3>
                        <p>Login and enroll to watch all videos</p>
                        <Link to="/login" className="btn-primary">Login to Watch</Link>
                      </div>
                    ) : (
                      <div>
                        <div className="video-player-wrap">
                          {activeVideo.video_url?.includes('youtube') || activeVideo.video_url?.includes('youtu.be') ? (
                            <iframe
                              src={activeVideo.video_url}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <video
                              src={activeVideo.video_url}
                              controls
                              style={{ width: '100%', height: '100%' }}
                              onEnded={() => markWatched(activeVideo.id)}
                            />
                          )}
                        </div>
                        <div style={{ marginTop: '16px' }}>
                          <h3 style={{ fontWeight: 600, marginBottom: '4px' }}>{activeVideo.title}</h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{activeVideo.description}</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="video-locked">
                      <div style={{ fontSize: '3rem' }}>▶️</div>
                      <h3>Select a video to start</h3>
                    </div>
                  )}
                </div>

                {/* Playlist */}
                <div className="playlist">
                  <div className="playlist-header">Course Content ({videos.length} videos)</div>
                  <div className="playlist-items">
                    {videos.map((v, i) => (
                      <div
                        key={v.id}
                        className={`playlist-item ${activeVideo?.id === v.id ? 'active' : ''} ${v.locked ? 'locked' : ''}`}
                        onClick={() => handleVideoSelect(v)}
                      >
                        <div className="item-num">
                          {v.progress?.watched ? '✅' : v.locked ? '🔒' : i + 1}
                        </div>
                        <div className="item-info">
                          <div className="item-title">{v.title}</div>
                          <div className="item-duration">{v.duration_minutes} min {v.is_preview ? '• Free Preview' : '• 🔒 Enroll to watch'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            {!user ? (
              <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔐</div>
                <h3 style={{ marginBottom: '8px' }}>Login to Access Tasks</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Create a free account to access course tasks and submit your work</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <Link to="/login" className="btn-primary">Login</Link>
                  <Link to="/register" className="btn-secondary">Register</Link>
                </div>
              </div>
            ) : course.tasks?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📝</div>
                <div>No tasks yet for this course.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {course.tasks?.map((task, i) => (
                  <div key={task.id} className="task-card">
                    <div className="task-header">
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>Task {i + 1}</div>
                        <div className="task-title">{task.title}</div>
                      </div>
                      <span className={`badge badge-${task.difficulty === 'easy' ? 'beginner' : task.difficulty === 'hard' ? 'advanced' : 'intermediate'}`}>
                        {task.difficulty}
                      </span>
                    </div>
                    <div className="task-body">{task.description}</div>
                    {user ? (
                      hasAccess ? (
                        <button className="task-btn" onClick={() => navigate(`/tasks/${task.id}`)}>
                          Start Task →
                        </button>
                      ) : (
                        <button className="task-btn" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)' }} onClick={handleEnroll} disabled={enrollment?.enrolled}>
                          {enrollment?.enrolled && !enrollment?.is_approved ? '⏳ Enrollment Pending' : '🎓 Enroll to unlock task'}
                        </button>
                      )
                    ) : (
                      <Link to="/login" className="task-btn" style={{ display: 'inline-block', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        Login to access tasks
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && course && <Reviews courseId={course.id} />}

        {activeTab === 'certificate' && hasAccess && (
          <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
            <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#1a202c' }}>
              Course Certificate
            </h2>
            <p style={{ color: '#718096', marginBottom: '24px' }}>
              Complete all course videos to earn your certificate
            </p>
            <div style={{ background: '#f7fafc', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                Progress: {videos.length > 0 ? Math.round((videos.filter(v => v.watched).length / videos.length) * 100) : 0}%
              </div>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${videos.length > 0 ? (videos.filter(v => v.watched).length / videos.length) * 100 : 0}%`,
                    height: '100%',
                    background: '#3b82f6',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div style={{ fontSize: '14px', color: '#718096', marginTop: '8px' }}>
                {videos.filter(v => v.watched).length} of {videos.length} videos completed
              </div>
            </div>
            {videos.length > 0 && videos.filter(v => v.watched).length === videos.length ? (
              <button
                onClick={async () => {
                  try {
                    const response = await api.post(`/certificates/course/${course.id}`);
                    alert('Certificate generated successfully!');
                    window.open(response.data.certificate_url, '_blank');
                  } catch (error) {
                    alert(error.response?.data?.error || 'Failed to generate certificate');
                  }
                }}
                style={{
                  padding: '12px 24px',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Generate Certificate
              </button>
            ) : (
              <button
                disabled
                style={{
                  padding: '12px 24px',
                  background: '#e2e8f0',
                  color: '#718096',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'not-allowed',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Complete all videos first
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
