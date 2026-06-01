import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MISSIONS = [
  { id: 1, dog: 'Luna', breed: 'Golden Retriever', size: 'L', duration: 45, price: 18, dist: '300m', address: '12 rue de Rivoli, Paris 75001', owner: 'Marie D.', rating: 4.8, icon: '🐕', urgent: true },
  { id: 2, dog: 'Rex',  breed: 'Bouledogue Français', size: 'XS', duration: 30, price: 12, dist: '600m', address: '8 avenue Montaigne, Paris 75008', owner: 'Pierre L.', rating: 5.0, icon: '🐩', urgent: false },
  { id: 3, dog: 'Nala', breed: 'Husky', size: 'M', duration: 60, price: 22, dist: '900m', address: '3 rue du Faubourg, Paris 75011', owner: 'Sophie M.', rating: 4.9, icon: '🦮', urgent: false },
];

export default function WalkerHome() {
  const navigate = useNavigate();
  const [available, setAvailable] = useState(false);
  const [activeMission, setActiveMission] = useState(null);
  const [timer, setTimer] = useState(90);
  const [accepted, setAccepted] = useState(false);
  const [walking, setWalking] = useState(false);
  const [walkTimer, setWalkTimer] = useState(0);
  const [tab, setTab] = useState('missions');

  // Timer mission
  useEffect(() => {
    if (!activeMission || accepted) return;
    if (timer === 0) { setActiveMission(null); setTimer(90); return; }
    const t = setInterval(() => setTimer(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [activeMission, timer, accepted]);

  // Timer balade
  useEffect(() => {
    if (!walking) return;
    const t = setInterval(() => setWalkTimer(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [walking]);

  const formatWalkTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const acceptMission = () => { setAccepted(true); };
  const startWalk = () => { setWalking(true); };
  const endWalk = () => { setWalking(false); setAccepted(false); setActiveMission(null); setWalkTimer(0); setTimer(90); };

  const timerColor = timer > 60 ? '#1D9E75' : timer > 30 ? '#F59E0B' : '#E24B4A';
  const timerPercent = (timer / 90) * 100;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAF9', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto' }}>
      <style>{`
        @keyframes slideup { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 24px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Bonjour 👋</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Espace Promeneur</h1>
          </div>
          <button onClick={() => navigate('/')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}>
            ← Accueil
          </button>
        </div>

        {/* TOGGLE DISPONIBILITÉ */}
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
              {available ? '🟢 Disponible' : '🔴 Indisponible'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
              {available ? 'Vous recevez des missions' : 'Activez pour recevoir des missions'}
            </div>
          </div>
          <div onClick={() => setAvailable(a => !a)}
            style={{ width: 52, height: 28, borderRadius: 14, background: available ? '#fff' : 'rgba(255,255,255,0.3)', cursor: 'pointer', position: 'relative', transition: 'all 0.3s' }}>
            <div style={{ position: 'absolute', width: 22, height: 22, borderRadius: '50%', background: available ? '#1D9E75' : '#fff', top: 3, left: available ? 27 : 3, transition: 'left 0.3s', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
          </div>
        </div>

        {/* GAINS SEMAINE */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {[{ label: 'Cette semaine', val: '127€' }, { label: 'Ce mois', val: '423€' }, { label: 'Balades', val: '18' }].map((s, i) => (
            <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #F0F0F0' }}>
        {[{ id: 'missions', label: '🐕 Missions' }, { id: 'history', label: '📋 Historique' }, { id: 'profile', label: '👤 Profil' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '14px 8px', border: 'none', background: 'transparent', fontSize: 13, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? '#1D9E75' : '#888', borderBottom: tab === t.id ? '2px solid #1D9E75' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px' }}>

        {/* TAB MISSIONS */}
        {tab === 'missions' && (
          <div>
            {!available ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>😴</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Vous êtes hors ligne</h3>
                <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>Activez votre disponibilité pour recevoir des missions près de chez vous.</p>
                <button onClick={() => setAvailable(true)}
                  style={{ marginTop: 20, padding: '12px 28px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  Me mettre disponible
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 16, animation: 'pulse 2s infinite' }}>
                  📡 En écoute — {MISSIONS.length} missions disponibles près de vous
                </p>
                {MISSIONS.map(m => (
                  <div key={m.id} onClick={() => { setActiveMission(m); setTimer(90); setAccepted(false); }}
                    style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'pointer', border: m.urgent ? '1.5px solid #F59E0B' : '1.5px solid transparent' }}>
                    {m.urgent && <div style={{ background: '#FFF8E1', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#F59E0B', display: 'inline-block', marginBottom: 10 }}>⚡ URGENT</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{m.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{m.dog}</div>
                        <div style={{ fontSize: 13, color: '#888' }}>{m.breed} · Gabarit {m.size}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#1D9E75' }}>{m.price}€</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{m.duration} min</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ background: '#F0F0F0', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#555' }}>📍 {m.dist}</span>
                      <span style={{ background: '#F0F0F0', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#555' }}>⭐ {m.owner} {m.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB HISTORIQUE */}
        {tab === 'history' && (
          <div>
            {[
              { dog: 'Milo', date: "Aujourd'hui 14h00", duration: 45, price: 18, status: 'Terminé' },
              { dog: 'Bella', date: 'Hier 10h30', duration: 30, price: 12, status: 'Terminé' },
              { dog: 'Oscar', date: '28 mai 16h00', duration: 60, price: 22, status: 'Terminé' },
            ].map((h, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🐕</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{h.dog}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{h.date} · {h.duration} min</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75' }}>{h.price}€</div>
                  <div style={{ fontSize: 11, color: '#888', background: '#E1F5EE', borderRadius: 6, padding: '2px 6px', marginTop: 2 }}>{h.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB PROFIL */}
        {tab === 'profile' && (
          <div>
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🧑</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A' }}>Mon Profil</div>
                  <div style={{ fontSize: 13, color: '#1D9E75' }}>⭐ 4.9 · 18 balades</div>
                </div>
              </div>
              {[
                { label: 'Zone de travail', val: 'Paris 1–11e' },
                { label: 'Gabarits acceptés', val: 'XS, S, M, L' },
                { label: 'Statut', val: '✅ Vérifié Dogger' },
                { label: 'Prochain versement', val: 'Lundi 127€' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 3 ? '1px solid #F5F5F5' : 'none' }}>
                  <span style={{ fontSize: 14, color: '#888' }}>{item.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL MISSION */}
      {activeMission && !accepted && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430, animation: 'slideup 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>Nouvelle mission ! 🐾</h3>
              {/* Timer circulaire */}
              <div style={{ position: 'relative', width: 52, height: 52 }}>
                <svg width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="26" cy="26" r="22" fill="none" stroke="#F0F0F0" strokeWidth="4" />
                  <circle cx="26" cy="26" r="22" fill="none" stroke={timerColor} strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - timerPercent / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1s linear' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: timerColor }}>{timer}s</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#F8FAF9', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{activeMission.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{activeMission.dog}</div>
                <div style={{ fontSize: 13, color: '#888' }}>{activeMission.breed} · Gabarit {activeMission.size}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Propriétaire : {activeMission.owner} ⭐{activeMission.rating}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1, background: '#F0F0F0', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{activeMission.duration} min</div>
                <div style={{ fontSize: 11, color: '#888' }}>Durée</div>
              </div>
              <div style={{ flex: 1, background: '#F0F0F0', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{activeMission.dist}</div>
                <div style={{ fontSize: 11, color: '#888' }}>Distance</div>
              </div>
              <div style={{ flex: 1, background: '#E1F5EE', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75' }}>{activeMission.price}€</div>
                <div style={{ fontSize: 11, color: '#888' }}>Gains nets</div>
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>📍 {activeMission.address}</div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setActiveMission(null); setTimer(90); }}
                style={{ flex: 1, padding: '14px', background: '#F5F5F5', color: '#888', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Refuser
              </button>
              <button onClick={acceptMission}
                style={{ flex: 2, padding: '14px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(29,158,117,0.4)' }}>
                ✅ Accepter la mission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BALADE EN COURS */}
      {accepted && activeMission && (
        <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 200, display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 24px 24px' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              {walking ? '🐾 Balade en cours' : '📍 En route vers le client'}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{activeMission.address}</p>
          </div>

          <div style={{ flex: 1, padding: '24px 20px' }}>
            <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '20px', marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{activeMission.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>{activeMission.dog}</div>
              <div style={{ fontSize: 14, color: '#888' }}>{activeMission.breed}</div>
              {walking && (
                <div style={{ marginTop: 16, fontSize: 36, fontWeight: 700, color: '#1D9E75' }}>
                  {formatWalkTime(walkTimer)}
                </div>
              )}
              {walking && <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Durée de la balade</div>}
            </div>

            {!walking ? (
              <button onClick={startWalk}
                style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12, boxShadow: '0 4px 14px rgba(29,158,117,0.4)' }}>
                🐾 Démarrer la balade
              </button>
            ) : (
              <button onClick={endWalk}
                style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #E24B4A, #C0392B)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12, boxShadow: '0 4px 14px rgba(226,75,74,0.4)' }}>
                ✅ Terminer la balade
              </button>
            )}

            <button onClick={() => { setAccepted(false); setWalking(false); setWalkTimer(0); setActiveMission(null); }}
              style={{ width: '100%', padding: 14, background: 'transparent', color: '#888', border: '1.5px solid #E8E8E8', borderRadius: 14, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
