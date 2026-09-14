import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import Toast from '../components/Toast';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const fileRef = useRef();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [imgFile, setImgFile] = useState(null);
  const [imgPrev, setImgPrev] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!user) return <div className="page-loader"><div className="spinner" /></div>;

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  /* ── helpers ─────────────────────────────────────────────── */
  const initials = user.name?.charAt(0).toUpperCase() || '?';

  const handleImg = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgFile(file);
    setImgPrev(URL.createObjectURL(file));
  };

  /* ── save profile info ───────────────────────────────────── */
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!name.trim()) { showToast('Name cannot be empty', 'error'); return; }
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', { name: name.trim(), phone: phone.trim() });
      if (typeof updateUser === 'function') updateUser(res.data.user);
      showToast('Profile updated successfully!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally { setSaving(false); }
  };

  /* ── upload avatar ───────────────────────────────────────── */
  const handleUploadAvatar = async () => {
    if (!imgFile) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('avatar', imgFile);
      // Don't set Content-Type manually — browser sets it with correct boundary
      const res = await api.put('/auth/profile/avatar', fd);
      if (typeof updateUser === 'function') updateUser(res.data.user);
      setImgFile(null); setImgPrev(null);
      if (fileRef.current) fileRef.current.value = '';
      showToast('Avatar updated!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to upload avatar', 'error');
    } finally { setSaving(false); }
  };

  /* ── change password ─────────────────────────────────────── */
  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (newPwd.length < 6) { showToast('New password must be at least 6 characters', 'error'); return; }
    if (newPwd !== confirm) { showToast('Passwords do not match', 'error'); return; }
    setSaving(true);
    try {
      await api.put('/auth/profile/password', { currentPassword: curPwd, newPassword: newPwd });
      setCurPwd(''); setNewPwd(''); setConfirm('');
      showToast('Password changed successfully!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to change password', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="profile-page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── Breadcrumb ────────────────────────────────────── */}
      <div className="breadcrumb" style={{ marginBottom: 24 }}>
        <Link to="/">Home</Link>
        <span className="sep">›</span>
        <Link to="/dashboard">Dashboard</Link>
        <span className="sep">›</span>
        <span>Profile Settings</span>
      </div>

      {/* ── Page title ────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 'clamp(1.4rem,3vw,1.75rem)', marginBottom: 4 }}>Profile Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Manage your account information and security settings.
        </p>
      </div>

      {/* ── Avatar card ───────────────────────────────────── */}
      <div className="profile-card">
        <div className="profile-card-header">
          <div className="card-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>👤</div>
          <h3>Profile Picture</h3>
        </div>
        <div className="profile-card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {/* Avatar circle */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--blue), var(--purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.2rem', color: '#fff', fontWeight: 800,
                border: '3px solid var(--border)',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {imgPrev ? (
                  <img src={imgPrev} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : user.avatar ? (
                  <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  initials
                )}
              </div>
              {/* Edit overlay */}
              <label
                htmlFor="avatarInput"
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--blue)', border: '2px solid var(--bg-card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '0.7rem',
                }}
                title="Change avatar"
              >✏️</label>
              <input id="avatarInput" type="file" accept="image/*" ref={fileRef} onChange={handleImg} style={{ display: 'none' }} />
            </div>

            {/* Info + actions */}
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>{user.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>{user.email}</div>

              {imgFile ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleUploadAvatar}
                    disabled={saving}
                    className="btn-primary"
                    style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                  >
                    {saving ? 'Uploading…' : '⬆️ Upload'}
                  </button>
                  <button
                    onClick={() => { setImgFile(null); setImgPrev(null); fileRef.current.value = ''; }}
                    className="btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                    {imgFile.name}
                  </span>
                </div>
              ) : (
                <label htmlFor="avatarInput" className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  📷 Change Photo
                </label>
              )}
            </div>
          </div>

          {/* Role badge */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 12px', borderRadius: 'var(--radius-full)',
              background: user.role === 'admin' ? 'rgba(239,68,68,0.12)' : 'var(--blue-light)',
              color: user.role === 'admin' ? 'var(--red)' : 'var(--blue)',
              border: `1px solid ${user.role === 'admin' ? 'var(--red-border)' : 'var(--blue-border)'}`,
              fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize',
            }}>
              {user.role === 'admin' ? '🛡️ Admin' : '🎓 Student'}
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: 'var(--radius-full)',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              fontSize: '0.75rem', color: 'var(--text-muted)',
            }}>
              Joined {new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Personal information ─────────────────────────── */}
      <div className="profile-card">
        <div className="profile-card-header">
          <div className="card-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>📋</div>
          <h3>Personal Information</h3>
        </div>
        <div className="profile-card-body">
          <form onSubmit={handleSaveInfo} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Email — read only */}
              <div className="form-group">
                <label className="form-label">
                  Email
                  <span style={{ marginLeft: 6, fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    (cannot be changed)
                  </span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={user.email}
                  disabled
                  style={{ opacity: 0.55, cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-row">
                {/* Full name */}
                <div className="form-group">
                  <label className="form-label" htmlFor="prof-name">Full Name *</label>
                  <input
                    id="prof-name"
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ahmed Mohamed"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label className="form-label" htmlFor="prof-phone">Phone</label>
                  <input
                    id="prof-phone"
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{ padding: '10px 24px', fontSize: '0.875rem' }}
                >
                  {saving ? 'Saving…' : '💾 Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Change Password ───────────────────────────────── */}
      <div className="profile-card">
        <div className="profile-card-header">
          <div className="card-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>🔒</div>
          <h3>Change Password</h3>
        </div>
        <div className="profile-card-body">
          <form onSubmit={handleChangePwd} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="cur-pwd">Current Password *</label>
                <input
                  id="cur-pwd"
                  type="password"
                  className="form-input"
                  value={curPwd}
                  onChange={e => setCurPwd(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="new-pwd">New Password *</label>
                  <input
                    id="new-pwd"
                    type="password"
                    className="form-input"
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="conf-pwd">Confirm Password *</label>
                  <input
                    id="conf-pwd"
                    type="password"
                    className="form-input"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {/* Strength indicator */}
              {newPwd.length > 0 && (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: newPwd.length >= i * 2
                        ? (i <= 1 ? 'var(--red)' : i <= 2 ? 'var(--yellow)' : 'var(--green)')
                        : 'var(--border)',
                      transition: 'background 0.2s',
                    }} />
                  ))}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: 6 }}>
                    {newPwd.length < 4 ? 'Weak' : newPwd.length < 6 ? 'Fair' : newPwd.length < 8 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}

              {/* Match indicator */}
              {confirm.length > 0 && (
                <div style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5, color: newPwd === confirm ? 'var(--green)' : 'var(--red)' }}>
                  <span>{newPwd === confirm ? '✅' : '❌'}</span>
                  {newPwd === confirm ? 'Passwords match' : 'Passwords do not match'}
                </div>
              )}

              <div style={{ paddingTop: 4 }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving || (confirm.length > 0 && newPwd !== confirm)}
                  style={{ padding: '10px 24px', fontSize: '0.875rem', background: 'var(--red)', boxShadow: saving ? 'none' : undefined }}
                >
                  {saving ? 'Updating…' : '🔑 Update Password'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Danger Zone ───────────────────────────────────── */}
      <div className="profile-card" style={{ borderColor: 'var(--red-border)' }}>
        <div className="profile-card-header" style={{ background: 'rgba(239,68,68,0.06)' }}>
          <div className="card-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>⚠️</div>
          <h3 style={{ color: 'var(--red)' }}>Danger Zone</h3>
        </div>
        <div className="profile-card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 3 }}>Delete Account</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Permanently delete your account and all associated data. This cannot be undone.
              </div>
            </div>
            <button
              style={{
                padding: '9px 20px', borderRadius: 'var(--radius-sm)',
                background: 'transparent', border: '1px solid var(--red-border)',
                color: 'var(--red)', fontWeight: 700, fontSize: '0.85rem',
                cursor: 'pointer', transition: 'all var(--t-fast)',
                flexShrink: 0, fontFamily: 'var(--font-ui)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--red)'; }}
              onClick={() => {
                if (window.confirm('Are you absolutely sure? This will delete your account permanently.')) {
                  api.delete('/auth/account')
                    .then(() => { localStorage.clear(); window.location.href = '/'; })
                    .catch(() => showToast('Failed to delete account. Contact support.', 'error'));
                }
              }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
