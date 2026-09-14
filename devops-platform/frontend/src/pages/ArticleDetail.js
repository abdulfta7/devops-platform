import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const CAT_COLORS = {
  devops: '#f59e0b', cloud: '#3b82f6', kubernetes: '#06b6d4',
  docker: '#3b82f6', cicd: '#8b5cf6', security: '#ef4444',
  general: '#10b981',
};

const SHARE_BTNS = [
  { label: 'Twitter', bg: '#1DA1F2', platform: 'twitter' },
  { label: 'Facebook', bg: '#4267B2', platform: 'facebook' },
  { label: 'LinkedIn', bg: '#0077B5', platform: 'linkedin' },
];

export default function ArticleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [posting, setPosting] = useState(false);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  useEffect(() => {
    api.get(`/articles/${id}`)
      .then(r => setArticle(r.data))
      .catch(() => showToast('Failed to load article', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await api.post(`/articles/${id}/like`);
      setArticle(a => ({ ...a, user_liked: res.data.liked, likes_count: a.likes_count + (res.data.liked ? 1 : -1) }));
    } catch { showToast('Failed to like', 'error'); }
  };

  const handleShare = async (platform) => {
    if (!user) { navigate('/login'); return; }
    try {
      await api.post(`/articles/${id}/share`, { platform });
      const urls = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
      };
      if (urls[platform]) window.open(urls[platform], '_blank', 'width=620,height=400');
      showToast('Shared!');
    } catch { showToast('Failed to share', 'error'); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const res = await api.post(`/articles/${id}/comments`, { content: comment, parent_id: replyTo });
      if (replyTo) {
        setArticle(a => ({ ...a, comments: a.comments.map(c => c.id === replyTo ? { ...c, replies: [...(c.replies || []), res.data] } : c) }));
      } else {
        setArticle(a => ({ ...a, comments: [res.data, ...a.comments], comments_count: a.comments_count + 1 }));
      }
      setComment(''); setReplyTo(null);
      showToast('Comment posted!');
    } catch { showToast('Failed to post comment', 'error'); }
    finally { setPosting(false); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/articles/comments/${commentId}`);
      setArticle(a => ({ ...a, comments: a.comments.filter(c => c.id !== commentId), comments_count: a.comments_count - 1 }));
      showToast('Deleted');
    } catch { showToast('Failed to delete', 'error'); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!article) return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: '3rem', marginBottom: 12 }}>😕</div>
      <h2 style={{ marginBottom: 8 }}>Article not found</h2>
      <Link to="/articles" className="btn-secondary" style={{ display: 'inline-flex', padding: '10px 20px' }}>← Back to Articles</Link>
    </div>
  );

  const catColor = CAT_COLORS[article.category] || 'var(--blue)';

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── Hero header ────────────────────────────────────── */}
      <div style={{
        padding: 'clamp(40px,8vw,80px) 24px clamp(32px,5vw,56px)',
        background:
          `radial-gradient(ellipse 80% 60% at 50% -10%, ${catColor}22 0%, transparent 65%),` +
          'var(--bg-base)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div className="breadcrumb" style={{ marginBottom: 20 }}>
            <Link to="/articles">Articles</Link>
            <span className="sep">›</span>
            <span style={{ textTransform: 'capitalize' }}>{article.category}</span>
          </div>

          {/* Category pill */}
          <span style={{
            display: 'inline-flex', padding: '4px 12px', borderRadius: 'var(--radius-full)',
            background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}35`,
            fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize', marginBottom: 14,
          }}>
            {article.category}
          </span>

          <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 16, lineHeight: 1.2 }}>
            {article.title}
          </h1>

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${catColor}, var(--purple))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800,
              }}>
                {article.author_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{article.author_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(article.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span>❤️ {article.likes_count || 0}</span>
              <span>💬 {article.comments_count || 0}</span>
              <span>👁 {article.views || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(24px,4vw,48px) 24px' }}>

        {/* Cover image */}
        {article.cover_image && (
          <img src={article.cover_image} alt={article.title} style={{
            width: '100%', height: 'clamp(200px,40vw,400px)',
            objectFit: 'cover', borderRadius: 'var(--radius-lg)',
            marginBottom: 32, display: 'block',
          }} />
        )}

        {/* Action bar */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 32,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 14,
          flexWrap: 'wrap',
        }}>
          <button onClick={handleLike} style={{
            flex: '1 1 100px', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            background: article.user_liked ? 'var(--red-light)' : 'var(--bg-secondary)',
            color: article.user_liked ? 'var(--red)' : 'var(--text-secondary)',
            border: `1px solid ${article.user_liked ? 'var(--red-border)' : 'var(--border)'}`,
            fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all var(--t-fast)', fontFamily: 'var(--font-ui)',
          }}>
            {article.user_liked ? '❤️ Liked' : '🤍 Like'}
            <span style={{ fontWeight: 400, fontSize: '0.8rem' }}>({article.likes_count || 0})</span>
          </button>

          {SHARE_BTNS.map(s => (
            <button key={s.platform} onClick={() => handleShare(s.platform)} style={{
              flex: '1 1 80px', padding: '10px', borderRadius: 'var(--radius-sm)',
              background: s.bg, color: '#fff', fontWeight: 700,
              fontSize: '0.82rem', border: 'none', cursor: 'pointer',
              transition: 'opacity var(--t-fast)', fontFamily: 'var(--font-ui)',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Article content */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 'clamp(20px,4vw,40px)',
          marginBottom: 32,
        }}>
          <div style={{ fontSize: '1rem', lineHeight: 1.85, color: 'var(--text-primary)' }}>
            {article.content?.split('\n').map((p, i) =>
              p.trim() ? <p key={i} style={{ marginBottom: 16 }}>{p}</p> : <br key={i} />
            )}
          </div>
        </div>

        {/* Tags */}
        {article.tags && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
            {article.tags.split(',').map((tag, i) => (
              <span key={i} style={{
                padding: '5px 12px', borderRadius: 'var(--radius-full)',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500,
              }}>
                #{tag.trim()}
              </span>
            ))}
          </div>
        )}

        {/* ── Comments ───────────────────────────────────────── */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 'clamp(20px,4vw,32px)',
        }}>
          <h3 style={{ marginBottom: 24 }}>
            💬 Comments
            <span style={{ marginLeft: 8, fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>
              ({article.comments_count || 0})
            </span>
          </h3>

          {/* Add comment */}
          {user ? (
            <form onSubmit={handleComment} style={{ marginBottom: 32 }}>
              {replyTo && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--blue-light)', border: '1px solid var(--blue-border)',
                  marginBottom: 10, fontSize: '0.85rem', color: 'var(--blue)',
                }}>
                  <span>↩ Replying to comment</span>
                  <button type="button" onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '1rem' }}>✕</button>
                </div>
              )}
              <textarea
                className="form-textarea"
                placeholder="Share your thoughts…"
                value={comment}
                onChange={e => setComment(e.target.value)}
                style={{ width: '100%', minHeight: 90, marginBottom: 10 }}
                required
              />
              <button type="submit" className="btn-primary" disabled={posting} style={{ padding: '9px 22px' }}>
                {posting ? 'Posting…' : 'Post Comment'}
              </button>
            </form>
          ) : (
            <div style={{
              padding: '20px 24px', background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius)', textAlign: 'center', marginBottom: 28,
              border: '1px solid var(--border)', fontSize: '0.9rem',
            }}>
              <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>Sign in</Link>
              <span style={{ color: 'var(--text-muted)' }}> to join the discussion</span>
            </div>
          )}

          {/* Comments list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(article.comments || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No comments yet. Be the first!
              </div>
            ) : (
              (article.comments || []).map((c, i) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  user={user}
                  catColor={catColor}
                  isLast={i === article.comments.length - 1}
                  onReply={() => setReplyTo(c.id)}
                  onDelete={() => handleDeleteComment(c.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, user, catColor, isLast, onReply, onDelete }) {
  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)', paddingBottom: isLast ? 0 : 20, marginBottom: isLast ? 0 : 20 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${catColor}, var(--purple))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: '0.82rem',
        }}>
          {comment.author_name?.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{comment.author_name}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.65, marginBottom: 8 }}>{comment.content}</p>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem' }}>
            <button onClick={onReply} style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>
              ↩ Reply
            </button>
            {(user?.id === comment.user_id || user?.role === 'admin') && (
              <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div style={{ marginLeft: 48, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
          {comment.replies.map(reply => (
            <div key={reply.id} style={{ display: 'flex', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${catColor}88, var(--purple)88)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '0.75rem',
              }}>
                {reply.author_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{reply.author_name}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(reply.created_at).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
