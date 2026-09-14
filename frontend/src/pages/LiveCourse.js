import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';

const EXPERIENCE_OPTIONS = [
  'مبتدئ — مفيش خبرة سابقة',
  'أعرف أساسيات Linux/Networking',
  'عندي خبرة بـ Docker أو CI/CD',
  'عندي خبرة كاملة في DevOps',
];

/* ── stat pill ─────────────────────────────────────────────── */
function StatPill({ icon, text, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      fontSize: 'clamp(0.8rem,2vw,0.9rem)',
      color: color || 'var(--text-secondary)',
    }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ fontWeight: color ? 700 : 400, wordBreak: 'break-word' }}>{text}</span>
    </div>
  );
}

export default function LiveCourse() {
  const { slug } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('info'); // 'info' | 'form' | 'done'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', age: '', experience: '', note: '' });

  useEffect(() => {
    api.get(`/live/${slug}`)
      .then(r => setCourse(r.data))
      .catch(() => setCourse(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('الاسم والإيميل والموبايل مطلوبين'); return;
    }
    setSubmitting(true);
    try {
      await api.post(`/live/${slug}/register`, form);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ، حاول تاني.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  if (!course) return (
    <div style={{ textAlign: 'center', padding: 'clamp(48px,10vw,96px) 24px' }}>
      <div style={{ fontSize: 'clamp(2rem,8vw,3.5rem)', marginBottom: 12 }}>😕</div>
      <h2 style={{ marginBottom: 10 }}>الكورس ده مش موجود</h2>
      <Link to="/live" className="btn-secondary" style={{ display: 'inline-flex', padding: '10px 20px' }}>
        ← الكورسات المباشرة
      </Link>
    </div>
  );

  const seatsLeft = course.seats > 0 ? course.seats - (course.reg_count || 0) : null;
  const isFull = seatsLeft !== null && seatsLeft <= 0;
  const isClosed = !course.is_open || isFull;

  const TABS = [
    { k: 'info', label: '📋 التفاصيل' },
    ...(!isClosed ? [{ k: 'form', label: '📝 سجّل الآن' }] : []),
  ];

  const stats = [
    course.instructor && { icon: '👨‍💻', label: course.instructor },
    course.start_date && { icon: '📅', label: course.start_date },
    course.schedule && { icon: '🕐', label: course.schedule },
    course.duration && { icon: '⏱', label: course.duration },
    course.price > 0 && { icon: '💰', label: `${course.price} ${course.currency}` },
    course.price === 0 && { icon: '🆓', label: 'مجاني' },
    seatsLeft !== null && {
      icon: '💺',
      label: seatsLeft > 0 ? `${seatsLeft} مقعد متبقي` : 'المقاعد اكتملت',
      color: seatsLeft <= 5 ? '#ef4444' : undefined,
    },
  ].filter(Boolean);

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,0.14) 0%, transparent 65%),' +
          'linear-gradient(180deg, var(--bg-base) 0%, var(--bg-primary) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: 'clamp(28px,5vw,56px) clamp(16px,4vw,24px) 0',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* subtle grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.03) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative' }}>

          {/* Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'clamp(14px,3vw,20px)', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 'var(--radius-full)',
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
              color: '#ef4444', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.05em',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'lp 1.5s ease-in-out infinite' }} />
              LIVE COURSE
            </span>
            {isClosed && (
              <span style={{
                padding: '5px 14px', borderRadius: 'var(--radius-full)',
                background: 'rgba(100,116,139,0.15)', color: 'var(--text-muted)',
                fontWeight: 600, fontSize: '0.78rem',
              }}>
                🔒 التسجيل مغلق
              </span>
            )}
          </div>

          {/* Title row */}
          <div style={{ display: 'flex', gap: 'clamp(12px,3vw,20px)', alignItems: 'flex-start', marginBottom: 'clamp(16px,3vw,24px)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'clamp(2.5rem,8vw,4rem)', lineHeight: 1, flexShrink: 0 }}>{course.cover_emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 'clamp(1.4rem,4vw,2.2rem)', fontWeight: 800, marginBottom: 8, lineHeight: 1.2, fontFamily: 'var(--font-display)' }}>
                {course.title}
              </h1>
              {course.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.875rem,2vw,1rem)', maxWidth: 560, lineHeight: 1.75, marginBottom: 0 }}>
                  {course.description}
                </p>
              )}
            </div>
          </div>

          {/* Stats strip */}
          {stats.length > 0 && (
            <div style={{
              display: 'flex', flexWrap: 'wrap',
              gap: 'clamp(10px,2.5vw,20px)',
              marginBottom: 'clamp(20px,4vw,32px)',
              padding: 'clamp(12px,2vw,16px) clamp(14px,3vw,20px)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}>
              {stats.map((s, i) => <StatPill key={i} icon={s.icon} text={s.label} color={s.color} />)}
            </div>
          )}

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 2,
            borderBottom: '1px solid var(--border)',
            overflowX: 'auto', scrollbarWidth: 'none',
          }}>
            {TABS.map(t => (
              <button key={t.k} onClick={() => setStep(t.k)} style={{
                padding: 'clamp(8px,2vw,10px) clamp(14px,3vw,22px)',
                background: 'none', border: 'none',
                borderBottom: `2px solid ${step === t.k ? '#f59e0b' : 'transparent'}`,
                color: step === t.k ? '#f59e0b' : 'var(--text-secondary)',
                fontWeight: step === t.k ? 700 : 400,
                fontSize: 'clamp(0.82rem,2vw,0.9rem)',
                cursor: 'pointer', marginBottom: -1,
                transition: 'all 0.15s', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-ui)',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(24px,5vw,48px) clamp(16px,4vw,24px)' }}>

        {/* ── INFO TAB ────────────────────────────────────────── */}
        {step === 'info' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0, 280px)',
            gap: 'clamp(20px,4vw,36px)',
            alignItems: 'start',
          }}
            /* stack on mobile */
            className="live-info-grid"
          >
            {/* Details */}
            <div>
              {course.details ? (
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.9, fontSize: 'clamp(0.875rem,2vw,0.95rem)', whiteSpace: 'pre-line' }}>
                  {course.details}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center', padding: 'clamp(32px,6vw,56px) 24px',
                  border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)',
                  color: 'var(--text-muted)',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 10 }}>📋</div>
                  <div>لا توجد تفاصيل إضافية بعد.</div>
                </div>
              )}
            </div>

            {/* Sidebar CTA */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(245,158,11,0.35)',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(18px,3vw,24px)',
              position: 'sticky', top: 80,
            }}>
              <div style={{ fontSize: 'clamp(1.6rem,5vw,2rem)', marginBottom: 8 }}>{course.cover_emoji}</div>
              <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 'clamp(0.9rem,2vw,1rem)', lineHeight: 1.4 }}>{course.title}</div>

              {course.price > 0 && (
                <div style={{ fontSize: 'clamp(1.4rem,4vw,1.8rem)', fontWeight: 800, color: '#f59e0b', margin: '10px 0 4px' }}>
                  {course.price} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{course.currency}</span>
                </div>
              )}
              {course.price === 0 && (
                <div style={{ fontSize: 'clamp(1.1rem,3vw,1.4rem)', fontWeight: 800, color: 'var(--green)', margin: '10px 0 4px' }}>مجاني 🆓</div>
              )}

              {seatsLeft !== null && (
                <div style={{ fontSize: '0.8rem', marginBottom: 14, color: seatsLeft <= 5 ? '#ef4444' : 'var(--text-muted)', fontWeight: seatsLeft <= 5 ? 700 : 400 }}>
                  {seatsLeft > 0
                    ? `${seatsLeft} مقعد من ${course.seats}`
                    : '🔴 المقاعد اكتملت'}
                </div>
              )}

              {!isClosed ? (
                <button
                  className="btn-primary"
                  onClick={() => setStep('form')}
                  style={{ width: '100%', padding: 'clamp(11px,2vw,13px)', fontSize: 'clamp(0.9rem,2vw,1rem)', background: '#f59e0b', color: '#000', fontWeight: 800, borderRadius: 'var(--radius)' }}
                >
                  📝 سجّل اهتمامك
                </button>
              ) : (
                <div style={{ padding: 'clamp(11px,2vw,13px)', borderRadius: 'var(--radius)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>
                  🔒 التسجيل مغلق
                </div>
              )}

              {course.reg_count > 0 && (
                <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  👥 {course.reg_count} شخص سجّل اهتمامه
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FORM TAB ─────────────────────────────────────────── */}
        {step === 'form' && !isClosed && (
          <div style={{ maxWidth: 520, width: '100%' }}>
            <div style={{ marginBottom: 'clamp(20px,4vw,32px)' }}>
              <h2 style={{ fontWeight: 800, marginBottom: 6, fontSize: 'clamp(1.1rem,3vw,1.35rem)', fontFamily: 'var(--font-display)' }}>
                📝 سجّل اهتمامك
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.82rem,2vw,0.9rem)' }}>
                ادخل بياناتك وهنتواصل معاك على طول بتفاصيل الكورس.
              </p>
            </div>

            {error && (
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                background: 'var(--red-light)', border: '1px solid var(--red-border)',
                color: 'var(--red)', marginBottom: 20, fontSize: '0.875rem',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <span>❌</span><span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px,2.5vw,16px)' }}>

              {/* Name + Phone row on tablet+ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,200px),1fr))', gap: 'clamp(12px,2.5vw,16px)' }}>
                <div className="form-group">
                  <label className="form-label">الاسم الكامل *</label>
                  <input className="form-input" placeholder="Ahmed Mohamed" value={form.name} onChange={set('name')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الموبايل (WhatsApp) *</label>
                  <input type="tel" className="form-input" placeholder="01xxxxxxxxx" value={form.phone} onChange={set('phone')} required />
                </div>
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">الإيميل *</label>
                <input type="email" className="form-input" placeholder="ahmed@example.com" value={form.email} onChange={set('email')} required />
              </div>

              {/* Age + Experience row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,180px),1fr))', gap: 'clamp(12px,2.5vw,16px)' }}>
                <div className="form-group">
                  <label className="form-label">السن</label>
                  <input type="number" className="form-input" placeholder="22" min="10" max="60" value={form.age} onChange={set('age')} />
                </div>
                <div className="form-group">
                  <label className="form-label">مستواك الحالي</label>
                  <select className="form-select" value={form.experience} onChange={set('experience')}>
                    <option value="">اختار مستواك...</option>
                    {EXPERIENCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Note */}
              <div className="form-group">
                <label className="form-label">ملاحظة <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(اختياري)</span></label>
                <textarea className="form-textarea" style={{ minHeight: 80 }} placeholder="أي سؤال أو تعليق..." value={form.note} onChange={set('note')} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1, minWidth: 140,
                    padding: 'clamp(11px,2vw,13px)',
                    borderRadius: 'var(--radius)',
                    background: submitting ? 'var(--bg-secondary)' : '#f59e0b',
                    color: submitting ? 'var(--text-muted)' : '#000',
                    fontWeight: 800, fontSize: 'clamp(0.9rem,2vw,1rem)',
                    border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s', fontFamily: 'var(--font-ui)',
                  }}
                >
                  {submitting ? '⏳ جاري التسجيل...' : '🚀 سجّل الآن'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('info')}
                  className="btn-secondary"
                  style={{ padding: 'clamp(11px,2vw,13px) clamp(16px,3vw,22px)', fontSize: 'clamp(0.875rem,2vw,0.9rem)' }}
                >
                  ← رجوع
                </button>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
                🔒 بياناتك محفوظة ومش هتتشارك مع أي جهة خارجية.
              </p>
            </form>
          </div>
        )}

        {/* ── SUCCESS ──────────────────────────────────────────── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: 'clamp(32px,8vw,72px) 16px', maxWidth: 480, margin: '0 auto' }}>
            <div style={{ fontSize: 'clamp(3rem,10vw,4.5rem)', marginBottom: 'clamp(14px,3vw,20px)', lineHeight: 1 }}>🎉</div>

            <h2 style={{ fontWeight: 800, marginBottom: 10, fontSize: 'clamp(1.2rem,3.5vw,1.6rem)', fontFamily: 'var(--font-display)' }}>
              تم التسجيل بنجاح!
            </h2>

            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'clamp(16px,3vw,24px)',
              marginBottom: 'clamp(20px,4vw,32px)',
              textAlign: 'right',
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12, textAlign: 'center' }}>تفاصيل تسجيلك</div>
              {[
                { label: 'الاسم', value: form.name },
                { label: 'الموبايل', value: form.phone },
                { label: 'الإيميل', value: form.email },
                { label: 'الكورس', value: course.title, color: '#f59e0b' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{r.label}</span>
                  <span style={{ fontWeight: 600, color: r.color || 'var(--text-primary)', wordBreak: 'break-all' }}>{r.value}</span>
                </div>
              ))}
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.82rem,2vw,0.9rem)', lineHeight: 1.7, marginBottom: 'clamp(20px,4vw,28px)' }}>
              هنتواصل معاك قريباً بتفاصيل الكورس والموعد.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/" className="btn-secondary" style={{ padding: '10px 22px', fontSize: '0.875rem' }}>← الرئيسية</Link>
              <Link to="/live" className="btn-secondary" style={{ padding: '10px 22px', fontSize: '0.875rem' }}>كورسات أخرى</Link>
              <Link to="/courses" className="btn-primary" style={{ padding: '10px 22px', fontSize: '0.875rem' }}>تصفح الكورسات</Link>
            </div>
          </div>
        )}
      </div>

      {/* ── styles ───────────────────────────────────────────── */}
      <style>{`
        @keyframes lp { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.72)} }

        /* Stack info grid on mobile/tablet */
        @media (max-width: 640px) {
          .live-info-grid {
            grid-template-columns: 1fr !important;
          }
          .live-info-grid > :last-child {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}
