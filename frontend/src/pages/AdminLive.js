import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

// ── small helpers ─────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: wide ? 700 : 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const STATUS_META = {
  pending:   { label: '⏳ Pending',   bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  confirmed: { label: '✅ Confirmed', bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  cancelled: { label: '❌ Cancelled', bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
};

const EMOJIS = ['🎓','⚙️','☁️','🐳','🔄','🛡️','📊','🎯','🚀','💻','🔥','🧱','📡','⎈','🌐'];

const EMPTY_FORM = {
  title: '', slug: '', description: '', details: '',
  instructor: '', price: 0, currency: 'EGP',
  start_date: '', schedule: '', duration: '', seats: 0,
  cover_emoji: '🎓', is_open: true, is_published: true,
};

// ── main component ────────────────────────────────────────────────────────
export default function AdminLive() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [courses,   setCourses]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState(null);
  const [courseModal, setCourseModal] = useState(null);  // null | 'add' | {course}
  const [regsModal,   setRegsModal]   = useState(null);  // null | {course}
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const load = useCallback(async () => {
    try {
      const r = await api.get('/live/admin/all');
      setCourses(r.data);
    } catch { showToast('Failed to load', 'error'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    load();
  }, [user, load]);

  const openAdd  = () => { setForm(EMPTY_FORM); setCourseModal('add'); };
  const openEdit = (c) => {
    setForm({
      title: c.title, slug: c.slug, description: c.description || '',
      details: c.details || '', instructor: c.instructor || '',
      price: c.price, currency: c.currency || 'EGP',
      start_date: c.start_date || '', schedule: c.schedule || '',
      duration: c.duration || '', seats: c.seats || 0,
      cover_emoji: c.cover_emoji || '🎓',
      is_open: c.is_open === 1, is_published: c.is_published === 1,
    });
    setCourseModal(c);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.slug) { showToast('Title and slug required', 'error'); return; }
    setSaving(true);
    try {
      if (courseModal === 'add') {
        await api.post('/live/admin/create', form);
        showToast('Live course created! ✅');
      } else {
        await api.put(`/live/admin/${courseModal.id}`, form);
        showToast('Course updated! ✅');
      }
      setCourseModal(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course and all registrations?')) return;
    await api.delete(`/live/admin/${id}`);
    showToast('Deleted');
    load();
  };

  const handleToggleOpen = async (c) => {
    await api.put(`/live/admin/${c.id}`, { ...c, is_open: !c.is_open, is_published: !!c.is_published });
    showToast(c.is_open ? 'Registration closed' : 'Registration opened');
    load();
  };

  const set    = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setNum = k => e => setForm(f => ({ ...f, [k]: Number(e.target.value) }));
  const setBool= k => e => setForm(f => ({ ...f, [k]: e.target.value === 'true' }));

  const autoSlug = (title) => title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1100, margin: '0 auto' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '4px' }}>
            📡 Live Courses
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            أنشئ وأدر كورسات live وشوف المسجلين
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{ padding: '10px 22px', borderRadius: 'var(--radius-sm)', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}>
          + كورس Live جديد
        </button>
      </div>

      {/* course cards */}
      {courses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📡</div>
          <div style={{ fontWeight: 600 }}>مفيش كورسات live بعد</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>اضغط "+ كورس Live جديد" لتبدأ</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {courses.map(c => {
            const seatsLeft = c.seats > 0 ? c.seats - (c.reg_count || 0) : null;
            return (
              <div key={c.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '20px 24px',
                display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap',
              }}>
                {/* emoji */}
                <div style={{ fontSize: '2.4rem', flexShrink: 0, lineHeight: 1 }}>{c.cover_emoji}</div>

                {/* info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{c.title}</span>
                    {c.is_open
                      ? <Pill color="#ef4444">🔴 مفتوح</Pill>
                      : <Pill color="#64748b">🔒 مغلق</Pill>}
                    {!c.is_published && <Pill color="#64748b">Hidden</Pill>}
                  </div>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    {c.start_date  && <span>📅 {c.start_date}</span>}
                    {c.schedule    && <span>🕐 {c.schedule}</span>}
                    {c.instructor  && <span>👨‍💻 {c.instructor}</span>}
                    {c.price > 0   ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>💰 {c.price} {c.currency}</span>
                                   : <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>🆓 مجاني</span>}
                  </div>
                </div>

                {/* stats */}
                <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
                  <StatBox
                    label="مسجلين"
                    value={c.reg_count || 0}
                    color="var(--accent-blue)"
                    onClick={() => setRegsModal(c)}
                    clickable
                  />
                  <StatBox
                    label="Confirmed"
                    value={c.confirmed_count || 0}
                    color="var(--accent-green)"
                  />
                  {seatsLeft !== null && (
                    <StatBox
                      label="متبقي"
                      value={seatsLeft}
                      color={seatsLeft <= 5 ? '#ef4444' : 'var(--text-secondary)'}
                    />
                  )}
                </div>

                {/* actions */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <ABtn bg="rgba(59,130,246,0.12)" color="var(--accent-blue)"   onClick={() => setRegsModal(c)}>👥 قائمة</ABtn>
                  <ABtn bg="rgba(245,158,11,0.12)"  color="#f59e0b"              onClick={() => openEdit(c)}>✏️ تعديل</ABtn>
                  <ABtn
                    bg={c.is_open ? 'rgba(100,116,139,0.1)' : 'rgba(16,185,129,0.1)'}
                    color={c.is_open ? 'var(--text-muted)' : 'var(--accent-green)'}
                    onClick={() => handleToggleOpen(c)}
                  >{c.is_open ? '🔒 أغلق' : '🔓 افتح'}</ABtn>
                  <a
                    href={`/live/${c.slug}`} target="_blank" rel="noreferrer"
                    style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.8rem', textDecoration: 'none' }}
                  >↗</a>
                  <ABtn bg="rgba(239,68,68,0.1)" color="var(--accent-red)" onClick={() => handleDelete(c.id)}>🗑</ABtn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Course form modal ─────────────────────────────────────────────── */}
      {courseModal && (
        <Modal title={courseModal === 'add' ? '📡 كورس Live جديد' : `✏️ تعديل: ${courseModal.title}`} onClose={() => setCourseModal(null)} wide>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* emoji picker */}
            <div className="form-group">
              <label className="form-label">أيقونة الكورس</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {EMOJIS.map(em => (
                  <button key={em} type="button"
                    onClick={() => setForm(f => ({ ...f, cover_emoji: em }))}
                    style={{
                      width: 38, height: 38, borderRadius: '8px', fontSize: '1.3rem',
                      cursor: 'pointer', border: `2px solid ${form.cover_emoji === em ? '#f59e0b' : 'var(--border)'}`,
                      background: form.cover_emoji === em ? 'rgba(245,158,11,0.1)' : 'var(--bg-primary)',
                    }}>{em}</button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">عنوان الكورس *</label>
                <input className="form-input" placeholder="DevOps Engineer Bootcamp" value={form.title}
                  onChange={e => { set('title')(e); if (courseModal === 'add') setForm(f => ({ ...f, title: e.target.value, slug: autoSlug(e.target.value) })); }} required />
              </div>
              <div className="form-group">
                <label className="form-label">Slug (URL) *</label>
                <input className="form-input" placeholder="devops-bootcamp" value={form.slug} onChange={set('slug')} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">وصف مختصر</label>
              <input className="form-input" placeholder="وصف قصير يظهر في الكارد" value={form.description} onChange={set('description')} />
            </div>

            <div className="form-group">
              <label className="form-label">تفاصيل الكورس الكاملة</label>
              <textarea className="form-textarea" style={{ minHeight: 120 }}
                placeholder={"هتتعلم إيه؟\n- Docker و Kubernetes\n- CI/CD مع GitHub Actions\n- AWS من الصفر..."}
                value={form.details} onChange={set('details')} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">اسم المدرب</label>
                <input className="form-input" placeholder="Ahmed Mohamed" value={form.instructor} onChange={set('instructor')} />
              </div>
              <div className="form-group">
                <label className="form-label">تاريخ البداية</label>
                <input className="form-input" placeholder="1 فبراير 2025" value={form.start_date} onChange={set('start_date')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">المواعيد</label>
                <input className="form-input" placeholder="السبت والاثنين 9م" value={form.schedule} onChange={set('schedule')} />
              </div>
              <div className="form-group">
                <label className="form-label">مدة الكورس</label>
                <input className="form-input" placeholder="8 أسابيع" value={form.duration} onChange={set('duration')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">السعر</label>
                <input type="number" className="form-input" min="0" placeholder="2500" value={form.price} onChange={setNum('price')} />
              </div>
              <div className="form-group">
                <label className="form-label">العملة</label>
                <select className="form-select" value={form.currency} onChange={set('currency')}>
                  <option value="EGP">EGP 🇪🇬</option>
                  <option value="USD">USD 🇺🇸</option>
                  <option value="SAR">SAR 🇸🇦</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">عدد المقاعد (0 = غير محدود)</label>
                <input type="number" className="form-input" min="0" placeholder="20" value={form.seats} onChange={setNum('seats')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">التسجيل</label>
                <select className="form-select" value={form.is_open.toString()} onChange={setBool('is_open')}>
                  <option value="true">🔓 مفتوح</option>
                  <option value="false">🔒 مغلق</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">الظهور</label>
                <select className="form-select" value={form.is_published.toString()} onChange={setBool('is_published')}>
                  <option value="true">👁 ظاهر</option>
                  <option value="false">🙈 مخفي</option>
                </select>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={saving}>
              {saving ? 'جاري الحفظ...' : courseModal === 'add' ? '🚀 إنشاء الكورس' : '💾 حفظ التعديلات'}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Registrations modal ───────────────────────────────────────────── */}
      {regsModal && (
        <RegsModal
          course={regsModal}
          onClose={() => setRegsModal(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ── Registrations modal ───────────────────────────────────────────────────
function RegsModal({ course, onClose, showToast }) {
  const [regs,    setRegs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all'); // all | pending | confirmed | cancelled
  const [search,  setSearch]  = useState('');

  const load = useCallback(async () => {
    const r = await api.get(`/live/admin/${course.id}/registrations`);
    setRegs(r.data.registrations);
    setLoading(false);
  }, [course.id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    await api.put(`/live/admin/registrations/${id}`, { status });
    showToast(status === 'confirmed' ? '✅ Confirmed!' : status === 'cancelled' ? '❌ Cancelled' : 'Updated');
    load();
  };

  const deleteReg = async (id) => {
    if (!window.confirm('Delete this registration?')) return;
    await api.delete(`/live/admin/registrations/${id}`);
    showToast('Deleted');
    load();
  };

  const exportCSV = () => {
    window.open(`/api/live/admin/${course.id}/export`, '_blank');
  };

  const filtered = regs.filter(r => {
    const matchFilter = filter === 'all' || r.status === filter;
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.email.includes(search) || r.phone.includes(search);
    return matchFilter && matchSearch;
  });

  const counts = {
    all:       regs.length,
    pending:   regs.filter(r => r.status === 'pending').length,
    confirmed: regs.filter(r => r.status === 'confirmed').length,
    cancelled: regs.filter(r => r.status === 'cancelled').length,
  };

  return (
    <Modal title={`👥 المسجلين — ${course.title}`} onClose={onClose} wide>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* summary row */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {Object.entries(counts).map(([k, v]) => {
              const meta = k === 'all' ? { color: 'var(--accent-blue)', label: 'الكل' } : STATUS_META[k];
              return (
                <button key={k} onClick={() => setFilter(k)} style={{
                  padding: '7px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  background: filter === k ? meta.bg || 'rgba(59,130,246,0.12)' : 'var(--bg-primary)',
                  color: filter === k ? meta.color : 'var(--text-muted)',
                  border: `1px solid ${filter === k ? (meta.color + '44') : 'var(--border)'}`,
                  fontWeight: filter === k ? 700 : 400, fontSize: '0.85rem',
                }}>
                  {meta.label || k} <span style={{ fontWeight: 800 }}>{v}</span>
                </button>
              );
            })}
            <button onClick={exportCSV} style={{
              marginLeft: 'auto', padding: '7px 16px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)',
              border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
            }}>
              📥 Export CSV
            </button>
          </div>

          {/* search */}
          <input
            className="form-input"
            placeholder="🔍 ابحث بالاسم أو الإيميل أو الموبايل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* list */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              {regs.length === 0 ? 'مفيش مسجلين لحد دلوقتي' : 'مفيش نتايج للبحث ده'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '55vh', overflowY: 'auto' }}>
              {filtered.map((r, i) => {
                const sm = STATUS_META[r.status] || STATUS_META.pending;
                return (
                  <div key={r.id} style={{
                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                    display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
                  }}>
                    {/* index */}
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {i + 1}
                    </div>

                    {/* info */}
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span>📧 {r.email}</span>
                        <span>📱 {r.phone}</span>
                        {r.age && <span>🎂 {r.age} سنة</span>}
                      </div>
                      {r.experience && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                          📊 {r.experience}
                        </div>
                      )}
                      {r.note && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', marginTop: '3px', fontStyle: 'italic' }}>
                          💬 {r.note}
                        </div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        🕐 {new Date(r.registered_at).toLocaleDateString('ar-EG')} {new Date(r.registered_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* status + actions */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: sm.bg, color: sm.color }}>
                        {sm.label}
                      </span>
                      {r.status !== 'confirmed' && (
                        <ABtn bg="rgba(16,185,129,0.1)" color="var(--accent-green)" onClick={() => updateStatus(r.id, 'confirmed')}>✅</ABtn>
                      )}
                      {r.status !== 'cancelled' && (
                        <ABtn bg="rgba(239,68,68,0.1)" color="var(--accent-red)" onClick={() => updateStatus(r.id, 'cancelled')}>❌</ABtn>
                      )}
                      {r.status !== 'pending' && (
                        <ABtn bg="rgba(245,158,11,0.1)" color="#f59e0b" onClick={() => updateStatus(r.id, 'pending')}>⏳</ABtn>
                      )}
                      <ABtn bg="rgba(100,116,139,0.1)" color="var(--text-muted)" onClick={() => deleteReg(r.id)}>🗑</ABtn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── tiny helpers ──────────────────────────────────────────────────────────
function Pill({ color, children }) {
  return (
    <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: color + '22', color, border: `1px solid ${color}44` }}>
      {children}
    </span>
  );
}

function StatBox({ label, value, color, onClick, clickable }) {
  return (
    <div
      onClick={onClick}
      style={{ textAlign: 'center', cursor: clickable ? 'pointer' : 'default', padding: '4px 8px', borderRadius: 'var(--radius-sm)', transition: 'background 0.15s', background: clickable ? 'var(--bg-secondary)' : 'transparent' }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
      onMouseLeave={e => { if (clickable) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
    >
      <div style={{ fontWeight: 800, fontSize: '1.3rem', color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function ABtn({ bg, color, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: 'none',
      background: bg, color, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
      transition: 'opacity 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {children}
    </button>
  );
}
