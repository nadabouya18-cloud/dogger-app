import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { toE164 } from '../Verification';

export default function Login() {
 const navigate = useNavigate();
 const [form, setForm] = useState({ email: '', password: '' });
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);
 // Connexion par téléphone : 'email' (défaut) ou 'phone' ; étape 'phone' puis 'code'.
 const [mode, setMode] = useState('email');
 const [phone, setPhone] = useState('');
 const [phoneStep, setPhoneStep] = useState('phone');
 const [code, setCode] = useState('');
 const [info, setInfo] = useState('');

 const params = new URLSearchParams(window.location.search);
 const redirect = params.get('redirect') || 'dashboard';
 const fromBooking = redirect === 'book';

 const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

 const handleLogin = async () => {
   if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Email invalide'); return; }
   if (!form.password) { setError('Entrez votre mot de passe'); return; }
   setError('');
   setLoading(true);
   try {
     const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
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

     await goAfterLogin(signInData?.user?.id);
   } catch (e) {
     setError('Une erreur est survenue — réessayez');
   } finally {
     setLoading(false);
   }
 };

 // Un compte promeneur a une ligne dans walker_profiles : on l'envoie
 // toujours vers son espace promeneur, quel que soit le paramètre redirect.
 const goAfterLogin = async (userId) => {
   let destination = '/' + redirect;
   if (userId) {
     const { data: walkerProfile } = await supabase
       .from('walker_profiles').select('id').eq('id', userId).maybeSingle();
     if (walkerProfile) destination = '/walker';
     else if (redirect === 'walker') destination = '/register-walker';
   }
   navigate(destination);
 };

 const sendPhoneCode = async () => {
   const cleaned = phone.replace(/\s/g, '');
   if (!/^0?[67]\d{8}$/.test(cleaned)) { setError('Numéro invalide — commence par 6 ou 7'); return; }
   setError('');
   setLoading(true);
   try {
     // shouldCreateUser:false → on ne crée jamais un compte par ce chemin.
     const { error: err } = await supabase.auth.signInWithOtp({
       phone: toE164(cleaned),
       options: { shouldCreateUser: false },
     });
     if (err) {
       const msg = (err.message || '').toLowerCase();
       if (msg.includes('signups not allowed') || msg.includes('not found')) {
         setError("Aucun compte avec ce numéro vérifié. Connectez-vous avec votre email, puis vérifiez votre numéro (Profil → Vérification du téléphone).");
       } else if (msg.includes('provider') || msg.includes('unsupported') || msg.includes('sms')) {
         setError("L'envoi de SMS n'est pas encore configuré — utilisez votre email.");
       } else {
         setError("Impossible d'envoyer le code — réessayez.");
       }
       return;
     }
     setPhoneStep('code');
   } catch (e) {
     setError('Une erreur est survenue — réessayez');
   } finally {
     setLoading(false);
   }
 };

 const confirmPhoneCode = async () => {
   if (!/^\d{6}$/.test(code)) { setError('Entrez le code à 6 chiffres reçu par SMS'); return; }
   setError('');
   setLoading(true);
   try {
     const { data, error: err } = await supabase.auth.verifyOtp({
       phone: toE164(phone), token: code, type: 'sms',
     });
     if (err) { setError('Code incorrect ou expiré — réessayez ou renvoyez un code.'); return; }
     await goAfterLogin(data?.user?.id);
   } catch (e) {
     setError('Une erreur est survenue — réessayez');
   } finally {
     setLoading(false);
   }
 };

 const handleForgot = async () => {
   setInfo('');
   if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
     setError("Entrez d'abord votre email dans le champ ci-dessus, puis cliquez sur « Mot de passe oublié ? »");
     return;
   }
   setError('');
   setLoading(true);
   try {
     const { error: err } = await supabase.auth.resetPasswordForEmail(form.email, {
       redirectTo: window.location.origin + '/reset-password',
     });
     if (err) { setError("Impossible d'envoyer l'email pour le moment — réessayez dans quelques minutes."); return; }
     // Message volontairement neutre : on ne révèle pas si l'email a un compte.
     setInfo('Si un compte existe avec cet email, un lien pour choisir un nouveau mot de passe vient de vous être envoyé.');
   } catch (e) {
     setError('Une erreur est survenue — réessayez');
   } finally {
     setLoading(false);
   }
 };

 const switchMode = (m) => { setMode(m); setError(''); setInfo(''); setPhoneStep('phone'); setCode(''); };

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
       <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
         {fromBooking
           ? 'Connectez-vous pour commander une balade 🐾'
           : 'Connectez-vous à votre compte Dogger'}
       </p>
     </div>

     <div style={{ padding: '32px 24px' }}>

       {fromBooking && (
         <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#0F6E56', fontWeight: 500 }}>
           🐾 Connectez-vous pour accéder au booking — ou créez un compte si vous n'en avez pas encore.
         </div>
       )}

       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
         {[['email', '✉️ Email'], ['phone', '📱 Téléphone']].map(([m, label]) => (
           <button key={m} onClick={() => switchMode(m)}
             style={{ padding: '10px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
               border: mode === m ? '1.5px solid #1D9E75' : '1.5px solid #E8E8E8',
               background: mode === m ? '#E1F5EE' : '#FAFAFA', color: mode === m ? '#0F6E56' : '#777' }}>
             {label}
           </button>
         ))}
       </div>

       {mode === 'email' ? (
         <>
           <label style={labelStyle}>Email</label>
           <input style={inputStyle} type="email" placeholder="marie@exemple.fr"
             value={form.email} onChange={e => update('email', e.target.value)} />

           <label style={labelStyle}>Mot de passe</label>
           <input style={inputStyle} type="password" placeholder="Votre mot de passe"
             value={form.password} onChange={e => update('password', e.target.value)} />

           <button onClick={handleForgot} disabled={loading} style={{ background: 'none', border: 'none', color: '#1D9E75', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 24, fontWeight: 600 }}>
             Mot de passe oublié ?
           </button>
         </>
       ) : phoneStep === 'phone' ? (
         <>
           <label style={labelStyle}>Numéro de téléphone</label>
           <div style={{ position: 'relative', marginBottom: 8 }}>
             <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#555' }}>🇫🇷 +33</span>
             <input style={{ ...inputStyle, paddingLeft: 80, marginBottom: 0 }} type="tel" placeholder="6 12 34 56 78"
               value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ''))} />
           </div>
           <div style={{ fontSize: 12, color: '#888', marginBottom: 20, lineHeight: 1.5 }}>
             Un code à 6 chiffres vous sera envoyé par SMS. Cela fonctionne uniquement si votre numéro a déjà été vérifié sur votre compte.
           </div>
         </>
       ) : (
         <>
           <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Code envoyé au +33 {phone.replace(/\s/g, '')}</div>
           <label style={labelStyle}>Code à 6 chiffres</label>
           <input style={{ ...inputStyle, fontSize: 20, letterSpacing: 6, textAlign: 'center' }} type="text" inputMode="numeric" maxLength={6} placeholder="••••••"
             value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
           <button onClick={() => { setPhoneStep('phone'); setCode(''); setError(''); }}
             style={{ background: 'none', border: 'none', color: '#1D9E75', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 20, fontWeight: 600 }}>
             Changer de numéro / renvoyer un code
           </button>
         </>
       )}

       {info && (
         <div style={{ background: '#E1F5EE', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#0F6E56', marginBottom: 16, lineHeight: 1.5 }}>
           ✅ {info}
         </div>
       )}

       {error && (
         <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 16 }}>
           ⚠️ {error}
         </div>
       )}

       <button onClick={mode === 'email' ? handleLogin : phoneStep === 'phone' ? sendPhoneCode : confirmPhoneCode} disabled={loading}
         style={{ width: '100%', padding: 16, background: loading ? '#A8D5C4' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)', marginBottom: 16 }}>
         {loading ? 'Patientez...' : mode === 'email' ? 'Se connecter' : phoneStep === 'phone' ? 'Recevoir le code' : 'Se connecter'}
       </button>

       <div style={{ textAlign: 'center', padding: '16px 0', borderTop: '1px solid #F0F0F0' }}>
         <span style={{ fontSize: 14, color: '#888' }}>Pas encore de compte ? </span>
         <button onClick={() => navigate('/register')}
           style={{ background: 'none', border: 'none', color: '#1D9E75', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
           S'inscrire
         </button>
       </div>

     </div>
   </div>
 );
}
