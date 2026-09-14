import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

export default function Checkout() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [course, setCourse] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // In the new system, paymentId could be courseId directly
    loadCourseDetails();
  }, [paymentId, user, navigate]);

  const loadCourseDetails = async () => {
    try {
      // Try to get course details (assuming paymentId is courseId)
      const res = await api.get(`/courses/${paymentId}`);
      setCourse(res.data);
    } catch (err) {
      console.error('Failed to load course:', err);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!user.is_approved) {
      setToast({ message: 'Your account is pending approval. Please wait for admin to approve your account.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/payments/enroll', { course_id: paymentId });
      setToast({ message: 'Successfully enrolled in course!' });
      setTimeout(() => navigate(`/courses/${course?.slug || paymentId}`), 2000);
    } catch (e) {
      setToast({ message: e.response?.data?.error || 'Failed to enroll', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="checkout-card">
        <div className="checkout-title">� Course Enrollment</div>

        {/* Course Info */}
        <div className="checkout-course-info">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>You're enrolling in:</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>{course?.title || 'Course'}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{course?.level} • {course?.duration_hours}h of content</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '12px', color: course?.is_free ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
            {course?.is_free ? '🆓 FREE' : `$${course?.price || 0}`}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Lifetime access • No payment required
          </div>
        </div>

        {/* Account Status */}
        <div style={{
          padding: '20px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius)',
          marginBottom: '24px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1.2rem'
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{user?.name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
          </div>
          <div style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            background: user?.is_approved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            color: user?.is_approved ? '#10b981' : '#f59e0b',
            fontWeight: 600,
            fontSize: '0.9rem',
            textAlign: 'center'
          }}>
            {user?.is_approved ? '✅ Account Approved' : '⏳ Account Pending Approval'}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleEnroll}
          disabled={loading || !user?.is_approved}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 'var(--radius)',
            background: user?.is_approved ? '#667eea' : 'var(--bg-secondary)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '1rem',
            border: 'none',
            cursor: user?.is_approved ? 'pointer' : 'not-allowed',
            opacity: !user?.is_approved ? 0.5 : 1
          }}
        >
          {loading ? '⏳ Processing...' : user?.is_approved ? '🎓 Enroll Now' : '⏳ Waiting for Approval'}
        </button>

        {!user?.is_approved && (
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Your account is pending approval. We'll contact you at {user?.phone} once approved.
          </div>
        )}

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link to={`/courses/${course?.slug || ''}`} style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            ← Cancel and go back
          </Link>
        </div>
      </div>
    </div>
  );
}
