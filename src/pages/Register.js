import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BREEDS = [
  'Labrador', 'Golden Retriever', 'Berger Allemand', 'Bouledogue Français',
  'Beagle', 'Caniche', 'Chihuahua', 'Yorkshire', 'Shih Tzu', 'Carlin',
  'Husky', 'Rottweiler', 'Dobermann', 'Dalmatien', 'Cocker Spaniel',
  'Border Collie', 'Cavalier King Charles', 'Bichon Frisé', 'Autre'
];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    dogName: '', dogBreed: '', dogSize: '', dogNotes: ''
  });
  const [error, setError] = useState('');

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validateStep1 = () => {
    if (!form.firstName) return 'Entrez votre prénom';
    if (!form.email || !form.email.includes('@')) return 'Email invalide';
    if (form.password.length < 6) return 'Mot de passe trop court (6 caractères min)';
    return null;
  };

  const validateStep2 = () => {
    if (!form.dogName) return 'Entrez le nom de votre chien';
    if (!form.dogBreed) return 'Sélectionnez une race';
    if (!form.dogSize) return 'Sélectionnez un gabarit';
    return null;
  };

  const nextStep = () => {
    const err = step === 1 ? validateStep1() : validateStep2();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: '1.5px solid #E8E8E8', fontSize: 15, fontFamily: 'inherit',
    outline: 'none', background: '#FAFAFA', color: '#1A1A1A',
    marginBottom: 12, boxSizing: 'border-box'
  };

  const labelStyle = {
    fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, display: 'block'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(160deg, #0F6E56 0%, #1D9E75 100%)', padding: '48px 24px 32px' }}>
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
          ← Retour
        </button>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🐾</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          {step === 1 ? 'Créer mon compte' : step === 2 ? 'Mon chien' : 'Tout est prêt !'}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
          {step === 1 ? 'Étape 1 sur 2 — Vos informations' : step === 2 ? 'Étape 2 sur 2 — Profil de votre chien' : ''}
        </p>

        {/* PROGRESS BAR */}
        {step < 3 && (
          <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.2)', borderRadius: 10, height: 4 }}>
            <div style={{ width: step === 1 ? '50%' : '100%', background: '#fff', borderRadius: 10, height: 4, transition: 'width 0.3s' }} />
          </div>
        )}
      </div>

      <div style={{ padding: '28px 24px' }}>

        {/* ÉTAPE 1 — INFOS PERSO */}
        {step === 1 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 0 }}>
              <div>
                <label style={labelStyle}>Prénom *</label>
                <input style={inputStyle} placeholder="Marie" value={form.firstName}
                  onChange={e => update('firstName', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Nom</label>
                <input style={inputStyle} placeholder="Dupont" value={form.lastName}
                  onChange={e => update('lastName', e.target.value)} />
              </div>
            </div>
            <label style={labelStyle}>Email *</label>
            <input style={inputStyle} type="email" placeholder="marie@exemple.fr" value={form.email}
              onChange={e => update('email', e.target.value)} />
            <label style={labelStyle}>Mot de passe *</label>
            <input style={inputStyle} type="password" placeholder="6 caractères minimum" value={form.password}
              onChange={e => update('password', e.target.value)} />

            <div style={{ background: '#F8FAF9', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#888' }}>
              🔒 Vos données sont sécurisées et ne seront jamais revendues.
            </div>
          </div>
        )}

        {/* ÉTAPE 2 — PROFIL CHIEN */}
        {step === 2 && (
          <div>
            <label style={labelStyle}>Nom de votre chien *</label>
            <input style={inputStyle} placeholder="Rex, Luna, Nala..." value={form.dogName}
              onChange={e => update('dogName', e.target.value)} />

            <label style={labelStyle}>Race *</label>
            <select style={{ ...inputStyle, appearance: 'none' }} value={form.dogBreed}
              onChange={e => update('dogBreed', e.target.value)}>
              <option value="">Sélectionner une race</option>
              {BREEDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <label style={labelStyle}>Gabarit *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[
                { id: 'xs', label: '🐩 XS', desc: '< 10 kg' },
                { id: 'sm', label: '🐕 S',  desc: '10–20 kg' },
                { id: 'md', label: '🦮 M',  desc: '20–35 kg' },
                { id: 'lg', label: '🐕‍🦺 L', desc: '> 35 kg' },
              ].map(s => (
                <div key={s.id} onClick={() => update('dogSize', s.id)}
                  style={{ padding: '14px', borderRadius: 12, border: form.dogSize === s.id ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: form.dogSize === s.id ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{s.desc}</div>
                </div>
              ))}
            </div>

            <label style={labelStyle}>Notes spéciales (optionnel)</label>
            <textarea style={{ ...inputStyle, height: 80, resize: 'none' }}
              placeholder="Allergies, médicaments, comportement particulier..."
              value={form.dogNotes} onChange={e => update('dogNotes', e.target.value)} />
          </div>
        )}

        {/* ÉTAPE 3 — CONFIRMATION */}
        {step === 3 && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
              Bienvenue {form.firstName} !
            </h2>
            <p style={{ fontSize: 15, color: '#888', lineHeight: 1.6, marginBottom: 24 }}>
              Votre compte est créé et {form.dogName} est prêt pour ses premières balades Dogger.
            </p>
            <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '20px', marginBottom: 28, textAlign: 'left' }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 12, fontWeight: 600 }}>RÉCAPITULATIF</div>
              <div style={{ fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>👤 {form.firstName} {form.lastName}</div>
              <div style={{ fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>📧 {form.email}</div>
              <div style={{ fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>🐾 {form.dogName} — {form.dogBreed}</div>
              <div style={{ fontSize: 14, color: '#1A1A1A' }}>📏 Gabarit : {form.dogSize.toUpperCase()}</div>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {/* BOUTON */}
        {step < 3 ? (
          <button onClick={nextStep}
            style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)' }}>
            {step === 1 ? 'Continuer →' : 'Créer mon compte 🐾'}
          </button>
        ) : (
          <button onClick={() => navigate('/dashboard')}
            style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)' }}>
            Accéder à mon espace →
          </button>
        )}

        {step === 1 && (
          <button onClick={() => navigate('/login')}
            style={{ width: '100%', padding: 14, background: 'transparent', color: '#1D9E75', border: 'none', fontSize: 14, cursor: 'pointer', marginTop: 8 }}>
            J'ai déjà un compte → Connexion
          </button>
        )}

      </div>
    </div>
  );
}
