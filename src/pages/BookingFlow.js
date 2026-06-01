import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SERVICES = [
  { id: 'xs',     icon: '🐩', name: 'Dogger XS',   desc: 'Petits gabarits −10 kg', pricePerMin: 0.35, popular: false },
  { id: 'solo',   icon: '🐕', name: 'Dogger Solo', desc: 'Balade individuelle',     pricePerMin: 0.42, popular: false },
  { id: 'shared', icon: '🐕‍🦺', name: 'Shared',     desc: 'Balade en groupe',       pricePerMin: 0.25, popular: true  },
  { id: 'home',   icon: '🏠', name: 'Dogger Home', desc: 'Garde à domicile',       pricePerMin: null, fixedPrice: 25, popular: false },
];

const DURATIONS = [
  { id: 30,  label: '30 min' },
  { id: 45,  label: '45 min' },
  { id: 60,  label: '1h' },
  { id: 90,  label: '1h30' },
  { id: 120, label: '2h' },
];

const TIMES = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

const WALKERS_NEARBY = [
  { name: 'Thomas M.', rating: 4.9, walks: 127, dist: '300m', eta: '8 min',  emoji: '🧑' },
  { name: 'Julie R.',  rating: 4.8, walks: 89,  dist: '500m', eta: '12 min', emoji: '👩' },
  { name: 'Karim B.',  rating: 5.0, walks: 203, dist: '800m', eta: '15 min', emoji: '🧔' },
];

const SEARCH_STEPS = [
  '🔍 Recherche de promeneurs à proximité...',
  '📡 Analyse de votre zone...',
  '🐾 3 promeneurs disponibles trouvés !',
  '📲 Envoi de la demande...',
  '✅ Mise en relation en cours...',
];

function getPrice(service, duration) {
  if (service.fixedPrice) return service.fixedPrice;
  return Math.round(service.pricePerMin * duration);
}

export default function BookingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('now');
  const [form, setForm] = useState({ service: 'shared', duration: 30, address: '', date: '', time: '', notes: '' });
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(0);
  const [matched, setMatched] = useState(false);
  const [walker, setWalker] = useState(null);
  const [dots, setDots] = useState([false, false, false]);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const selectedService = SERVICES.find(s => s.id === form.service);
  const price = getPrice(selectedService, form.duration);

  // Animation de recherche
  useEffect(() => {
    if (!searching) return;
    let i = 0;
    const interval = setInterval(() => {
      setSearchStep(i);
      i++;
      if (i >= SEARCH_STEPS.length) {
        clearInterval(interval);
        setTimeout(() => {
          setWalker(WALKERS_NEARBY[0]);
          setMatched(true);
          setSearching(false);
        }, 800);
      }
    }, 900);
    return () => clearInterval(interval);
  }, [searching]);

  // Animation des points
  useEffect(() => {
    if (!searching) return;
    const interval = setInterval(() => {
      setDots(d => {
        const next = [...d];
        const idx = next.indexOf(false);
        if (idx === -1) return [false, false, false];
        next[idx] = true;
        return next;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [searching]);

  const validateStep2 = () => {
    if (!form.address) return 'Entrez une adresse';
    if (mode === 'later' && !form.date) return 'Choisissez une date';
    if (mode === 'later' && !form.time) return 'Choisissez une heure';
    return null;
  };

  const nextStep = () => {
    if (step === 2) { const err = validateStep2(); if (err) { setError(err); return; } }
    setError('');
    setStep(s => s + 1);
  };

  const confirm = () => {
    if (mode === 'now') { setSearching(true); }
    else { setMatched(true); }
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: '1.5px solid #E8E8E8', fontSize: 15, fontFamily: 'inherit',
    outline: 'none', background: '#FAFAFA', color: '#1A1A1A',
    marginBottom: 12, boxSizing: 'border-box'
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, display: 'block' };

  // ── ÉCRAN RECHERCHE ──────────────────────────────────────────────────────
  if (searching) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'sans-serif', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @keyframes ping { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.5); opacity: 0; } }
          @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          @keyframes fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>

        {/* Carte simulée */}
        <div style={{ height: 340, background: 'linear-gradient(160deg, #E8F5F0 0%, #D0EDE4 100%)', position: 'relative', overflow: 'hidden' }}>
          {/* Grille de rues */}
          {[60,120,180,240,300].map(y => <div key={y} style={{ position: 'absolute', left: 0, right: 0, top: y, height: 1, background: 'rgba(29,158,117,0.12)' }} />)}
          {[60,120,180,240,300,360].map(x => <div key={x} style={{ position: 'absolute', top: 0, bottom: 0, left: x, width: 1, background: 'rgba(29,158,117,0.12)' }} />)}

          {/* Promeneurs sur la carte */}
          {[{ x: 80, y: 80 }, { x: 200, y: 120 }, { x: 300, y: 60 }].map((pos, i) => (
            <div key={i} style={{ position: 'absolute', left: pos.x, top: pos.y, animation: `float ${1.5 + i * 0.3}s ease-in-out infinite` }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 3px 10px rgba(29,158,117,0.4)' }}>🚶</div>
            </div>
          ))}

          {/* Radar central */}
          <div style={{ position: 'absolute', left: '50%', top: '55%', transform: 'translate(-50%,-50%)' }}>
            <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', border: '2px solid rgba(29,158,117,0.3)', top: -40, left: -40, animation: 'ping 1.2s ease-out infinite' }} />
            <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', border: '2px solid rgba(29,158,117,0.2)', top: -60, left: -60, animation: 'ping 1.2s ease-out infinite 0.4s' }} />
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 16px rgba(29,158,117,0.5)', position: 'relative', zIndex: 2 }}>📍</div>
          </div>

          {/* Badge */}
          <div style={{ position: 'absolute', top: 16, left: 16, background: 'white', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#1D9E75', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            Paris 🗺️
          </div>
        </div>

        {/* Panel du bas */}
        <div style={{ flex: 1, padding: '24px 24px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {dots.map((active, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: active ? '#1D9E75' : '#E0E0E0', transition: 'background 0.2s' }} />
              ))}
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>Recherche en cours</span>
          </div>

          {/* Étapes de recherche */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SEARCH_STEPS.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderRadius: 12, background: i === searchStep ? '#E1F5EE' : i < searchStep ? '#F8FAF9' : '#FAFAFA',
                border: i === searchStep ? '1.5px solid #1D9E75' : '1.5px solid transparent',
                opacity: i > searchStep ? 0.4 : 1,
                animation: i === searchStep ? 'fadein 0.3s ease' : 'none',
                transition: 'all 0.3s'
              }}>
                <span style={{ fontSize: 18 }}>{i < searchStep ? '✅' : i === searchStep ? '⏳' : '○'}</span>
                <span style={{ fontSize: 14, fontWeight: i === searchStep ? 600 : 400, color: i === searchStep ? '#0F6E56' : '#555' }}>{s}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: '#AAA', marginTop: 20, textAlign: 'center' }}>
            Temps moyen de mise en relation : 30–90 secondes
          </p>
        </div>
      </div>
    );
  }

  // ── ÉCRAN MATCH TROUVÉ ───────────────────────────────────────────────────
  if (matched && walker) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'sans-serif', maxWidth: 430, margin: '0 auto' }}>
        <style>{`@keyframes slidein { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 24px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            {mode === 'now' ? 'Promeneur trouvé !' : 'Balade planifiée !'}
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
            {mode === 'now' ? 'Votre chien va adorer !' : 'Rendez-vous confirmé !'}
          </p>
        </div>

        <div style={{ padding: '24px 20px', animation: 'slidein 0.4s ease' }}>
          {/* Promeneur */}
          {mode === 'now' && (
            <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                {walker.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', marginBottom: 2 }}>{walker.name}</div>
                <div style={{ fontSize: 13, color: '#1D9E75', marginBottom: 2 }}>⭐ {walker.rating} · {walker.walks} balades</div>
                <div style={{ fontSize: 12, color: '#888' }}>📍 À {walker.dist} · ETA {walker.eta}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1D9E75' }}>{walker.eta}</div>
                <div style={{ fontSize: 11, color: '#888' }}>arrivée</div>
              </div>
            </div>
          )}

          {/* Détails balade */}
          <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 12 }}>DÉTAILS DE LA BALADE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{selectedService.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{selectedService.name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{selectedService.desc}</div>
              </div>
            </div>
            <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
            <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>⏱️ Durée : {DURATIONS.find(d => d.id === form.duration)?.label}</div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>
              {mode === 'now' ? "⚡ Maintenant" : `📅 ${form.date} à ${form.time}`}
            </div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>📍 {form.address}</div>
            <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#555' }}>Total estimé</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#1D9E75' }}>{price}€</span>
            </div>
          </div>

          <button onClick={() => navigate('/dashboard')}
            style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)', marginBottom: 12 }}>
            🗺️ Suivre la balade en direct
          </button>
          <button onClick={() => navigate('/')}
            style={{ width: '100%', padding: 14, background: 'transparent', color: '#888', border: '1.5px solid #E8E8E8', borderRadius: 14, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // ── FORMULAIRE PRINCIPAL ─────────────────────────────────────────────────
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

        {/* ÉTAPE 1 — FORMULE + DURÉE */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Sélectionnez la formule adaptée à votre chien</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {SERVICES.map(s => (
                <div key={s.id} onClick={() => update('service', s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', borderRadius: 16, border: form.service === s.id ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: form.service === s.id ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer', position: 'relative' }}>
                  {s.popular && <span style={{ position: 'absolute', top: 10, right: 10, background: '#1D9E75', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>Populaire</span>}
                  <span style={{ fontSize: 32 }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 2 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{s.desc}</div>
                  </div>
                  {s.fixedPrice
                    ? <div style={{ fontSize: 16, fontWeight: 700, color: '#1D9E75' }}>{s.fixedPrice}€</div>
                    : <div style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75' }}>dès {Math.round(s.pricePerMin * 30)}€</div>
                  }
                </div>
              ))}
            </div>

            {/* DURÉE */}
            {selectedService && !selectedService.fixedPrice && (
              <>
                <label style={labelStyle}>⏱️ Durée de la balade</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {DURATIONS.map(d => (
                    <div key={d.id} onClick={() => update('duration', d.id)}
                      style={{ padding: '10px 16px', borderRadius: 12, border: form.duration === d.id ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: form.duration === d.id ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer', fontSize: 14, fontWeight: form.duration === d.id ? 700 : 400, color: form.duration === d.id ? '#0F6E56' : '#555' }}>
                      {d.label}
                    </div>
                  ))}
                </div>
                <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#0F6E56', fontWeight: 600 }}>
                  Prix estimé : {getPrice(selectedService, form.duration)}€
                </div>
              </>
            )}
          </div>
        )}

        {/* ÉTAPE 2 — ADRESSE & MODE */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', background: '#F0F0F0', borderRadius: 14, padding: 4, marginBottom: 20 }}>
              <button onClick={() => setMode('now')}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: mode === 'now' ? '#fff' : 'transparent', color: mode === 'now' ? '#1D9E75' : '#888', boxShadow: mode === 'now' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                ⚡ Maintenant
              </button>
              <button onClick={() => setMode('later')}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: mode === 'later' ? '#fff' : 'transparent', color: mode === 'later' ? '#1D9E75' : '#888', boxShadow: mode === 'later' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                📅 Planifier
              </button>
            </div>

            {mode === 'now' && (
              <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#0F6E56', marginBottom: 16, fontWeight: 500 }}>
                ⚡ Un promeneur sera chez vous dans 30–90 min
              </div>
            )}

            <label style={labelStyle}>Adresse de prise en charge</label>
            <input style={inputStyle} placeholder="12 rue de la Paix, Paris 75001"
              value={form.address} onChange={e => update('address', e.target.value)} />

            {mode === 'later' && (
              <>
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
              </>
            )}

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
                  <div style={{ fontSize: 13, color: '#888' }}>{selectedService.desc}</div>
                </div>
              </div>
              <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
              <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>⏱️ {DURATIONS.find(d => d.id === form.duration)?.label}</div>
              <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>
                {mode === 'now' ? '⚡ Maintenant — arrivée dans ~30 min' : `📅 ${form.date} à ${form.time}`}
              </div>
              <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>📍 {form.address}</div>
              {form.notes && <div style={{ fontSize: 14, color: '#555' }}>📝 {form.notes}</div>}
              <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, color: '#555' }}>Total estimé</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#1D9E75' }}>{price}€</span>
              </div>
            </div>
            <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#888', marginBottom: 20 }}>
              💳 Votre carte sera débitée uniquement à la fin de la balade.
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={step < 3 ? nextStep : confirm}
          style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)' }}>
          {step === 1 ? 'Continuer →' : step === 2 ? 'Voir le récapitulatif →' : mode === 'now' ? '⚡ Trouver un promeneur maintenant' : '🐾 Confirmer la balade'}
        </button>

      </div>
    </div>
  );
}
