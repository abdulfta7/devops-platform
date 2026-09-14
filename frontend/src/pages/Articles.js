import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['all', 'devops', 'cloud', 'kubernetes', 'docker', 'cicd', 'security', 'general'];

const CAT_COLORS = {
  devops: '#f59e0b', cloud: '#3b82f6', kubernetes: '#06b6d4',
  docker: '#3b82f6', cicd: '#8b5cf6', security: '#ef4444',
  security: '#ef4444', general: '#10b981', all: '#64748b',
};

export default function Articles() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    setLoading(true);
    const url = category === 'all' ? '/articles' : `/articles?category=${category}`;
    api.get(url)
      .then(r => setArticles(r.data))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        padding: 'clamp(40px,8vw,80px) 24px clamp(32px,5vw,56px)',
        background:
          'radial-gradient(ellipse 70% 60% at 30% 30%, rgba(139,92,246,0.15) 0%, transparent 60%),' +
          'radial-gradient(ellipse 60% 50% at 70% 70%, rgba(59,130,246,0.1) 0%, transparent 60%),' +
          'var(--bg-base)',
        borderBottom: '1px solid var(--border)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 14px', borderRadius: 'var(--radius-full)',
            background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)',
            fontSize: '0.75rem', fontWeight: 700, color: 'var(--purple)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 16,
          }}>
            ✍️ Community
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 10 }}>
            DevOps Articles
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.95rem,2vw,1.1rem)', marginBottom: user ? 28 : 0 }}>
            Share knowledge, learn from the community, and stay updated with the latest in DevOps & Cloud.
          </p>

          {user && (
            <button
              onClick={() => navigate('/articles/create')}
              className="btn-primary"
              style={{ padding: '11px 28px', fontSize: '0.95rem', margin: '0 auto', display: 'inline-flex' }}
            >
              ✍️ Write an Article
            </button>
          )}
          {!user && (
            <Link to="/login" className="btn-secondary" style={{ padding: '10px 24px', fontSize: '0.9rem', display: 'inline-flex', margin: '0 auto' }}>
              Sign in to write →
            </Link>
          )}
        </div>
      </div>

      {/* ── Category filter ────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 24px',
        display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {CATEGORIES.map(cat => {
          const color = CAT_COLORS[cat] || 'var(--blue)';
          const active = category === cat;
          return (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: '6px 16px', borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              background: active ? color : 'transparent',
              color: active ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${active ? color : 'var(--border)'}`,
              transition: 'all var(--t-fast)',
              textTransform: 'capitalize',
              fontFamily: 'var(--font-ui)',
            }}>
              {cat === 'all' ? '🗂 All' : cat}
            </button>
          );
        })}
      </div>

      {/* ── Articles grid ──────────────────────────────────── */}
      <div className="section">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <div className="spinner" />
          </div>
        ) : articles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 14 }}>📝</div>
            <h3 style={{ marginBottom: 8 }}>No articles yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {user ? 'Be the first to share your knowledge!' : 'Sign in to write the first article.'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
            gap: 20,
          }}>
            {articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleCard({ article }) {
  const color = CAT_COLORS[article.category] || 'var(--blue)';
  const initials = article.author_name?.charAt(0).toUpperCase() || '?';

  return (
    <Link
      to={`/articles/${article.id}`}
      style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' }}
    >
      <article style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        flex: 1,
        transition: 'transform var(--t-base), border-color var(--t-base), box-shadow var(--t-base)',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.35)`; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = ''; }}
      >
        {/* Cover image or gradient placeholder */}
        {article.cover_image ? (
          <div style={{ height: 180, background: `url(${article.cover_image}) center/cover no-repeat` }} />
        ) : (
          <div style={{
            height: 100,
            background: `linear-gradient(135deg, ${color}18, ${color}30)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem',
          }} aria-hidden="true">
            {{ devops: '⚙️', cloud: '☁️', kubernetes: '⎈', docker: '🐳', cicd: '🔄', security: '🛡️', general: '📝' }[article.category] || '📝'}
          </div>
        )}

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Category pill */}
          <div style={{
            display: 'inline-flex', alignSelf: 'flex-start',
            padding: '3px 10px', borderRadius: 'var(--radius-full)',
            background: `${color}18`, color, border: `1px solid ${color}35`,
            fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
            marginBottom: 10,
          }}>
            {article.category}
          </div>

          <h3 style={{
            fontWeight: 700, fontSize: '0.98rem', lineHeight: 1.4,
            marginBottom: 8,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {article.title}
          </h3>

          <p style={{
            fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55,
            marginBottom: 16, flex: 1,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {article.excerpt || article.content?.substring(0, 130) + '…'}
          </p>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${color}, var(--purple))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '0.78rem',
              }}>
                {initials}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {article.author_name}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              <span>❤️ {article.likes_count || 0}</span>
              <span>💬 {article.comments_count || 0}</span>
              <span>👁 {article.views || 0}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
