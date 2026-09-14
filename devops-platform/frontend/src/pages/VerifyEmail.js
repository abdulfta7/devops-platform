import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import '../styles.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage(res.data.message || 'Your email has been verified successfully.');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Failed to verify email. The link may be invalid or expired.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Email Verification</h2>
        
        {status === 'loading' && (
          <div>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p>Verifying your email...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
            <div className="alert success">{message}</div>
            <Link to="/login" className="nav-btn" style={{ display: 'inline-flex', marginTop: '1rem' }}>
              Go to Login
            </Link>
          </div>
        )}
        
        {status === 'error' && (
          <div>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
            <div className="alert error">{message}</div>
            <Link to="/" className="nav-btn outline" style={{ display: 'inline-flex', marginTop: '1rem' }}>
              Go Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
