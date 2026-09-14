import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

// ── Level meta: color + icon per level number ──────────────────────────────
const LEVEL_META = {
  1: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: '🧱', label: 'Foundation' },
  2: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', icon: '🐳', label: 'Web Server & Containers' },
  3: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)', icon: '🔄', label: 'CI/CD Pipelines' },
  4: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: '☁️', label: 'Cloud — AWS' },
  5: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: '🏗️', label: 'Infrastructure as Code' },
  6: { color: '#06B6D4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.3)', icon: '⎈', label: 'Container Orchestration' },
  7: { color: '#F97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', icon: '🔀', label: 'GitOps' },
  8: { color: '#EC4899', bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.3)', icon: '📊', label: 'Monitoring & Observability' },
  9: { color: '#6366F1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)', icon: '🛡️', label: 'Security' },
  10: { color: '#14B8A6', bg: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.3)', icon: '🎯', label: 'SRE' },
  11: { color: '#FF6B35', bg: 'rgba(255,107,53,0.12)', border: 'rgba(255,107,53,0.4)', icon: '🔥', label: 'Real-World Projects' },
};

const levelColors = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
  '#06B6D4', '#F97316', '#EC4899', '#6366F1', '#14B8A6', '#FF6B35',
];

export default function Roadmap() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openLevel, setOpenLevel] = useState(null); // null = all open by default for DevOps
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/tracks/${slug}/roadmap`)
      .then(r => {
        setData(r.data);
        // default: first level expanded
        const first = r.data.steps?.[0]?.level_num ?? 1;
        setOpenLevel(first);
      })
      .catch(() => navigate('/tracks'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!data) return null;

  const { track, steps } = data;
  const isDevOps = slug === 'devops';

  // Group steps by level_num (fallback: all in level 1)
  const grouped = {};
  for (const step of steps) {
    const lvl = step.level_num ?? 1;
    if (!grouped[lvl]) grouped[lvl] = { title: step.level_title ?? `Level ${lvl}`, steps: [] };
    grouped[lvl].steps.push(step);
  }
  const levelNums = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  const totalFree = steps.filter(s => s.is_free).length;
  const totalPaid = steps.filter(s => !s.is_free && s.price > 0).length;
  const totalHours = steps.reduce((a, s) => a + (s.duration_hours || 0), 0);

  return (
    <div>
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div
        className="page-header"
        style={{ borderLeft: `4px solid ${track.color}`, background: 'linear-gradient(135deg, var(--bg-secondary), #1a1040)' }}
      >
        <div className="page-header-inner">
          <div className="breadcrumb">
            <Link to="/">Home</Link> / <Link to="/tracks">Tracks</Link> / {track.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>{track.icon}</span>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>
                {track.title} — Roadmap
              </h1>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>{track.description}</p>
            </div>
            <Link
              to={`/courses?track=${slug}`}
              className="btn-primary"
              style={{ padding: '11px 24px', whiteSpace: 'nowrap' }}
            >
              Browse Courses →
            </Link>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: '24px', marginTop: '20px', flexWrap: 'wrap' }}>
            {[
              { icon: '📐', val: levelNums.length, label: 'Levels' },
              { icon: '📚', val: steps.length, label: 'Topics' },
              { icon: '⏱', val: `${totalHours}h+`, label: 'Content' },
              { icon: '🆓', val: totalFree, label: 'Free Courses' },
              { icon: '💰', val: totalPaid, label: 'Paid Courses' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>{s.icon}</span>
                <span style={{ fontWeight: 700, color: track.color }}>{s.val}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="section" style={{ maxWidth: '1100px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isDevOps ? '1fr 280px' : '1fr', gap: '40px', alignItems: 'start' }}>

          {/* ── Roadmap levels ─────────────────────────────────────────────── */}
          <div>
            {levelNums.map((lvlNum, lvlIdx) => {
              const lvlData = grouped[lvlNum];
              const meta = LEVEL_META[lvlNum] ?? { color: levelColors[lvlIdx % levelColors.length], bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)', icon: '📌', label: lvlData.title };
              const isOpen = openLevel === lvlNum;
              const isProject = lvlNum === 11;

              return (
                <div key={lvlNum} style={{ marginBottom: '12px' }}>

                  {/* Arrow connector between levels */}
                  {lvlIdx > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 4px 28px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <div style={{ width: '2px', height: '16px', background: `linear-gradient(to bottom, ${levelColors[lvlIdx - 1]}, ${meta.color})` }} />
                        <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `8px solid ${meta.color}` }} />
                      </div>
                    </div>
                  )}

                  {/* Level header — clickable to expand/collapse */}
                  <div
                    onClick={() => setOpenLevel(isOpen ? null : lvlNum)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 20px',
                      background: isProject
                        ? 'linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,107,53,0.05))'
                        : meta.bg,
                      border: `1px solid ${meta.border}`,
                      borderRadius: isOpen ? '12px 12px 0 0' : '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      userSelect: 'none',
                    }}
                  >
                    {/* Level badge */}
                    {isProject ? (
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                        background: `linear-gradient(135deg, ${meta.color}, #ff9a5c)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.3rem', boxShadow: `0 4px 12px ${meta.color}44`,
                      }}>
                        {meta.icon}
                      </div>
                    ) : (
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                        background: `linear-gradient(135deg, ${meta.color}cc, ${meta.color}88)`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 4px 12px ${meta.color}33`,
                      }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'white', opacity: 0.9, lineHeight: 1 }}>LVL</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{lvlNum}</span>
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      {isProject ? (
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: meta.color }}>
                          🔥 REAL-WORLD PROJECTS
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: 700, fontSize: '1rem', color: meta.color }}>
                            LEVEL {lvlNum} — {lvlData.title.toUpperCase()}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {lvlData.steps.map(s => s.title).join(' · ')}
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '0.8rem', fontWeight: 600, padding: '3px 10px',
                        borderRadius: '999px', background: meta.bg, color: meta.color,
                        border: `1px solid ${meta.border}`,
                      }}>
                        {lvlData.steps.length} {lvlData.steps.length === 1 ? 'topic' : 'topics'}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '1rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Level body — topics grid */}
                  {isOpen && (
                    <div style={{
                      background: 'var(--bg-card)',
                      border: `1px solid ${meta.border}`,
                      borderTop: 'none',
                      borderRadius: '0 0 12px 12px',
                      padding: '16px',
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '10px',
                      }}>
                        {lvlData.steps.map((step, i) => (
                          <TopicCard
                            key={step.id}
                            step={step}
                            meta={meta}
                            index={i}
                            onClick={() => step.course_slug && navigate(`/courses/${step.course_slug}`)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Sidebar (DevOps only) ──────────────────────────────────────── */}
          {isDevOps && (
            <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Track summary */}
              <div style={{
                background: 'var(--bg-card)',
                border: `1px solid ${track.color}44`,
                borderRadius: 'var(--radius)', padding: '20px',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{track.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '1rem' }}>{track.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '16px', lineHeight: '1.5' }}>
                  {track.description}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                  {[
                    ['Levels', levelNums.length, 'var(--text-primary)'],
                    ['Total Topics', steps.length, 'var(--text-primary)'],
                    ['Total Hours', `${totalHours}h+`, 'var(--text-primary)'],
                    ['Free Courses', totalFree, 'var(--accent-green)'],
                    ['Paid Courses', totalPaid, 'var(--accent-yellow)'],
                  ].map(([label, val, col]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontWeight: 700, color: col }}>{val}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to={`/courses?track=${slug}`}
                  className="btn-primary"
                  style={{ display: 'block', textAlign: 'center', padding: '11px' }}
                >
                  Browse All Courses
                </Link>
              </div>

              {/* Level index */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '16px',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Jump to Level
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {levelNums.map(lvlNum => {
                    const meta = LEVEL_META[lvlNum] ?? { color: '#64748b', icon: '📌' };
                    const lvlData = grouped[lvlNum];
                    return (
                      <button
                        key={lvlNum}
                        onClick={() => setOpenLevel(lvlNum)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                          background: openLevel === lvlNum ? meta.bg : 'transparent',
                          border: openLevel === lvlNum ? `1px solid ${meta.border ?? meta.color + '44'}` : '1px solid transparent',
                          cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                        }}
                      >
                        <span style={{
                          width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0,
                          background: meta.bg, border: `1px solid ${meta.border ?? meta.color + '44'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: lvlNum === 11 ? '0.85rem' : '0.75rem', fontWeight: 800, color: meta.color,
                        }}>
                          {lvlNum === 11 ? '🔥' : lvlNum}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: openLevel === lvlNum ? meta.color : 'var(--text-secondary)', fontWeight: openLevel === lvlNum ? 600 : 400 }}>
                          {lvlNum === 11 ? 'Real-World Projects' : lvlData.title}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {lvlData.steps.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Topic card component ────────────────────────────────────────────────────
function TopicCard({ step, meta, index, onClick }) {
  const isFree = step.is_free === 1 || step.is_free === true;
  const isProject = step.step_type === 'project';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-primary)',
        border: `1px solid ${meta.border}`,
        borderRadius: '10px',
        padding: '14px',
        cursor: step.course_slug ? 'pointer' : 'default',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { if (step.course_slug) { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 16px ${meta.color}22`; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = meta.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: meta.color }} />

      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '5px', color: 'var(--text-primary)', marginTop: '4px' }}>
        {step.title}
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: '1.4', minHeight: '32px' }}>
        {step.description?.length > 60 ? step.description.slice(0, 60) + '…' : step.description}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
        {/* Price badge */}
        <span style={{
          padding: '3px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
          background: isFree ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
          color: isFree ? 'var(--accent-green)' : 'var(--accent-yellow)',
        }}>
          {isFree ? '🆓 Free' : `💰 $${step.price}`}
        </span>

        {/* Duration */}
        {step.duration_hours > 0 && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            ⏱ {step.duration_hours}h
          </span>
        )}
      </div>

      {/* Course level pill */}
      {step.course_level && (
        <div style={{ marginTop: '8px' }}>
          <span style={{
            padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600,
            background: meta.bg, color: meta.color,
          }}>
            {step.course_level}
          </span>
        </div>
      )}

      {/* View arrow */}
      {step.course_slug && (
        <div style={{
          position: 'absolute', bottom: '12px', right: '12px',
          fontSize: '0.75rem', color: meta.color, fontWeight: 700, opacity: 0.7,
        }}>
          →
        </div>
      )}
    </div>
  );
}
