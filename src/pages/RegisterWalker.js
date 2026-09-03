import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function RegisterWalker() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: '',
    photo: '', bio: '',
  });
  const [error, setError] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoValid, setPhotoValid] = useState(false);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validateStep1 = () => {
    if (!form.firstName) return 'Entrez votre prénom';
    if (!form.email || !form.email.includes('@')) return 'Email invalide';
    if (form.password.length < 6) return 'Mot de passe trop court (6 caractères min)';
    if (!form.phone) return 'Le numéro de téléphone est obligatoire';
    const cleaned = form.phone.replace(/\s/g, '');
    if (!/^[67]\d{8}$/.test(cleaned)) return 'Numéro invalide — commence par 6 ou 7';
    if (!form.photo) return 'Votre photo de profil est obligatoire';
    if (!photoValid) return 'Attendez la validation de votre photo';
    return null;
  };

  const validateStep2 = () => {
    if (!form.bio || form.bio.trim().length < 20) return 'Présentez-vous en au moins 20 caractères';
    return null;
  };

  const nextStep = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      update('photo', ev.target.result);
      setPhotoLoading(true);
      setPhotoValid(false);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPhotoValid(true);
      setPhotoLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      if (!supabase) {
        setError('Configuration manquante — contactez le support');
        setLoading(false);
        return;
      }
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.firstName,
            last_name: form.lastName,
            phone: form.phone,
            // role + bio sont lus côté base de données par un déclencheur
            // (voir walker_profiles.sql) qui crée la ligne walker_profiles
            // automatiquement — ça marche même si le compte n'a pas encore
            // de session active (email pas encore confirmé).
            role: 'walker',
            bio: form.bio,
          }
        }
      });
      if (authError) {
        setError(authError.message.includes('already registered')
          ? 'Cet email est déjà utilisé — connectez-vous'
          : authError.message);
        setLoading(false);
        return;
      }
      if (!data?.user?.id) {
        setError('Erreur lors de la création du compte — réessayez');
        setLoading(false);
        return;
      }

      setStep(3);
    } catch (e) {
      console.error(e);
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

      <div style={{ background: 'linear-gradient(160deg, #0F6E56 0%, #1D9E75 100%)', padding: '48px 24px 32px' }}>
        <button onClick={() => step > 1 && step < 3 ? setStep(s => s - 1) : navigate('/')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
          ← Retour
        </button>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🚶🐾</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          {step === 1 ? 'Devenir promeneur' : step === 2 ? 'Votre présentation' : 'Bienvenue chez Dogger !'}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
          {step === 1 ? 'Étape 1 sur 2 — Vos informations' : step === 2 ? 'Étape 2 sur 2 — Parlez de vous' : ''}
        </p>
        {step < 3 && (
          <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.2)', borderRadius: 10, height: 4 }}>
            <div style={{ width: step === 1 ? '50%' : '100%', background: '#fff', borderRadius: 10, height: 4, transition: 'width 0.3s' }} />
          </div>
        )}
      </div>

      <div style={{ padding: '28px 24px' }}>

        {/* ÉTAPE 1 */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div onClick={() => !photoLoading && document.getElementById('walkerRegPhoto').click()}
                style={{ width: 90, height: 90, borderRadius: '50%', background: form.photo ? 'transparent' : '#FFF0F0', border: photoValid ? '2.5px solid #1D9E75' : '2.5px dashed #E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto 8px', overflow: 'hidden', position: 'relative' }}>
                {form.photo
                  ? <img src={form.photo} alt="profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28 }}>🧑</div>
                      <div style={{ fontSize: 10, color: '#E24B4A', marginTop: 2, fontWeight: 700 }}>Requis *</div>
                    </div>
                }
                {photoLoading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 20 }}>⏳</div>
                  </div>
                )}
                {photoValid && !photoLoading && (
                  <div style={{ position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✅</div>
                )}
              </div>
              <input id="walkerRegPhoto" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
              <div style={{ fontSize: 11, color: photoValid ? '#1D9E75' : '#E24B4A', fontWeight: 600 }}>
                {photoValid ? '✅ Photo ajoutée' : 'Photo de profil obligatoire *'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Prénom *</label>
                <input style={inputStyle} placeholder="Thomas" value={form.firstName}
                  onChange={e => update('firstName', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Nom *</label>
                <input style={inputStyle} placeholder="Martin" value={form.lastName}
                  onChange={e => update('lastName', e.target.value)} />
              </div>
            </div>
            <label style={labelStyle}>Email *</label>
            <input style={inputStyle} type="email" placeholder="thomas@exemple.fr" value={form.email}
              onChange={e => update('email', e.target.value)} />
            <label style={labelStyle}>Mot de passe *</label>
            <input style={inputStyle} type="password" placeholder="6 caractères minimum" value={form.password}
              onChange={e => update('password', e.target.value)} />
            <label style={labelStyle}>Téléphone * <span style={{ color: '#AAA', fontWeight: 400 }}>(commence par 6 ou 7)</span></label>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#555', zIndex: 1 }}>🇫🇷 +33</span>
              <input style={{ ...inputStyle, paddingLeft: 80, marginBottom: 0 }}
                type="tel" placeholder="6 12 34 56 78" maxLength={13}
                value={form.phone}
                onChange={e => { const val = e.target.value.replace(/[^\d\s]/g, ''); update('phone', val); }} />
            </div>
          </div>
        )}

        {/* ÉTAPE 2 */}
        {step === 2 && (
          <div>
            <label style={labelStyle}>Présentez-vous *</label>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
              Expérience avec les chiens, disponibilités générales, ce qui vous motive... (min. 20 caractères)
            </p>
            <textarea style={{ ...inputStyle, height: 140, resize: 'none' }}
              placeholder="Passionné(e) de chiens depuis toujours, disponible en semaine et le week-end dans le quartier..."
              value={form.bio} onChange={e => update('bio', e.target.value)} />
            <div style={{ textAlign: 'right', fontSize: 11, color: '#AAA', marginBottom: 8 }}>{form.bio.length} caractères</div>
          </div>
        )}

        {/* ÉTAPE 3 */}
        {step === 3 && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ marginBottom: 16 }}>
              {form.photo
                ? <img src={form.photo} alt="profil" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #1D9E75' }} />
                : <div style={{ fontSize: 64 }}>🎉</div>
              }
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Bienvenue {form.firstName} !</h2>
            <p style={{ fontSize: 15, color: '#888', lineHeight: 1.6, marginBottom: 8 }}>
              Votre profil promeneur est créé ! Vérifiez votre email pour confirmer votre compte.
            </p>
            <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#888', marginBottom: 24 }}>
              📧 Email de confirmation envoyé à <strong>{form.email}</strong>
            </div>
            <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '20px', marginBottom: 28, textAlign: 'left' }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 12, fontWeight: 600 }}>RÉCAPITULATIF</div>
              <div style={{ fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>👤 {form.firstName} {form.lastName}</div>
              <div style={{ fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>📧 {form.email}</div>
              <div style={{ fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>📱 +33 {form.phone}</div>
              <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
              <div style={{ fontSize: 13, color: '#555', fontStyle: 'italic' }}>"{form.bio}"</div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {step < 3 ? (
          <button onClick={step === 1 ? nextStep : handleSubmit} disabled={loading}
            style={{ width: '100%', padding: 16, background: loading ? '#A8D5C4' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)' }}>
            {loading ? 'Création du profil...' : step === 1 ? 'Continuer →' : 'Créer mon profil promeneur 🐾'}
          </button>
        ) : (
          <button onClick={() => navigate('/login?redirect=walker')}
            style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)' }}>
            Me connecter →
          </button>
        )}

        {step === 1 && (
          <button onClick={() => navigate('/login?redirect=walker')}
            style={{ width: '100%', padding: 14, background: 'transparent', color: '#1D9E75', border: 'none', fontSize: 14, cursor: 'pointer', marginTop: 8 }}>
            J'ai déjà un compte promeneur → Connexion
          </button>
        )}

      </div>
    </div>
  );
}
