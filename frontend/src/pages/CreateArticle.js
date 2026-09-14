import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const CATEGORIES = [
  { value: 'devops', label: 'DevOps', icon: '⚙️', color: '#f59e0b' },
  { value: 'cloud', label: 'Cloud', icon: '☁️', color: '#3b82f6' },
  { value: 'kubernetes', label: 'Kubernetes', icon: '⎈', color: '#06b6d4' },
  { value: 'docker', label: 'Docker', icon: '🐳', color: '#3b82f6' },
  { value: 'cicd', label: 'CI/CD', icon: '🔄', color: '#8b5cf6' },
  { value: 'security', label: 'Security', icon: '🛡️', color: '#ef4444' },
  { value: 'general', label: 'General', icon: '📝', color: '#10b981' },
];

const SUGGESTED_TAGS = ['linux', 'aws', 'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'github-actions', 'nginx', 'prometheus', 'grafana', 'bash', 'python', 'devsecops'];

export default function CreateArticle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imgFile, setImgFile] = useState(null);
  const [imgPrev, setImgPrev] = useState(null);
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    tags: [],
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  /* ── image handling ─────────────────────────────────────── */
  const handleImg = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast('Image must be under 10 MB', 'error'); return; }
    setImgFile(file);
    setImgPrev(URL.createObjectURL(file));
  };
  const removeImg = () => {
    setImgFile(null);
    setImgPrev(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  /* ── tags handling ──────────────────────────────────────── */
  const addTag = (tag) => {
    const cleaned = tag.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!cleaned || form.tags.includes(cleaned) || form.tags.length >= 8) return;
    setForm(f => ({ ...f, tags: [...f.tags, cleaned] }));
    setTagInput('');
  };
  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  const handleTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
    if (e.key === 'Backspace' && !tagInput && form.tags.length) {
      removeTag(form.tags[form.tags.length - 1]);
    }
  };

  /* ── submit ─────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    if (!form.content.trim()) { showToast('Content is required', 'error'); return; }
    if (!form.category) { showToast('Please choose a category', 'error'); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('content', form.content.trim());
      fd.append('excerpt', form.excerpt.trim() || form.content.trim().substring(0, 150));
      fd.append('category', form.category);
      fd.append('tags', form.tags.join(','));
      if (imgFile) fd.append('image', imgFile);

      const res = await api.post('/articles', fd);
      showToast('Article published! 🎉');
      setTimeout(() => navigate(`/articles/${res.data.id}`), 1200);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to publish. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedCat = CATEGORIES.find(c => c.value === form.category);
  const wordCount = form.content.trim().split(/\s+/).filter(Boolean).length;
  const readMins = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: 56,
        background: 'rgba(10,15,30,0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(16px,4vw,32px)',
        gap: 16,
      }}>
        <Link to="/articles" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.875rem', flexShrink: 0 }}>
          ← Articles
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', flex: 1 }}>
          New Article
        </span>

        {/* word count pill */}
        {wordCount > 0 && (
          <span style={{
            padding: '3px 10px', borderRadius: 'var(--radius-full)',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            fontSize: '0.75rem', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {wordCount} words · {readMins} min read
          </span>
        )}

        {/* author */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--blue), var(--purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.8rem', color: '#fff',
            }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{user.name}</span>
          </div>
        )}

        <button
          form="article-form"
          type="submit"
          disabled={loading}
          style={{
            padding: '7px 20px', borderRadius: 'var(--radius-sm)',
            background: loading ? 'var(--bg-card)' : 'var(--blue)',
            color: loading ? 'var(--text-muted)' : '#fff',
            fontWeight: 700, fontSize: '0.875rem', border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all var(--t-fast)', flexShrink: 0,
            fontFamily: 'var(--font-ui)',
          }}
        >
          {loading ? 'Publishing…' : 'Publish →'}
        </button>
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(16px,4vw,24px)' }}>
        <form id="article-form" onSubmit={handleSubmit} noValidate>

          {/* ── Category picker ─────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Category *
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => {
                const active = form.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 'var(--radius-full)',
                      background: active ? `${cat.color}22` : 'var(--bg-card)',
                      color: active ? cat.color : 'var(--text-secondary)',
                      border: `1px solid ${active ? cat.color + '66' : 'var(--border)'}`,
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.85rem', cursor: 'pointer',
                      transition: 'all var(--t-fast)',
                      fontFamily: 'var(--font-ui)',
                      boxShadow: active ? `0 0 0 3px ${cat.color}18` : 'none',
                    }}
                  >
                    <span aria-hidden="true">{cat.icon}</span>
                    {cat.label}
                  </button>
                );
              })}
            </div>
            {!form.category && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Choose a category so readers can find your article.
              </p>
            )}
          </div>

          {/* ── Title ───────────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <textarea
              placeholder="Your article title…"
              value={form.title}
              onChange={e => {
                setForm(f => ({ ...f, title: e.target.value }));
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              style={{
                width: '100%',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
                fontWeight: 800,
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                resize: 'none',
                overflow: 'hidden',
                padding: '0 0 12px',
                borderBottom: `2px solid ${selectedCat?.color || 'var(--border)'}`,
                minHeight: 60,
              }}
              rows={1}
            />
          </div>

          {/* ── Excerpt / subtitle ──────────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Short description (shown in article cards) — optional"
              value={form.excerpt}
              onChange={set('excerpt')}
              maxLength={200}
              style={{ fontSize: '0.95rem' }}
            />
          </div>

          {/* ── Cover image ─────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            {imgPrev ? (
              <div style={{ position: 'relative' }}>
                <img
                  src={imgPrev} alt="Cover preview"
                  style={{ width: '100%', height: 'clamp(180px,35vw,320px)', objectFit: 'cover', borderRadius: 'var(--radius-lg)', display: 'block' }}
                />
                <button
                  type="button" onClick={removeImg}
                  style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', backdropFilter: 'blur(4px)',
                  }}
                  aria-label="Remove cover image"
                >✕</button>
                <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: 4 }}>
                  Cover Image
                </div>
              </div>
            ) : (
              <div>
                <input type="file" accept="image/*" ref={fileRef} onChange={handleImg} style={{ display: 'none' }} id="cover-img" />
                <label htmlFor="cover-img" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, height: 120,
                  border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem',
                  transition: 'border-color var(--t-fast), background var(--t-fast)',
                  background: 'var(--bg-card)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = selectedCat?.color || 'var(--blue)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                >
                  <span style={{ fontSize: '1.8rem' }}>🖼️</span>
                  <span><strong style={{ color: 'var(--text-secondary)' }}>Click to upload</strong> cover image (optional)</span>
                  <span style={{ fontSize: '0.75rem' }}>PNG, JPG, WebP — max 10 MB</span>
                </label>
              </div>
            )}
          </div>

          {/* ── Content ─────────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Content *
            </div>
            <textarea
              className="form-textarea"
              placeholder={`Write your article here…\n\nShare your knowledge about ${selectedCat?.label || 'DevOps & Cloud'}. Include:\n- What you learned\n- Step-by-step instructions\n- Code examples or commands\n- Tips and best practices`}
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              style={{
                width: '100%',
                minHeight: 320,
                fontSize: '1rem',
                lineHeight: 1.8,
                fontFamily: 'var(--font-ui)',
              }}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {wordCount} words
            </div>
          </div>

          {/* ── Tags ────────────────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Tags <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '0.72rem' }}>(max 8)</span>
            </div>

            {/* Tags input */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
              padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              transition: 'border-color var(--t-fast)',
              minHeight: 42,
            }}
              onClick={() => document.getElementById('tag-input').focus()}
            >
              {form.tags.map(tag => (
                <span key={tag} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 'var(--radius-full)',
                  background: `${selectedCat?.color || 'var(--blue)'}22`,
                  color: selectedCat?.color || 'var(--blue)',
                  border: `1px solid ${selectedCat?.color || 'var(--blue)'}44`,
                  fontSize: '0.78rem', fontWeight: 600,
                }}>
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'inherit', opacity: 0.6, fontSize: '0.8rem', lineHeight: 1, padding: '0 0 0 2px',
                  }}>✕</button>
                </span>
              ))}
              {form.tags.length < 8 && (
                <input
                  id="tag-input"
                  type="text"
                  placeholder={form.tags.length === 0 ? 'Type a tag and press Enter…' : 'Add tag…'}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKey}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    color: 'var(--text-primary)', fontSize: '0.875rem',
                    fontFamily: 'var(--font-ui)', minWidth: 120, flex: 1,
                  }}
                />
              )}
            </div>

            {/* Suggested tags */}
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center', flexShrink: 0 }}>Suggestions:</span>
              {SUGGESTED_TAGS.filter(t => !form.tags.includes(t)).slice(0, 10).map(tag => (
                <button
                  key={tag} type="button"
                  onClick={() => addTag(tag)}
                  style={{
                    padding: '3px 10px', borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer',
                    transition: 'all var(--t-fast)', fontFamily: 'var(--font-ui)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = selectedCat?.color || 'var(--blue)'; e.currentTarget.style.color = selectedCat?.color || 'var(--blue)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* ── Submit button (also in topbar) ──────────────── */}
          <div style={{
            display: 'flex', gap: 12, alignItems: 'center',
            paddingTop: 20, borderTop: '1px solid var(--border)',
          }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ padding: '12px 32px', fontSize: '0.95rem' }}
            >
              {loading ? 'Publishing…' : '🚀 Publish Article'}
            </button>
            <Link to="/articles" className="btn-secondary" style={{ padding: '12px 24px', fontSize: '0.9rem' }}>
              Cancel
            </Link>
            {form.title && form.category && (
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                Ready to publish
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
