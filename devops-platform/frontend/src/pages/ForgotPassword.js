import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import '../styles.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message || 'Password reset email sent. Please check your inbox.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem' }}>Forgot Password</h2>
        
        {message && <div className="alert success">{message}</div>}
        {error && <div className="alert error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email Address</label>
            <input 
              type="email" 
              className="input" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="Enter your email"
            />
          </div>
          
          <button type="submit" className="nav-btn" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          Remembered your password? <Link to="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Log in</Link>
        </div>
      </div>
    </div>
  );
}
