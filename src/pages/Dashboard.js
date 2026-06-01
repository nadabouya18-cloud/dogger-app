import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const HISTORY = [
  { id: 1, dog: 'Luna', walker: 'Thomas M.', date: "Aujourd'hui 14h00", duration: 45, price: 18, rating: 5, status: 'Terminé' },
  { id: 2, dog: 'Milo', walker: 'Julie R.',  date: 'Hier 10h30',        duration: 30, price: 12, rating: 4, status: 'Terminé' },
  { id: 3, dog: 'Luna', walker: 'Karim B.',  date: '28 mai 16h00',      duration: 60, price: 22, rating: 5, status: 'Terminé' },
];

const WALK_STEPS = [
  'Thomas est en route vers vous...',
  'Thomas est arrivé ! 🎉',
  'La balade a commencé 🐾',
  'Votre chien profite de sa balade !',
  'Presque terminé...',
  'Votre chien est rentré ✅',
];

const SIZE_ICONS = { xs: '🐩', s: '🐕', m: '🦮', l: '🐕‍🦺' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('home');
  const [activeWalk, setActiveWalk] = useState(false);
  const [walkStep] = useState(2);
  const [walkTime, setWalkTime] = useState(0);
  const [selectedDog, setSelectedDog] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/login'); return; }
        const { data: profileData } = await supabase
          .from('profiles').select('*').eq('id', user.id).single();
        if (profileData) setProfile(profileData);
        const { data: dogsData } = await supabase
          .from('dogs').select('*').eq('owner_id', user.id);
        if (dogsData) setDogs(dogsData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate]);

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

  const displayName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : '...';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐾</div>
          <div style={{ fontSize: 16, color: '#1D9E75', fontWeight: 600 }}>Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAF9', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto', paddingBottom: 80 }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes slidein { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 24px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>Bonjour 👋</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{displayName}</h1>
          </div>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👤</div>
        </div>

        {activeWalk && (
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => setTab('live')}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7FFFD4', animation: 'pulse 1s infinite', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{dogs[0]?.name || 'Votre chien'} est en balade 🐾</div>
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
          { id: 'dogs',    label: '🐾 Chiens' },
          { id: 'history', label: '📋 Historique' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '12px 4px', border: 'none', background: 'transparent', fontSize: 11, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? '#1D9E75' : '#888', borderBottom: tab === t.id ? '2px solid #1D9E75' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px' }}>

        {/* ACCUEIL */}
        {tab === 'home' && (
          <div style={{ animation: 'slidein 0.3s ease' }}>
            <div style={{ background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', borderRadius: 18, padding: '20px', marginBottom: 16, cursor: 'pointer' }}
              onClick={() => navigate('/book')}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🐾</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Commander une balade</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Promeneurs disponibles près de vous</div>
              <div style={{ marginTop: 14, background: '#fff', borderRadius: 10, padding: '10px 16px', display: 'inline-block' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>⚡ Commander maintenant →</span>
              </div>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>Mes chiens</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {dogs.length > 0 ? dogs.map(d => (
                <div key={d.id} style={{ flex: 1, background: '#fff', borderRadius: 14, padding: '14px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  {d.photo_url
                    ? <img src={d.photo_url} alt={d.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', marginBottom: 6 }} />
                    : <div style={{ fontSize: 28, marginBottom: 6 }}>{SIZE_ICONS[d.size] || '🐕'}</div>
                  }
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{d.breed}</div>
                </div>
              )) : (
                <div style={{ fontSize: 14, color: '#888' }}>Aucun chien enregistré</div>
              )}
              <div onClick={() => navigate('/register')}
                style={{ width: 80, background: '#F8FAF9', borderRadius: 14, padding: '14px', textAlign: 'center', border: '1.5px dashed #D0D0D0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 24, color: '#CCC' }}>+</div>
                <div style={{ fontSize: 11, color: '#AAA', marginTop: 4 }}>Ajouter</div>
              </div>
            </div>

            {HISTORY.length > 0 && (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>Dernière balade</h3>
                <div style={{ background: '#fff', borderRadius: 14, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🐕</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{HISTORY[0].dog} avec {HISTORY[0].walker}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{HISTORY[0].date} · {HISTORY[0].duration} min</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75' }}>{HISTORY[0].price}€</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>{'⭐'.repeat(HISTORY[0].rating)}</div>
                    <span style={{ fontSize: 12, color: '#888', background: '#E1F5EE', borderRadius: 8, padding: '3px 8px' }}>Terminé</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* EN DIRECT */}
        {tab === 'live' && (
          <div style={{ animation: 'slidein 0.3s ease', textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😴</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Aucune balade en cours</h3>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>Commandez une balade pour suivre votre chien en temps réel.</p>
            <button onClick={() => navigate('/book')}
              style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Commander une balade
            </button>
          </div>
        )}

        {/* MES CHIENS */}
        {tab === 'dogs' && (
          <div style={{ animation: 'slidein 0.3s ease' }}>
            {dogs.map(d => (
              <div key={d.id} onClick={() => setSelectedDog(selectedDog?.id === d.id ? null : d)}
                style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', border: selectedDog?.id === d.id ? '1.5px solid #1D9E75' : '1.5px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {d.photo_url
                    ? <img src={d.photo_url} alt={d.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                    : <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{SIZE_ICONS[d.size] || '🐕'}</div>
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{d.name}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>{d.breed} · {d.gender === 'male' ? '♂️' : '♀️'}</div>
                    <div style={{ fontSize: 12, color: '#1D9E75', marginTop: 2 }}>Gabarit {d.size?.toUpperCase()}</div>
                  </div>
                  <div style={{ fontSize: 20, color: '#CCC' }}>{selectedDog?.id === d.id ? '▲' : '▼'}</div>
                </div>
                {selectedDog?.id === d.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0F0F0' }}>
                    <button onClick={() => navigate('/book')}
                      style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
                      🐾 Commander une balade pour {d.name}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {dogs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🐾</div>
                <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Aucun chien enregistré</p>
              </div>
            )}
            <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '20px', textAlign: 'center', border: '1.5px dashed #D0D0D0', cursor: 'pointer' }}
              onClick={() => navigate('/register')}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>➕</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#888' }}>Ajouter un chien</div>
            </div>
          </div>
        )}

        {/* HISTORIQUE */}
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
                  <span style={{ fontSize: 12, color: '#1D9E75', cursor: 'pointer' }}>Voir le rapport →</span>
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
