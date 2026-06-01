import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function WalkerHome() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚶</div>
        <h2 style={{ color: '#1D9E75', marginBottom: 8 }}>Espace Promeneur</h2>
        <p style={{ color: '#888', marginBottom: 24 }}>Page en construction</p>
        <button onClick={() => navigate('/')} style={{ background: '#1D9E75', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 12, cursor: 'pointer', fontSize: 15 }}>
          ← Retour
        </button>
      </div>
    </div>
  );
}
