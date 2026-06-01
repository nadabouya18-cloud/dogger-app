import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SERVICES = [
  { id: 'xs',     icon: '🐩', name: 'Dogger XS',   desc: 'Petits gabarits −10 kg', price: 12, duration: '30 min', popular: false },
  { id: 'solo',   icon: '🐕', name: 'Dogger Solo', desc: 'Balade individuelle',     price: 15, duration: '30 min', popular: false },
  { id: 'shared', icon: '🐕‍🦺', name: 'Shared',     desc: 'Balade en groupe',       price: 8,  duration: '45 min', popular: true  },
  { id: 'home',   icon: '🏠', name: 'Dogger Home', desc: 'Garde à domicile',       price: 25, duration: '1 nuit', popular: false },
];

const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

export default function BookingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    service: 'shared', address: '', date: '', time: '', notes: ''
  });
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const selectedService = SERVICES.find(s => s.id === form.service);

  const validateStep2 = () => {
    if (!form.address) return 'Entrez une adresse';
    if (!form.date) return 'Choisissez une date';
    if (!form.time) return 'Choisissez une heure';
    return null;
  };

  const nextStep = () => {
    if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
    }
    setError('');
    setStep(s => s + 1);
  };

  const confirm = () => {
    setConfirmed(true);
    setTimeout(() => navigate('/dashboard'), 2500);
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

  if (confirmed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: 'sans-serif', maxWidth: 430, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🐾</div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Balade confirmée !</h2>
          <p style={{ fontSize: 15, color: '#888', lineHeight: 1.6, marginBottom: 24 }}>
            Nous cherchons un promeneur disponible près de chez vous. Vous serez notifié dans quelques instants.
          </p>
          <div style={{ background: '#E1F5EE', borderRadius: 16, padding: '16px 20px', display: 'inline-block' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{selectedService.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F6E56' }}>{selectedService.name}</div>
            <div style={{ fontSize: 13, color: '#1D9E75' }}>{form.date} à {form.time}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(160deg, #0F6E56 0%, #1D9E75 100%)', padding: '48px 24px 32px' }}>
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
          ← Retour
        </button>
        <div style={{ fontSize: 28, marginBottom: 8 }}>
          {step === 1 ? '🐾' : step === 2 ? '📍' : '✅'}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          {step === 1 ? 'Choisir une formule' : step === 2 ? 'Où et quand ?' : 'Récapitulatif'}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Étape {step} sur 3</p>
        <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.2)', borderRadius: 10, height: 4 }}>
          <div style={{ width: `${(step / 3) * 100}%`, background: '#fff', borderRadius: 10, height: 4, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>

        {/* ÉTAPE 1 — FORMULE */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Sélectionnez la formule adaptée à votre chien</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SERVICES.map(s => (
                <div key={s.id} onClick={() => update('service', s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', borderRadius: 16, border: form.service === s.id ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: form.service === s.id ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer', position: 'relative' }}>
                  {s.popular && <span style={{ position: 'absolute', top: 10, right: 10, background: '#1D9E75', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>Populaire</span>}
                  <span style={{ fontSize: 32 }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 2 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{s.desc} · {s.duration}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1D9E75' }}>{s.price}€</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÉTAPE 2 — ADRESSE & HEURE */}
        {step === 2 && (
          <div>
            <label style={labelStyle}>Adresse de prise en charge</label>
            <input style={inputStyle} placeholder="12 rue de la Paix, Paris 75001"
              value={form.address} onChange={e => update('address', e.target.value)} />

            <label style={labelStyle}>Date</label>
            <input style={inputStyle} type="date" value={form.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => update('date', e.target.value)} />

            <label style={labelStyle}>Heure</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {TIMES.map(t => (
                <div key={t} onClick={() => update('time', t)}
                  style={{ padding: '10px 4px', textAlign: 'center', borderRadius: 10, border: form.time === t ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: form.time === t ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer', fontSize: 13, fontWeight: form.time === t ? 700 : 400, color: form.time === t ? '#0F6E56' : '#555' }}>
                  {t}
                </div>
              ))}
            </div>

            <label style={labelStyle}>Instructions spéciales (optionnel)</label>
            <textarea style={{ ...inputStyle, height: 80, resize: 'none' }}
              placeholder="Code porte, comportement particulier..."
              value={form.notes} onChange={e => update('notes', e.target.value)} />
          </div>
        )}

        {/* ÉTAPE 3 — RÉCAP */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Vérifiez votre commande avant de confirmer</p>

            <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 14 }}>VOTRE COMMANDE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{selectedService.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{selectedService.name}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>{selectedService.desc} · {selectedService.duration}</div>
                </div>
              </div>
              <div style={{ height: 1, background: '#EBEBEB', margin: '12px 0' }} />
              <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>📍 {form.address}</div>
              <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>📅 {form.date} à {form.time}</div>
              {form.notes && <div style={{ fontSize: 14, color: '#555' }}>📝 {form.notes}</div>}
              <div style={{ height: 1, background: '#EBEBEB', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, color: '#555' }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#1D9E75' }}>{selectedService.price}€</span>
              </div>
            </div>

            <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#888', marginBottom: 20 }}>
              💳 Votre carte sera débitée uniquement à la fin de la balade.
            </div>
          </div>
        )}

        {/* ERREUR */}
        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {/* BOUTON */}
        <button onClick={step < 3 ? nextStep : confirm}
          style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)' }}>
          {step === 1 ? 'Choisir cette formule →' : step === 2 ? 'Voir le récapitulatif →' : '🐾 Confirmer la balade'}
        </button>

      </div>
    </div>
  );
}
