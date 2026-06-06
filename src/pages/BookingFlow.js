import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const SERVICES = [
  { id: 'walk',   icon: '🐕',  name: 'Balade',           desc: 'Promenade dans le quartier',   pricePerMin: 0.42, popular: false },
  { id: 'shared', icon: '🐕‍🦺', name: 'Balade Shared',    desc: 'Balade en groupe économique',  pricePerMin: 0.25, popular: true  },
  { id: 'parc',   icon: '🌳',  name: 'Dogger Parc',      desc: 'Session de jeu en parc canin', pricePerMin: 0.35, popular: false },
  { id: 'home',   icon: '🏠',  name: 'Garde à domicile', desc: 'Garde chez le promeneur',      isHome: true,      popular: false },
];

const DURATIONS = [
  { id: 15, label: '15 min' }, { id: 30, label: '30 min' },
  { id: 45, label: '45 min' }, { id: 60, label: '1h' },
  { id: 90, label: '1h30' },   { id: 120, label: '2h' },
];

const HOME_DURATIONS = [
  { id: 300,  label: '5h',         desc: 'Demi-journée',  price: 35 },
  { id: 720,  label: '12h',        desc: 'Journée',       price: 55 },
  { id: 1440, label: '1 jour',     desc: '24h',           price: 75 },
  { id: 2880, label: '2 jours',    desc: '48h',           price: 140 },
  { id: 4320, label: '3 jours',    desc: '72h',           price: 195 },
  { id: 10080,label: '1 semaine',  desc: '7 jours',       price: 399 },
];

const MOCK_WALKERS = [
  { id: 1, name: 'Thomas M.', rating: 4.9, walks: 127, lat: 48.8576, lng: 2.3532, price: 13, bio: 'Passionné par les animaux, 3 ans d\'expérience', specialties: ['Petits gabarits', 'Seniors'], photo: '🧑', available: true },
  { id: 2, name: 'Julie R.',  rating: 4.8, walks: 89,  lat: 48.8556, lng: 2.3512, price: 12, bio: 'Vétérinaire en formation, douce et attentionnée', specialties: ['Tous gabarits', 'Chiots'], photo: '👩', available: true },
  { id: 3, name: 'Karim B.',  rating: 4.7, walks: 64,  lat: 48.8596, lng: 2.3552, price: 11, bio: 'Sportif, idéal pour les chiens énergiques', specialties: ['Grands gabarits', 'Sport'], photo: '🧔', available: true },
  { id: 4, name: 'Sophie L.', rating: 5.0, walks: 203, lat: 48.8546, lng: 2.3572, price: 15, bio: 'Professionnelle certifiée, 5 ans d\'expérience', specialties: ['Tous gabarits', 'Garde'], photo: '👱‍♀️', available: false },
  { id: 5, name: 'Marc D.',   rating: 4.6, walks: 45,  lat: 48.8586, lng: 2.3492, price: 10, bio: 'Retraité passionné, beaucoup de disponibilité', specialties: ['Petits gabarits'], photo: '👴', available: true },
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
  if (service.isHome) {
    const d = HOME_DURATIONS.find(h => h.id === duration);
    return d ? d.price : 35;
  }
  return Math.round(service.pricePerMin * duration);
}

const getSavedPhase = () => localStorage.getItem('dogger_walker_phase') || 'incoming';
const getSavedEta = () => parseInt(localStorage.getItem('dogger_walker_eta') || '480');
const getSavedWalker = () => { const w = localStorage.getItem('dogger_walker'); return w ? JSON.parse(w) : null; };
const getSavedAddress = () => localStorage.getItem('dogger_walk_address') || '';

export default function BookingFlow() {
  const navigate = useNavigate();
  const isResuming = !!getSavedWalker();

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('now');
  const [form, setForm] = useState({
    address: getSavedAddress(),
    instructions: '', service: 'walk',
    duration: 30, date: '', time: ''
  });
  const [selectedDogs, setSelectedDogs] = useState([]);
  const [userDogs, setUserDogs] = useState([]);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(0);
  const [matched, setMatched] = useState(isResuming);
  const [walker, setWalker] = useState(getSavedWalker());
  const [dots, setDots] = useState([false, false, false]);
  const [locating, setLocating] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [walkerPhase, setWalkerPhase] = useState(getSavedPhase());
  const [etaSeconds, setEtaSeconds] = useState(getSavedEta());
  const [userCoords, setUserCoords] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [selectedWalker, setSelectedWalker] = useState(null);
  const [showWalkerDetail, setShowWalkerDetail] = useState(null);

  // Messagerie
  const [messages, setMessages] = useState([
    { id: 1, from: 'walker', text: 'Bonjour ! J\'ai bien reçu votre demande 🐾', time: 'maintenant' }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);

  const mapRef = useRef(null);
  const walkerMapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const walkerMapInstanceRef = useRef(null);
  const walkerMarkerRef = useRef(null);
  const addressRef = useRef(null);
  const chatEndRef = useRef(null);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const selectedService = SERVICES.find(s => s.id === form.service) || SERVICES[0];
  const price = getPrice(selectedService, form.duration);

  // Load user dogs
  useEffect(() => {
    const loadDogs = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('dogs').select('*').eq('owner_id', session.user.id);
      if (data) { setUserDogs(data); if (data.length === 1) setSelectedDogs([data[0].id]); }
    };
    loadDogs();
  }, []);

  // Set default duration when service changes
  useEffect(() => {
    if (selectedService.isHome) update('duration', 300);
    else update('duration', 30);
  }, [form.service]);

  // Google Maps Autocomplete
  useEffect(() => {
    if (step !== 1 || !window.google) return;
    const input = addressRef.current;
    if (!input) return;
    const autocomplete = new window.google.maps.places.Autocomplete(
      input, { types: ['address'], componentRestrictions: { country: 'fr' } }
    );
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) update('address', place.formatted_address);
      if (place.geometry?.location) {
        const coords = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
        setUserCoords(coords);
        localStorage.setItem('dogger_user_coords', JSON.stringify(coords));
      }
    });
  }, [step]);

  // Init carte promeneurs (étape 3 garde)
  const initWalkerMap = useCallback(() => {
    if (!walkerMapRef.current || !window.google) return;
    if (walkerMapInstanceRef.current) return;

    const center = userCoords || { lat: 48.8566, lng: 2.3522 };
    const map = new window.google.maps.Map(walkerMapRef.current, {
      center, zoom: 15, disableDefaultUI: true,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
    });
    walkerMapInstanceRef.current = map;

    // Ajouter les marqueurs promeneurs
    MOCK_WALKERS.forEach(w => {
      const marker = new window.google.maps.Marker({
        position: { lat: w.lat, lng: w.lng },
        map,
        icon: {
          url: w.available
            ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
            : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window.google.maps.Size(36, 36),
        },
        title: w.name,
        label: { text: w.name.split(' ')[0], color: '#fff', fontSize: '10px', fontWeight: 'bold' }
      });
      marker.addListener('click', () => setShowWalkerDetail(w));
    });

    // Marqueur utilisateur
    new window.google.maps.Marker({
      position: center, map,
      icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', scaledSize: new window.google.maps.Size(40, 40) },
      title: 'Vous'
    });

    setTimeout(() => { window.google.maps.event.trigger(map, 'resize'); map.setCenter(center); }, 200);
  }, [userCoords]);

  useEffect(() => {
    if (step === 3 && selectedService.isHome && walkerMapRef.current) {
      walkerMapInstanceRef.current = null;
      setTimeout(initWalkerMap, 400);
    }
  }, [step, selectedService.isHome, initWalkerMap]);

  // Init carte Thomas en route
  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google || !userCoords) return;
    if (mapInstanceRef.current) return;
    mapRef.current.style.height = '320px';
    mapRef.current.style.width = '100%';
    const map = new window.google.maps.Map(mapRef.current, {
      center: userCoords, zoom: 15, disableDefaultUI: true,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
    });
    mapInstanceRef.current = map;
    setTimeout(() => { window.google.maps.event.trigger(map, 'resize'); map.setCenter(userCoords); }, 200);
    new window.google.maps.Marker({
      position: userCoords, map,
      icon: { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', scaledSize: new window.google.maps.Size(40, 40) },
    });
    const startCoords = {
      lat: userCoords.lat + (Math.random() - 0.5) * 0.008,
      lng: userCoords.lng + (Math.random() - 0.5) * 0.008,
    };
    const walkerMarker = new window.google.maps.Marker({
      position: startCoords, map,
      icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', scaledSize: new window.google.maps.Size(40, 40) },
    });
    walkerMarkerRef.current = walkerMarker;
    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      map, suppressMarkers: true,
      polylineOptions: { strokeColor: '#1D9E75', strokeWeight: 4 }
    });
    directionsService.route({
      origin: startCoords, destination: userCoords,
      travelMode: window.google.maps.TravelMode.WALKING,
    }, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        setRoutePath(result.routes[0].overview_path);
        setEtaSeconds(result.routes[0].legs[0].duration.value);
        localStorage.setItem('dogger_walker_eta', String(result.routes[0].legs[0].duration.value));
      }
    });
  }, [userCoords]);

  useEffect(() => {
    if (matched && userCoords && mapRef.current) setTimeout(initMap, 400);
  }, [matched, userCoords, initMap]);

  // Animer Thomas
  useEffect(() => {
    if (!matched || walkerPhase === 'here' || routePath.length === 0) return;
    const totalSteps = routePath.length;
    const msPerStep = etaSeconds > 0 ? (etaSeconds * 1000) / totalSteps : 1000;
    const interval = setInterval(() => {
      setRoutePath(prev => {
        if (walkerMarkerRef.current && prev.length > 1) {
          walkerMarkerRef.current.setPosition(prev[1]);
          return prev.slice(1);
        }
        return prev;
      });
    }, Math.max(msPerStep, 800));
    return () => clearInterval(interval);
  }, [matched, walkerPhase, routePath.length, etaSeconds]);

  // Countdown ETA
  useEffect(() => {
    if (!matched || walkerPhase === 'here') return;
    const interval = setInterval(() => {
      setEtaSeconds(s => {
        const next = s - 1;
        localStorage.setItem('dogger_walker_eta', String(Math.max(0, next)));
        if (next <= 120 && next > 0) {
          setWalkerPhase(p => { if (p !== 'arriving' && p !== 'here') { localStorage.setItem('dogger_walker_phase', 'arriving'); return 'arriving'; } return p; });
        }
        if (next <= 0) { setWalkerPhase('here'); localStorage.setItem('dogger_walker_phase', 'here'); clearInterval(interval); return 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [matched, walkerPhase]);

  // Géolocalisation
  const handleLocate = () => {
    if (!navigator.geolocation) { setError('Géolocalisation non supportée'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lng } = pos.coords;
        const coords = { lat, lng };
        setUserCoords(coords);
        localStorage.setItem('dogger_user_coords', JSON.stringify(coords));
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'fr' } });
        const data = await res.json();
        if (data.address) {
          const a = data.address;
          const parts = [a.house_number, a.road, a.postcode, a.city || a.town || a.village].filter(Boolean);
          const addr = parts.join(', ') || data.display_name;
          update('address', addr);
          localStorage.setItem('dogger_walk_address', addr);
        }
      } catch (e) { setError('Impossible de récupérer votre adresse'); }
      finally { setLocating(false); }
    }, () => { setError('Permission refusée'); setLocating(false); }, { timeout: 10000, enableHighAccuracy: true });
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
          const w = selectedWalker || { name: 'Thomas M.', rating: 4.9, walks: 127, emoji: '🧑' };
          localStorage.setItem('dogger_walker', JSON.stringify(w));
          localStorage.setItem('dogger_walker_phase', 'incoming');
          localStorage.setItem('dogger_walker_eta', '480');
          setWalker(w);
          setWalkerPhase('incoming');
          setEtaSeconds(480);
          setMatched(true);
          setSearching(false);
        }, 800);
      }
    }, 900);
    return () => clearInterval(interval);
  }, [searching, selectedWalker]);

  useEffect(() => {
    if (!searching) return;
    const interval = setInterval(() => {
      setDots(d => { const n=[...d]; const i=n.indexOf(false); if(i===-1) return [false,false,false]; n[i]=true; return n; });
    }, 300);
    return () => clearInterval(interval);
  }, [searching]);

  // Chat scroll
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showChat]);

  const toggleDog = (dogId) => setSelectedDogs(prev => prev.includes(dogId) ? prev.filter(id => id !== dogId) : [...prev, dogId]);

  const validateStep1 = () => {
    if (!form.address) return 'Entrez votre adresse';
    if (mode === 'later' && !form.date) return 'Choisissez une date';
    if (mode === 'later' && !form.time) return 'Choisissez une heure';
    return null;
  };

  const nextStep = () => {
    if (step === 1) { const err = validateStep1(); if (err) { setError(err); return; } }
    if (step === 2 && selectedDogs.length === 0) { setError('Sélectionnez au moins un chien'); return; }
    if (step === 3 && selectedService.isHome && !selectedWalker) { setError('Sélectionnez un promeneur'); return; }
    setError(''); setStep(s => s + 1);
  };

  const confirm = () => {
    localStorage.setItem('dogger_walk_active', String(form.duration));
    localStorage.setItem('dogger_walk_service', selectedService.name);
    localStorage.setItem('dogger_walk_start', String(Date.now()));
    localStorage.setItem('dogger_walk_address', form.address);
    if (userCoords) localStorage.setItem('dogger_user_coords', JSON.stringify(userCoords));
    setSearching(true);
  };

  const handleCancelConfirm = () => {
    localStorage.removeItem('dogger_walk_active');
    localStorage.removeItem('dogger_walk_service');
    localStorage.removeItem('dogger_walk_start');
    localStorage.removeItem('dogger_walk_address');
    localStorage.removeItem('dogger_walker');
    localStorage.removeItem('dogger_walker_eta');
    localStorage.removeItem('dogger_walker_phase');
    localStorage.removeItem('dogger_walker_start_coords');
    navigate('/dashboard');
  };

  const startWalk = () => {
    localStorage.removeItem('dogger_walker');
    localStorage.removeItem('dogger_walker_eta');
    localStorage.removeItem('dogger_walker_phase');
    navigate('/dashboard#live');
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = { id: Date.now(), from: 'owner', text: newMessage, time: 'maintenant' };
    setMessages(m => [...m, msg]);
    setNewMessage('');
    // Simuler réponse du promeneur
    setTimeout(() => {
      const responses = [
        'Parfait, je note ! 🐾',
        'Bien reçu, merci !',
        'Je serai là dans quelques minutes 🚶',
        'Votre chien est adorable !',
      ];
      setMessages(m => [...m, { id: Date.now() + 1, from: 'walker', text: responses[Math.floor(Math.random() * responses.length)], time: 'maintenant' }]);
    }, 1500);
  };

  const formatEta = (s) => {
    if (s <= 0) return 'quelques secondes';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m === 0) return `${sec}s`;
    return sec > 0 ? `${m} min ${sec}s` : `${m} min`;
  };

  const totalSteps = selectedService.isHome ? 4 : 4;

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
          @keyframes ping { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.5);opacity:0} }
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
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
              {dots.map((active, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: active ? '#1D9E75' : '#E0E0E0', transition: 'background 0.2s' }} />)}
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

  // ── CHAT ─────────────────────────────────────────────────────────────────
  if (showChat && matched && walker) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAF9', fontFamily: 'sans-serif', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setShowChat(false)}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}>
            ← Retour
          </button>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            {walker.emoji || '🧑'}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{walker.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>🟢 En ligne</div>
          </div>
        </div>

        <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.from === 'owner' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '75%', background: msg.from === 'owner' ? '#1D9E75' : '#fff', color: msg.from === 'owner' ? '#fff' : '#1A1A1A', borderRadius: msg.from === 'owner' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div>{msg.text}</div>
                <div style={{ fontSize: 10, color: msg.from === 'owner' ? 'rgba(255,255,255,0.7)' : '#AAA', marginTop: 4, textAlign: 'right' }}>{msg.time}</div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #F0F0F0', display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            style={{ flex: 1, padding: '12px 14px', borderRadius: 24, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA' }}
            placeholder="Écrire un message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage}
            style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ➤
          </button>
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
          @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
          @keyframes slidein { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        `}</style>

        <div style={{ position: 'relative', height: 320 }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {!userCoords && (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #E8F5F0, #D0EDE4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 48 }}>🗺️</div>
            </div>
          )}
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: isHere ? '#1D9E75' : isArriving ? '#F59E0B' : '#fff', color: isHere || isArriving ? '#fff' : '#1D9E75', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 700, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', whiteSpace: 'nowrap', zIndex: 10, animation: isArriving || isHere ? 'pulse 1s infinite' : 'none' }}>
            {isHere ? '🎉 Thomas est arrivé !' : isArriving ? '⚠️ Préparez-vous !' : `🚶 ${walker.name} arrive dans ${formatEta(etaSeconds)}`}
          </div>
        </div>

        <div style={{ flex: 1, padding: '20px', background: '#fff', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#F8FAF9', borderRadius: 16, padding: '16px', marginBottom: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{walker.emoji || '🧑'}</div>
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

          {/* Bouton messagerie */}
          <button onClick={() => setShowChat(true)}
            style={{ width: '100%', padding: '12px', background: '#E1F5EE', color: '#0F6E56', border: '1.5px solid #1D9E75', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            💬 Messagerie avec {walker.name}
            {messages.length > 0 && <span style={{ background: '#1D9E75', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{messages.length}</span>}
          </button>

          <div style={{ background: '#F8FAF9', borderRadius: 14, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: '#555' }}>
            <div style={{ marginBottom: 4 }}>📍 {form.address || getSavedAddress()}</div>
            <div style={{ marginBottom: 4 }}>🐾 {selectedService.name} · {selectedService.isHome ? HOME_DURATIONS.find(d => d.id === form.duration)?.label : DURATIONS.find(d => d.id === form.duration)?.label}</div>
            <div style={{ fontWeight: 700, color: '#1D9E75' }}>💶 {price}€</div>
          </div>

          {isHere ? (
            <button onClick={startWalk}
              style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10, animation: 'slidein 0.3s ease' }}>
              🐾 Confirmer le départ de la balade
            </button>
          ) : (
            <div style={{ background: isArriving ? '#FFF8E1' : '#E1F5EE', borderRadius: 12, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: isArriving ? '#F59E0B' : '#0F6E56', fontWeight: 600, textAlign: 'center' }}>
              {isArriving ? '⚠️ Préparez votre chien — Thomas arrive !' : `🚶 ${walker.name} est en route vers vous...`}
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
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/dashboard')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
          ← Retour
        </button>
        <div style={{ fontSize: 28, marginBottom: 8 }}>
          {step === 1 ? '📍' : step === 2 ? '🐾' : step === 3 ? '🎯' : '✅'}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          {step === 1 ? 'Où ?' : step === 2 ? 'Quel(s) chien(s) ?' : step === 3 ? selectedService.isHome ? 'Choisir un promeneur' : 'Quel service ?' : 'Récapitulatif'}
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
              value={form.address} onChange={e => { update('address', e.target.value); localStorage.setItem('dogger_walk_address', e.target.value); }} />
            {mode === 'later' && (
              <>
                <label style={labelStyle}>Date</label>
                <input style={inputStyle} type="date" value={form.date} min={new Date().toISOString().split('T')[0]} onChange={e => update('date', e.target.value)} />
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
            <textarea style={{ ...inputStyle, height: 80, resize: 'none' }} placeholder="Code porte, comportement particulier..." value={form.instructions} onChange={e => update('instructions', e.target.value)} />
          </div>
        )}

        {/* ÉTAPE 2 — CHIENS */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Sélectionnez le ou les chiens à promener</p>
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
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  {userDogs.map(d => {
                    const isSelected = selectedDogs.includes(d.id);
                    return (
                      <div key={d.id} onClick={() => toggleDog(d.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', borderRadius: 16, border: isSelected ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: isSelected ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer' }}>
                        {d.photo_url
                          ? <img src={d.photo_url} alt={d.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} />
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
                {selectedDogs.length > 0 && (
                  <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#0F6E56', fontWeight: 600 }}>
                    🐾 {selectedDogs.length} chien{selectedDogs.length > 1 ? 's' : ''} sélectionné{selectedDogs.length > 1 ? 's' : ''}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ÉTAPE 3 — SERVICE ou PROMENEURS CARTE */}
        {step === 3 && (
          <div>
            {!selectedService.isHome ? (
              // Sélection service normal
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
                      {s.isHome
                        ? <div style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75' }}>dès 35€</div>
                        : s.fixedPrice
                          ? <div style={{ fontSize: 16, fontWeight: 700, color: '#1D9E75' }}>{s.fixedPrice}€</div>
                          : <div style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75' }}>dès {Math.round(s.pricePerMin * 15)}€</div>
                      }
                    </div>
                  ))}
                </div>
                {selectedService && !selectedService.fixedPrice && !selectedService.isHome && (
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
            ) : (
              // GARDE À DOMICILE — carte + promeneurs
              <div>
                {/* Durées garde */}
                <label style={labelStyle}>⏱️ Durée de la garde</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {HOME_DURATIONS.map(d => (
                    <div key={d.id} onClick={() => update('duration', d.id)}
                      style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderRadius: 14, border: form.duration === d.id ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: form.duration === d.id ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: form.duration === d.id ? '#0F6E56' : '#1A1A1A' }}>{d.label}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{d.desc}</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1D9E75' }}>{d.price}€</div>
                      {form.duration === d.id && <div style={{ marginLeft: 10, width: 20, height: 20, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>✓</div>}
                    </div>
                  ))}
                </div>

                {/* Carte promeneurs */}
                <label style={labelStyle}>📍 Promeneurs disponibles près de vous</label>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <div ref={walkerMapRef} style={{ height: 220, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', background: '#E8F5F0' }} />
                  <div style={{ position: 'absolute', bottom: 10, left: 10, background: '#fff', borderRadius: 10, padding: '4px 10px', fontSize: 11, color: '#555' }}>
                    🟢 Disponible &nbsp; 🔴 Indisponible
                  </div>
                </div>

                {/* Liste promeneurs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {MOCK_WALKERS.filter(w => w.available).map(w => (
                    <div key={w.id} onClick={() => setSelectedWalker(selectedWalker?.id === w.id ? null : w)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, border: selectedWalker?.id === w.id ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: selectedWalker?.id === w.id ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{w.photo}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{w.name}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>⭐ {w.rating} · {w.walks} balades</div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{w.bio}</div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {w.specialties.map(s => (
                            <span key={s} style={{ background: '#E1F5EE', color: '#0F6E56', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{s}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1D9E75' }}>{w.price}€</div>
                        <div style={{ fontSize: 10, color: '#888' }}>/ 30 min</div>
                        {selectedWalker?.id === w.id && <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 700, marginTop: 4 }}>✓ Sélectionné</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {userDogs.filter(d => selectedDogs.includes(d.id)).map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E1F5EE', borderRadius: 20, padding: '4px 12px' }}>
                      <span style={{ fontSize: 16 }}>{SIZE_ICONS[d.size] || '🐕'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F6E56' }}>{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Promeneur sélectionné pour garde */}
              {selectedService.isHome && selectedWalker && (
                <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 24 }}>{selectedWalker.photo}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F6E56' }}>{selectedWalker.name}</div>
                    <div style={{ fontSize: 12, color: '#555' }}>⭐ {selectedWalker.rating} · {selectedWalker.walks} balades</div>
                  </div>
                </div>
              )}

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
              <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>
                ⏱️ {selectedService.isHome
                  ? HOME_DURATIONS.find(d => d.id === form.duration)?.label
                  : DURATIONS.find(d => d.id === form.duration)?.label}
              </div>
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
          {step === 1 ? 'Choisir mes chiens →'
            : step === 2 ? 'Choisir un service →'
            : step === 3 ? 'Voir le récapitulatif →'
            : '⚡ Confirmer la commande'}
        </button>

      </div>

      {/* MODAL DETAIL PROMENEUR */}
      {showWalkerDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 12px' }}>{showWalkerDetail.photo}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A' }}>{showWalkerDetail.name}</div>
              <div style={{ fontSize: 14, color: '#1D9E75' }}>⭐ {showWalkerDetail.rating} · {showWalkerDetail.walks} balades</div>
            </div>
            <div style={{ background: '#F8FAF9', borderRadius: 12, padding: '14px', marginBottom: 16, fontSize: 14, color: '#555' }}>
              {showWalkerDetail.bio}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {showWalkerDetail.specialties.map(s => (
                <span key={s} style={{ background: '#E1F5EE', color: '#0F6E56', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>{s}</span>
              ))}
            </div>
            {showWalkerDetail.available ? (
              <button onClick={() => { setSelectedWalker(showWalkerDetail); setShowWalkerDetail(null); }}
                style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
                ✅ Sélectionner {showWalkerDetail.name}
              </button>
            ) : (
              <div style={{ background: '#FFF0F0', borderRadius: 12, padding: '12px', marginBottom: 10, textAlign: 'center', fontSize: 14, color: '#E24B4A', fontWeight: 600 }}>
                ❌ Indisponible pour le moment
              </div>
            )}
            <button onClick={() => setShowWalkerDetail(null)}
              style={{ width: '100%', padding: 13, background: 'transparent', color: '#888', border: '1.5px solid #E8E8E8', borderRadius: 14, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              Fermer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
