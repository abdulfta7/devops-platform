import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

const TRACK_ICONS = { devops: '⚙️', cloud: '☁️', sysadmin: '🖥️' };

const FEATURES = [
  { icon: '🎬', title: 'Video Lessons', desc: 'High-quality recordings you can rewatch any time, at your own pace.' },
  { icon: '💪', title: 'Practical Tasks', desc: 'Real-world assignments reviewed by your instructor — not just MCQs.' },
  { icon: '🗺️', title: 'Structured Roadmaps', desc: 'A clear path for every track so you always know what comes next.' },
  { icon: '🔒', title: 'Lifetime Access', desc: 'Pay once and revisit the material — including all future updates.' },
];

export default function Home() {
  const [tracks, setTracks] = useState([]);
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/tracks').then(r => setTracks(r.data));
    api.get('/courses').then(r => setCourses(r.data.slice(0, 6)));
  }, []);

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <span>🚀</span> Launch Your Tech Career
          </div>

          <h1 id="hero-heading">
            Master{' '}
            <span className="gradient-text">DevOps, Cloud</span>
            <br />& System Admin
          </h1>

          <p>
            Hands-on courses with real-world tasks, structured roadmaps,
            and video tutorials — from beginner to professional.
          </p>

          <div className="hero-btns">
            <Link to="/tracks" className="btn-primary" style={{ fontSize: '0.95rem', padding: '11px 28px' }}>
              Explore Tracks
            </Link>
            <Link to="/courses" className="btn-secondary" style={{ fontSize: '0.95rem', padding: '11px 28px' }}>
              Browse Courses
            </Link>
          </div>

          {/* trusted-by strip */}
          <div style={{
            marginTop: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, flexWrap: 'wrap',
          }}>
            {['Linux', 'Docker', 'Kubernetes', 'AWS', 'Terraform', 'GitHub Actions', 'Ansible', 'Prometheus'].map(t => (
              <span key={t} style={{
                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border)',
                fontSize: '0.75rem', fontWeight: 600,
                color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.03)',
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="stats-bar" role="list">
        {[
          { num: '3', label: 'Learning Tracks' },
          { num: '40+', label: 'Courses' },
          { num: '150+', label: 'Video Lessons' },
          { num: '80+', label: 'Practical Tasks' },
        ].map(s => (
          <div key={s.label} className="stat" role="listitem">
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tracks ───────────────────────────────────────────── */}
      <section className="section" aria-labelledby="tracks-heading">
        <div className="section-header">
          <h2 id="tracks-heading">Choose Your Track</h2>
          <p>Pick a career path and follow a structured roadmap built around real job requirements.</p>
        </div>

        <div className="tracks-grid">
          {tracks.map(track => (
            <article
              key={track.id}
              className="track-card"
              style={{ '--track-color': track.color }}
              onClick={() => navigate(`/tracks/${track.slug}`)}
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(`/tracks/${track.slug}`)}
              role="button"
              aria-label={`${track.title} — view roadmap`}
            >
              <div className="track-icon" aria-hidden="true">{track.icon}</div>
              <h3 className="track-title">{track.title}</h3>
              <p className="track-desc">{track.description}</p>
              <div className="track-meta">
                <span className="track-count">📚 {track.course_count} courses</span>
                <span className="track-cta">View Roadmap →</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Featured Courses ──────────────────────────────────── */}
      <section
        style={{
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
        aria-labelledby="courses-heading"
      >
        <div className="section">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 'clamp(24px,4vw,40px)' }}>
            <div>
              <h2 id="courses-heading">Featured Courses</h2>
              <p style={{ marginTop: 6 }}>Start with our most popular courses — some are completely free.</p>
            </div>
            <Link to="/courses" className="btn-ghost" style={{ fontSize: '0.875rem', flexShrink: 0 }}>
              View all courses →
            </Link>
          </div>

          <div className="courses-grid">
            {courses.map(course => (
              <CourseCard key={course.id} course={course} onClick={() => navigate(`/courses/${course.slug}`)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="section" aria-labelledby="features-heading">
        <div className="section-header" style={{ textAlign: 'center' }}>
          <h2 id="features-heading">Why CloudNexa Academy?</h2>
          <p style={{ margin: '0 auto' }}>Everything you need to go from zero to job-ready.</p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
        }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(18px,3vw,24px)',
              transition: 'border-color var(--t-base), transform var(--t-base)',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: 12 }} aria-hidden="true">{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.95rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.1) 100%)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: 'clamp(40px,8vw,72px) 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ marginBottom: 12 }}>Ready to get started?</h2>
          <p style={{ marginBottom: 32 }}>
            Create a free account today and enroll in your first course within minutes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn-primary" style={{ padding: '12px 32px', fontSize: '0.95rem' }}>
              Create Free Account
            </Link>
            <Link to="/tracks" className="btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>
              Explore Tracks
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        padding: 'clamp(28px,5vw,48px) 24px',
      }}>
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 32,
            marginBottom: 40,
          }}>
            {/* Brand column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,var(--blue),var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>⚡</div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem' }}>
                  DevOps<span style={{ color: 'var(--blue)' }}>Academy</span>
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.6, maxWidth: 220 }}>
                Structured learning paths for DevOps, Cloud, and SysAdmin professionals.
              </p>
            </div>

            {/* Tracks */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Tracks</div>
              {[['DevOps Engineer', '/tracks/devops'], ['Cloud Engineer', '/tracks/cloud'], ['System Admin', '/tracks/sysadmin']].map(([label, to]) => (
                <Link key={to} to={to} style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8, transition: 'color var(--t-fast)' }}
                  onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
                >{label}</Link>
              ))}
            </div>

            {/* Learning */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Learning</div>
              {[['Courses', '/courses'], ['Live Courses', '/live'], ['Dashboard', '/dashboard']].map(([label, to]) => (
                <Link key={to} to={to} style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8, transition: 'color var(--t-fast)' }}
                  onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
                >{label}</Link>
              ))}
            </div>

            {/* Account */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Account</div>
              {[['Login', '/login'], ['Register', '/register']].map(([label, to]) => (
                <Link key={to} to={to} style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8, transition: 'color var(--t-fast)' }}
                  onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
                >{label}</Link>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: '0.8rem' }}>© {new Date().getFullYear()} CloudNexa Academy. All rights reserved.</p>
            <p style={{ fontSize: '0.8rem' }}>Built for engineers, by engineers. ⚡</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Reusable course card ─────────────────────────────────── */
function CourseCard({ course, onClick }) {
  const icon = TRACK_ICONS[course.track_slug] || '📚';
  const color = course.track_color || '#3b82f6';
  const level = course.level || 'beginner';

  return (
    <article
      className="course-card"
      onClick={onClick}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      role="button"
      aria-label={`${course.title} — ${course.is_free ? 'free' : '$' + course.price}`}
    >
      <div
        className="course-thumbnail"
        style={{ background: `linear-gradient(135deg, ${color}18, ${color}30)` }}
        aria-hidden="true"
      >
        <span style={{ fontSize: 'clamp(2.2rem,5vw,3rem)', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>{icon}</span>
      </div>

      <div className="course-body">
        <div className="course-badges">
          <span className={`badge ${course.is_free ? 'badge-free' : 'badge-paid'}`}>
            {course.is_free ? 'Free' : `$${course.price}`}
          </span>
          <span className={`badge badge-${level}`}>{level}</span>
          {course.track_title && (
            <span className="badge" style={{
              background: `${color}18`, color, border: `1px solid ${color}40`,
            }}>
              {course.track_title}
            </span>
          )}
        </div>

        <h3 className="course-title">{course.title}</h3>
        <p className="course-desc">{course.description}</p>

        <div className="course-footer">
          <span className={`course-price ${course.is_free ? 'free' : ''}`}>
            {course.is_free ? '🆓 Free' : `$${course.price}`}
          </span>
          <div className="course-meta-small">
            <span>🎬 {course.video_count || 0}</span>
            <span>✅ {course.task_count || 0}</span>
            {course.duration_hours > 0 && <span>⏱ {course.duration_hours}h</span>}
          </div>
        </div>
      </div>
    </article>
  );
}
