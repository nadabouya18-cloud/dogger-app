import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import useBookingStore from '../store/bookingStore';

const WALK_SERVICES = [
  { id: 'walk',   icon: '🐕',  name: 'Balade',           desc: 'Promenade dans le quartier',   pricePerMin: 0.42, popular: false },
  { id: 'shared', icon: '🐕‍🦺', name: 'Balade Shared',    desc: 'Balade en groupe économique',  pricePerMin: 0.25, popular: true  },
  { id: 'parc',   icon: '🌳',  name: 'Dogger Parc',      desc: 'Session de jeu en parc canin', pricePerMin: 0.35, popular: false },
];

const DURATIONS = [
  { id: 15, label: '15 min' }, { id: 30, label: '30 min' },
  { id: 45, label: '45 min' }, { id: 60, label: '1h' },
  { id: 90, label: '1h30' },   { id: 120, label: '2h' },
];

const HOME_DURATIONS = [
  { id: 300,   label: '5h',        desc: 'Demi-journée', price: 35  },
  { id: 720,   label: '12h',       desc: 'Journée',      price: 55  },
  { id: 1440,  label: '1 jour',    desc: '24h',          price: 75  },
  { id: 2880,  label: '2 jours',   desc: '48h',          price: 140 },
  { id: 4320,  label: '3 jours',   desc: '72h',          price: 195 },
  { id: 10080, label: '1 semaine', desc: '7 jours',      price: 399 },
];

const MOCK_WALKERS = [
  { id: 1, name: 'Thomas M.', rating: 4.9, walks: 127, lat: 48.8576, lng: 2.3532, price: 13, bio: "Passionné par les animaux, 3 ans d'expérience", specialties: ['Petits gabarits', 'Seniors'], photo: '🧑', available: true, dist: '320m', eta: '8 min' },
  { id: 2, name: 'Julie R.',  rating: 4.8, walks: 89,  lat: 48.8556, lng: 2.3512, price: 12, bio: 'Vétérinaire en formation, douce et attentionnée', specialties: ['Tous gabarits', 'Chiots'], photo: '👩', available: true, dist: '450m', eta: '10 min' },
  { id: 3, name: 'Karim B.',  rating: 4.7, walks: 64,  lat: 48.8596, lng: 2.3552, price: 11, bio: 'Sportif, idéal pour les chiens énergiques', specialties: ['Grands gabarits', 'Sport'], photo: '🧔', available: true, dist: '600m', eta: '12 min' },
  { id: 4, name: 'Sophie L.', rating: 5.0, walks: 203, lat: 48.8546, lng: 2.3572, price: 15, bio: "Professionnelle certifiée, 5 ans d'expérience", specialties: ['Tous gabarits', 'Garde'], photo: '👱‍♀️', available: false, dist: '200m', eta: '5 min' },
  { id: 5, name: 'Marc D.',   rating: 4.6, walks: 45,  lat: 48.8586, lng: 2.3492, price: 10, bio: 'Retraité passionné, beaucoup de disponibilité', specialties: ['Petits gabarits'], photo: '👴', available: true, dist: '750m', eta: '15 min' },
];

const TIMES = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
const DEPOSIT_TIMES = ['08:00','09:00','10:00','11:00','12:00','13:00'];
const PICKUP_TIMES  = ['14:00','15:00','16:00','17:00','18:00','19:00'];

const SEARCH_STEPS = [
  '🔍 Recherche de gardiens à proximité...',
  '📡 Vérification des disponibilités...',
  '🐾 3 gardiens disponibles trouvés !',
  '📲 Envoi de la demande...',
  '✅ Mise en relation en cours...',
];

const WALK_SEARCH_STEPS = [
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

function formatDuration(minutes) {
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    return `${days} jour${days > 1 ? 's' : ''}`;
  }
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}` : `${h}h`;
  }
  return `${minutes} min`;
}

export default function BookingFlow() {
  const navigate = useNavigate();
  const { flowType: urlFlowType } = useParams();

  const {
    flowType, setFlowType,
    walkStep, setWalkStep, walkService, setWalkService,
    walkDuration, setWalkDuration, walkMode, setWalkMode,
    walkAddress, setWalkAddress, walkDate, setWalkDate,
    walkTime, setWalkTime, walkInstructions, setWalkInstructions,
    homeStep, setHomeStep, homeMode, setHomeMode,
    homeDuration, setHomeDuration, homeAddress, setHomeAddress,
    homeStartDate, setHomeStartDate, homeEndDate, setHomeEndDate,
    homeDepositTime, setHomeDepositTime, homePickupTime, setHomePickupTime,
    homeFoodInfo, setHomeFoodInfo, homeMedInfo, setHomeMedInfo,
    homeBehaviorInfo, setHomeBehaviorInfo, homeAccessories, setHomeAccessories,
    homeInstructions, setHomeInstructions,
    selectedHomeWalker, setSelectedHomeWalker,
    homeConfirmed, setHomeConfirmed,
    dogHandedOver, setDogHandedOver,
    walker, setWalker, walkerPhase, setWalkerPhase,
    etaSeconds, setEtaSeconds, matched, setMatched,
    searching, setSearching, userCoords, setUserCoords,
    selectedDogs, setSelectedDogs,
    resetBooking,
  } = useBookingStore();

  const [userDogs, setUserDogs] = React.useState([]);
  const [error, setError] = React.useState('');
  const [locating, setLocating] = React.useState(false);
  const [dots, setDots] = React.useState([false, false, false]);
  const [searchStep, setSearchStep] = React.useState(0);
  const [routePath, setRoutePath] = React.useState([]);
  const [showCancel, setShowCancel] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [messages, setMessages] = React.useState([
    { id: 1, from: 'walker', text: "Bonjour ! J'ai bien reçu votre demande 🐾", time: 'maintenant' }
  ]);
  const [newMessage, setNewMessage] = React.useState('');
  const [showChat, setShowChat] = React.useState(false);
  const [showWalkerDetail, setShowWalkerDetail] = React.useState(null);

  const mapRef = useRef(null);
  const walkerMapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const walkerMapInstanceRef = useRef(null);
  const walkerMarkerRef = useRef(null);
  const addressRef = useRef(null);
  const homeAddressRef = useRef(null);
  const chatEndRef = useRef(null);

  // Initialiser flowType depuis l'URL
  useEffect(() => {
    if (urlFlowType === 'walk' || urlFlowType === 'home') {
      if (!homeConfirmed && !matched) {
        resetBooking();
      }
      setFlowType(urlFlowType);
    } else if (!urlFlowType) {
      // On arrive sur /book sans flowType — reset systématique
      resetBooking();
    }
  }, [urlFlowType]);

  // Charger les chiens
  useEffect(() => {
    const loadDogs = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('dogs').select('*').eq('owner_id', session.user.id);
      if (data) {
        setUserDogs(data);
        if (data.length === 1 && selectedDogs.length === 0) setSelectedDogs([data[0].id]);
      }
    };
    loadDogs();
  }, []);

  // Autocomplete walk
  useEffect(() => {
    if (flowType !== 'walk' || walkStep !== 1 || !window.google) return;
    const input = addressRef.current;
    if (!input) return;
    const ac = new window.google.maps.places.Autocomplete(input, { types: ['address'], componentRestrictions: { country: 'fr' } });
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (place.formatted_address) setWalkAddress(place.formatted_address);
      if (place.geometry?.location) {
        setUserCoords({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      }
    });
  }, [flowType, walkStep]);

  // Autocomplete home
  useEffect(() => {
    if (flowType !== 'home' || homeStep !== 1 || !window.google) return;
    const input = homeAddressRef.current;
    if (!input) return;
    const ac = new window.google.maps.places.Autocomplete(input, { types: ['address'], componentRestrictions: { country: 'fr' } });
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (place.formatted_address) setHomeAddress(place.formatted_address);
      if (place.geometry?.location) {
        setUserCoords({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      }
    });
  }, [flowType, homeStep]);

  // Carte gardiens
  const initWalkerMap = useCallback(() => {
    if (!walkerMapRef.current || !window.google || walkerMapInstanceRef.current) return;
    const center = userCoords || { lat: 48.8566, lng: 2.3522 };
    const map = new window.google.maps.Map(walkerMapRef.current, {
      center, zoom: 15, disableDefaultUI: true,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
    });
    walkerMapInstanceRef.current = map;
    MOCK_WALKERS.forEach(w => {
      const marker = new window.google.maps.Marker({
        position: { lat: w.lat, lng: w.lng }, map,
        icon: { url: w.available ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new window.google.maps.Size(36, 36) },
        title: w.name
      });
      marker.addListener('click', () => setShowWalkerDetail(w));
    });
    new window.google.maps.Marker({ position: center, map, icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', scaledSize: new window.google.maps.Size(40, 40) }, title: 'Vous' });
    setTimeout(() => { window.google.maps.event.trigger(map, 'resize'); map.setCenter(center); }, 200);
  }, [userCoords]);

  useEffect(() => {
    if (flowType === 'home' && homeStep === 4 && walkerMapRef.current) {
      walkerMapInstanceRef.current = null;
      setTimeout(initWalkerMap, 400);
    }
  }, [flowType, homeStep, initWalkerMap]);

  // Carte promeneur en route
  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google || !userCoords || mapInstanceRef.current) return;
    mapRef.current.style.height = '320px';
    const map = new window.google.maps.Map(mapRef.current, {
      center: userCoords, zoom: 15, disableDefaultUI: true,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
    });
    mapInstanceRef.current = map;
    setTimeout(() => { window.google.maps.event.trigger(map, 'resize'); map.setCenter(userCoords); }, 200);
    new window.google.maps.Marker({ position: userCoords, map, icon: { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', scaledSize: new window.google.maps.Size(40, 40) } });
    const startCoords = { lat: userCoords.lat + (Math.random() - 0.5) * 0.008, lng: userCoords.lng + (Math.random() - 0.5) * 0.008 };
    const wm = new window.google.maps.Marker({ position: startCoords, map, icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', scaledSize: new window.google.maps.Size(40, 40) } });
    walkerMarkerRef.current = wm;
    const ds = new window.google.maps.DirectionsService();
    const dr = new window.google.maps.DirectionsRenderer({ map, suppressMarkers: true, polylineOptions: { strokeColor: '#1D9E75', strokeWeight: 4 } });
    ds.route({ origin: startCoords, destination: userCoords, travelMode: window.google.maps.TravelMode.WALKING }, (result, status) => {
      if (status === 'OK') {
        dr.setDirections(result);
        setRoutePath(result.routes[0].overview_path);
        const dur = result.routes[0].legs[0].duration.value;
        setEtaSeconds(dur);
      }
    });
  }, [userCoords]);

  useEffect(() => {
    if (matched && userCoords && mapRef.current) setTimeout(initMap, 400);
  }, [matched, userCoords, initMap]);

  // Animation walker sur la carte
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
        if (next <= 120 && next > 0 && walkerPhase !== 'arriving' && walkerPhase !== 'here') {
          setWalkerPhase('arriving');
        }
        if (next <= 0) {
          setWalkerPhase('here');
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [matched, walkerPhase]);

  // Animation recherche
  useEffect(() => {
    if (!searching) return;
    let i = 0;
    const steps = flowType === 'home' ? SEARCH_STEPS : WALK_SEARCH_STEPS;
    const interval = setInterval(() => {
      setSearchStep(i); i++;
      if (i >= steps.length) {
        clearInterval(interval);
        setTimeout(() => {
          const w = flowType === 'home' && selectedHomeWalker
            ? { ...selectedHomeWalker, emoji: selectedHomeWalker.photo }
            : { name: 'Thomas M.', rating: 4.9, walks: 127, emoji: '🧑' };
          setWalker(w);
          setWalkerPhase('incoming');
          setEtaSeconds(480);
          setMatched(true);
          setSearching(false);
          if (flowType === 'home') setHomeConfirmed(true);
        }, 800);
      }
    }, 900);
    return () => clearInterval(interval);
  }, [searching, flowType, selectedHomeWalker]);

  useEffect(() => {
    if (!searching) return;
    const interval = setInterval(() => {
      setDots(d => { const n=[...d]; const i=n.indexOf(false); if(i===-1) return [false,false,false]; n[i]=true; return n; });
    }, 300);
    return () => clearInterval(interval);
  }, [searching]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showChat]);

  const toggleDog = (id) => setSelectedDogs(
    selectedDogs.includes(id) ? selectedDogs.filter(x => x !== id) : [...selectedDogs, id]
  );

  const goToDashboard = () => {
    resetBooking();
    navigate('/dashboard');
  };

  const handleCancelConfirm = () => {
    resetBooking();
    navigate('/dashboard');
  };

  const startWalk = () => {
    if (flowType === 'home') setHomeConfirmed(true);
    else navigate('/dashboard');
  };

  const confirmHandover = () => {
    setDogHandedOver(true);
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages(m => [...m, { id: Date.now(), from: 'owner', text: newMessage, time: 'maintenant' }]);
    setNewMessage('');
    setTimeout(() => {
      const r = ["Parfait, je note ! 🐾","Bien reçu, merci !","Je serai là dans quelques minutes 🚶","Votre chien est adorable !","Ne vous inquiétez pas 🐕"];
      setMessages(m => [...m, { id: Date.now()+1, from: 'walker', text: r[Math.floor(Math.random()*r.length)], time: 'maintenant' }]);
    }, 1500);
  };

  const formatEta = (s) => {
    if (s <= 0) return 'quelques secondes';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m === 0) return `${sec}s`;
    return sec > 0 ? `${m} min ${sec}s` : `${m} min`;
  };

  const calcHomeDuration = (startDate, endDate, depositTime, pickupTime) => {
    if (!startDate) return;
    if (startDate === endDate && depositTime && pickupTime) {
      const [sh, sm] = depositTime.split(':').map(Number);
      const [eh, em] = pickupTime.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff > 0) setHomeDuration(diff);
    } else if (endDate && startDate < endDate) {
      const start = new Date(`${startDate}T${depositTime || '08:00'}`);
      const end   = new Date(`${endDate}T${pickupTime || '18:00'}`);
      const diff  = Math.round((end - start) / 60000);
      if (diff > 0) setHomeDuration(diff);
    }
  };

  const handleLocate = (setAddr) => {
    if (!navigator.geolocation) { setError('Géolocalisation non supportée'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserCoords({ lat, lng });
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'fr' } });
        const data = await res.json();
        if (data.address) {
          const a = data.address;
          const addr = [a.house_number, a.road, a.postcode, a.city || a.town || a.village].filter(Boolean).join(', ') || data.display_name;
          setAddr(addr);
        }
      } catch (e) { setError('Impossible de récupérer votre adresse'); }
      finally { setLocating(false); }
    }, () => { setLocating(false); }, { timeout: 10000, enableHighAccuracy: true });
  };

  const confirmSearch = () => {
    if (flowType === 'home' && homeMode === 'later') {
      const w = selectedHomeWalker
        ? { ...selectedHomeWalker, emoji: selectedHomeWalker.photo }
        : { name: 'Thomas M.', rating: 4.9, walks: 127, emoji: '🧑' };
      setWalker(w);
      setHomeConfirmed(true);
      return;
    }
    // Mode "maintenant" avec un gardien déjà choisi (étape 4) → pas de recherche, accès direct au suivi
    if (flowType === 'home' && homeMode === 'now' && selectedHomeWalker) {
      const w = { ...selectedHomeWalker, emoji: selectedHomeWalker.photo };
      const etaMinutes = parseInt(selectedHomeWalker.eta) || 8;
      setWalker(w);
      setWalkerPhase('incoming');
      setEtaSeconds(etaMinutes * 60);
      setMatched(true);
      setHomeConfirmed(true);
      return;
    }
    setSearching(true);
  };

  const inputStyle = { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #E8E8E8', fontSize: 15, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', color: '#1A1A1A', marginBottom: 12, boxSizing: 'border-box' };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, display: 'block' };
  const textareaStyle = { ...inputStyle, height: 72, resize: 'none' };

  // ── RECHERCHE ─────────────────────────────────────────────────────────────
  if (searching) {
    const steps = flowType === 'home' ? SEARCH_STEPS : WALK_SEARCH_STEPS;
    return (
      <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'sans-serif', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <style>{`@keyframes ping{0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.5);opacity:0}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
        <div style={{ height: 300, background: 'linear-gradient(160deg, #E8F5F0, #D0EDE4)', position: 'relative', overflow: 'hidden' }}>
          {[60,120,180,240].map(y => <div key={y} style={{ position: 'absolute', left: 0, right: 0, top: y, height: 1, background: 'rgba(29,158,117,0.12)' }} />)}
          {[60,120,180,240,300,360].map(x => <div key={x} style={{ position: 'absolute', top: 0, bottom: 0, left: x, width: 1, background: 'rgba(29,158,117,0.12)' }} />)}
          {[{x:80,y:60},{x:200,y:100},{x:300,y:50}].map((pos,i) => (
            <div key={i} style={{ position: 'absolute', left: pos.x, top: pos.y, animation: `float ${1.5+i*0.3}s ease-in-out infinite` }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{flowType === 'home' ? '🏠' : '🚶'}</div>
            </div>
          ))}
          <div style={{ position: 'absolute', left: '50%', top: '55%', transform: 'translate(-50%,-50%)' }}>
            <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', border: '2px solid rgba(29,158,117,0.3)', top: -40, left: -40, animation: 'ping 1.2s ease-out infinite' }} />
            <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', border: '2px solid rgba(29,158,117,0.2)', top: -60, left: -60, animation: 'ping 1.2s ease-out infinite 0.4s' }} />
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, position: 'relative', zIndex: 2 }}>📍</div>
          </div>
          <div style={{ position: 'absolute', top: 16, left: 16, background: 'white', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#1D9E75' }}>
            {(flowType === 'home' ? homeAddress : walkAddress).split(',')[0]} 🗺️
          </div>
        </div>
        <div style={{ flex: 1, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 5 }}>{dots.map((active, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: active ? '#1D9E75' : '#E0E0E0', transition: 'background 0.2s' }} />)}</div>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Recherche en cours</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {steps.map((s, i) => (
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

  // ── CHAT ──────────────────────────────────────────────────────────────────
  if (showChat && (matched || homeConfirmed) && walker) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAF9', fontFamily: 'sans-serif', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setShowChat(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}>← Retour</button>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{walker.emoji || '🧑'}</div>
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
          <input style={{ flex: 1, padding: '12px 14px', borderRadius: 24, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA' }}
            placeholder="Écrire un message..." value={newMessage}
            onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} />
          <button onClick={sendMessage} style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>➤</button>
        </div>
      </div>
    );
  }

  // ── GARDIEN EN ROUTE (HOME) ───────────────────────────────────────────────
  if (homeConfirmed && flowType === 'home' && walker) {
    if (dogHandedOver) {
      return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'sans-serif', maxWidth: 430, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 24px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🐾</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Garde en cours</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{formatDuration(homeDuration)}</p>
          </div>
          <div style={{ padding: '24px 20px' }}>
            <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{walker.emoji || '🧑'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{walker.name}</div>
                <div style={{ fontSize: 13, color: '#1D9E75' }}>⭐ {walker.rating} · {walker.walks} balades</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>🟢 Garde en cours</div>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>📸 Nouvelles de votre chien</div>
              {[{ icon: '✅', text: 'Votre chien est bien arrivé', time: 'maintenant', color: '#1D9E75' }, { icon: '🍽️', text: 'Repas servi', time: 'À venir', color: '#888' }, { icon: '📸', text: 'Photo du soir', time: 'À venir', color: '#888' }].map((n, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, opacity: i === 0 ? 1 : 0.4 }}>
                  <span style={{ fontSize: 20 }}>{n.icon}</span>
                  <div><div style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: n.color }}>{n.text}</div><div style={{ fontSize: 11, color: '#AAA' }}>{n.time}</div></div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowChat(true)} style={{ width: '100%', padding: 14, background: '#E1F5EE', color: '#0F6E56', border: '1.5px solid #1D9E75', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>💬 Contacter {walker.name}</button>
            <button onClick={goToDashboard} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>🏠 Retour au tableau de bord</button>
          </div>
        </div>
      );
    }

    if (homeMode === 'later') {
      return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'sans-serif', maxWidth: 430, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(160deg, #D97706, #F59E0B)', padding: '48px 24px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Garde planifiée !</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{homeStartDate} → {homeEndDate || homeStartDate}</p>
          </div>
          <div style={{ padding: '24px 20px' }}>
            <div style={{ background: '#FFF8E1', borderRadius: 16, padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{walker.emoji || '🧑'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{walker.name}</div>
                <div style={{ fontSize: 13, color: '#D97706' }}>⭐ {walker.rating} · {walker.walks} balades</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>✅ Confirmé pour les dates choisies</div>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>📋 Récapitulatif</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>📅 {homeStartDate}{homeEndDate && homeEndDate !== homeStartDate ? ` → ${homeEndDate}` : ''}</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>🕐 Dépôt {homeDepositTime || '—'} · Reprise {homePickupTime || '—'}</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>⏱️ {formatDuration(homeDuration)}</div>
              <div style={{ fontSize: 13, color: '#555' }}>📍 {homeAddress}</div>
            </div>
            <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#D97706', fontWeight: 500, marginBottom: 16 }}>
              📲 {walker.name} sera notifié et viendra récupérer votre chien le {homeStartDate} à {homeDepositTime || "l'heure convenue"}.
            </div>
            <button onClick={() => setShowChat(true)} style={{ width: '100%', padding: 14, background: '#FFF8E1', color: '#D97706', border: '1.5px solid #F59E0B', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>💬 Contacter {walker.name}</button>
            <button onClick={goToDashboard} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>🏠 Retour au tableau de bord</button>
          </div>
        </div>
      );
    }

    const isArriving = walkerPhase === 'arriving';
    const isHere = walkerPhase === 'here';
    return (
      <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'sans-serif', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes slidein{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        <div style={{ position: 'relative', height: 280 }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {!userCoords && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #E8F5F0, #D0EDE4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🗺️</div>}
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: isHere ? '#1D9E75' : isArriving ? '#F59E0B' : '#fff', color: isHere || isArriving ? '#fff' : '#1D9E75', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 700, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', whiteSpace: 'nowrap', zIndex: 10, animation: isArriving || isHere ? 'pulse 1s infinite' : 'none' }}>
            {isHere ? `🎉 ${walker.name} est arrivé !` : isArriving ? '⚠️ Préparez votre chien !' : `🚶 ${walker.name} arrive dans ${formatEta(etaSeconds)}`}
          </div>
        </div>
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#F8FAF9', borderRadius: 16, padding: '16px', marginBottom: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{walker.emoji || '🧑'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{walker.name}</div>
              <div style={{ fontSize: 13, color: '#1D9E75' }}>⭐ {walker.rating} · {walker.walks} balades</div>
            </div>
            <div style={{ textAlign: 'center', background: isHere ? '#E1F5EE' : isArriving ? '#FFF8E1' : '#F0F0F0', borderRadius: 12, padding: '8px 14px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: isHere ? '#1D9E75' : isArriving ? '#F59E0B' : '#555' }}>{isHere ? '✅' : formatEta(etaSeconds)}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{isHere ? 'Arrivé' : 'restant'}</div>
            </div>
          </div>
          <button onClick={() => setShowChat(true)} style={{ width: '100%', padding: '11px', background: '#E1F5EE', color: '#0F6E56', border: '1.5px solid #1D9E75', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>
            💬 Messagerie avec {walker.name} {messages.length > 0 && <span style={{ marginLeft: 8, background: '#1D9E75', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 11 }}>{messages.length}</span>}
          </button>
          <div style={{ background: '#F8FAF9', borderRadius: 14, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: '#555' }}>
            <div style={{ marginBottom: 4 }}>📍 {homeAddress}</div>
            <div style={{ marginBottom: 4 }}>🏠 Garde à domicile · {formatDuration(homeDuration)}</div>
          </div>
          {isHere ? (
            <div>
              <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '14px 16px', marginBottom: 12, fontSize: 14, color: '#0F6E56', fontWeight: 600, textAlign: 'center', animation: 'slidein 0.3s ease' }}>
                🎉 {walker.name} est devant votre porte !<br/><span style={{ fontSize: 12, fontWeight: 400, color: '#555' }}>Remettez votre chien et confirmez le départ</span>
              </div>
              <button onClick={confirmHandover} style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>🐾 Confirmer la remise du chien</button>
            </div>
          ) : (
            <div style={{ background: isArriving ? '#FFF8E1' : '#E1F5EE', borderRadius: 12, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: isArriving ? '#F59E0B' : '#0F6E56', fontWeight: 600, textAlign: 'center' }}>
              {isArriving ? '⚠️ Préparez votre chien — le gardien arrive !' : `🚶 ${walker.name} est en route pour récupérer votre chien...`}
            </div>
          )}
          {!isHere && <button onClick={() => setShowCancel(true)} style={{ width: '100%', padding: 13, background: 'transparent', color: '#E24B4A', border: '1.5px solid #E24B4A', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>❌ Annuler la garde</button>}
        </div>
        {showCancel && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Annuler la garde</h3>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Pourquoi souhaitez-vous annuler ?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {CANCEL_REASONS.map(r => <div key={r} onClick={() => setCancelReason(r)} style={{ padding: '14px 16px', borderRadius: 12, border: cancelReason === r ? '2px solid #E24B4A' : '1.5px solid #E8E8E8', background: cancelReason === r ? '#FFF0F0' : '#FAFAFA', cursor: 'pointer', fontSize: 14, color: cancelReason === r ? '#E24B4A' : '#555', fontWeight: cancelReason === r ? 600 : 400 }}>{r}</div>)}
              </div>
              <button disabled={!cancelReason} onClick={handleCancelConfirm} style={{ width: '100%', padding: 16, background: cancelReason ? '#E24B4A' : '#F0F0F0', color: cancelReason ? '#fff' : '#AAA', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: cancelReason ? 'pointer' : 'default', marginBottom: 10, fontFamily: 'inherit' }}>Confirmer l'annulation</button>
              <button onClick={() => { setShowCancel(false); setCancelReason(''); }} style={{ width: '100%', padding: 13, background: 'transparent', color: '#888', border: '1.5px solid #E8E8E8', borderRadius: 14, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Garder ma réservation</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── WALKER EN ROUTE (BALADE) ──────────────────────────────────────────────
  if (matched && walker && flowType !== 'home') {
    const isArriving = walkerPhase === 'arriving';
    const isHere = walkerPhase === 'here';
    return (
      <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'sans-serif', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes slidein{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        <div style={{ position: 'relative', height: 320 }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {!userCoords && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #E8F5F0, #D0EDE4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🗺️</div>}
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: isHere ? '#1D9E75' : isArriving ? '#F59E0B' : '#fff', color: isHere || isArriving ? '#fff' : '#1D9E75', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 700, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', whiteSpace: 'nowrap', zIndex: 10, animation: isArriving || isHere ? 'pulse 1s infinite' : 'none' }}>
            {isHere ? '🎉 Le promeneur est arrivé !' : isArriving ? '⚠️ Préparez-vous !' : `🚶 ${walker.name} arrive dans ${formatEta(etaSeconds)}`}
          </div>
        </div>
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#F8FAF9', borderRadius: 16, padding: '16px', marginBottom: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{walker.emoji || '🧑'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{walker.name}</div>
              <div style={{ fontSize: 13, color: '#1D9E75' }}>⭐ {walker.rating} · {walker.walks} balades</div>
            </div>
            <div style={{ textAlign: 'center', background: isHere ? '#E1F5EE' : isArriving ? '#FFF8E1' : '#F0F0F0', borderRadius: 12, padding: '8px 14px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: isHere ? '#1D9E75' : isArriving ? '#F59E0B' : '#555' }}>{isHere ? '✅' : formatEta(etaSeconds)}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{isHere ? 'Arrivé' : 'restant'}</div>
            </div>
          </div>
          <button onClick={() => setShowChat(true)} style={{ width: '100%', padding: '11px', background: '#E1F5EE', color: '#0F6E56', border: '1.5px solid #1D9E75', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>
            💬 Messagerie avec {walker.name} {messages.length > 0 && <span style={{ marginLeft: 8, background: '#1D9E75', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 11 }}>{messages.length}</span>}
          </button>
          <div style={{ background: '#F8FAF9', borderRadius: 14, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: '#555' }}>
            <div style={{ marginBottom: 4 }}>📍 {walkAddress}</div>
            <div style={{ marginBottom: 4 }}>🐾 {WALK_SERVICES.find(s => s.id === walkService)?.name} · {DURATIONS.find(d => d.id === walkDuration)?.label}</div>
          </div>
          {isHere ? (
            <button onClick={startWalk} style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10, animation: 'slidein 0.3s ease' }}>🐾 Confirmer le départ de la balade</button>
          ) : (
            <div style={{ background: isArriving ? '#FFF8E1' : '#E1F5EE', borderRadius: 12, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: isArriving ? '#F59E0B' : '#0F6E56', fontWeight: 600, textAlign: 'center' }}>
              {isArriving ? '⚠️ Préparez votre chien !' : `🚶 ${walker.name} est en route vers vous...`}
            </div>
          )}
          {!isHere && <button onClick={() => setShowCancel(true)} style={{ width: '100%', padding: 13, background: 'transparent', color: '#E24B4A', border: '1.5px solid #E24B4A', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>❌ Annuler la balade</button>}
        </div>
        {showCancel && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Annuler la balade</h3>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Pourquoi souhaitez-vous annuler ?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {CANCEL_REASONS.map(r => <div key={r} onClick={() => setCancelReason(r)} style={{ padding: '14px 16px', borderRadius: 12, border: cancelReason === r ? '2px solid #E24B4A' : '1.5px solid #E8E8E8', background: cancelReason === r ? '#FFF0F0' : '#FAFAFA', cursor: 'pointer', fontSize: 14, color: cancelReason === r ? '#E24B4A' : '#555', fontWeight: cancelReason === r ? 600 : 400 }}>{r}</div>)}
              </div>
              <button disabled={!cancelReason} onClick={handleCancelConfirm} style={{ width: '100%', padding: 16, background: cancelReason ? '#E24B4A' : '#F0F0F0', color: cancelReason ? '#fff' : '#AAA', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: cancelReason ? 'pointer' : 'default', marginBottom: 10, fontFamily: 'inherit' }}>Confirmer l'annulation</button>
              <button onClick={() => { setShowCancel(false); setCancelReason(''); }} style={{ width: '100%', padding: 13, background: 'transparent', color: '#888', border: '1.5px solid #E8E8E8', borderRadius: 14, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Garder ma balade</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── CHOIX INITIAL ─────────────────────────────────────────────────────────
  if (!flowType && !urlFlowType) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto' }}>
        <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 24px 40px' }}>
          <button onClick={goToDashboard} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', marginBottom: 24 }}>← Retour</button>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🐾</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Que recherchez-vous ?</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Choisissez le type de service</p>
        </div>
        <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div onClick={() => { setFlowType('walk'); navigate('/book/walk'); }} style={{ background: '#F8FAF9', borderRadius: 20, padding: '24px', cursor: 'pointer', border: '1.5px solid #E8E8E8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🐕</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>Balade & Activités</div>
                <div style={{ fontSize: 13, color: '#888' }}>Promenade, parc canin, balade en groupe</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {['🐕 Balade Solo', '🐕‍🦺 Balade Shared', '🌳 Dogger Parc'].map(s => <span key={s} style={{ background: '#E1F5EE', color: '#0F6E56', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>{s}</span>)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#888' }}>Disponible en ~5 min ⚡</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75' }}>Dès 4€ →</span>
            </div>
          </div>
          <div onClick={() => { setFlowType('home'); navigate('/book/home'); }} style={{ background: 'linear-gradient(135deg, #FFF8F0, #FFF0E0)', borderRadius: 20, padding: '24px', cursor: 'pointer', border: '1.5px solid #F59E0B', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 12, right: 12, background: '#F59E0B', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 10 }}>Nouveau ✨</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🏠</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>Dogger Home</div>
                <div style={{ fontSize: 13, color: '#888' }}>Garde chez le promeneur</div>
              </div>
            </div>
            <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>⚡ Le gardien vient chez vous</div>
              <div style={{ fontSize: 12, color: '#888' }}>Il récupère votre chien et le garde chez lui. Disponible en moins de 30 min.</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {['5h', '12h', '1 jour', '2 jours', '1 semaine'].map(s => <span key={s} style={{ background: 'rgba(245,158,11,0.15)', color: '#D97706', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>{s}</span>)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#888' }}>📸 Photos régulières · 💬 Chat direct</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#D97706' }}>Dès 35€ →</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── FLOW BALADE ───────────────────────────────────────────────────────────
  if (flowType === 'walk') {
    const walkSelectedService = WALK_SERVICES.find(s => s.id === walkService);
    return (
      <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto' }}>
        <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 24px 32px' }}>
          <button onClick={() => walkStep > 1 ? setWalkStep(walkStep - 1) : setFlowType(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>← Retour</button>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{walkStep === 1 ? '📍' : walkStep === 2 ? '🐾' : walkStep === 3 ? '🎯' : '✅'}</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{walkStep === 1 ? 'Où ?' : walkStep === 2 ? 'Quel(s) chien(s) ?' : walkStep === 3 ? 'Quel service ?' : 'Récapitulatif'}</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Étape {walkStep} sur 4</p>
          <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.2)', borderRadius: 10, height: 4 }}>
            <div style={{ width: `${(walkStep/4)*100}%`, background: '#fff', borderRadius: 10, height: 4, transition: 'width 0.3s' }} />
          </div>
        </div>
        <div style={{ padding: '24px 20px' }}>
          {walkStep === 1 && (
            <div>
              <div style={{ display: 'flex', background: '#F0F0F0', borderRadius: 14, padding: 4, marginBottom: 20 }}>
                {[{id:'now',label:'⚡ Le plus tôt possible'},{id:'later',label:'📅 Planifier'}].map(m => (
                  <button key={m.id} onClick={() => setWalkMode(m.id)} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: walkMode === m.id ? '#fff' : 'transparent', color: walkMode === m.id ? '#1D9E75' : '#888', boxShadow: walkMode === m.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s', fontFamily: 'inherit' }}>{m.label}</button>
                ))}
              </div>
              <button onClick={() => handleLocate(setWalkAddress)} disabled={locating} style={{ width: '100%', padding: '12px', background: '#F0F9F5', color: '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>
                {locating ? '📡 Localisation en cours...' : '📍 Utiliser ma position actuelle'}
              </button>
              <label style={labelStyle}>Ou entrez votre adresse</label>
              <input ref={addressRef} style={inputStyle} placeholder="12 rue de la Paix, Paris 75001" value={walkAddress} onChange={e => setWalkAddress(e.target.value)} />
              {walkMode === 'later' && (
                <>
                  <label style={labelStyle}>Date</label>
                  <input style={inputStyle} type="date" value={walkDate} min={new Date().toISOString().split('T')[0]} onChange={e => setWalkDate(e.target.value)} />
                  <label style={labelStyle}>Heure</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                    {TIMES.map(t => (
                      <div key={t} onClick={() => setWalkTime(t)} style={{ padding: '10px 4px', textAlign: 'center', borderRadius: 10, border: walkTime === t ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: walkTime === t ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer', fontSize: 13, fontWeight: walkTime === t ? 700 : 400, color: walkTime === t ? '#0F6E56' : '#555' }}>{t}</div>
                    ))}
                  </div>
                  <label style={labelStyle}>⏱️ Durée</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {DURATIONS.map(d => (
                      <div key={d.id} onClick={() => setWalkDuration(d.id)} style={{ padding: '10px 16px', borderRadius: 12, border: walkDuration === d.id ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: walkDuration === d.id ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer', fontSize: 14, fontWeight: walkDuration === d.id ? 700 : 400, color: walkDuration === d.id ? '#0F6E56' : '#555' }}>{d.label}</div>
                    ))}
                  </div>
                </>
              )}
              <label style={labelStyle}>Instructions spéciales (optionnel)</label>
              <textarea style={textareaStyle} placeholder="Code porte, comportement particulier..." value={walkInstructions} onChange={e => setWalkInstructions(e.target.value)} />
            </div>
          )}
          {walkStep === 2 && (
            <div>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Sélectionnez le ou les chiens à promener</p>
              {userDogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🐾</div>
                  <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Aucun chien enregistré</p>
                  <button onClick={() => navigate('/add-dog')} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Ajouter un chien</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    {userDogs.map(d => {
                      const isSel = selectedDogs.includes(d.id);
                      return (
                        <div key={d.id} onClick={() => toggleDog(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', borderRadius: 16, border: isSel ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: isSel ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer' }}>
                          {d.photo_url ? <img src={d.photo_url} alt={d.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{SIZE_ICONS[d.size] || '🐕'}</div>}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{d.name}</div>
                            <div style={{ fontSize: 13, color: '#888' }}>{d.breed} · Gabarit {d.size?.toUpperCase()}</div>
                          </div>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${isSel ? '#1D9E75' : '#CCC'}`, background: isSel ? '#1D9E75' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }}>{isSel ? '✓' : ''}</div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedDogs.length > 0 && <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#0F6E56', fontWeight: 600 }}>🐾 {selectedDogs.length} chien{selectedDogs.length > 1 ? 's' : ''} sélectionné{selectedDogs.length > 1 ? 's' : ''}</div>}
                </>
              )}
            </div>
          )}
          {walkStep === 3 && (
            <div>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Le tarif est adapté au gabarit de votre chien</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {WALK_SERVICES.map(s => (
                  <div key={s.id} onClick={() => setWalkService(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', borderRadius: 16, border: walkService === s.id ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: walkService === s.id ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer', position: 'relative' }}>
                    {s.popular && <span style={{ position: 'absolute', top: 10, right: 10, background: '#1D9E75', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>Populaire</span>}
                    <span style={{ fontSize: 32 }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 2 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{s.desc}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75' }}>dès {Math.round(s.pricePerMin * 15)}€</div>
                  </div>
                ))}
              </div>
              {walkMode === 'now' && (
                <>
                  <label style={labelStyle}>⏱️ Durée</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {DURATIONS.map(d => (
                      <div key={d.id} onClick={() => setWalkDuration(d.id)} style={{ padding: '10px 16px', borderRadius: 12, border: walkDuration === d.id ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: walkDuration === d.id ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer', fontSize: 14, fontWeight: walkDuration === d.id ? 700 : 400, color: walkDuration === d.id ? '#0F6E56' : '#555' }}>{d.label}</div>
                    ))}
                  </div>
                </>
              )}
              {walkSelectedService && (
                <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#0F6E56', fontWeight: 600 }}>
                  Prix estimé : {Math.round(walkSelectedService.pricePerMin * walkDuration)}€
                </div>
              )}
            </div>
          )}
          {walkStep === 4 && walkSelectedService && (
            <div>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Vérifiez votre commande</p>
              <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 14 }}>VOTRE COMMANDE</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {userDogs.filter(d => selectedDogs.includes(d.id)).map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E1F5EE', borderRadius: 20, padding: '4px 12px' }}>
                      <span>{SIZE_ICONS[d.size] || '🐕'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F6E56' }}>{d.name}</span>
                    </div>
                  ))}
                </div>
                <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 24 }}>{walkSelectedService.icon}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{walkSelectedService.name}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>{walkSelectedService.desc}</div>
                  </div>
                </div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>{walkMode === 'now' ? '⚡ Le plus tôt possible' : `📅 ${walkDate} à ${walkTime}`}</div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>⏱️ {DURATIONS.find(d => d.id === walkDuration)?.label}</div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>📍 {walkAddress}</div>
                {walkInstructions && <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>📝 {walkInstructions}</div>}
                <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, color: '#555' }}>Total estimé</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#1D9E75' }}>{Math.round(walkSelectedService.pricePerMin * walkDuration)}€</span>
                </div>
              </div>
              <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#888', marginBottom: 20 }}>💳 Votre carte sera débitée uniquement à la fin de la prestation.</div>
            </div>
          )}
          {error && <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 16 }}>⚠️ {error}</div>}
          <button onClick={() => {
            setError('');
            if (walkStep === 1 && !walkAddress) { setError('Entrez votre adresse'); return; }
            if (walkStep === 2 && selectedDogs.length === 0) { setError('Sélectionnez au moins un chien'); return; }
            if (walkStep < 4) setWalkStep(walkStep + 1);
            else confirmSearch();
          }} style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)' }}>
            {walkStep === 1 ? 'Choisir mes chiens →' : walkStep === 2 ? 'Choisir un service →' : walkStep === 3 ? 'Voir le récapitulatif →' : '⚡ Trouver un promeneur maintenant'}
          </button>
        </div>
      </div>
    );
  }

  // ── FLOW GARDE À DOMICILE ─────────────────────────────────────────────────
  if (flowType === 'home') {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto' }}>
        <div style={{ background: 'linear-gradient(160deg, #D97706, #F59E0B)', padding: '48px 24px 32px' }}>
          <button onClick={() => homeStep > 1 ? setHomeStep(homeStep - 1) : setFlowType(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>← Retour</button>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏠</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Dogger Home</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 6 }}>
            {homeStep === 1 ? '📍 Adresse & durée' : homeStep === 2 ? '🐾 Quel(s) chien(s) ?' : homeStep === 3 ? '📝 Infos pratiques' : homeStep === 4 ? '👤 Choisir un gardien' : '✅ Récapitulatif'}
          </p>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, height: 4 }}>
            <div style={{ width: `${(homeStep/5)*100}%`, background: '#fff', borderRadius: 10, height: 4, transition: 'width 0.3s' }} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>Étape {homeStep} sur 5</p>
        </div>
        <div style={{ padding: '24px 20px' }}>
          {homeStep === 1 && (
            <div>
              <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#D97706', fontWeight: 500 }}>
                ⚡ Le gardien viendra chercher votre chien chez vous en moins de 30 min
              </div>
              <button onClick={() => handleLocate(setHomeAddress)} disabled={locating} style={{ width: '100%', padding: '12px', background: '#FFFBF0', color: '#D97706', border: '1.5px solid #F59E0B', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>
                {locating ? '📡 Localisation en cours...' : '📍 Utiliser ma position actuelle'}
              </button>
              <label style={labelStyle}>Adresse de récupération</label>
              <input ref={homeAddressRef} style={inputStyle} placeholder="12 rue de la Paix, Paris 75001" value={homeAddress} onChange={e => setHomeAddress(e.target.value)} />
              <div style={{ display: 'flex', background: '#F0F0F0', borderRadius: 14, padding: 4, marginBottom: 16 }}>
                {[{id:'now',label:'⚡ Maintenant'},{id:'later',label:'📅 Planifier'}].map(m => (
                  <button key={m.id} onClick={() => setHomeMode(m.id)} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: homeMode === m.id ? '#fff' : 'transparent', color: homeMode === m.id ? '#D97706' : '#888', boxShadow: homeMode === m.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s', fontFamily: 'inherit' }}>{m.label}</button>
                ))}
              </div>
              {homeMode === 'later' && (
                <div style={{ background: '#FFF8E1', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ ...labelStyle, color: '#D97706' }}>📅 Date de début</label>
                      <input style={{ ...inputStyle, marginBottom: 0, border: '1.5px solid #F59E0B' }} type="date" value={homeStartDate} min={new Date().toISOString().split('T')[0]} onChange={e => { setHomeStartDate(e.target.value); calcHomeDuration(e.target.value, homeEndDate, homeDepositTime, homePickupTime); }} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: '#D97706' }}>📅 Date de fin</label>
                      <input style={{ ...inputStyle, marginBottom: 0, border: '1.5px solid #F59E0B' }} type="date" value={homeEndDate} min={homeStartDate || new Date().toISOString().split('T')[0]} onChange={e => { setHomeEndDate(e.target.value); calcHomeDuration(homeStartDate, e.target.value, homeDepositTime, homePickupTime); }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={{ ...labelStyle, color: '#D97706' }}>🕐 Heure de dépôt</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {DEPOSIT_TIMES.map(t => (
                          <div key={t} onClick={() => { setHomeDepositTime(t); calcHomeDuration(homeStartDate, homeEndDate, t, homePickupTime); }} style={{ padding: '8px 4px', textAlign: 'center', borderRadius: 10, border: homeDepositTime === t ? '2px solid #F59E0B' : '1.5px solid #E8E8E8', background: homeDepositTime === t ? '#FFF8E1' : '#FAFAFA', cursor: 'pointer', fontSize: 12, fontWeight: homeDepositTime === t ? 700 : 400, color: homeDepositTime === t ? '#D97706' : '#555' }}>{t}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: '#D97706' }}>🕐 Heure de reprise</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {PICKUP_TIMES.map(t => (
                          <div key={t} onClick={() => { setHomePickupTime(t); calcHomeDuration(homeStartDate, homeEndDate, homeDepositTime, t); }} style={{ padding: '8px 4px', textAlign: 'center', borderRadius: 10, border: homePickupTime === t ? '2px solid #F59E0B' : '1.5px solid #E8E8E8', background: homePickupTime === t ? '#FFF8E1' : '#FAFAFA', cursor: 'pointer', fontSize: 12, fontWeight: homePickupTime === t ? 700 : 400, color: homePickupTime === t ? '#D97706' : '#555' }}>{t}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {homeDuration > 0 && (
                    <div style={{ background: '#F59E0B', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#fff', fontWeight: 700, textAlign: 'center' }}>
                      ⏱️ Durée : {formatDuration(homeDuration)}
                    </div>
                  )}
                </div>
              )}
              {homeMode === 'now' && (
                <>
                  <label style={labelStyle}>⏱️ Durée de la garde</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {HOME_DURATIONS.map(d => (
                      <div key={d.id} onClick={() => setHomeDuration(d.id)} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderRadius: 14, border: homeDuration === d.id ? '2px solid #F59E0B' : '1.5px solid #E8E8E8', background: homeDuration === d.id ? '#FFF8E1' : '#FAFAFA', cursor: 'pointer' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: homeDuration === d.id ? '#D97706' : '#1A1A1A' }}>{d.label}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>{d.desc}</div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B' }}>{d.price}€</div>
                        {homeDuration === d.id && <div style={{ marginLeft: 10, width: 20, height: 20, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>✓</div>}
                      </div>
                    ))}
                  </div>
                </>
              )}
              <label style={{ ...labelStyle, marginTop: 16 }}>📝 Instructions pour le gardien (optionnel)</label>
              <textarea style={textareaStyle} placeholder="Code porte, digicode, comportement particulier..." value={homeInstructions} onChange={e => setHomeInstructions(e.target.value)} />
            </div>
          )}
          {homeStep === 2 && (
            <div>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Quel(s) chien(s) confier au gardien ?</p>
              {userDogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🐾</div>
                  <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Aucun chien enregistré</p>
                  <button onClick={() => navigate('/add-dog')} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Ajouter un chien</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    {userDogs.map(d => {
                      const isSel = selectedDogs.includes(d.id);
                      return (
                        <div key={d.id} onClick={() => toggleDog(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', borderRadius: 16, border: isSel ? '2px solid #F59E0B' : '1.5px solid #E8E8E8', background: isSel ? '#FFF8E1' : '#FAFAFA', cursor: 'pointer' }}>
                          {d.photo_url ? <img src={d.photo_url} alt={d.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FFF8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{SIZE_ICONS[d.size] || '🐕'}</div>}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{d.name}</div>
                            <div style={{ fontSize: 13, color: '#888' }}>{d.breed} · Gabarit {d.size?.toUpperCase()}</div>
                          </div>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${isSel ? '#F59E0B' : '#CCC'}`, background: isSel ? '#F59E0B' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700 }}>{isSel ? '✓' : ''}</div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedDogs.length > 0 && <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '10px 16px', fontSize: 13, color: '#D97706', fontWeight: 600 }}>🐾 {selectedDogs.length} chien{selectedDogs.length > 1 ? 's' : ''} sélectionné{selectedDogs.length > 1 ? 's' : ''}</div>}
                </>
              )}
            </div>
          )}
          {homeStep === 3 && (
            <div>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Ces infos aideront le gardien à prendre soin de votre chien</p>
              <label style={labelStyle}>🍽️ Alimentation</label>
              <textarea style={textareaStyle} placeholder="Quantité, fréquence, marque de croquettes, allergies..." value={homeFoodInfo} onChange={e => setHomeFoodInfo(e.target.value)} />
              <label style={labelStyle}>💊 Médicaments (optionnel)</label>
              <textarea style={{ ...textareaStyle, height: 60 }} placeholder="Nom, dosage, fréquence..." value={homeMedInfo} onChange={e => setHomeMedInfo(e.target.value)} />
              <label style={labelStyle}>🐕 Comportement & habitudes</label>
              <textarea style={textareaStyle} placeholder="Câlin, joueur, peureux, dort où, heure de sortie..." value={homeBehaviorInfo} onChange={e => setHomeBehaviorInfo(e.target.value)} />
              <label style={labelStyle}>🎒 Accessoires à apporter (optionnel)</label>
              <textarea style={{ ...textareaStyle, height: 60 }} placeholder="Laisse, jouets, couverture, gamelle..." value={homeAccessories} onChange={e => setHomeAccessories(e.target.value)} />
            </div>
          )}
          {homeStep === 4 && (
            <div>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Gardiens disponibles près de vous</p>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <div ref={walkerMapRef} style={{ height: 200, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', background: '#E8F5F0' }} />
                <div style={{ position: 'absolute', bottom: 10, left: 10, background: '#fff', borderRadius: 10, padding: '4px 10px', fontSize: 11, color: '#555' }}>🟢 Disponible &nbsp; 🔴 Indisponible</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MOCK_WALKERS.filter(w => homeMode === 'now' ? w.available : w.id !== 4).map(w => (
                  <div key={w.id} onClick={() => setSelectedHomeWalker(selectedHomeWalker?.id === w.id ? null : w)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, border: selectedHomeWalker?.id === w.id ? '2px solid #F59E0B' : '1.5px solid #E8E8E8', background: selectedHomeWalker?.id === w.id ? '#FFF8E1' : '#FAFAFA', cursor: 'pointer' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{w.photo}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{w.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>⭐ {w.rating} · {w.walks} balades · 📍 {w.dist}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{w.bio}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {w.specialties.map(s => <span key={s} style={{ background: '#FFF8E1', color: '#D97706', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{s}</span>)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {homeMode === 'now' ? (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>~{w.eta}</div>
                          <div style={{ fontSize: 10, color: '#888' }}>arrivée</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>✅ Dispo</div>
                          <div style={{ fontSize: 10, color: '#888' }}>{homeStartDate || 'date choisie'}</div>
                        </>
                      )}
                      {selectedHomeWalker?.id === w.id && <div style={{ fontSize: 11, color: '#D97706', fontWeight: 700, marginTop: 4 }}>✓ Choisi</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {homeStep === 5 && (
            <div>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Vérifiez votre réservation</p>
              <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 14 }}>VOTRE GARDE</div>
                {selectedHomeWalker && (
                  <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 28 }}>{selectedHomeWalker.photo}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#D97706' }}>{selectedHomeWalker.name}</div>
                      <div style={{ fontSize: 12, color: '#555' }}>⭐ {selectedHomeWalker.rating} · {homeMode === 'now' ? `Arrive en ~${selectedHomeWalker.eta}` : `Disponible le ${homeStartDate}`}</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {userDogs.filter(d => selectedDogs.includes(d.id)).map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E1F5EE', borderRadius: 20, padding: '4px 12px' }}>
                      <span>{SIZE_ICONS[d.size] || '🐕'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F6E56' }}>{d.name}</span>
                    </div>
                  ))}
                </div>
                <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 24 }}>🏠</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>Dogger Home</div>
                    <div style={{ fontSize: 13, color: '#888' }}>{formatDuration(homeDuration)}</div>
                  </div>
                </div>
                <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
                <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>
                  {homeMode === 'now' ? '⚡ Le plus tôt possible' : `📅 ${homeStartDate}${homeEndDate && homeEndDate !== homeStartDate ? ` → ${homeEndDate}` : ''} · ${homeDepositTime || ''}${homePickupTime ? ` → ${homePickupTime}` : ''}`}
                </div>
                <div style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>📍 {homeAddress}</div>
                {homeFoodInfo && <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>🍽️ {homeFoodInfo}</div>}
                {homeBehaviorInfo && <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>🐕 {homeBehaviorInfo}</div>}
                <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, color: '#555' }}>Total</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B' }}>
                    {homeMode === 'now' ? `${HOME_DURATIONS.find(d => d.id === homeDuration)?.price || '—'}€` : `${Math.round(homeDuration * 0.048)}€`}
                  </span>
                </div>
              </div>
              <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#888', marginBottom: 20 }}>
                🐾 Le gardien viendra récupérer votre chien · 📸 Photos régulières · 💬 Chat direct
              </div>
            </div>
          )}
          {error && <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 16 }}>⚠️ {error}</div>}
          <button
            style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,0.35)' }}
            onClick={() => {
              setError('');
              if (homeStep === 1 && !homeAddress) { setError('Entrez votre adresse'); return; }
              if (homeStep === 1 && homeMode === 'later' && !homeStartDate) { setError('Choisissez une date de début'); return; }
              if (homeStep === 2 && selectedDogs.length === 0) { setError('Sélectionnez au moins un chien'); return; }
              if (homeStep === 4 && !selectedHomeWalker) { setError('Sélectionnez un gardien'); return; }
              if (homeStep < 5) setHomeStep(homeStep + 1);
              else confirmSearch();
            }}>
            {homeStep === 1 ? 'Choisir mes chiens →' : homeStep === 2 ? 'Informations pratiques →' : homeStep === 3 ? 'Choisir un gardien →' : homeStep === 4 ? 'Voir le récapitulatif →' : '⚡ Confirmer'}
          </button>
        </div>
        {showWalkerDetail && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430 }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 12px' }}>{showWalkerDetail.photo}</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{showWalkerDetail.name}</div>
                <div style={{ fontSize: 14, color: '#F59E0B' }}>⭐ {showWalkerDetail.rating} · {showWalkerDetail.walks} balades</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>📍 À {showWalkerDetail.dist} · ~{showWalkerDetail.eta}</div>
              </div>
              <div style={{ background: '#F8FAF9', borderRadius: 12, padding: '14px', marginBottom: 16, fontSize: 14, color: '#555' }}>{showWalkerDetail.bio}</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {showWalkerDetail.specialties.map(s => <span key={s} style={{ background: '#FFF8E1', color: '#D97706', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>{s}</span>)}
              </div>
              {showWalkerDetail.available ? (
                <button onClick={() => { setSelectedHomeWalker(showWalkerDetail); setShowWalkerDetail(null); }} style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
                  ✅ Choisir {showWalkerDetail.name}
                </button>
              ) : (
                <div style={{ background: '#FFF0F0', borderRadius: 12, padding: '12px', marginBottom: 10, textAlign: 'center', fontSize: 14, color: '#E24B4A', fontWeight: 600 }}>❌ Indisponible pour le moment</div>
              )}
              <button onClick={() => setShowWalkerDetail(null)} style={{ width: '100%', padding: 13, background: 'transparent', color: '#888', border: '1.5px solid #E8E8E8', borderRadius: 14, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Fermer</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
