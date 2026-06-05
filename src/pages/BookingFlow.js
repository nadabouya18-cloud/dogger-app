import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const SERVICES = [
  { id: 'walk',   icon: '🐕',  name: 'Balade',           desc: 'Promenade dans le quartier',   pricePerMin: 0.42, popular: false },
  { id: 'shared', icon: '🐕‍🦺', name: 'Balade Shared',    desc: 'Balade en groupe économique',  pricePerMin: 0.25, popular: true  },
  { id: 'parc',   icon: '🌳',  name: 'Dogger Parc',      desc: 'Session de jeu en parc canin', pricePerMin: 0.35, popular: false },
  { id: 'home',   icon: '🏠',  name: 'Garde à domicile', desc: 'Garde chez le promeneur',      fixedPrice: 25,    popular: false },
];

const DURATIONS = [
  { id: 15, label: '15 min' }, { id: 30, label: '30 min' },
  { id: 45, label: '45 min' }, { id: 60, label: '1h' },
  { id: 90, label: '1h30' },   { id: 120, label: '2h' },
];

const TIMES = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

const SEARCH_STEPS = [
  '🔍 Recherche de promeneurs à proximité...',
  '📡 Analyse de votre zone...',
  '🐾 3 promeneurs disponibles trouvés !',
  '📲 Envoi de la demande...',
  '✅ Mise en relation en cours...',
];

const CANCEL_REASONS = [
  "Je me suis trompé d'adresse",
  "Je me suis trompé de durée",
  "Le promeneur n'avance pas",
  "Mon chien n'est plus disponible",
  "J'ai trouvé une autre solution",
  "Autre raison",
];

const SIZE_ICONS = { xs: '🐩', s: '🐕', m: '🦮', l: '🐕‍🦺' };

function getPrice(service, duration) {
  if (service.fixedPrice) return service.fixedPrice;
  return Math.round(service.pricePerMin * duration);
}

export default function BookingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('now');
  const [form, setForm] = useState({
    address: '', instructions: '', service: 'walk', duration: 30, date: '', time: ''
  });
  const [selectedDogs, setSelectedDogs] = useState([]);
  const [userDogs, setUserDogs] = useState([]);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(0);
  const [matched, setMatched] = useState(false);
  const [walker, setWalker] = useState(null);
  const [dots, setDots] = useState([false, false, false]);
  const [locating, setLocating] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [walkerPhase, setWalkerPhase] = useState('incoming');
  const [etaSeconds, setEtaSeconds] = useState(480);
  const [userCoords, setUserCoords] = useState(null);
  const [walkerCoords, setWalkerCoords] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeIndex, setRouteIndex] = useState(0);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const walkerMarkerRef = useRef(null);
  const addressRef = useRef(null);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const selectedService = SERVICES.find(s => s.id === form.service);
  const price = getPrice(selectedService, form.duration);

  // Load user dogs
  useEffect(() => {
    const loadDogs = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('dogs').select('*').eq('owner_id', session.user.id);
      if (data) {
        setUserDogs(data);
        if (data.length === 1) setSelectedDogs([data[0].id]);
      }
    };
    loadDogs();
  }, []);

  // Google Maps Autocomplete
  useEffect(() => {
    if (step !== 1 || !window.google) return;
    const autocomplete = new window.google.maps.places.Autocomplete(
      addressRef.current, { types: ['address'], componentRestrictions: { country: 'fr' } }
    );
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) update('address', place.formatted_address);
      if (place.geometry?.location) {
        setUserCoords({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      }
    });
  }, [step]);

  // Init Google Map pour l'écran Thomas
  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google || !userCoords) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: userCoords,
      zoom: 15,
      disableDefaultUI: true,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ]
    });
    mapInstanceRef.current = map;

    // Marqueur destination (toi)
    new window.google.maps.Marker({
      position: userCoords,
      map,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
        scaledSize: new window.google.maps.Size(40, 40),
      },
      title: 'Votre adresse'
    });

    // Position départ Thomas (~500m)
    const startLat = userCoords.lat + (Math.random() - 0.5) * 0.008;
    const startLng = userCoords.lng + (Math.random() - 0.5) * 0.008;
    const startCoords = { lat: startLat, lng: startLng };
    setWalkerCoords(startCoords);

    // Marqueur Thomas
    const walkerMarker = new window.google.maps.Marker({
      position: startCoords,
      map,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        scaledSize: new window.google.maps.Size(40, 40),
      },
      title: 'Thomas M.'
    });
    walkerMarkerRef.current = walkerMarker;

    // Calculer le vrai trajet avec Directions API
    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#1D9E75', strokeWeight: 4, strokeOpacity: 0.7 }
    });

    directionsService.route({
      origin: startCoords,
      destination: userCoords,
      travelMode: window.google.maps.TravelMode.WALKING,
    }, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        const path = result.routes[0].overview_path;
        setRoutePath(path);
        // ETA réel en secondes
        const duration = result.routes[0].legs[0].duration.value;
        setEtaSeconds(duration);
      }
    });
  }, [userCoords]);

  useEffect(() => {
    if (matched && userCoords && mapRef.current) {
      setTimeout(initMap, 300);
    }
  }, [matched, userCoords, initMap]);

  // Animer Thomas sur le trajet
  useEffect(() => {
    if (!matched || walkerPhase !== 'incoming' || routePath.length === 0) return;
    const totalSteps = routePath.length;
    const interval = setInterval(() => {
      setRouteIndex(i => {
        const next = i + 1;
        if (next >= totalSteps) {
          clearInterval(interval);
          setWalkerPhase('here');
          return totalSteps - 1;
        }
        // Mettre à jour position Thomas
        if (walkerMarkerRef.current) {
          walkerMarkerRef.current.setPosition(routePath[next]);
        }
        // ETA restant
        const remaining = Math.round(((totalSteps - next) / totalSteps) * etaSeconds);
        setEtaSeconds(remaining);
        if (remaining <= 120 && walkerPhase === 'incoming') setWalkerPhase('arriving');
        return next;
      });
    }, etaSeconds > 0 ? (etaSeconds * 1000) / totalSteps : 500);
    return () => clearInterval(interval);
  }, [matched, walkerPhase, routePath, etaSeconds]);

  // Géolocalisation
  const handleLocate = () => {
    if (!navigator.geolocation) { setError('Géolocalisation non supportée'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserCoords({ lat, lng });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'Accept-Language': 'fr' } }
        );
        const data = await res.json();
        if (data.address) {
          const a = data.address;
          const parts = [a.house_number, a.road, a.postcode, a.city || a.town || a.village].filter(Boolean);
          update('address', parts.join(', ') || data.display_name);
        }
      } catch (e) { setError('Impossible de récupérer votre adresse'); }
      finally { setLocating(false); }
    }, () => { setError('Permission refusée'); setLocating(false); },
    { timeout: 10000, enableHighAccuracy: true });
  };

  // Animation recherche
  useEffect(() => {
    if (!searching) return;
    let i = 0;
    const interval = setInterval(() => {
      setSearchStep(i); i++;
      if (i >= SEARCH_STEPS.length) {
        clearInterval(interval);
        setTimeout(() => {
          setWalker({ name: 'Thomas M.', rating: 4.9, walks: 127, emoji: '🧑' });
          setWalkerPhase('incoming');
          setMatched(true);
          setSearching(false);
        }, 800);
      }
    }, 900);
    return () => clearInterval(interval);
  }, [searching]);

  useEffect(() => {
    if (!searching) return;
    const interval = setInterval(() => {
      setDots(d => { const n=[...d]; const i=n.indexOf(false); if(i===-1) return [false,false,false]; n[i]=true; return n; });
    }, 300);
    return () => clearInterval(interval);
  }, [searching]);

  const toggleDog = (dogId) => {
    setSelectedDogs(prev =>
      prev.includes(dogId) ? prev.filter(id => id !== dogId) : [...prev, dogId]
    );
  };

  const validateStep1 = () => {
    if (!form.address) return 'Entrez votre adresse';
    if (mode === 'later' && !form.date) return 'Choisissez une date';
    if (mode === 'later' && !form.time) return 'Choisissez une heure';
    return null;
  };

  const nextStep = () => {
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }
    if (step === 2 && selectedDogs.length === 0) {
      setError('Sélectionnez au moins un chien');
      return;
    }
    setError(''); setStep(s => s + 1);
  };

  const confirm = () => {
    localStorage.setItem('dogger_walk_active', String(form.duration));
    localStorage.setItem('dogger_walk_service', selectedService.name);
    if (mode === 'now') setSearching(true);
    else setMatched(true);
  };

  const handleCancelConfirm = () => {
    localStorage.removeItem('dogger_walk_active');
    localStorage.removeItem('dogger_walk_service');
    navigate('/dashboard');
  };

  const startWalk = () => {
    setWalkerPhase('walking');
    navigate('/dashboard#live');
  };

  const formatEta = (s) => {
    if (s <= 0) return 'quelques secondes';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m === 0) return `${sec}s`;
    return sec > 0 ? `${m} min ${sec}s` : `${m} min`;
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
        `}</style>
        <div style={{ height: 340, background: 'linear-gradient(160deg, #E8F5F0, #D0EDE4)', position: 'relative', overflow: 'hidden' }}>
          {[60,120,180,240,300].map(y => <div key={y} style={{ position: 'absolute', left: 0, right: 0, top: y, height: 1, background: 'rgba(29,158,117,0.12)' }} />)}
          {[60,120,180,240,300,360].map(x => <div key={x} style={{ position: 'absolute', top: 0, bottom: 0, left: x, width: 1, background: 'rgba(29,158,117,0.12)' }} />)}
          {[{x:80,y:80},{x:200,y:120},{x:300,y:60}].map((pos,i) => (
            <div key={i} style={{ position: 'absolute', left: pos.x, top: pos.y, animation: `float ${1.5+i*0.3}s ease-in-out infinite` }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚶</div>
            </div>
          ))}
          <div style={{ position: 'absolute', left: '50%', top: '55%', transform: 'translate(-50%,-50%)' }}>
            <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', border: '2px solid rgba(29,158,117,0.3)', top: -40, left: -40, animation: 'ping 1.2s ease-out infinite' }} />
            <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', border: '2px solid rgba(29,158,117,0.2)', top: -60, left: -60, animation: 'ping 1.2s ease-out infinite 0.4s' }} />
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, position: 'relative', zIndex: 2 }}>📍</div>
          </div>
          <div style={{ position: 'absolute', top: 16, left: 16, background: 'white', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#1D9E75' }}>
            {form.address.split(',')[0]} 🗺️
          </div>
        </div>
        <div style={{ flex: 1, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {dots.map((active, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: active ? '#1D9E75' : '#E0E0E0', transition: 'background 0.2s' }} />
              ))}
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>Recherche en cours</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SEARCH_STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: i === searchStep ? '#E1F5EE' : '#FAFAFA', border: i === searchStep ? '1.5px solid #1D9E75' : '1.5px solid transparent', opacity: i > searchStep ? 0.4 : 1, transition: 'all 0.3s' }}>
                <span style={{ fontSize: 18 }}>{i < searchStep ? '✅' : i === searchStep ? '⏳' : '○'}</span>
                <span style={{ fontSize: 14, fontWeight: i === searchStep ? 600 : 400, color: i === searchStep ? '#0F6E56' : '#555' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── ÉCRAN THOMAS EN ROUTE ────────────────────────────────────────────────
  if (matched && walker) {
    const isArriving = walkerPhase === 'arriving';
    const isHere = walkerPhase === 'here';

    return (
      <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'sans-serif', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes slidein { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `}</style>

        {/* VRAIE CARTE GOOGLE MAPS */}
        <div ref={mapRef} style={{ height: 320, width: '100%', position: 'relative' }}>
          {/* Badge statut sur la carte */}
          <div style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            background: isHere ? '#1D9E75' : isArriving ? '#F59E0B' : '#fff',
            color: isHere || isArriving ? '#fff' : '#1D9E75',
            borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 700,
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)', whiteSpace: 'nowrap', zIndex: 10,
            animation: isArriving || isHere ? 'pulse 1s infinite' : 'none'
          }}>
            {isHere ? '🎉 Thomas est arrivé !' : isArriving ? '⚠️ Préparez-vous !' : `🚶 Thomas arrive dans ${formatEta(etaSeconds)}`}
          </div>
        </div>

        {/* PANEL BAS */}
        <div style={{ flex: 1, padding: '20px', background: '#fff', overflowY: 'auto' }}>

          {/* Info Thomas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#F8FAF9', borderRadius: 16, padding: '16px', marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{walker.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{walker.name}</div>
              <div style={{ fontSize: 13, color: '#1D9E75' }}>⭐ {walker.rating} · {walker.walks} balades</div>
            </div>
            <div style={{ textAlign: 'center', background: isHere ? '#E1F5EE' : isArriving ? '#FFF8E1' : '#F0F0F0', borderRadius: 12, padding: '8px 14px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: isHere ? '#1D9E75' : isArriving ? '#F59E0B' : '#555' }}>
                {isHere ? '✅' : formatEta(etaSeconds)}
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>{isHere ? 'Arrivé' : 'restant'}</div>
            </div>
          </div>

          {/* Chiens sélectionnés */}
          <div style={{ background: '#F8FAF9', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8 }}>CHIENS</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {userDogs.filter(d => selectedDogs.includes(d.id)).map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E1F5EE', borderRadius: 20, padding: '4px 12px' }}>
                  <span style={{ fontSize: 16 }}>{SIZE_ICONS[d.size] || '🐕'}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F6E56' }}>{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Détails */}
          <div style={{ background: '#F8FAF9', borderRadius: 14, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#555' }}>
            <div style={{ marginBottom: 4 }}>📍 {form.address}</div>
            <div style={{ marginBottom: 4 }}>🐾 {selectedService.name} · {DURATIONS.find(d => d.id === form.duration)?.label}</div>
            <div style={{ fontWeight: 700, color: '#1D9E75' }}>💶 {price}€</div>
          </div>

          {isHere ? (
            <button onClick={startWalk}
              style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10, animation: 'slidein 0.3s ease' }}>
              🐾 Confirmer le départ de la balade
            </button>
          ) : (
            <div style={{ background: isArriving ? '#FFF8E1' : '#E1F5EE', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: isArriving ? '#F59E0B' : '#0F6E56', fontWeight: 600, textAlign: 'center' }}>
              {isArriving ? '⚠️ Préparez votre chien — Thomas arrive !' : '🚶 Thomas est en route vers vous...'}
            </div>
          )}

          {!isHere && (
            <button onClick={() => setShowCancel(true)}
              style={{ width: '100%', padding: 13, background: 'transparent', color: '#E24B4A', border: '1.5px solid #E24B4A', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              ❌ Annuler la balade
            </button>
          )}
        </div>

        {/* MODAL ANNULATION */}
        {showCancel && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>Annuler la balade</h3>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Pourquoi souhaitez-vous annuler ?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {CANCEL_REASONS.map(r => (
                  <div key={r} onClick={() => setCancelReason(r)}
                    style={{ padding: '14px 16px', borderRadius: 12, border: cancelReason === r ? '2px solid #E24B4A' : '1.5px solid #E8E8E8', background: cancelReason === r ? '#FFF0F0' : '#FAFAFA', cursor: 'pointer', fontSize: 14, fontWeight: cancelReason === r ? 600 : 400, color: cancelReason === r ? '#E24B4A' : '#555' }}>
                    {r}
                  </div>
                ))}
              </div>
              <button disabled={!cancelReason} onClick={handleCancelConfirm}
                style={{ width: '100%', padding: 16, background: cancelReason ? '#E24B4A' : '#F0F0F0', color: cancelReason ? '#fff' : '#AAA', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: cancelReason ? 'pointer' : 'default', marginBottom: 10, fontFamily: 'inherit' }}>
                Confirmer l'annulation
              </button>
              <button onClick={() => { setShowCancel(false); setCancelReason(''); }}
                style={{ width: '100%', padding: 14, background: 'transparent', color: '#888', border: '1.5px solid #E8E8E8', borderRadius: 14, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Garder ma balade
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── FORMULAIRE ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(160deg, #0F6E56 0%, #1D9E75 100%)', padding: '48px 24px 32px' }}>
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
          ← Retour
        </button>
        <div style={{ fontSize: 28, marginBottom: 8 }}>
          {step === 1 ? '📍' : step === 2 ? '🐾' : step === 3 ? '🎯' : '✅'}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          {step === 1 ? 'Où ?' : step === 2 ? 'Quel(s) chien(s) ?' : step === 3 ? 'Quel service ?' : 'Récapitulatif'}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Étape {step} sur 4</p>
        <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.2)', borderRadius: 10, height: 4 }}>
          <div style={{ width: `${(step/4)*100}%`, background: '#fff', borderRadius: 10, height: 4, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>

        {/* ÉTAPE 1 — ADRESSE */}
        {step === 1 && (
          <div>
            <div style={{ display: 'flex', background: '#F0F0F0', borderRadius: 14, padding: 4, marginBottom: 20 }}>
              {[{id:'now',label:'⚡ Le plus tôt possible'},{id:'later',label:'📅 Planifier'}].map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: mode === m.id ? '#fff' : 'transparent', color: mode === m.id ? '#1D9E75' : '#888', boxShadow: mode === m.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                  {m.label}
                </button>
              ))}
            </div>
            <button onClick={handleLocate} disabled={locating}
              style={{ width: '100%', padding: '12px', background: '#F0F9F5', color: '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>
              {locating ? '📡 Localisation en cours...' : '📍 Utiliser ma position actuelle'}
            </button>
            <label style={labelStyle}>Ou entrez votre adresse</label>
            <input ref={addressRef} style={inputStyle} placeholder="12 rue de la Paix, Paris 75001"
              value={form.address} onChange={e => update('address', e.target.value)} />
            {mode === 'later' && (
              <>
                <label style={labelStyle}>Date</label>
                <input style={inputStyle} type="date" value={form.date}
                  min={new Date().toISOString().split('T')[0]} onChange={e => update('date', e.target.value)} />
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
              value={form.instructions} onChange={e => update('instructions', e.target.value)} />
          </div>
        )}

        {/* ÉTAPE 2 — SÉLECTION CHIENS */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>
              Sélectionnez le ou les chiens à promener
            </p>
            {userDogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🐾</div>
                <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Aucun chien enregistré</p>
                <button onClick={() => navigate('/add-dog')}
                  style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Ajouter un chien
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {userDogs.map(d => {
                  const isSelected = selectedDogs.includes(d.id);
                  return (
                    <div key={d.id} onClick={() => toggleDog(d.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', borderRadius: 16, border: isSelected ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: isSelected ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer', position: 'relative' }}>
                      {d.photo_url
                        ? <img src={d.photo_url} alt={d.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E1F5EE' }} />
                        : <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{SIZE_ICONS[d.size] || '🐕'}</div>
                      }
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{d.name}</div>
                        <div style={{ fontSize: 13, color: '#888' }}>{d.breed} · Gabarit {d.size?.toUpperCase()}</div>
                      </div>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${isSelected ? '#1D9E75' : '#CCC'}`, background: isSelected ? '#1D9E75' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }}>
                        {isSelected ? '✓' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {selectedDogs.length > 0 && (
              <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#0F6E56', fontWeight: 600 }}>
                🐾 {selectedDogs.length} chien{selectedDogs.length > 1 ? 's' : ''} sélectionné{selectedDogs.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 3 — SERVICE + DURÉE */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Le tarif est adapté au gabarit de votre chien</p>
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
                    : <div style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75' }}>dès {Math.round(s.pricePerMin * 15)}€</div>
                  }
                </div>
              ))}
            </div>
            {selectedService && !selectedService.fixedPrice && (
              <>
                <label style={labelStyle}>⏱️ Durée</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {DURATIONS.map(d => (
                    <div key={d.id} onClick={() => update('duration', d.id)}
                      style={{ padding: '10px 16px', borderRadius: 12, border: form.duration === d.id ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: form.duration === d.id ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer', fontSize: 14, fontWeight: form.duration === d.id ? 700 : 400, color: form.duration === d.id ? '#0F6E56' : '#555' }}>
                      {d.label}
                    </div>
                  ))}
                </div>
                <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#0F6E56', fontWeight: 600 }}>
                  Prix estimé : {price}€
                </div>
              </>
            )}
          </div>
        )}

        {/* ÉTAPE 4 — RÉCAP */}
        {step === 4 && (
          <div>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Vérifiez votre commande avant de confirmer</p>
            <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 14 }}>VOTRE COMMANDE</div>

              {/* Chiens */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>CHIENS</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {userDogs.filter(d => selectedDogs.includes(d.id)).map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E1F5EE', borderRadius: 20, padding: '4px 12px' }}>
                      <span style={{ fontSize: 16 }}>{SIZE_ICONS[d.size] || '🐕'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F6E56' }}>{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 24 }}>{selectedService.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{selectedService.name}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>{selectedService.desc}</div>
                </div>
              </div>
              <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
              <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>
                {mode === 'now' ? '⚡ Le plus tôt possible' : `📅 ${form.date} à ${form.time}`}
              </div>
              {!selectedService.fixedPrice && <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>⏱️ {DURATIONS.find(d => d.id === form.duration)?.label}</div>}
              <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>📍 {form.address}</div>
              {form.instructions && <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>📝 {form.instructions}</div>}
              <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, color: '#555' }}>Total estimé</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#1D9E75' }}>{price}€</span>
              </div>
            </div>
            <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#888', marginBottom: 20 }}>
              💳 Votre carte sera débitée uniquement à la fin de la prestation.
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={step < 4 ? nextStep : confirm}
          style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)' }}>
          {step === 1 ? 'Choisir mes chiens →' : step === 2 ? 'Choisir un service →' : step === 3 ? 'Voir le récapitulatif →' : mode === 'now' ? '⚡ Trouver un promeneur maintenant' : '🐾 Confirmer la balade'}
        </button>

      </div>
    </div>
  );
}
