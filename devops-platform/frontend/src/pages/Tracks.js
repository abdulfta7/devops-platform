import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Tracks() {
  const [tracks, setTracks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { api.get('/tracks').then(r => setTracks(r.data)); }, []);

  return (
    <div>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-base))' }}>
        <div className="page-header-inner">
          <h1>Learning Tracks</h1>
          <p>Choose your career path and follow a structured roadmap to get job-ready.</p>
        </div>
      </div>

      <div className="section">
        <div className="tracks-grid">
          {tracks.map(track => (
            <article
              key={track.id}
              className="track-card"
              style={{ '--track-color': track.color }}
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(`/tracks/${track.slug}`)}
            >
              <div className="track-icon" aria-hidden="true">{track.icon}</div>
              <h2 style={{ fontSize: 'clamp(1.1rem,2.5vw,1.35rem)', marginBottom: 8 }}>{track.title}</h2>
              <p className="track-desc" style={{ marginBottom: 20 }}>{track.description}</p>

              {/* mini stats */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { icon: '📚', val: `${track.course_count} Courses` },
                  { icon: '🗺️', val: 'Structured Roadmap' },
                  { icon: '✅', val: 'Practical Tasks' },
                ].map(s => (
                  <div key={s.val} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: '0.78rem', fontWeight: 500,
                    padding: '4px 10px', borderRadius: 'var(--radius-full)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}>
                    <span aria-hidden="true">{s.icon}</span> {s.val}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Link
                  to={`/tracks/${track.slug}`}
                  className="btn-primary"
                  style={{ flex: 1, textAlign: 'center', padding: '10px', fontSize: '0.875rem' }}
                  onClick={e => e.stopPropagation()}
                >
                  View Roadmap
                </Link>
                <Link
                  to={`/courses?track=${track.slug}`}
                  className="btn-secondary"
                  style={{ flex: 1, textAlign: 'center', padding: '10px', fontSize: '0.875rem' }}
                  onClick={e => e.stopPropagation()}
                >
                  Courses
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
