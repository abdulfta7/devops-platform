import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  pending: { label: '⏳ Pending', bg: 'var(--yellow-light)', color: 'var(--yellow)' },
  approved: { label: '✅ Approved', bg: 'var(--green-light)', color: 'var(--green)' },
  rejected: { label: '❌ Rejected', bg: 'var(--red-light)', color: 'var(--red)' },
};
const TRACK_ICONS = { devops: '⚙️', cloud: '☁️', sysadmin: '🖥️' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [tab, setTab] = useState('courses');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([
      api.get('/payments/my-courses'),
      api.get('/tasks/my/submissions'),
    ]).then(([c, s]) => {
      setCourses(c.data);
      setSubmissions(s.data);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const approved = submissions.filter(s => s.status === 'approved').length;

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--blue), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1.3rem', color: '#fff',
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1>Welcome back, {user?.name?.split(' ')[0]}!</h1>
            <p style={{ marginTop: 2 }}>Track your progress and continue learning.</p>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 32 }}>
          {[
            { icon: '📚', num: courses.length, label: 'Enrolled', color: 'var(--blue)' },
            { icon: '✅', num: submissions.length, label: 'Submitted', color: 'var(--green)' },
            { icon: '🏆', num: approved, label: 'Approved Tasks', color: 'var(--yellow)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ fontSize: '1.5rem' }} aria-hidden="true">{s.icon}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${tab === 'courses' ? 'active' : ''}`} onClick={() => setTab('courses')}>
          📚 My Courses {courses.length > 0 && `(${courses.length})`}
        </button>
        <button className={`tab-btn ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
          ✅ My Submissions {submissions.length > 0 && `(${submissions.length})`}
        </button>
      </div>

      {/* Courses tab */}
      {tab === 'courses' && (
        courses.length === 0 ? (
          <Empty
            icon="📭"
            title="No courses yet"
            desc="Enroll in your first course to start learning."
            cta={{ to: '/courses', label: 'Browse Courses' }}
          />
        ) : (
          <div className="enrolled-grid">
            {courses.map(c => {
              const icon = TRACK_ICONS[c.track_title?.toLowerCase().includes('devops') ? 'devops' : c.track_title?.toLowerCase().includes('cloud') ? 'cloud' : 'sysadmin'] || '📚';
              return (
                <article
                  key={c.id}
                  className="enrolled-card"
                  onClick={() => navigate(`/courses/${c.slug}`)}
                  role="button" tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/courses/${c.slug}`)}
                  aria-label={c.title}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: `${c.track_color || 'var(--blue)'}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.3rem',
                    }} aria-hidden="true">
                      {icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                      {c.track_title && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.track_title}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>⏱ {c.duration_hours || 0}h</span>
                    <span style={{
                      padding: '2px 9px', borderRadius: 'var(--radius-full)',
                      background: c.payment_status === 'paid' ? 'var(--green-light)' : 'var(--blue-light)',
                      color: c.payment_status === 'paid' ? 'var(--green)' : 'var(--blue)',
                      fontWeight: 700, fontSize: '0.72rem',
                    }}>
                      {c.payment_status === 'paid' ? '💳 Paid' : '🆓 Free'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}

      {/* Submissions tab */}
      {tab === 'tasks' && (
        submissions.length === 0 ? (
          <Empty
            icon="📝"
            title="No submissions yet"
            desc="Complete tasks from your enrolled courses."
            cta={{ to: '/courses', label: 'Browse Courses' }}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Course</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => {
                  const sm = STATUS_STYLES[s.status] || STATUS_STYLES.pending;
                  return (
                    <tr
                      key={s.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/tasks/${s.task_id}`)}
                    >
                      <td style={{ fontWeight: 600 }}>{s.task_title}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{s.course_title}</td>
                      <td>
                        <span className={`badge badge-${s.difficulty === 'easy' ? 'beginner' : s.difficulty === 'hard' ? 'advanced' : 'intermediate'}`}>
                          {s.difficulty}
                        </span>
                      </td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, background: sm.bg, color: sm.color }}>
                          {sm.label}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {new Date(s.submitted_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function Empty({ icon, title, desc, cta }) {
  return (
    <div style={{ textAlign: 'center', padding: '72px 24px' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 14 }} aria-hidden="true">{icon}</div>
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 24 }}>{desc}</p>
      {cta && <Link to={cta.to} className="btn-primary" style={{ padding: '10px 24px' }}>{cta.label}</Link>}
    </div>
  );
}
