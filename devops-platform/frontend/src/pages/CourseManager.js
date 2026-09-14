import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

// ─── helpers ────────────────────────────────────────────────────────────────
function youtubeEmbed(url) {
  if (!url) return url;
  // already embed
  if (url.includes('youtube.com/embed/')) return url;
  // youtu.be/ID
  const short = url.match(/youtu\.be\/([^?&]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  // watch?v=ID
  const watch = url.match(/[?&]v=([^&]+)/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
  return url;
}

const DIFF_COLORS = {
  easy:   { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  medium: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  hard:   { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
};

// ─── small reusable modal ───────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── main page ──────────────────────────────────────────────────────────────
export default function CourseManager() {
  const { courseId } = useParams();
  const { user }     = useAuth();
  const navigate     = useNavigate();

  const [course,  setCourse]  = useState(null);
  const [videos,  setVideos]  = useState([]);
  const [tasks,   setTasks]   = useState([]);
  const [tab,     setTab]     = useState('videos');   // 'videos' | 'tasks'
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);

  // modals
  const [videoModal, setVideoModal] = useState(null); // null | 'add' | {video}
  const [taskModal,  setTaskModal]  = useState(null); // null | 'add' | {task}
  const [delConfirm, setDelConfirm] = useState(null); // {type,id,name}

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/courses/${courseId}/manage`);
      setCourse(r.data);
      setVideos(r.data.videos || []);
      setTasks(r.data.tasks  || []);
    } catch {
      showToast('Course not found', 'error');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    load();
  }, [user, load]);

  const handleDeleteVideo = async () => {
    try {
      await api.delete(`/admin/courses/videos/${delConfirm.id}`);
      showToast('Video deleted');
      setDelConfirm(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete video', 'error');
    }
  };

  const handleDeleteTask = async () => {
    try {
      await api.delete(`/admin/courses/tasks/${delConfirm.id}`);
      showToast('Task deleted');
      setDelConfirm(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete task', 'error');
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!course)  return null;

  const levelColor = { beginner: '#3b82f6', intermediate: '#8b5cf6', advanced: '#ef4444' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── top bar ───────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
        padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '16px',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link to="/admin" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Admin
        </Link>
        <span style={{ color: 'var(--border)' }}>|</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{course.title}</span>
          <span style={{ marginLeft: '10px', fontSize: '0.8rem', padding: '2px 10px', borderRadius: '999px', background: `${levelColor[course.level]}22`, color: levelColor[course.level] }}>
            {course.level}
          </span>
          {course.track_title && (
            <span style={{ marginLeft: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>· {course.track_title}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span>🎬 {videos.length} videos</span>
          <span>·</span>
          <span>✅ {tasks.length} tasks</span>
        </div>
        <a href={`/courses/${course.slug}`} target="_blank" rel="noreferrer"
          style={{ fontSize: '0.8rem', color: 'var(--accent-blue)' }}>
          View Course ↗
        </a>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── tabs ──────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { key: 'videos', label: `🎬 Videos (${videos.length})` },
            { key: 'tasks',  label: `✅ Tasks (${tasks.length})` },
          ].map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '9px 20px', borderRadius: 'var(--radius-sm)',
                fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                background: tab === t.key ? 'var(--accent-blue)' : 'var(--bg-card)',
                color:      tab === t.key ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${tab === t.key ? 'var(--accent-blue)' : 'var(--border)'}`,
                transition: 'all 0.15s',
              }}>
              {t.label}
            </button>
          ))}

          <button
            onClick={() => tab === 'videos' ? setVideoModal('add') : setTaskModal('add')}
            style={{
              marginLeft: 'auto', padding: '9px 20px', borderRadius: 'var(--radius-sm)',
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              background: 'var(--accent-green)', color: '#fff', border: 'none',
            }}>
            + Add {tab === 'videos' ? 'Video' : 'Task'}
          </button>
        </div>

        {/* ══════════════════ VIDEOS TAB ══════════════════ */}
        {tab === 'videos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {videos.length === 0 && (
              <Empty icon="🎬" text="No videos yet" sub="Click + Add Video to get started" />
            )}
            {videos.map((v, i) => (
              <VideoRow key={v.id} video={v} index={i}
                onEdit={() => setVideoModal(v)}
                onDelete={() => setDelConfirm({ type: 'video', id: v.id, name: v.title })}
              />
            ))}
          </div>
        )}

        {/* ══════════════════ TASKS TAB ══════════════════ */}
        {tab === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tasks.length === 0 && (
              <Empty icon="✅" text="No tasks yet" sub="Click + Add Task to get started" />
            )}
            {tasks.map((t, i) => (
              <TaskRow key={t.id} task={t} index={i}
                onEdit={() => setTaskModal(t)}
                onDelete={() => setDelConfirm({ type: 'task', id: t.id, name: t.title })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── modals ────────────────────────────────────────────────────────── */}
      {videoModal && (
        <VideoModal
          courseId={courseId}
          video={videoModal === 'add' ? null : videoModal}
          onClose={() => setVideoModal(null)}
          onSaved={() => { setVideoModal(null); load(); showToast(videoModal === 'add' ? 'Video added!' : 'Video updated!'); }}
          showToast={showToast}
        />
      )}

      {taskModal && (
        <TaskModal
          courseId={courseId}
          task={taskModal === 'add' ? null : taskModal}
          onClose={() => setTaskModal(null)}
          onSaved={() => { setTaskModal(null); load(); showToast(taskModal === 'add' ? 'Task added!' : 'Task updated!'); }}
          showToast={showToast}
        />
      )}

      {delConfirm && (
        <Modal title="⚠️ Confirm Delete" onClose={() => setDelConfirm(null)}>
          <div style={{ padding: '0 0 20px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>"{delConfirm.name}"</strong>?
              {delConfirm.type === 'task' && ' All student submissions will also be deleted.'}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={delConfirm.type === 'video' ? handleDeleteVideo : handleDeleteTask}
                style={{ padding: '10px 24px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-red)', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Delete
              </button>
              <button
                onClick={() => setDelConfirm(null)}
                style={{ padding: '10px 24px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontWeight: 600, border: '1px solid var(--border)', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Video Row ───────────────────────────────────────────────────────────────
function VideoRow({ video, index, onEdit, onDelete }) {
  const isYT = video.video_url?.includes('youtube') || video.video_url?.includes('youtu');
  const isLocal = video.video_url?.startsWith('/uploads/');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '14px 18px',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* order badge */}
      <div style={{
        width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
        background: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '0.85rem',
      }}>
        {video.order_num || index + 1}
      </div>

      {/* thumbnail / icon */}
      <div style={{
        width: 56, height: 40, borderRadius: '6px', flexShrink: 0, overflow: 'hidden',
        background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isYT ? (
          <img
            src={`https://img.youtube.com/vi/${video.video_url?.match(/embed\/([^?]+)/)?.[1]}/default.jpg`}
            alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <span style={{ fontSize: '1.3rem' }}>{isLocal ? '📁' : '🎬'}</span>
        )}
      </div>

      {/* info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {video.title}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>⏱ {video.duration_minutes} min</span>
          {video.is_preview === 1 && (
            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)', fontWeight: 600 }}>Preview</span>
          )}
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {isYT ? '🔴 YouTube' : isLocal ? '📁 Local file' : '🔗 URL'}
          </span>
        </div>
      </div>

      {/* actions */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <ActionBtn icon="✏️" label="Edit" color="var(--accent-blue)" onClick={onEdit} />
        <ActionBtn icon="🗑" label="Delete" color="var(--accent-red)" onClick={onDelete} />
      </div>
    </div>
  );
}

// ─── Task Row ────────────────────────────────────────────────────────────────
function TaskRow({ task, index, onEdit, onDelete }) {
  const diff = DIFF_COLORS[task.difficulty] || DIFF_COLORS.medium;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '14px 18px',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-green)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
        background: 'rgba(16,185,129,0.12)', color: 'var(--accent-green)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '0.85rem',
      }}>
        {task.order_num || index + 1}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', background: diff.bg, color: diff.color, fontWeight: 600 }}>
            {task.difficulty}
          </span>
          {task.description && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 360 }}>
              {task.description}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <ActionBtn icon="✏️" label="Edit" color="var(--accent-blue)" onClick={onEdit} />
        <ActionBtn icon="🗑" label="Delete" color="var(--accent-red)" onClick={onDelete} />
      </div>
    </div>
  );
}

// ─── Video Modal (Add / Edit) ─────────────────────────────────────────────────
function VideoModal({ courseId, video, onClose, onSaved, showToast }) {
  const isEdit = !!video;
  const [source,   setSource]   = useState(isEdit ? (video.video_url?.startsWith('/uploads/') ? 'file' : 'url') : 'youtube');
  const [form,     setForm]     = useState({
    title:            video?.title            || '',
    description:      video?.description      || '',
    video_url:        video?.video_url        || '',
    duration_minutes: video?.duration_minutes || '',
    order_num:        video?.order_num        || '',
    is_preview:       video?.is_preview === 1 ? 'true' : 'false',
  });
  const [file,     setFile]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    setLoading(true);
    try {
      if (isEdit) {
        // edit always uses JSON (no file re-upload here)
        await api.put(`/courses/videos/${video.id}`, {
          ...form,
          video_url: youtubeEmbed(form.video_url),
          is_preview: form.is_preview === 'true',
        });
      } else {
        if (source === 'file' || source === 'local') {
          if (!file) { showToast('Please select a file', 'error'); setLoading(false); return; }
          const fd = new FormData();
          fd.append('file', file);
          fd.append('title', form.title);
          fd.append('description', form.description);
          fd.append('duration_minutes', form.duration_minutes || 0);
          fd.append('order_num', form.order_num || 0);
          fd.append('is_preview', form.is_preview);
          await api.post(`/courses/${courseId}/videos/upload`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: ev => setProgress(Math.round(ev.loaded * 100 / ev.total)),
          });
        } else {
          // YouTube or raw URL
          await api.post(`/courses/${courseId}/videos`, {
            ...form,
            video_url: youtubeEmbed(form.video_url),
            is_preview: form.is_preview === 'true',
          });
        }
      }
      onSaved();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save video', 'error');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <Modal title={isEdit ? '✏️ Edit Video' : '🎬 Add Video'} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* source picker — only on add */}
        {!isEdit && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { k: 'youtube', label: '🔴 YouTube'   },
              { k: 'url',     label: '🔗 URL'        },
              { k: 'file',    label: '📁 From Device' },
            ].map(s => (
              <button key={s.k} type="button"
                onClick={() => setSource(s.k)}
                style={{
                  flex: 1, padding: '9px 6px', borderRadius: 'var(--radius-sm)',
                  fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                  background: source === s.k ? 'var(--accent-blue)' : 'var(--bg-primary)',
                  color:      source === s.k ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${source === s.k ? 'var(--accent-blue)' : 'var(--border)'}`,
                }}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* title */}
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="form-input" placeholder="Introduction to Docker" value={form.title} onChange={set('title')} required />
        </div>

        {/* description */}
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" style={{ minHeight: 60 }} placeholder="What will students learn?" value={form.description} onChange={set('description')} />
        </div>

        {/* source-specific input */}
        {!isEdit && source === 'file' ? (
          <div className="form-group">
            <label className="form-label">Video File (mp4, mkv…)</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '24px', textAlign: 'center', cursor: 'pointer',
                background: 'var(--bg-primary)', transition: 'border-color 0.2s',
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
              {file ? (
                <div>
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🎬</div>
                  <div style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{file.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: '6px' }}>📁</div>
                  <div style={{ fontWeight: 600 }}>Click to browse or drag & drop</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>MP4, MKV, AVI, MOV — max 500 MB</div>
                </div>
              )}
            </div>
            {loading && progress > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  <span>Uploading…</span><span>{progress}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-blue)', transition: 'width 0.3s' }} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">
              {source === 'youtube' ? 'YouTube URL' : 'Video URL'}
            </label>
            <input
              className="form-input"
              placeholder={source === 'youtube'
                ? 'https://www.youtube.com/watch?v=... or https://youtu.be/...'
                : 'https://example.com/video.mp4'}
              value={form.video_url}
              onChange={set('video_url')}
            />
            {source === 'youtube' && form.video_url && (
              <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--accent-green)' }}>
                ✅ Will embed as: {youtubeEmbed(form.video_url)}
              </div>
            )}
          </div>
        )}

        {/* duration + order */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Duration (minutes)</label>
            <input type="number" className="form-input" min="0" placeholder="30" value={form.duration_minutes} onChange={set('duration_minutes')} />
          </div>
          <div className="form-group">
            <label className="form-label">Order</label>
            <input type="number" className="form-input" min="0" placeholder="1" value={form.order_num} onChange={set('order_num')} />
          </div>
        </div>

        {/* preview */}
        <div className="form-group">
          <label className="form-label">Visible without enrollment?</label>
          <select className="form-select" value={form.is_preview} onChange={set('is_preview')}>
            <option value="false">No — enrolled students only</option>
            <option value="true">Yes — free preview for everyone</option>
          </select>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? (source === 'file' ? `Uploading ${progress}%…` : 'Saving…') : (isEdit ? 'Save Changes' : 'Add Video')}
        </button>
      </form>
    </Modal>
  );
}

// ─── Task Modal (Add / Edit) ──────────────────────────────────────────────────
function TaskModal({ courseId, task, onClose, onSaved, showToast }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title:           task?.title           || '',
    description:     task?.description     || '',
    instructions:    task?.instructions    || '',
    expected_output: task?.expected_output || '',
    difficulty:      task?.difficulty      || 'medium',
    order_num:       task?.order_num       || '',
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim())        { showToast('Title is required', 'error'); return; }
    if (!form.instructions.trim()) { showToast('Instructions are required', 'error'); return; }
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/courses/tasks/${task.id}`, form);
      } else {
        await api.post(`/courses/${courseId}/tasks`, form);
      }
      onSaved();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save task', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={isEdit ? '✏️ Edit Task' : '✅ Add Task'} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        <div className="form-group">
          <label className="form-label">Task Title *</label>
          <input className="form-input" placeholder="Deploy your first container" value={form.title} onChange={set('title')} required />
        </div>

        <div className="form-group">
          <label className="form-label">Short Description</label>
          <input className="form-input" placeholder="Brief one-liner about the task" value={form.description} onChange={set('description')} />
        </div>

        <div className="form-group">
          <label className="form-label">Full Instructions *</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: 130, fontFamily: 'monospace', fontSize: '0.88rem' }}
            placeholder={"Step 1: ...\nStep 2: ...\nStep 3: ..."}
            value={form.instructions}
            onChange={set('instructions')}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Expected Output / Deliverable</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: 70 }}
            placeholder="What should the student submit? e.g. screenshot + working URL"
            value={form.expected_output}
            onChange={set('expected_output')}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Difficulty</label>
            <select className="form-select" value={form.difficulty} onChange={set('difficulty')}>
              <option value="easy">🟢 Easy</option>
              <option value="medium">🟡 Medium</option>
              <option value="hard">🔴 Hard</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Order</label>
            <input type="number" className="form-input" min="0" placeholder="1" value={form.order_num} onChange={set('order_num')} />
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Task'}
        </button>
      </form>
    </Modal>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty({ icon, text, sub }) {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 24px',
      background: 'var(--bg-card)', borderRadius: 'var(--radius)',
      border: '1px dashed var(--border)',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{text}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{sub}</div>
    </div>
  );
}

// ─── Small action button ──────────────────────────────────────────────────────
function ActionBtn({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: 'none',
        background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '0.9rem',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = color + '22'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
    >
      {icon}
    </button>
  );
}
