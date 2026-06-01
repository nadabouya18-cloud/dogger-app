import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DOGS = [
  { id: 1, name: 'Luna', breed: 'Golden Retriever', size: 'L', icon: '🐕', age: '3 ans' },
  { id: 2, name: 'Milo', breed: 'Bouledogue Français', size: 'XS', icon: '🐩', age: '1 an' },
];

const HISTORY = [
  { id: 1, dog: 'Luna', walker: 'Thomas M.', date: "Aujourd'hui 14h00", duration: 45, price: 18, rating: 5, status: 'Terminé' },
  { id: 2, dog: 'Milo', walker: 'Julie R.',  date: 'Hier 10h30',        duration: 30, price: 12, rating: 4, status: 'Terminé' },
  { id: 3, dog: 'Luna', walker: 'Karim B.',  date: '28 mai 16h00',      duration: 60, price: 22, rating: 5, status: 'Terminé' },
  { id: 4, dog: 'Milo', walker: 'Thomas M.', date: '25 mai 09h00',      duration: 45, price: 18, rating: 5, status: 'Terminé' },
];

const WALK_STEPS = [
  'Thomas est en route vers vous...',
  'Thomas est arrivé ! 🎉',
  'La balade a commencé 🐾',
  'Luna profite de sa balade !',
  'Presque terminé...',
  'Luna est rentrée ✅',
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('home');
  const [activeWalk, setActiveWalk] = useState(true);
  const [walkStep, setWalkStep] = useState(2);
  const [walkTime, setWalkTime] = useState(847);
  const [selectedDog, setSelectedDog] = useState(null);

  // Simulation progression balade
  useEffect(() => {
    if (!activeWalk) return;
    const t = setInterval(() => setWalkTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [activeWalk]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAF9', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto', paddingBottom: 80 }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes slidein { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @key* ping { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2); opacity: 0; } }
      `}</style>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 24px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>Bonjour 👋</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Marie D.</h1>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👤</div>
        </div>

        {/* BALADE EN COURS MINI */}
        {activeWalk && (
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => setTab('live')}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7FFFD4', animation: 'pulse 1s infinite', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Luna est en balade 🐾</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Thomas M. · {formatTime(walkTime)}</div>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Suivre →</div>
          </div>
        )}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #F0F0F0' }}>
        {[
          { id: 'home',    label: '🏠 Accueil' },
          { id: 'live',    label: '📍 En direct' },
          { id: 'dogs',    label: '🐾 Mes chiens' },
          { id: 'history', label: '📋 Historique' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '12px 4px', border: 'none', background: 'transparent', fontSize: 11, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? '#1D9E75' : '#888', borderBottom: tab === t.id ? '2px solid #1D9E75' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px' }}>

        {/* ── ACCUEIL ── */}
        {tab === 'home' && (
          <div style={{ animation: 'slidein 0.3s ease' }}>
            {/* CTA Commander */}
            <div style={{ background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', borderRadius: 18, padding: '20px', marginBottom: 16, cursor: 'pointer' }}
              onClick={() => navigate('/book')}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🐾</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Commander une balade</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Promeneurs disponibles près de vous</div>
              <div style={{ marginTop: 14, background: '#fff', borderRadius: 10, padding: '10px 16px', display: 'inline-block' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>⚡ Commander maintenant →</span>
              </div>
            </div>

            {/* Mes chiens (résumé) */}
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>Mes chiens</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {DOGS.map(d => (
                <div key={d.id} style={{ flex: 1, background: '#fff', borderRadius: 14, padding: '14px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{d.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{d.breed}</div>
                  <div style={{ fontSize: 11, color: '#1D9E75', marginTop: 4, fontWeight: 600 }}>{d.age}</div>
                </div>
              ))}
              <div onClick={() => setTab('dogs')}
                style={{ width: 80, background: '#F8FAF9', borderRadius: 14, padding: '14px', textAlign: 'center', border: '1.5px dashed #D0D0D0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 24, color: '#CCC' }}>+</div>
                <div style={{ fontSize: 11, color: '#AAA', marginTop: 4 }}>Ajouter</div>
              </div>
            </div>

            {/* Dernière balade */}
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>Dernière balade</h3>
            <div style={{ background: '#fff', borderRadius: 14, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🐕</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>Luna avec Thomas M.</div>
                  <div style={{ fontSize: 12, color: '#888' }}>Aujourd'hui 14h00 · 45 min</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75' }}>18€</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>{'⭐'.repeat(5)}</div>
                <span style={{ fontSize: 12, color: '#888', background: '#E1F5EE', borderRadius: 8, padding: '3px 8px' }}>Terminé</span>
              </div>
            </div>
          </div>
        )}

        {/* ── LIVE ── */}
        {tab === 'live' && (
          <div style={{ animation: 'slidein 0.3s ease' }}>
            {activeWalk ? (
              <div>
                {/* Carte simulée */}
                <div style={{ height: 220, background: 'linear-gradient(160deg, #E8F5F0, #D0EDE4)', borderRadius: 18, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
                  {[40,90,140,190].map(y => <div key={y} style={{ position: 'absolute', left: 0, right: 0, top: y, height: 1, background: 'rgba(29,158,117,0.15)' }} />)}
                  {[50,110,170,230,290,350].map(x => <div key={x} style={{ position: 'absolute', top: 0, bottom: 0, left: x, width: 1, background: 'rgba(29,158,117,0.15)' }} />)}

                  {/* Position promeneur */}
                  <div style={{ position: 'absolute', left: '45%', top: '40%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 12px rgba(29,158,117,0.5)', animation: 'pulse 2s infinite' }}>🚶</div>
                  </div>

                  {/* Position domicile */}
                  <div style={{ position: 'absolute', left: '70%', top: '65%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', border: '2px solid #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏠</div>
                  </div>

                  {/* Badge temps */}
                  <div style={{ position: 'absolute', top: 12, left: 12, background: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 14, fontWeight: 700, color: '#1D9E75', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    {formatTime(walkTime)} ⏱️
                  </div>

                  <div style={{ position: 'absolute', top: 12, right: 12, background: '#1D9E75', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#fff', animation: 'pulse 2s infinite' }}>
                    🔴 Live
                  </div>
                </div>

                {/* Info promeneur */}
                <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧑</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Thomas M.</div>
                      <div style={{ fontSize: 13, color: '#1D9E75' }}>⭐ 4.9 · 127 balades</div>
                    </div>
                    <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75' }}>~10 min</div>
                      <div style={{ fontSize: 11, color: '#888' }}>retour</div>
                    </div>
                  </div>

                  {/* Étapes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {WALK_STEPS.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i > walkStep ? 0.3 : 1 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: i <= walkStep ? '#1D9E75' : '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', flexShrink: 0, fontWeight: 700 }}>
                          {i < walkStep ? '✓' : i === walkStep ? '●' : ''}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: i === walkStep ? 700 : 400, color: i === walkStep ? '#1D9E75' : '#555' }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Photos reçues */}
                <div style={{ background: '#fff', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>📸 Photos reçues</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['🌳', '🌿', '🐕'].map((e, i) => (
                      <div key={i} style={{ flex: 1, height: 80, background: '#E1F5EE', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{e}</div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>😴</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Aucune balade en cours</h3>
                <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>Commandez une balade pour suivre votre chien en temps réel.</p>
                <button onClick={() => navigate('/book')}
                  style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  Commander une balade
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── MES CHIENS ── */}
        {tab === 'dogs' && (
          <div style={{ animation: 'slidein 0.3s ease' }}>
            {DOGS.map(d => (
              <div key={d.id} onClick={() => setSelectedDog(selectedDog?.id === d.id ? null : d)}
                style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', border: selectedDog?.id === d.id ? '1.5px solid #1D9E75' : '1.5px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{d.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{d.name}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>{d.breed} · {d.age}</div>
                    <div style={{ fontSize: 12, color: '#1D9E75', marginTop: 2 }}>Gabarit {d.size}</div>
                  </div>
                  <div style={{ fontSize: 20, color: '#CCC' }}>{selectedDog?.id === d.id ? '▲' : '▼'}</div>
                </div>
                {selectedDog?.id === d.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0F0F0' }}>
                    <button onClick={() => navigate('/book')}
                      style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
                      🐾 Commander une balade pour {d.name}
                    </button>
                    <button style={{ width: '100%', padding: '11px', background: 'transparent', color: '#888', border: '1.5px solid #E8E8E8', borderRadius: 12, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ✏️ Modifier le profil
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '20px', textAlign: 'center', border: '1.5px dashed #D0D0D0', cursor: 'pointer' }}
              onClick={() => navigate('/register')}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>➕</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#888' }}>Ajouter un chien</div>
            </div>
          </div>
        )}

        {/* ── HISTORIQUE ── */}
        {tab === 'history' && (
          <div style={{ animation: 'slidein 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Toutes les balades</h3>
              <span style={{ fontSize: 13, color: '#1D9E75', fontWeight: 600 }}>{HISTORY.length} balades</span>
            </div>
            {HISTORY.map(h => (
              <div key={h.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🐕</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{h.dog} avec {h.walker}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{h.date} · {h.duration} min</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75' }}>{h.price}€</div>
                    <div style={{ fontSize: 11, background: '#E1F5EE', color: '#0F6E56', borderRadius: 6, padding: '2px 6px', marginTop: 2 }}>{h.status}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14 }}>{'⭐'.repeat(h.rating)}</div>
                  <span style={{ fontSize: 12, color: '#888', cursor: 'pointer', color: '#1D9E75' }}>Voir le rapport →</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#fff', borderTop: '1px solid #F0F0F0', display: 'flex', padding: '8px 0 16px' }}>
        {[
          { id: 'home',    icon: '🏠', label: 'Accueil' },
          { id: 'live',    icon: '📍', label: 'En direct' },
          { id: 'dogs',    icon: '🐾', label: 'Chiens' },
          { id: 'history', icon: '📋', label: 'Historique' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px 0', fontFamily: 'inherit' }}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>{t.icon}</div>
            <div style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? '#1D9E75' : '#AAA' }}>{t.label}</div>
          </button>
        ))}
      </div>

    </div>
  );
}
