import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('stats');
  const [stats, setStats] = useState({});
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingEnrollments, setPendingEnrollments] = useState([]);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [filterTrack, setFilterTrack] = useState('all');

  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    loadSection('stats');
  }, [user]);

  const loadSection = useCallback(async (section) => {
    // Live Courses has its own dedicated page
    if (section === 'live') { navigate('/admin/live'); return; }
    setActiveSection(section);
    try {
      if (section === 'stats') {
        const [s, t] = await Promise.all([api.get('/admin/stats'), api.get('/tracks')]);
        setStats(s.data); setTracks(t.data);
      } else if (section === 'courses') {
        const [c, t] = await Promise.all([api.get('/admin/courses'), api.get('/tracks')]);
        setCourses(c.data); setTracks(t.data);
      } else if (section === 'approvals') {
        const [r, e] = await Promise.all([api.get('/admin/users/pending'), api.get('/payments/admin/pending-enrollments')]);
        setPendingUsers(r.data);
        setPendingEnrollments(e.data);
      } else if (section === 'users') {
        const r = await api.get('/admin/users'); setUsers(r.data);
      } else if (section === 'submissions') {
        const r = await api.get('/admin/submissions'); setSubmissions(r.data);
      }
    } catch { }
  }, []);

  const openModal = (type, data = {}) => { setModal(type); setForm(data); };
  const closeModal = () => { setModal(null); setForm({}); };

  const handleCreateCourse = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const fd = new FormData();
      Object.keys(form).forEach(k => {
        if (k !== 'thumbnailFile' && form[k] !== undefined) fd.append(k, form[k]);
      });
      if (form.thumbnailFile) fd.append('thumbnail', form.thumbnailFile);
      await axios.post('/api/courses', fd, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      showToast('Course created!');
      closeModal(); loadSection('courses');
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post(`/courses/${form.course_id}/videos`, form);
      showToast('Video added!');
      closeModal();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  const handleAddTask = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post(`/courses/${form.course_id}/tasks`, form);
      showToast('Task added!');
      closeModal();
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  const handleReview = async (submissionId, status) => {
    const feedback = status === 'approved' ? 'Great work! Well done.' : prompt('Feedback for student:') || 'Please improve your submission.';
    try {
      await api.put(`/admin/submissions/${submissionId}`, { status, feedback });
      showToast(`Submission ${status}!`);
      loadSection('submissions');
    } catch { showToast('Failed to review', 'error'); }
  };

  const handleToggleCourse = async (courseId) => {
    try { await api.put(`/admin/courses/${courseId}/toggle`); loadSection('courses'); showToast('Course updated!'); }
    catch { showToast('Failed', 'error'); }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm('Are you sure you want to delete this course? This will also delete all associated videos, tasks, and enrollments!')) return;
    try {
      await api.delete(`/courses/${courseId}`);
      showToast('Course deleted successfully!');
      loadSection('courses');
    } catch { showToast('Failed to delete course', 'error'); }
  };

  const handleUpdatePrice = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.put(`/admin/courses/${form.id}/price`, { price: form.price, is_free: form.is_free });
      showToast('Price updated!');
      closeModal(); loadSection('courses');
    } catch (e) { showToast(e.response?.data?.error || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  const handleApproveUser = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/approve`);
      showToast('User approved successfully!');
      loadSection('approvals');
    } catch (e) { showToast(e.response?.data?.error || 'Failed to approve user', 'error'); }
  };

  const handleRejectUser = async (userId) => {
    if (!confirm('Are you sure you want to reject this user? This will delete their account.')) return;
    try {
      await api.delete(`/admin/users/${userId}/reject`);
      showToast('User rejected and account deleted');
      loadSection('approvals');
    } catch (e) { showToast(e.response?.data?.error || 'Failed to reject user', 'error'); }
  };

  const handleApproveEnrollment = async (enrollmentId) => {
    try {
      await api.put(`/payments/admin/enrollments/${enrollmentId}/approve`);
      showToast('Enrollment approved successfully!');
      loadSection('approvals');
    } catch (e) { showToast(e.response?.data?.error || 'Failed to approve enrollment', 'error'); }
  };

  const handleRejectEnrollment = async (enrollmentId) => {
    if (!confirm('Are you sure you want to reject this enrollment request?')) return;
    try {
      await api.put(`/payments/admin/enrollments/${enrollmentId}/reject`);
      showToast('Enrollment rejected and removed');
      loadSection('approvals');
    } catch (e) { showToast(e.response?.data?.error || 'Failed to reject enrollment', 'error'); }
  };

  const sideItems = [
    { key: 'stats', icon: '📊', label: 'Dashboard' },
    { key: 'courses', icon: '📚', label: 'Courses' },
    { key: 'approvals', icon: '✅', label: 'Approvals' },
    { key: 'users', icon: '👥', label: 'Students' },
    { key: 'submissions', icon: '📝', label: 'Submissions' },
    { key: 'live', icon: '📡', label: 'Live Courses' },
  ];

  // bottom nav shows the 5 most important sections
  const bottomNavItems = [
    { key: 'stats', icon: '📊', label: 'Dashboard' },
    { key: 'courses', icon: '📚', label: 'Courses' },
    {
      key: 'approvals', icon: '✅', label: 'Approvals',
      badge: (stats.pending_approvals || 0) + (stats.pending_enrollments || 0), badgeColor: 'yellow'
    },
    {
      key: 'submissions', icon: '📝', label: 'Tasks',
      badge: stats.pending_tasks || 0, badgeColor: 'red'
    },
    { key: 'users', icon: '👥', label: 'Students' },
  ];

  const activeSectionLabel = sideItems.find(s => s.key === activeSection)?.label || 'Admin';

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── Mobile top bar ──────────────────────────────────── */}
      <div className="admin-mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,var(--blue),var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>⚡</div>
          <span className="section-title">{activeSectionLabel}</span>
        </div>
        <button
          onClick={() => navigate('/admin/live')}
          style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
          Live
        </button>
      </div>

      <div className="admin-layout">
        {/* ── Desktop Sidebar ──────────────────────────────── */}
        <div className="admin-sidebar">
          {/* Brand bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 10px 16px', marginBottom: 8,
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,var(--blue),var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>⚡</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-display)' }}>Admin Panel</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>CloudNexa</div>
            </div>
          </div>

          <div className="sidebar-section-label">Navigation</div>
          {sideItems.map(item => (
            <button
              key={item.key}
              className={`sidebar-item ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => loadSection(item.key)}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
              {/* pending badge */}
              {item.key === 'submissions' && stats.pending_tasks > 0 && (
                <span style={{ marginLeft: 'auto', padding: '1px 7px', borderRadius: 'var(--radius-full)', background: 'var(--red-light)', color: 'var(--red)', fontSize: '0.7rem', fontWeight: 800 }}>
                  {stats.pending_tasks}
                </span>
              )}
              {item.key === 'approvals' && stats.pending_approvals > 0 && (
                <span style={{ marginLeft: 'auto', padding: '1px 7px', borderRadius: 'var(--radius-full)', background: 'var(--yellow-light)', color: 'var(--yellow)', fontSize: '0.7rem', fontWeight: 800 }}>
                  {stats.pending_approvals}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="admin-content">

          {/* Stats */}
          {activeSection === 'stats' && (
            <div>
              <h2 style={{ fontWeight: 700, marginBottom: '24px' }}>📊 Dashboard Overview</h2>
              <div className="admin-stats">
                {[
                  { label: 'Total Students', value: stats.total_users || 0, icon: '👥', color: 'var(--blue)' },
                  { label: 'Enrollments', value: stats.total_enrollments || 0, icon: '📚', color: 'var(--green)' },
                  { label: 'Pending Approvals', value: stats.pending_approvals || 0, icon: '⏳', color: 'var(--yellow)' },
                  { label: 'Pending Enrollments', value: stats.pending_enrollments || 0, icon: '🎓', color: 'var(--purple)' },
                  { label: 'Pending Tasks', value: stats.pending_tasks || 0, icon: '📝', color: 'var(--red)' },
                  { label: 'Published Courses', value: stats.total_courses || 0, icon: '🎓', color: 'var(--blue)' },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-card-icon">{s.icon}</div>
                    <div className="stat-card-num" style={{ color: s.color }}>{s.value}</div>
                    <div className="stat-card-label">{s.label}</div>
                  </div>
                ))}
              </div>

              <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>🗂️ Learning Tracks</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {tracks.map(t => (
                  <div key={t.id} style={{ background: 'var(--bg-card)', border: `1px solid ${t.color}44`, borderRadius: 'var(--radius)', padding: '20px' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{t.icon}</div>
                    <div style={{ fontWeight: 700 }}>{t.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.course_count} courses</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courses */}
          {activeSection === 'courses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontWeight: 700 }}>📚 Manage Courses</h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <select className="form-select" style={{ padding: '8px 16px', minWidth: '200px' }} value={filterTrack} onChange={e => setFilterTrack(e.target.value)}>
                    <option value="all">All Tracks</option>
                    {tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                  <button className="btn-primary" style={{ padding: '10px 20px', whiteSpace: 'nowrap' }} onClick={() => openModal('course')}>
                    + Add Course
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Track</th>
                      <th>Level</th>
                      <th>Price</th>
                      <th>Videos</th>
                      <th>Tasks</th>
                      <th>Enrollments</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.filter(c => filterTrack === 'all' || c.track_id === filterTrack).map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.title}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{c.track_title}</td>
                        <td><span className={`badge badge-${c.level}`}>{c.level}</span></td>
                        <td>
                          <span style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--accent-blue)' }} onClick={() => openModal('price', { id: c.id, title: c.title, price: c.price, is_free: c.is_free })}>
                            {c.is_free ? <span className="badge badge-free">FREE</span> : `$${c.price}`}
                          </span>
                        </td>
                        <td>{c.video_count}</td>
                        <td>{c.task_count}</td>
                        <td>{c.enrollment_count}</td>
                        <td>
                          <span className={`status ${c.is_published ? 'status-approved' : 'status-rejected'}`}>
                            {c.is_published ? 'Published' : 'Hidden'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)', fontSize: '0.8rem', fontWeight: 600 }}
                              onClick={() => navigate(`/admin/courses/${c.id}/manage`)}
                            >📂 Manage</button>
                            <button
                              style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: c.is_published ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: c.is_published ? 'var(--accent-red)' : 'var(--accent-green)', fontSize: '0.8rem' }}
                              onClick={() => handleToggleCourse(c.id)}
                            >{c.is_published ? 'Hide' : 'Show'}</button>
                            <button
                              style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', fontSize: '0.8rem', fontWeight: 600 }}
                              onClick={() => handleDeleteCourse(c.id)}
                            >🗑️ Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending Approvals */}
          {activeSection === 'approvals' && (
            <div>
              <h2 style={{ fontWeight: 700, marginBottom: '24px' }}>✅ Pending Account Approvals ({pendingUsers.length})</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Registered</th><th>Actions</th></tr></thead>
                  <tbody>
                    {pendingUsers.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No pending approvals</td></tr>
                    ) : (
                      pendingUsers.map(u => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 500 }}>{u.name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{u.phone}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', fontSize: '0.8rem', fontWeight: 600 }}
                                onClick={() => handleApproveUser(u.id)}
                              >✅ Approve</button>
                              <button
                                style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', fontSize: '0.8rem', fontWeight: 600 }}
                                onClick={() => handleRejectUser(u.id)}
                              >❌ Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <h2 style={{ fontWeight: 700, marginBottom: '24px', marginTop: '40px' }}>🎓 Pending Enrollment Approvals ({pendingEnrollments.length})</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Student</th><th>Email</th><th>Course</th><th>Enrolled Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {pendingEnrollments.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No pending enrollment approvals</td></tr>
                    ) : (
                      pendingEnrollments.map(e => (
                        <tr key={e.id}>
                          <td style={{ fontWeight: 500 }}>{e.user_name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{e.user_email}</td>
                          <td style={{ fontWeight: 500 }}>{e.course_title}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(e.enrolled_at).toLocaleDateString()}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', fontSize: '0.8rem', fontWeight: 600 }}
                                onClick={() => handleApproveEnrollment(e.id)}
                              >✅ Approve</button>
                              <button
                                style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', fontSize: '0.8rem', fontWeight: 600 }}
                                onClick={() => handleRejectEnrollment(e.id)}
                              >❌ Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Users */}
          {activeSection === 'users' && (
            <div>
              <h2 style={{ fontWeight: 700, marginBottom: '24px' }}>👥 Students ({users.length})</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 500 }}>{u.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{u.phone}</td>
                        <td><span className={`badge ${u.role === 'admin' ? 'badge-advanced' : 'badge-beginner'}`}>{u.role}</span></td>
                        <td>
                          <span className={`status ${u.is_approved ? 'status-approved' : 'status-rejected'}`}>
                            {u.is_approved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Submissions */}
          {activeSection === 'submissions' && (
            <div>
              <h2 style={{ fontWeight: 700, marginBottom: '24px' }}>📝 Task Submissions</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Student</th><th>Task</th><th>Course</th><th>Answer Preview</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {submissions.map(s => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{s.student_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.student_email}</div>
                        </td>
                        <td style={{ fontSize: '0.9rem' }}>{s.task_title}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{s.course_title}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {s.answer}
                        </td>
                        <td><span className={`status status-${s.status}`}>{s.status}</span></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(s.submitted_at).toLocaleDateString()}</td>
                        <td>
                          {s.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', fontSize: '0.8rem', fontWeight: 600 }}
                                onClick={() => handleReview(s.id, 'approved')}
                              >Approve</button>
                              <button
                                style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', fontSize: '0.8rem', fontWeight: 600 }}
                                onClick={() => handleReview(s.id, 'rejected')}
                              >Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {submissions.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No submissions yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Course */}
      {modal === 'course' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">📚 Add New Course</span>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleCreateCourse}>
              <div className="form-group"><label className="form-label">Course Title</label>
                <input className="form-input" placeholder="Docker & Containerization" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Slug (URL)</label>
                <input className="form-input" placeholder="docker-containerization" value={form.slug || ''} onChange={e => setForm({ ...form, slug: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Course description..." value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Course Thumbnail Image (Optional)</label>
                <input type="file" className="form-input" accept="image/*" onChange={e => setForm({ ...form, thumbnailFile: e.target.files[0] })} style={{ padding: '8px' }} /></div>
              <div className="form-group"><label className="form-label">Track</label>
                <select className="form-select" value={form.track_id || ''} onChange={e => setForm({ ...form, track_id: e.target.value })} required>
                  <option value="">Select track...</option>
                  {tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Level</label>
                  <select className="form-select" value={form.level || 'beginner'} onChange={e => setForm({ ...form, level: e.target.value })}>
                    <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
                  </select></div>
                <div className="form-group"><label className="form-label">Duration (hours)</label>
                  <input type="number" className="form-input" value={form.duration_hours || ''} onChange={e => setForm({ ...form, duration_hours: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Price ($)</label>
                  <input type="number" className="form-input" placeholder="49" value={form.price || ''} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Free Course?</label>
                  <select className="form-select" value={form.is_free || 'false'} onChange={e => setForm({ ...form, is_free: e.target.value === 'true' })}>
                    <option value="false">Paid</option><option value="true">Free</option>
                  </select></div>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Creating...' : 'Create Course'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Video */}
      {modal === 'video' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🎬 Add Video to: {form.course_title}</span>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleAddVideo}>
              <div className="form-group"><label className="form-label">Video Title</label>
                <input className="form-input" placeholder="Introduction to Docker" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Description</label>
                <textarea className="form-textarea" style={{ minHeight: '70px' }} placeholder="What will students learn in this video?" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Video URL (YouTube embed or direct URL)</label>
                <input className="form-input" placeholder="https://www.youtube.com/embed/VIDEO_ID" value={form.video_url || ''} onChange={e => setForm({ ...form, video_url: e.target.value })} required /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Duration (minutes)</label>
                  <input type="number" className="form-input" value={form.duration_minutes || ''} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Order</label>
                  <input type="number" className="form-input" value={form.order_num || ''} onChange={e => setForm({ ...form, order_num: e.target.value })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Preview (visible without enrollment)?</label>
                <select className="form-select" value={form.is_preview || 'false'} onChange={e => setForm({ ...form, is_preview: e.target.value === 'true' })}>
                  <option value="false">No</option><option value="true">Yes (Preview)</option>
                </select></div>
              <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Adding...' : 'Add Video'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Task */}
      {modal === 'task' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">✅ Add Task to: {form.course_title}</span>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleAddTask}>
              <div className="form-group"><label className="form-label">Task Title</label>
                <input className="form-input" placeholder="Deploy your first container" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Short Description</label>
                <input className="form-input" placeholder="Brief description of the task" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Full Instructions</label>
                <textarea className="form-textarea" placeholder="Step by step instructions..." value={form.instructions || ''} onChange={e => setForm({ ...form, instructions: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Expected Output</label>
                <textarea className="form-textarea" style={{ minHeight: '70px' }} placeholder="What should the student deliver?" value={form.expected_output || ''} onChange={e => setForm({ ...form, expected_output: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Difficulty</label>
                  <select className="form-select" value={form.difficulty || 'medium'} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                  </select></div>
                <div className="form-group"><label className="form-label">Order</label>
                  <input type="number" className="form-input" value={form.order_num || ''} onChange={e => setForm({ ...form, order_num: e.target.value })} /></div>
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Adding...' : 'Add Task'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Price */}
      {modal === 'price' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">💰 Update Price: {form.title}</span>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleUpdatePrice}>
              <div className="form-group"><label className="form-label">Price ($)</label>
                <input type="number" className="form-input" placeholder="49" value={form.price || ''} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Free Course?</label>
                <select className="form-select" value={form.is_free ? 'true' : 'false'} onChange={e => setForm({ ...form, is_free: e.target.value === 'true' })}>
                  <option value="false">Paid</option><option value="true">Free</option>
                </select></div>
              <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Updating...' : 'Update Price'}</button>
            </form>
          </div>
        </div>
      )}

      {/* ── Mobile Bottom Navigation ─────────────────────── */}
      <nav className="admin-bottom-nav" aria-label="Admin navigation">
        <div className="admin-bottom-nav-inner">
          {bottomNavItems.map(item => (
            <button
              key={item.key}
              className={`admin-nav-item ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => loadSection(item.key)}
              aria-label={item.label}
              aria-current={activeSection === item.key ? 'page' : undefined}
            >
              {item.badge > 0 && (
                <span className={`nav-badge ${item.badgeColor === 'yellow' ? 'yellow' : ''}`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label" style={{ color: activeSection === item.key ? 'var(--blue)' : undefined }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
