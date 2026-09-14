import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

/* ── tiny helpers ──────────────────────────────────────────── */
function Detail({ icon, text, bold }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      fontSize: '0.85rem', color: 'var(--text-secondary)',
    }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ fontWeight: bold ? 700 : 400, wordBreak: 'break-word' }}>{text}</span>
    </div>
  );
}

function LiveBadge({ open }) {
  return open ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 'var(--radius-full)',
      background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
      color: '#ef4444', fontSize: '0.7rem', fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'livepulse 1.5s ease-in-out infinite' }} />
      مفتوح
    </span>
  ) : (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 'var(--radius-full)',
      background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.2)',
      color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600,
    }}>
      🔒 مغلق
    </span>
  );
}

/* ── main page ─────────────────────────────────────────────── */
export default function LiveCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/live').then(r => setCourses(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────── */}
      <div style={{
        background:
          'radial-gradient(ellipse 70% 60% at 20% 30%, rgba(239,68,68,0.1) 0%, transparent 60%),' +
          'linear-gradient(180deg, var(--bg-base) 0%, var(--bg-secondary) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: 'clamp(32px,6vw,60px) clamp(16px,4vw,24px)',
      }}>
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto' }}>
          {/* Live indicator */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 14px', borderRadius: 'var(--radius-full)',
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            marginBottom: 16,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'livepulse 1.5s ease-in-out infinite' }} />
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Live</span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 8, fontSize: 'clamp(1.5rem,4vw,2.2rem)' }}>
            كورسات مباشرة
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 520, fontSize: 'clamp(0.875rem,2vw,1rem)' }}>
            كورسات مباشرة مع المدرب — سجّل اهتمامك وهنتواصل معاك بكل التفاصيل
          </p>
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────── */}
      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: 'clamp(28px,5vw,56px) clamp(16px,4vw,24px)' }}>
        {courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'clamp(48px,10vw,96px) 24px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 'clamp(2rem,8vw,3.5rem)', marginBottom: 16 }}>📡</div>
            <div style={{ fontWeight: 700, fontSize: 'clamp(1rem,2.5vw,1.15rem)', marginBottom: 8 }}>
              مفيش كورسات live دلوقتي
            </div>
            <div style={{ fontSize: '0.875rem' }}>تابعنا عشان تعرف لما هيبدأ الكورس الجديد</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: 'clamp(14px,3vw,24px)',
          }}>
            {courses.map(c => {
              const seatsLeft = c.seats > 0 ? c.seats - (c.reg_count || 0) : null;
              const isClosed = !c.is_open || (seatsLeft !== null && seatsLeft <= 0);
              return (
                <CourseCard
                  key={c.id}
                  course={c}
                  seatsLeft={seatsLeft}
                  isClosed={isClosed}
                  onClick={() => navigate(`/live/${c.slug}`)}
                />
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes livepulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }`}</style>
    </div>
  );
}

/* ── Course card ───────────────────────────────────────────── */
function CourseCard({ course: c, seatsLeft, isClosed, onClick }) {
  return (
    <article
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform var(--t-base), border-color var(--t-base), box-shadow var(--t-base)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = isClosed ? 'var(--border-light)' : '#f59e0b';
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = isClosed ? 'var(--shadow-sm)' : '0 8px 28px rgba(245,158,11,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: isClosed ? 'var(--border)' : 'linear-gradient(90deg,#f59e0b,#ef4444)' }} />

      {/* Card header */}
      <div style={{
        padding: 'clamp(16px,3vw,24px)',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02))',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Status + seats row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
          <LiveBadge open={!isClosed} />
          {seatsLeft !== null && seatsLeft > 0 && seatsLeft <= 10 && (
            <span style={{ fontSize: '0.72rem', color: seatsLeft <= 3 ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>
              💺 {seatsLeft} متبقي
            </span>
          )}
        </div>

        {/* Emoji + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 'clamp(2rem,5vw,2.5rem)', lineHeight: 1, flexShrink: 0 }}>{c.cover_emoji}</span>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              fontWeight: 700, fontSize: 'clamp(0.95rem,2vw,1.05rem)',
              lineHeight: 1.35, marginBottom: 6,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {c.title}
            </h3>
            {c.description && (
              <p style={{
                fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                margin: 0,
              }}>
                {c.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: 'clamp(14px,3vw,20px)', flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
          {c.instructor && <Detail icon="👨‍💻" text={c.instructor} />}
          {c.start_date && <Detail icon="📅" text={c.start_date} />}
          {c.schedule && <Detail icon="🕐" text={c.schedule} />}
          {c.duration && <Detail icon="⏱" text={c.duration} />}
        </div>

        {/* Price + CTA */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            {c.price > 0
              ? <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: 'clamp(1rem,2.5vw,1.15rem)' }}>
                {c.price} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.currency}</span>
              </span>
              : <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: '0.95rem' }}>🆓 مجاني</span>
            }
            {seatsLeft !== null && seatsLeft <= 0 && (
              <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 2, fontWeight: 600 }}>المقاعد اكتملت</div>
            )}
          </div>

          <div style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            background: isClosed ? 'var(--bg-secondary)' : 'rgba(245,158,11,0.12)',
            border: `1px solid ${isClosed ? 'var(--border)' : 'rgba(245,158,11,0.3)'}`,
            color: isClosed ? 'var(--text-muted)' : '#f59e0b',
            fontWeight: 700, fontSize: '0.82rem', flexShrink: 0,
          }}>
            {isClosed ? 'مغلق' : 'سجّل →'}
          </div>
        </div>

        {/* Social proof */}
        {c.reg_count > 0 && (
          <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>👥</span>
            <span>{c.reg_count} شخص سجّل اهتمامه</span>
          </div>
        )}
      </div>
    </article>
  );
}
