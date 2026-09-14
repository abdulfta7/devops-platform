import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/client';

const TRACK_ICONS = { devops: '⚙️', cloud: '☁️', sysadmin: '🖥️' };
const LEVEL_MAP = { beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced' };

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [activeTrack, setActiveTrack] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const t = new URLSearchParams(location.search).get('track');
    if (t) setActiveTrack(t);
    api.get('/tracks').then(r => setTracks(r.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = activeTrack === 'all' ? '/courses' : `/courses?track=${activeTrack}`;
    api.get(url).then(r => setCourses(r.data)).finally(() => setLoading(false));
  }, [activeTrack]);

  const filtered = courses.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const color = slug => tracks.find(t => t.slug === slug)?.color || 'var(--blue)';

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-inner">
          <h1>All Courses</h1>
          <p>Browse our full catalog of DevOps, Cloud, and SysAdmin courses.</p>
        </div>
      </div>

      <div className="section">
        {/* Filters row */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 32,
          flexWrap: 'wrap', alignItems: 'center',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              🔍
            </span>
            <input
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search courses…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Track tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ slug: 'all', title: 'All', icon: '📚' }, ...tracks.map(t => ({ ...t, slug: t.slug }))].map(t => (
              <button
                key={t.slug}
                onClick={() => setActiveTrack(t.slug)}
                style={{
                  padding: '7px 14px', borderRadius: 'var(--radius-full)',
                  fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  background: activeTrack === t.slug ? 'var(--blue)' : 'var(--bg-card)',
                  color: activeTrack === t.slug ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${activeTrack === t.slug ? 'var(--blue)' : 'var(--border)'}`,
                  transition: 'all var(--t-fast)',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {t.icon || '📚'} {t.title || 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            {filtered.length} {filtered.length === 1 ? 'course' : 'courses'} found
            {search && ` for "${search}"`}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No courses found</div>
            <div style={{ fontSize: '0.875rem' }}>Try a different search or track filter.</div>
          </div>
        ) : (
          <div className="courses-grid">
            {filtered.map(course => {
              const c = course;
              const trackColor = color(c.track_slug);
              const icon = TRACK_ICONS[c.track_slug] || '📚';
              return (
                <article
                  key={c.id}
                  className="course-card"
                  onClick={() => navigate(`/courses/${c.slug}`)}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/courses/${c.slug}`)}
                  role="button"
                  aria-label={c.title}
                >
                  <div className="course-thumbnail" style={{ background: `linear-gradient(135deg,${trackColor}18,${trackColor}30)` }} aria-hidden="true">
                    <span style={{ fontSize: 'clamp(2.2rem,5vw,3rem)', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.3))' }}>{icon}</span>
                  </div>
                  <div className="course-body">
                    <div className="course-badges">
                      <span className={`badge ${c.is_free ? 'badge-free' : 'badge-paid'}`}>{c.is_free ? 'Free' : `$${c.price}`}</span>
                      <span className={`badge badge-${LEVEL_MAP[c.level] || 'beginner'}`}>{c.level}</span>
                      {c.track_title && <span className="badge" style={{ background: `${trackColor}18`, color: trackColor, border: `1px solid ${trackColor}35` }}>{c.track_title}</span>}
                    </div>
                    <h3 className="course-title">{c.title}</h3>
                    <p className="course-desc">{c.description}</p>
                    <div className="course-footer">
                      <span className={`course-price ${c.is_free ? 'free' : ''}`}>{c.is_free ? '🆓 Free' : `$${c.price}`}</span>
                      <div className="course-meta-small">
                        <span>🎬 {c.video_count || 0}</span>
                        <span>✅ {c.task_count || 0}</span>
                        {c.duration_hours > 0 && <span>⏱ {c.duration_hours}h</span>}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
