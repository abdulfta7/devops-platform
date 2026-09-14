import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

export default function TaskPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get(`/tasks/${id}`)
      .then(r => {
        setTask(r.data);
        if (r.data.submission) setAnswer(r.data.submission.answer || '');
      })
      .catch(e => {
        showToast(e.response?.data?.error || 'Task not found', 'error');
        setTimeout(() => navigate(-1), 2000);
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleSubmit = async () => {
    if (!answer.trim()) { showToast('Please write your answer first', 'error'); return; }
    setSubmitting(true);
    try {
      const res = await api.post(`/tasks/${id}/submit`, { answer });
      showToast(res.data.message);
      setTask(prev => ({ ...prev, submission: { answer, status: 'pending' } }));
    } catch (e) {
      showToast(e.response?.data?.error || 'Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!task) return null;

  const statusColor = { pending: 'var(--accent-yellow)', approved: 'var(--accent-green)', rejected: 'var(--accent-red)' };
  const difficultyMap = { easy: 'beginner', medium: 'intermediate', hard: 'advanced' };

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div className="page-header-inner">
          <div className="breadcrumb">
            <Link to="/">Home</Link> / <Link to="/courses">Courses</Link> /
            <Link to={`/courses/${task.course_slug}`}>{task.course_title}</Link> / Task
          </div>
          <h1>{task.title}</h1>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span className={`badge badge-${difficultyMap[task.difficulty] || 'intermediate'}`}>{task.difficulty}</span>
            <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>📚 {task.course_title}</span>
          </div>
        </div>
      </div>

      <div className="section" style={{ maxWidth: '800px' }}>

        {/* Status Banner */}
        {task.submission && (
          <div style={{
            padding: '16px 20px', borderRadius: 'var(--radius)', marginBottom: '24px',
            background: task.submission.status === 'approved' ? 'rgba(16,185,129,0.1)' : task.submission.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${statusColor[task.submission.status]}44`,
            color: statusColor[task.submission.status]
          }}>
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>
              {task.submission.status === 'approved' && '✅ Task Approved!'}
              {task.submission.status === 'pending' && '⏳ Submission Pending Review'}
              {task.submission.status === 'rejected' && '❌ Needs Improvement'}
            </div>
            {task.submission.feedback && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
                <strong>Feedback:</strong> {task.submission.feedback}
              </div>
            )}
          </div>
        )}

        {/* Task Description */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 Task Description
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{task.description}</p>
        </div>

        {/* Instructions */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📝 Instructions
          </h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.7', border: '1px solid var(--border)' }}>
            {task.instructions}
          </pre>
        </div>

        {/* Expected Output */}
        {task.expected_output && (
          <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✅ Expected Output
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{task.expected_output}</p>
          </div>
        )}

        {/* Answer Form */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>💬 Your Answer</h3>
          <textarea
            className="form-textarea"
            placeholder="Write your solution here... Include commands used, screenshots description, or step-by-step explanation of what you did."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            style={{ width: '100%', minHeight: '200px', marginBottom: '16px' }}
            disabled={task.submission?.status === 'approved'}
          />
          {task.submission?.status !== 'approved' && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="task-btn"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ padding: '12px 28px', fontSize: '1rem' }}
              >
                {submitting ? 'Submitting...' : task.submission ? '🔄 Resubmit' : '🚀 Submit Answer'}
              </button>
              <Link to={`/courses/${task.course_slug}`} className="btn-secondary" style={{ padding: '12px 20px' }}>
                ← Back to Course
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
