import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleLogin = async () => {
    if (!form.email || !form.email.includes('@')) { setError('Email invalide'); return; }
    if (!form.password) { setError('Entrez votre mot de passe'); return; }
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (authError) {
        if (authError.message.includes('Invalid login')) {
          setError('Email ou mot de passe incorrect');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Vérifiez votre email avant de vous connecter');
        } else {
          setError(authError.message);
        }
        return;
      }
      navigate('/dashboard');
    } catch (e) {
      setError('Une erreur est survenue — réessayez');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: '1.5px solid #E8E8E8', fontSize: 15, fontFamily: 'inherit',
    outline: 'none', background: '#FAFAFA', color: '#1A1A1A',
    marginBottom: 12, boxSizing: 'border-box'
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, display: 'block' };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto' }}>

      <div style={{ background: 'linear-gradient(160deg, #0F6E56 0%, #1D9E75 100%)', padding: '48px 24px 40px' }}>
        <button onClick={() => navigate('/')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', marginBottom: 24 }}>
          ← Retour
        </button>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🐾</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Bon retour !</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Connectez-vous à votre compte Dogger</p>
      </div>

      <div style={{ padding: '32px 24px' }}>
        <label style={labelStyle}>Email</label>
        <input style={inputStyle} type="email" placeholder="marie@exemple.fr"
          value={form.email} onChange={e => update('email', e.target.value)} />

        <label style={labelStyle}>Mot de passe</label>
        <input style={inputStyle} type="password" placeholder="Votre mot de passe"
          value={form.password} onChange={e => update('password', e.target.value)} />

        <button style={{ background: 'none', border: 'none', color: '#1D9E75', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 24, fontWeight: 600 }}>
          Mot de passe oublié ?
        </button>

        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', padding: 16, background: loading ? '#A8D5C4' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)', marginBottom: 16 }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        <div style={{ textAlign: 'center', padding: '16px 0', borderTop: '1px solid #F0F0F0' }}>
          <span style={{ fontSize: 14, color: '#888' }}>Pas encore de compte ? </span>
          <button onClick={() => navigate('/register')}
            style={{ background: 'none', border: 'none', color: '#1D9E75', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            S'inscrire
          </button>
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ textAlign: 'center', fontSize: 13, color: '#AAA', marginBottom: 16, position: 'relative' }}>
            <span style={{ background: '#fff', padding: '0 12px', position: 'relative', zIndex: 1 }}>ou continuer avec</span>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: '#F0F0F0' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button style={{ padding: '12px', border: '1.5px solid #E8E8E8', borderRadius: 12, background: '#FAFAFA', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              🍎 Apple
            </button>
            <button style={{ padding: '12px', border: '1.5px solid #E8E8E8', borderRadius: 12, background: '#FAFAFA', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              🌐 Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
