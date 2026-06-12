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

  // Profil edit
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [newOwnerPhoto, setNewOwnerPhoto] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const walkerMarkerRef = useRef(null);
  const routePathRef = useRef([]);
  const walkTimerRef = useRef(null);

  useEffect(() => {
    if (location.hash === '#live') setTab('live');
  }, [location.hash]);

useEffect(() => {
    const duration = localStorage.getItem('dogger_walk_active');
    const startTime = localStorage.getItem('dogger_walk_start');
    if (duration && startTime) {
      const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000);
      const totalSeconds = parseInt(duration) * 60;
      // Si la balade est terminée (temps écoulé > durée totale), on nettoie
      if (elapsed >= totalSeconds) {
        ['dogger_walk_active','dogger_walk_start','dogger_walk_service','dogger_walk_address','dogger_walker','dogger_walker_eta','dogger_walker_phase','dogger_walker_start_coords'].forEach(k => localStorage.removeItem(k));
      } else {
        setActiveWalk(true);
        setWalkDuration(parseInt(duration));
        setWalkTime(elapsed);
      }
    }
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
        if (profileData) {
          setProfile(profileData);
          setEditForm({
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            phone: profileData.phone || '',
          });
        }
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

  const initLiveMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;
    if (mapInstanceRef.current) return;
    const center = userCoords || { lat: 48.8566, lng: 2.3522 };
    const map = new window.google.maps.Map(mapRef.current, {
      center, zoom: 15, disableDefaultUI: true,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ]
    });
    mapInstanceRef.current = map;
    new window.google.maps.Marker({
      position: center, map,
      icon: { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', scaledSize: new window.google.maps.Size(40, 40) },
    });
    let walkerStart = JSON.parse(localStorage.getItem('dogger_walker_start_coords') || 'null');
    if (!walkerStart) {
      walkerStart = { lat: center.lat + 0.003, lng: center.lng + 0.003 };
      localStorage.setItem('dogger_walker_start_coords', JSON.stringify(walkerStart));
    }
    const walkerMarker = new window.google.maps.Marker({
      position: walkerStart, map,
      icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', scaledSize: new window.google.maps.Size(40, 40) },
      title: 'Thomas M.'
    });
    walkerMarkerRef.current = walkerMarker;
    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      map, suppressMarkers: true,
      polylineOptions: { strokeColor: '#1D9E75', strokeWeight: 4, strokeOpacity: 0.7 }
    });
    directionsService.route({
      origin: walkerStart, destination: center,
      travelMode: window.google.maps.TravelMode.WALKING,
    }, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        const path = result.routes[0].overview_path;
        routePathRef.current = path;
        let idx = 0;
        const totalSteps = path.length;
        const intervalMs = (walkDuration * 60 * 1000) / totalSteps;
        const moveInterval = setInterval(() => {
          idx++;
          if (idx >= totalSteps) { clearInterval(moveInterval); return; }
          if (walkerMarkerRef.current) {
            walkerMarkerRef.current.setPosition(path[idx]);
            map.panTo(path[idx]);
          }
        }, Math.max(intervalMs, 2000));
      }
    });
  }, [userCoords, walkDuration]);

  useEffect(() => {
    if (tab === 'live' && activeWalk && mapRef.current && !mapInstanceRef.current) {
      setTimeout(initLiveMap, 300);
    }
  }, [tab, activeWalk, initLiveMap]);

  const handleSaveProfile = async () => {
    setEditLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const updates = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
      };
      if (newOwnerPhoto) updates.photo_url = newOwnerPhoto;
      const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
      if (!error) {
        setProfile(p => ({ ...p, ...updates }));
        setEditSuccess(true);
        setEditMode(false);
        setNewOwnerPhoto(null);
        setTimeout(() => setEditSuccess(false), 3000);
      }
    } catch (e) { console.error(e); }
    finally { setEditLoading(false); }
  };

  const handleOwnerPhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setNewOwnerPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/');
  };

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
  const photoUrl = newOwnerPhoto || profile?.photo_url;

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
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.6} }
        @keyframes slidein { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 24px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>Bonjour 👋</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{displayName}</h1>
          </div>
          <div onClick={() => setTab('profile')}
            style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            {photoUrl
              ? <img src={photoUrl} alt="profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          { id: 'profile', label: '👤 Profil' },
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
            {/* CTA Commander */}
            {activeWalk ? (
              <div onClick={() => setTab('live')}
                style={{ background: 'linear-gradient(135deg, #0F6E56, #0A4D3A)', borderRadius: 18, padding: '20px', marginBottom: 20, cursor: 'pointer' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🐾</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Balade en cours</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 14 }}>{dogName} se promène avec Thomas M.</div>
                <div style={{ background: '#fff', borderRadius: 10, padding: '10px 16px', display: 'inline-block' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>📍 Suivre en direct →</span>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>Que voulez-vous commander ?</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Balade */}
                  <div onClick={() => navigate('/book/walk')}
                    style={{ background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', borderRadius: 18, padding: '18px 14px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🐕</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Balade</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>Promenade, parc, groupe</div>
                    <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '5px 10px', display: 'inline-block' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>dès 4€ →</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: -10, right: -10, fontSize: 48, opacity: 0.15 }}>🐕</div>
                  </div>
                  {/* Dogger Home */}
                  <div onClick={() => navigate('/book/home')}
                    style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', borderRadius: 18, padding: '18px 14px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 8, padding: '2px 7px', fontSize: 9, fontWeight: 700, color: '#fff' }}>Nouveau</div>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🏠</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Dogger Home</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>Garde chez le gardien</div>
                    <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '5px 10px', display: 'inline-block' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>dès 35€ →</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: -10, right: -10, fontSize: 48, opacity: 0.15 }}>🏠</div>
                  </div>
                </div>
              </div>
            )}

            {/* Mes chiens */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Mes chiens</h3>
              <button onClick={() => navigate('/add-dog')}
                style={{ background: '#E1F5EE', border: 'none', color: '#1D9E75', fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                + Ajouter
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
              {dogs.length > 0 ? dogs.map(d => (
                <div key={d.id} onClick={() => navigate('/book')}
                  style={{ minWidth: 110, background: '#fff', borderRadius: 16, padding: '14px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flexShrink: 0, cursor: 'pointer' }}>
                  {d.photo_url
                    ? <img src={d.photo_url} alt={d.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', marginBottom: 8, border: '2px solid #E1F5EE' }} />
                    : <div style={{ fontSize: 36, marginBottom: 8 }}>{SIZE_ICONS[d.size] || '🐕'}</div>
                  }
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{d.breed}</div>
                  <div style={{ fontSize: 10, color: '#1D9E75', marginTop: 4, fontWeight: 600 }}>Gabarit {d.size?.toUpperCase()}</div>
                </div>
              )) : (
                <div onClick={() => navigate('/add-dog')}
                  style={{ minWidth: 110, background: '#F8FAF9', borderRadius: 16, padding: '20px', textAlign: 'center', border: '1.5px dashed #D0D0D0', cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ fontSize: 28, color: '#CCC', marginBottom: 6 }}>+</div>
                  <div style={{ fontSize: 12, color: '#AAA' }}>Ajouter un chien</div>
                </div>
              )}
            </div>

            {/* Stats rapides */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: 'Balades', value: '12', icon: '🐾' },
                { label: 'Note moy.', value: '4.8⭐', icon: '⭐' },
                { label: 'Dépensé', value: '143€', icon: '💶' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '14px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EN DIRECT */}
        {tab === 'live' && (
          <div style={{ animation: 'slidein 0.3s ease' }}>
            {activeWalk ? (
              <div>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <div ref={mapRef} style={{ height: 280, borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                  <div style={{ position: 'absolute', top: 12, right: 12, background: '#1D9E75', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#fff', animation: 'pulse 2s infinite', zIndex: 10 }}>
                    🔴 Live
                  </div>
                  <div style={{ position: 'absolute', top: 12, left: 12, background: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 700, color: '#1D9E75', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 10 }}>
                    {formatTime(walkTime)} ⏱️
                  </div>
                </div>

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
                  <div style={{ background: '#F0F0F0', borderRadius: 10, height: 6, marginBottom: 12 }}>
                    <div style={{ width: `${Math.min(100, (walkTime / (walkDuration * 60)) * 100)}%`, background: '#1D9E75', borderRadius: 10, height: 6, transition: 'width 1s linear' }} />
                  </div>
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

        {/* PROFIL */}
        {tab === 'profile' && (
          <div style={{ animation: 'slidein 0.3s ease' }}>

            {editSuccess && (
              <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#0F6E56', fontWeight: 600, textAlign: 'center' }}>
                ✅ Profil mis à jour avec succès !
              </div>
            )}

            {/* Photo profil */}
            <div style={{ background: '#fff', borderRadius: 18, padding: '24px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
                <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#E1F5EE', overflow: 'hidden', border: '3px solid #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                  {photoUrl
                    ? <img src={photoUrl} alt="profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '👤'
                  }
                </div>
                <div onClick={() => document.getElementById('profilePhotoInput').click()}
                  style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>
                  ✏
                </div>
                <input id="profilePhotoInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleOwnerPhotoChange} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 2 }}>{displayName}</div>
              <div style={{ fontSize: 13, color: '#888' }}>Membre Dogger 🐾</div>
            </div>

            {/* Infos modifiables */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>Mes informations</div>
                <button onClick={() => setEditMode(e => !e)}
                  style={{ background: editMode ? '#FFF0F0' : '#E1F5EE', border: 'none', color: editMode ? '#E24B4A' : '#1D9E75', fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '4px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {editMode ? 'Annuler' : '✏️ Modifier'}
                </button>
              </div>

              {editMode ? (
                <div>
                  {[
                    { label: 'Prénom', key: 'first_name', placeholder: 'Marie' },
                    { label: 'Nom', key: 'last_name', placeholder: 'Dupont' },
                    { label: 'Téléphone', key: 'phone', placeholder: '6 12 34 56 78' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>{f.label}</div>
                      <input
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' }}
                        value={editForm[f.key]}
                        placeholder={f.placeholder}
                        onChange={e => setEditForm(ef => ({ ...ef, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <button onClick={handleSaveProfile} disabled={editLoading}
                    style={{ width: '100%', padding: 14, background: editLoading ? '#A8D5C4' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: editLoading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    {editLoading ? 'Sauvegarde...' : '✅ Sauvegarder'}
                  </button>
                </div>
              ) : (
                <div>
                  {[
                    { icon: '👤', label: 'Prénom', value: profile?.first_name },
                    { icon: '👤', label: 'Nom', value: profile?.last_name },
                    { icon: '📧', label: 'Email', value: profile?.email || '—' },
                    { icon: '📱', label: 'Téléphone', value: profile?.phone ? `+33 ${profile.phone}` : '—' },
                  ].map((item, idx, arr) => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: idx < arr.length - 1 ? '1px solid #F8F8F8' : 'none' }}>
                      <span style={{ fontSize: 18 }}>{item.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: '#AAA', marginBottom: 1 }}>{item.label}</div>
                        <div style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 500 }}>{item.value || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Menu profil */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '4px 16px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              {[
                { icon: '🐾', label: 'Mes chiens', action: () => setTab('dogs') },
                { icon: '📋', label: 'Historique des balades', action: () => {} },
                { icon: '🔔', label: 'Notifications', action: () => {} },
                { icon: '🔒', label: 'Sécurité & mot de passe', action: () => {} },
                { icon: '❓', label: 'Aide & Support', action: () => {} },
              ].map((item, idx, arr) => (
                <div key={item.label} onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: idx < arr.length - 1 ? '1px solid #F0F0F0' : 'none', cursor: 'pointer' }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span style={{ fontSize: 15, color: '#1A1A1A', fontWeight: 500, flex: 1 }}>{item.label}</span>
                  <span style={{ color: '#CCC', fontSize: 18 }}>›</span>
                </div>
              ))}
            </div>

            {/* Déconnexion */}
            <button onClick={handleLogout}
              style={{ width: '100%', padding: 14, background: '#FFF0F0', color: '#E24B4A', border: '1.5px solid #FFD0D0', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              🚪 Se déconnecter
            </button>

          </div>
        )}

      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#fff', borderTop: '1px solid #F0F0F0', display: 'flex', padding: '8px 0 16px' }}>
        {[
          { id: 'home',    icon: '🏠', label: 'Accueil' },
          { id: 'live',    icon: '📍', label: 'En direct' },
          { id: 'dogs',    icon: '🐾', label: 'Chiens' },
          { id: 'profile', icon: '👤', label: 'Profil' },
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
