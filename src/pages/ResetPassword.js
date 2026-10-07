import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

// Page d'arrivée du lien « Mot de passe oublié » reçu par email.
// Supabase lit lui-même le jeton dans l'adresse et ouvre une session de
// récupération ; il ne reste qu'à demander le nouveau mot de passe.
export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(null); // null = on vérifie, true = lien valide, false = invalide/expiré
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    const t = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setReady(r => (r === null ? !!session : r));
    }, 1500);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async () => {
    if (password.length < 8) { setError('Mot de passe trop court (8 caractères min)'); return; }
    if (password !== confirm) { setError('Les deux mots de passe ne sont pas identiques'); return; }
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError('Impossible de changer le mot de passe — le lien a peut-être expiré.'); return; }
    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => navigate('/login'), 2500);
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: '1.5px solid #E8E8E8', fontSize: 15, fontFamily: 'inherit',
    outline: 'none', background: '#FAFAFA', color: '#1A1A1A',
    marginBottom: 12, boxSizing: 'border-box'
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, display: 'block' };
  const btn = (disabled) => ({ width: '100%', padding: 16, background: disabled ? '#A8D5C4' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit' });

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(160deg, #0F6E56 0%, #1D9E75 100%)', padding: '48px 24px 40px' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🔑</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Nouveau mot de passe</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', margin: 0 }}>Choisissez un nouveau mot de passe pour votre compte</p>
      </div>

      <div style={{ padding: '32px 24px' }}>
        {ready === null && <div style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>Vérification du lien...</div>}

        {ready === false && (
          <>
            <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 16, lineHeight: 1.6 }}>
              ⚠️ Ce lien est invalide ou a expiré. Refaites une demande depuis la page de connexion (« Mot de passe oublié ? »).
            </div>
            <button style={btn(false)} onClick={() => navigate('/login')}>Retour à la connexion</button>
          </>
        )}

        {ready === true && !done && (
          <>
            <label style={labelStyle}>Nouveau mot de passe</label>
            <input style={inputStyle} type="password" placeholder="8 caractères minimum" value={password} onChange={e => setPassword(e.target.value)} />
            <label style={labelStyle}>Confirmer le mot de passe</label>
            <input style={inputStyle} type="password" placeholder="Retapez-le" value={confirm} onChange={e => setConfirm(e.target.value)} />
            {error && (
              <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 16 }}>⚠️ {error}</div>
            )}
            <button style={btn(loading)} disabled={loading} onClick={submit}>{loading ? 'Enregistrement...' : 'Changer mon mot de passe'}</button>
          </>
        )}

        {done && (
          <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#0F6E56', lineHeight: 1.6 }}>
            ✅ Mot de passe changé. Redirection vers la connexion...
          </div>
        )}
      </div>
    </div>
  );
}
