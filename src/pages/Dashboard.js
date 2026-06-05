import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;

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
  const location = useLocation();
  const [tab, setTab] = useState(location.hash === '#live' ? 'live' : 'home');
  const [activeWalk, setActiveWalk] = useState(false);
  const [walkStep] = useState(2);
  const [walkTime, setWalkTime] = useState(0);
  const [walkDuration, setWalkDuration] = useState(30);
  const [selectedDog, setSelectedDog] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const walkerMarkerRef = useRef(null);
  const routePathRef = useRef([]);
  const routeIndexRef = useRef(0);
  const walkTimerRef = useRef(null);

  useEffect(() => {
    if (location.hash === '#live') setTab('live');
  }, [location.hash]);

  useEffect(() => {
    const duration = localStorage.getItem('dogger_walk_active');
    if (duration) {
      setActiveWalk(true);
      setWalkDuration(parseInt(duration));
    }
    // Récupérer les coordonnées sauvegardées
    const coords = localStorage.getItem('dogger_user_coords');
    if (coords) setUserCoords(JSON.parse(coords));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate('/login'); return; }
        const { data: profileData } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).single();
        if (profileData) setProfile(profileData);
        const { data: dogsData } = await supabase
          .from('dogs').select('*').eq('owner_id', session.user.id);
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
    walkTimerRef.current = setInterval(() => setWalkTime(s => s + 1), 1000);
    return () => clearInterval(walkTimerRef.current);
  }, [activeWalk]);

  // Init carte GPS live
  const initLiveMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    const center = userCoords || { lat: 48.8566, lng: 2.3522 }; // Paris par défaut

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 15,
      disableDefaultUI: true,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ]
    });
    mapInstanceRef.current = map;

    // Marqueur maison (toi)
    new window.google.maps.Marker({
      position: center,
      map,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
        scaledSize: new window.google.maps.Size(40, 40),
      },
      title: 'Votre adresse'
    });

    // Position départ promeneur (simulé ~300m)
    const walkerStart = {
      lat: center.lat + 0.003,
      lng: center.lng + 0.003
    };

    const walkerMarker = new window.google.maps.Marker({
      position: walkerStart,
      map,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        scaledSize: new window.google.maps.Size(40, 40),
      },
      title: 'Thomas M.'
    });
    walkerMarkerRef.current = walkerMarker;

    // Trajet avec Directions API
    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#1D9E75', strokeWeight: 4, strokeOpacity: 0.7 }
    });

    directionsService.route({
      origin: walkerStart,
      destination: center,
      travelMode: window.google.maps.TravelMode.WALKING,
    }, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        const path = result.routes[0].overview_path;
        routePathRef.current = path;

        // Animer Thomas le long du trajet
        let idx = 0;
        const totalSteps = path.length;
        const intervalMs = (walkDuration * 60 * 1000) / totalSteps;

        const moveInterval = setInterval(() => {
          idx++;
          if (idx >= totalSteps) {
            clearInterval(moveInterval);
            return;
          }
          if (walkerMarkerRef.current) {
            walkerMarkerRef.current.setPosition(path[idx]);
            map.panTo(path[idx]);
          }
          routeIndexRef.current = idx;
        }, Math.max(intervalMs, 2000));
      }
    });
  }, [userCoords, walkDuration]);

  useEffect(() => {
    if (tab === 'live' && activeWalk && mapRef.current && !mapInstanceRef.current) {
      setTimeout(initLiveMap, 300);
    }
  }, [tab, activeWalk, initLiveMap]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => {
    const total = walkDuration * 60;
    const remaining = total - walkTime;
    if (remaining <= 0) return 'Terminée !';
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const displayName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : '...';

  const dogName = dogs[0]?.name || 'Votre chien';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
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
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)' }}>
            {profile?.photo_url
              ? <img src={profile.photo_url} alt="profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '👤'
            }
          </div>
        </div>

        {activeWalk && (
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => setTab('live')}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7FFFD4', animation: 'pulse 1s infinite', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{dogName} est en balade 🐾</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Thomas M. · {formatTime(walkTime)} · reste {getRemainingTime()}</div>
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
            <div
              onClick={() => !activeWalk && navigate('/book')}
              style={{ background: activeWalk ? 'linear-gradient(135deg, #0F6E56, #0A4D3A)' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', borderRadius: 18, padding: '20px', marginBottom: 16, cursor: activeWalk ? 'default' : 'pointer' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🐾</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                {activeWalk ? 'Balade en cours' : 'Commander une balade'}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                {activeWalk ? `${dogName} se promène avec Thomas M.` : 'Promeneurs disponibles près de vous'}
              </div>
              <div style={{ marginTop: 14, background: '#fff', borderRadius: 10, padding: '10px 16px', display: 'inline-block' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>
                  {activeWalk ? '📍 Suivre en direct →' : '⚡ Commander maintenant →'}
                </span>
              </div>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>Mes chiens</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
              {dogs.length > 0 ? dogs.map(d => (
                <div key={d.id} style={{ minWidth: 100, background: '#fff', borderRadius: 14, padding: '14px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                  {d.photo_url
                    ? <img src={d.photo_url} alt={d.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', marginBottom: 6, border: '2px solid #E1F5EE' }} />
                    : <div style={{ fontSize: 32, marginBottom: 6 }}>{SIZE_ICONS[d.size] || '🐕'}</div>
                  }
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>{d.breed}</div>
                </div>
              )) : (
                <div style={{ fontSize: 14, color: '#888', padding: '10px 0' }}>Aucun chien enregistré</div>
              )}
              <div onClick={() => navigate('/add-dog')}
                style={{ minWidth: 80, background: '#F8FAF9', borderRadius: 14, padding: '14px', textAlign: 'center', border: '1.5px dashed #D0D0D0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 24, color: '#CCC' }}>+</div>
                <div style={{ fontSize: 10, color: '#AAA', marginTop: 4 }}>Ajouter</div>
              </div>
            </div>
          </div>
        )}

        {/* EN DIRECT */}
        {tab === 'live' && (
          <div style={{ animation: 'slidein 0.3s ease' }}>
            {activeWalk ? (
              <div>
                {/* VRAIE CARTE GPS */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <div ref={mapRef} style={{ height: 280, borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                  <div style={{ position: 'absolute', top: 12, right: 12, background: '#1D9E75', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#fff', animation: 'pulse 2s infinite', zIndex: 10 }}>
                    🔴 Live
                  </div>
                  <div style={{ position: 'absolute', top: 12, left: 12, background: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 700, color: '#1D9E75', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 10 }}>
                    {formatTime(walkTime)} ⏱️
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
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75' }}>{getRemainingTime()}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>restant</div>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div style={{ background: '#F0F0F0', borderRadius: 10, height: 6, marginBottom: 12 }}>
                    <div style={{ width: `${Math.min(100, (walkTime / (walkDuration * 60)) * 100)}%`, background: '#1D9E75', borderRadius: 10, height: 6, transition: 'width 1s linear' }} />
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

                {/* Photos */}
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

        {/* MES CHIENS */}
        {tab === 'dogs' && (
          <div style={{ animation: 'slidein 0.3s ease' }}>
            {dogs.map(d => (
              <div key={d.id} onClick={() => setSelectedDog(selectedDog?.id === d.id ? null : d)}
                style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', border: selectedDog?.id === d.id ? '1.5px solid #1D9E75' : '1.5px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {d.photo_url
                    ? <img src={d.photo_url} alt={d.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E1F5EE' }} />
                    : <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{SIZE_ICONS[d.size] || '🐕'}</div>
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{d.name}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>{d.breed} · {d.gender === 'male' ? '♂️ Mâle' : '♀️ Femelle'}</div>
                    <div style={{ fontSize: 12, color: '#1D9E75', marginTop: 2 }}>Gabarit {d.size?.toUpperCase()}</div>
                  </div>
                  <div style={{ fontSize: 20, color: '#CCC' }}>{selectedDog?.id === d.id ? '▲' : '▼'}</div>
                </div>
                {selectedDog?.id === d.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0F0F0' }}>
                    <button onClick={() => navigate('/book')}
                      style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
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
              onClick={() => navigate('/add-dog')}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>➕</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#888' }}>Ajouter un chien</div>
            </div>
          </div>
        )}

        {/* HISTORIQUE */}
        {tab === 'history' && (
          <div style={{ animation: 'slidein 0.3s ease', textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Aucune balade passée</h3>
            <p style={{ fontSize: 14, color: '#888' }}>Vos balades terminées apparaîtront ici.</p>
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
