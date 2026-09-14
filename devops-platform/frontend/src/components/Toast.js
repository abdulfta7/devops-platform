import React, { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast ${type}`} role="alert" aria-live="assertive">
      <span aria-hidden="true">{type === 'success' ? '✅' : '❌'}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'inherit', opacity: 0.7, padding: '0 2px',
          fontSize: '1rem', lineHeight: 1, flexShrink: 0,
        }}
        aria-label="Dismiss"
      >✕</button>
    </div>
  );
}
