import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;

// Étapes réelles d'une balade — dérivées du vrai statut de la réservation
// (accepted / walker_arrived / walking), plus aucune étape inventée.
const LIVE_STEPS = [
  { status: 'accepted', label: 'Le promeneur est en route vers vous' },
  { status: 'walker_arrived', label: 'Le promeneur est arrivé' },
  { status: 'walking', label: 'La balade est en cours 🐾' },
  { status: 'walker_returning', label: 'Le promeneur ramène votre chien' },
];

const SIZE_ICONS = { xs: '🐩', s: '🐕', m: '🦮', l: '🐕‍🦺' };

const CANCEL_REASONS = [
  "Je me suis trompé d'adresse",
  "Je me suis trompé de durée",
  "Le promeneur n'avance pas",
  "Mon chien n'est plus disponible",
  "J'ai trouvé une autre solution",
  "Autre raison",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(location.hash === '#live' ? 'live' : 'home');
  const [activeBooking, setActiveBooking] = useState(null);
  const [walkTime, setWalkTime] = useState(0);
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

  // Suivi de balade en direct
  const [showCancelWalk, setShowCancelWalk] = useState(false);
  const [cancelWalkReason, setCancelWalkReason] = useState('');
  const [confirmingHandover, setConfirmingHandover] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [justFinished, setJustFinished] = useState(false);

  // Historique des balades passées — consultation en lecture seule
  const [historyBookings, setHistoryBookings] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyChat, setHistoryChat] = useState(null); // booking sélectionnée pour revoir sa conversation
  const [historyMessages, setHistoryMessages] = useState([]);
  const [historyMsgLoading, setHistoryMsgLoading] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const walkerMarkerRef = useRef(null);
  const ownerIdRef = useRef(null);
  const chatEndRef = useRef(null);
  const lastBookingStatusRef = useRef(null);

  useEffect(() => {
    if (location.hash === '#live') setTab('live');
  }, [location.hash]);

  // On va chercher la vraie balade en cours (si vous en avez une) — plus
  // aucun mock ici : ce qui s'affiche vient directement de la réservation
  // que le promeneur a réellement acceptée.
  useEffect(() => {
    let stopped = false;
    const checkActiveBooking = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      ownerIdRef.current = session.user.id;
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('owner_id', session.user.id)
        .in('status', ['accepted', 'walker_arrived', 'walking', 'walker_returning', 'incident'])
        .order('created_at', { ascending: false })
        .limit(1);
      if (stopped) return;
      const found = data && data.length > 0 ? data[0] : null;
      // Si la balade qu'on suivait vient de disparaître de la liste des
      // balades actives alors qu'elle était en cours, c'est qu'elle vient
      // d'être marquée terminée côté promeneur — petit message de clôture.
      if (!found && (lastBookingStatusRef.current === 'walker_returning' || lastBookingStatusRef.current === 'incident')) {
        setJustFinished(true);
      }
      lastBookingStatusRef.current = found?.status || null;
      setActiveBooking(found);
    };
    checkActiveBooking();
    const interval = setInterval(checkActiveBooking, 5000);
    return () => { stopped = true; clearInterval(interval); };
  }, []);

  // Chrono de la balade : recalculé sur la vraie heure de départ à chaque
  // tick, pour rester juste même après une mise en veille du téléphone.
  useEffect(() => {
    if (activeBooking?.status !== 'walking' || !activeBooking.walk_started_at) {
      setWalkTime(0);
      return;
    }
    const startedAt = new Date(activeBooking.walk_started_at).getTime();
    const tick = () => setWalkTime(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeBooking?.status, activeBooking?.walk_started_at]);

  // Position du promeneur en direct (géolocalisation réelle envoyée par le
  // promeneur pendant la balade) + position approximative de l'adresse de
  // la balade, pour centrer la carte sans redemander la géoloc du client.
  useEffect(() => {
    if (!activeBooking?.address || !window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: activeBooking.address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        setUserCoords({ lat: loc.lat(), lng: loc.lng() });
      }
    });
  }, [activeBooking?.address]);

  // Vraie discussion avec le promeneur (texte, photos, notifs pipi/caca) —
  // un seul fil partagé, plus de fausses réponses automatiques.
  const loadMessages = useCallback(async () => {
    if (!activeBooking?.id) return;
    const { data } = await supabase
      .from('booking_messages').select('*').eq('booking_id', activeBooking.id)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  }, [activeBooking?.id]);

  useEffect(() => {
    if (!activeBooking?.id) { setMessages([]); return; }
    loadMessages();
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [activeBooking?.id, loadMessages]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showChat]);

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !activeBooking?.id || !ownerIdRef.current) return;
    setNewMessage('');
    await supabase.from('booking_messages').insert({
      booking_id: activeBooking.id, sender_id: ownerIdRef.current, kind: 'text', text,
    });
    loadMessages();
  };

  // Le promeneur est arrivé — on confirme lui avoir remis le chien, ce qui
  // démarre la balade pour de vrai des deux côtés.
  const confirmHandoverReal = async () => {
    if (!activeBooking?.id) return;
    setConfirmingHandover(true);
    try {
      await supabase.from('bookings').update({
        status: 'walking', walk_started_at: new Date().toISOString(),
      }).eq('id', activeBooking.id);
      lastBookingStatusRef.current = 'walking';
      setActiveBooking(b => b ? { ...b, status: 'walking', walk_started_at: new Date().toISOString() } : b);
    } finally {
      setConfirmingHandover(false);
    }
  };

  const cancelActiveWalk = async () => {
    if (!activeBooking?.id || !cancelWalkReason) return;
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', activeBooking.id);
    setShowCancelWalk(false);
    setCancelWalkReason('');
    setActiveBooking(null);
    lastBookingStatusRef.current = null;
  };

  // Le propriétaire confirme avoir bien récupéré son chien — que ce soit
  // juste après le retour du promeneur, ou après avoir résolu un
  // signalement qui s'est avéré être un malentendu.
  const confirmReturnReal = async () => {
    if (!activeBooking?.id) return;
    setConfirmingHandover(true);
    try {
      await supabase.from('bookings').update({ status: 'completed' }).eq('id', activeBooking.id);
      setJustFinished(true);
      setActiveBooking(null);
      lastBookingStatusRef.current = null;
    } finally {
      setConfirmingHandover(false);
    }
  };

  // Le propriétaire signale ne PAS avoir récupéré son chien. On ne peut
  // pas empêcher physiquement quelqu'un de partir avec un chien — ce que
  // l'app peut faire, c'est garder une trace claire (discussion, photos,
  // dernière position connue) et orienter vers les vraies autorités.
  const reportIncident = async () => {
    if (!activeBooking?.id) return;
    if (!window.confirm("Confirmer que vous n'avez pas récupéré votre chien ? Si la situation est urgente, contactez la police (17) sans attendre.")) return;
    await supabase.from('bookings').update({ status: 'incident' }).eq('id', activeBooking.id);
    lastBookingStatusRef.current = 'incident';
    setActiveBooking(b => b ? { ...b, status: 'incident' } : b);
  };

  // Historique des balades passées — pour retrouver une conversation ou une
  // photo d'une balade déjà terminée (plus jamais "aucune trace de la conv").
  const openHistoryTab = async () => {
    setTab('history');
    if (!ownerIdRef.current) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) ownerIdRef.current = session.user.id;
    }
    if (!ownerIdRef.current) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from('bookings').select('*').eq('owner_id', ownerIdRef.current)
      .in('status', ['completed', 'cancelled', 'incident'])
      .order('created_at', { ascending: false }).limit(50);
    setHistoryBookings(data || []);
    setHistoryLoading(false);
  };

  const openHistoryChat = async (booking) => {
    setHistoryChat(booking);
    setHistoryMsgLoading(true);
    setHistoryMessages([]);
    const { data } = await supabase
      .from('booking_messages').select('*').eq('booking_id', booking.id)
      .order('created_at', { ascending: true });
    setHistoryMessages(data || []);
    setHistoryMsgLoading(false);
  };

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
    if (userCoords) {
      new window.google.maps.Marker({
        position: userCoords, map,
        icon: { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', scaledSize: new window.google.maps.Size(40, 40) },
        title: 'Chez vous',
      });
    }
  }, [userCoords]);

  useEffect(() => {
    if (tab === 'live' && activeBooking && mapRef.current && !mapInstanceRef.current) {
      setTimeout(initLiveMap, 300);
    }
    // La carte doit être reconstruite si on quitte puis revient sur l'onglet
    if (!activeBooking) mapInstanceRef.current = null;
  }, [tab, activeBooking, initLiveMap]);

  // Le marqueur du promeneur suit sa vraie position, envoyée en direct
  // pendant la balade (voir WalkerHome.js côté promeneur).
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;
    if (activeBooking?.walker_lat == null || activeBooking?.walker_lng == null) return;
    const pos = { lat: activeBooking.walker_lat, lng: activeBooking.walker_lng };
    if (!walkerMarkerRef.current) {
      walkerMarkerRef.current = new window.google.maps.Marker({
        position: pos, map: mapInstanceRef.current,
        icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', scaledSize: new window.google.maps.Size(40, 40) },
        title: activeBooking.walker_name || 'Promeneur',
      });
    } else {
      walkerMarkerRef.current.setPosition(pos);
    }
    mapInstanceRef.current.panTo(pos);
  }, [activeBooking?.walker_lat, activeBooking?.walker_lng, activeBooking?.walker_name]);

  useEffect(() => {
    if (!activeBooking) { walkerMarkerRef.current = null; }
  }, [activeBooking]);

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
    const total = (activeBooking?.duration || 0) * 60;
    const remaining = total - walkTime;
    if (remaining <= 0) return 'Terminée !';
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Texte adapté au vrai statut de la réservation — pas de fausse étape
  // qu'on ne pourrait pas garantir.
  const activeWalkStatusLabel = (() => {
    if (!activeBooking) return '';
    const walkerLabel = activeBooking.walker_name || 'Le promeneur';
    if (activeBooking.status === 'walking') return `${walkerLabel} est avec ${activeBooking.dog_name || 'votre chien'} 🐾`;
    if (activeBooking.status === 'walker_arrived') return `${walkerLabel} est arrivé, en attente de votre confirmation`;
    if (activeBooking.status === 'walker_returning') return `${walkerLabel} ramène ${activeBooking.dog_name || 'votre chien'} — confirmation à faire`;
    if (activeBooking.status === 'incident') return `⚠️ Signalement en cours pour ${activeBooking.dog_name || 'votre chien'}`;
    return `${walkerLabel} est en route pour venir chercher ${activeBooking.dog_name || 'votre chien'}`;
  })();

  const displayName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : '...';

  const dogName = activeBooking?.dog_name || dogs[0]?.name || 'Votre chien';
  const photoUrl = newOwnerPhoto || profile?.photo_url;

  // Photos "état des lieux" prises par le promeneur — à la prise en charge
  // et au retour — pour vérifier avant de confirmer, comme chez Yego.
  const handoverPhoto = [...messages].reverse().find(m => m.kind === 'handover_photo');
  const returnPhoto = [...messages].reverse().find(m => m.kind === 'return_photo');

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

        {activeBooking && (
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => setTab('live')}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7FFFD4', animation: 'pulse 1s infinite', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{dogName} est en balade 🐾</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                {activeBooking.walker_name || 'Promeneur'}
                {activeBooking.status === 'walking' ? ` · ${formatTime(walkTime)} · reste ${getRemainingTime()}`
                  : activeBooking.status === 'walker_returning' ? ' · retour en cours'
                  : activeBooking.status === 'incident' ? ' · signalement en cours'
                  : ' · en route'}
              </div>
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
            {activeBooking ? (
              <div onClick={() => setTab('live')}
                style={{ background: 'linear-gradient(135deg, #0F6E56, #0A4D3A)', borderRadius: 18, padding: '20px', marginBottom: 20, cursor: 'pointer' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🐾</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Balade en cours</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 14 }}>{activeWalkStatusLabel}</div>
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
            {activeBooking ? (
              <div>
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <div ref={mapRef} style={{ height: 280, borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                  {activeBooking.walker_lat == null && (
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #E8F5F0, #D0EDE4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#0F6E56', fontWeight: 600, textAlign: 'center', padding: 20 }}>
                      En attente de la position du promeneur…
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 12, right: 12, background: '#1D9E75', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#fff', animation: 'pulse 2s infinite', zIndex: 10 }}>
                    🔴 Live
                  </div>
                  {activeBooking.status === 'walking' && (
                    <div style={{ position: 'absolute', top: 12, left: 12, background: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 700, color: '#1D9E75', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 10 }}>
                      {formatTime(walkTime)} ⏱️
                    </div>
                  )}
                </div>

                <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧑</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{activeBooking.walker_name || 'Promeneur'}</div>
                      <div style={{ fontSize: 13, color: '#1D9E75' }}>
                        {activeBooking.walker_rating != null ? `⭐ ${activeBooking.walker_rating} · ${activeBooking.walker_total_walks || 0} balades` : 'Nouveau promeneur'}
                      </div>
                    </div>
                    {activeBooking.status === 'walking' && (
                      <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '8px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75' }}>{getRemainingTime()}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>restant</div>
                      </div>
                    )}
                  </div>
                  {activeBooking.status === 'walking' && (
                    <div style={{ background: '#F0F0F0', borderRadius: 10, height: 6, marginBottom: 12 }}>
                      <div style={{ width: `${Math.min(100, (walkTime / ((activeBooking.duration || 1) * 60)) * 100)}%`, background: '#1D9E75', borderRadius: 10, height: 6, transition: 'width 1s linear' }} />
                    </div>
                  )}
                  {handoverPhoto && ['walking', 'walker_returning', 'incident'].includes(activeBooking.status) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8FAF9', borderRadius: 12, padding: '8px 10px', marginBottom: 12 }}>
                      <img src={handoverPhoto.image_url} alt="prise en charge" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
                      <div style={{ fontSize: 12, color: '#555' }}>📸 Photo prise à la remise de {activeBooking.dog_name || 'votre chien'}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {LIVE_STEPS.map((s, i) => {
                      const currentIdx = LIVE_STEPS.findIndex(x => x.status === activeBooking.status);
                      return (
                        <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i > currentIdx ? 0.3 : 1 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: i <= currentIdx ? '#1D9E75' : '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', flexShrink: 0, fontWeight: 700 }}>
                            {i < currentIdx ? '✓' : i === currentIdx ? '●' : ''}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: i === currentIdx ? 700 : 400, color: i === currentIdx ? '#1D9E75' : '#555' }}>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {activeBooking.status === 'walker_arrived' && (
                  <div style={{ background: '#E1F5EE', borderRadius: 16, padding: '16px', marginBottom: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 14, color: '#0F6E56', fontWeight: 600, marginBottom: 12 }}>
                      🐾 {activeBooking.walker_name || 'Le promeneur'} est arrivé ! Confirmez lui avoir remis {activeBooking.dog_name || 'votre chien'}.
                    </div>
                    <button onClick={confirmHandoverReal} disabled={confirmingHandover}
                      style={{ width: '100%', padding: 15, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: confirmingHandover ? 'default' : 'pointer', opacity: confirmingHandover ? 0.7 : 1 }}>
                      🐾 Confirmer la remise de mon chien
                    </button>
                  </div>
                )}

                {activeBooking.status === 'walker_returning' && (
                  <div style={{ background: '#E1F5EE', borderRadius: 16, padding: '16px', marginBottom: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 14, color: '#0F6E56', fontWeight: 600, marginBottom: 12 }}>
                      🐾 {activeBooking.walker_name || 'Le promeneur'} dit avoir terminé la balade et vous ramener {activeBooking.dog_name || 'votre chien'}.
                    </div>
                    {returnPhoto && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: '#0F6E56', fontWeight: 600, marginBottom: 6 }}>📸 Photo prise par {activeBooking.walker_name || 'le promeneur'} juste avant de vous le rendre :</div>
                        <img src={returnPhoto.image_url} alt="retour du chien" style={{ width: 140, height: 140, borderRadius: 14, objectFit: 'cover' }} />
                      </div>
                    )}
                    <button onClick={confirmReturnReal} disabled={confirmingHandover}
                      style={{ width: '100%', padding: 15, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: confirmingHandover ? 'default' : 'pointer', opacity: confirmingHandover ? 0.7 : 1, marginBottom: 10 }}>
                      ✅ J'ai bien récupéré mon chien
                    </button>
                    <button onClick={reportIncident} disabled={confirmingHandover}
                      style={{ width: '100%', padding: 13, background: 'transparent', color: '#E24B4A', border: '1.5px solid #E24B4A', borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: confirmingHandover ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                      ⚠️ Je n'ai pas récupéré mon chien
                    </button>
                  </div>
                )}

                {activeBooking.status === 'incident' && (
                  <div style={{ background: '#FFF0F0', border: '2px solid #E24B4A', borderRadius: 16, padding: '16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, color: '#E24B4A', fontWeight: 700, marginBottom: 8 }}>🚨 Signalement enregistré</div>
                    <div style={{ fontSize: 13, color: '#555', marginBottom: 10, lineHeight: 1.5 }}>
                      Vous avez indiqué ne pas avoir récupéré {activeBooking.dog_name || 'votre chien'}. La discussion, les photos et la dernière position connue du promeneur restent visibles ci-dessous.
                    </div>
                    <div style={{ fontSize: 13, color: '#B8860B', background: '#FFF8E1', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontWeight: 600 }}>
                      Si vous êtes inquiète pour la sécurité de votre chien, contactez la police (17) sans attendre.
                    </div>
                    {returnPhoto && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: '#555', fontWeight: 600, marginBottom: 6 }}>📸 Dernière photo prise par {activeBooking.walker_name || 'le promeneur'} :</div>
                        <img src={returnPhoto.image_url} alt="retour du chien" style={{ width: 140, height: 140, borderRadius: 14, objectFit: 'cover' }} />
                      </div>
                    )}
                    <button onClick={confirmReturnReal} disabled={confirmingHandover}
                      style={{ width: '100%', padding: 14, background: 'transparent', color: '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: confirmingHandover ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                      ✅ En fait, tout va bien — marquer comme résolu
                    </button>
                  </div>
                )}

                <button onClick={() => setShowChat(true)} style={{ width: '100%', padding: '13px', background: '#E1F5EE', color: '#0F6E56', border: '1.5px solid #1D9E75', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10, fontFamily: 'inherit' }}>
                  💬 Discuter avec {activeBooking.walker_name || 'le promeneur'} {messages.length > 0 && <span style={{ marginLeft: 8, background: '#1D9E75', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 11 }}>{messages.length}</span>}
                </button>

                {(activeBooking.status === 'accepted' || activeBooking.status === 'walker_arrived') && (
                  <button onClick={() => setShowCancelWalk(true)} style={{ width: '100%', padding: 13, background: 'transparent', color: '#E24B4A', border: '1.5px solid #E24B4A', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ❌ Annuler la balade
                  </button>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>{justFinished ? '🎉' : '😴'}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>{justFinished ? 'Balade terminée !' : 'Aucune balade en cours'}</h3>
                <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>{justFinished ? "Votre chien est rentré, on espère qu'il s'est bien amusé 🐾" : 'Commandez une balade pour suivre votre chien en temps réel.'}</p>
                <button onClick={() => { setJustFinished(false); navigate('/book'); }}
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

        {/* HISTORIQUE DES BALADES */}
        {tab === 'history' && (
          <div style={{ animation: 'slidein 0.3s ease' }}>
            <div onClick={() => setTab('profile')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1D9E75', fontWeight: 600, fontSize: 14, marginBottom: 14, cursor: 'pointer' }}>
              ← Retour au profil
            </div>
            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888', fontSize: 14 }}>Chargement...</div>
            ) : historyBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <p style={{ fontSize: 14, color: '#888' }}>Aucune balade terminée pour l'instant</p>
              </div>
            ) : historyBookings.map(b => {
              const statusLabel = b.status === 'completed' ? '✅ Terminée'
                : b.status === 'incident' ? '⚠️ Signalement'
                : '❌ Annulée';
              return (
                <div key={b.id} onClick={() => openHistoryChat(b)}
                  style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{b.dog_name || 'Chien'} · {b.walker_name || 'Promeneur'}</div>
                    <div style={{ fontSize: 12, color: b.status === 'incident' ? '#E24B4A' : '#888' }}>{statusLabel}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>{new Date(b.created_at).toLocaleDateString('fr-FR')} · {b.duration} min</div>
                  <div style={{ fontSize: 12, color: '#1D9E75', marginTop: 4, fontWeight: 600 }}>💬 Voir la conversation</div>
                </div>
              );
            })}
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
                { icon: '📋', label: 'Historique des balades', action: openHistoryTab },
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

      {/* DISCUSSION AVEC LE PROMENEUR */}
      {showChat && activeBooking && (
        <div style={{ position: 'fixed', inset: 0, background: '#F8FAF9', zIndex: 400, display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setShowChat(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}>← Retour</button>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🧑</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{activeBooking.walker_name || 'Promeneur'}</div>
          </div>
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#AAA', fontSize: 13, marginTop: 20 }}>Aucun message pour l'instant</div>
            )}
            {messages.map(msg => {
              const mine = msg.sender_id === ownerIdRef.current;
              if (msg.kind === 'event') {
                return <div key={msg.id} style={{ alignSelf: 'center', background: '#FFF8E1', color: '#B8860B', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600 }}>{msg.text}</div>;
              }
              if (msg.kind === 'photo' || msg.kind === 'handover_photo' || msg.kind === 'return_photo') {
                return (
                  <div key={msg.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start' }}>
                    {msg.kind !== 'photo' && (
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textAlign: mine ? 'right' : 'left' }}>
                        {msg.kind === 'handover_photo' ? '📸 Photo à la prise en charge' : '📸 Photo au retour'}
                      </div>
                    )}
                    <img src={msg.image_url} alt="balade" style={{ width: 180, height: 180, borderRadius: 14, objectFit: 'cover' }} />
                  </div>
                );
              }
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '75%', background: mine ? '#1D9E75' : '#fff', color: mine ? '#fff' : '#1A1A1A', borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #F0F0F0', display: 'flex', gap: 10, alignItems: 'center' }}>
            <input style={{ flex: 1, padding: '12px 14px', borderRadius: 24, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA' }}
              placeholder="Écrire un message..." value={newMessage}
              onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} />
            <button onClick={sendMessage} style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>➤</button>
          </div>
        </div>
      )}

      {/* HISTORIQUE D'UNE BALADE PASSÉE : conversation + photos, lecture seule */}
      {historyChat && (
        <div style={{ position: 'fixed', inset: 0, background: '#F8FAF9', zIndex: 400, display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setHistoryChat(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}>← Retour</button>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{historyChat.dog_name || 'Chien'} · {historyChat.walker_name || 'Promeneur'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{new Date(historyChat.created_at).toLocaleDateString('fr-FR')} · historique</div>
            </div>
          </div>
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historyMsgLoading ? (
              <div style={{ textAlign: 'center', color: '#AAA', fontSize: 13, marginTop: 20 }}>Chargement...</div>
            ) : historyMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#AAA', fontSize: 13, marginTop: 20 }}>Aucun message pour cette balade</div>
            ) : historyMessages.map(msg => {
              const mine = msg.sender_id === ownerIdRef.current;
              if (msg.kind === 'event') {
                return <div key={msg.id} style={{ alignSelf: 'center', background: '#FFF8E1', color: '#B8860B', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600 }}>{msg.text}</div>;
              }
              if (msg.kind === 'photo' || msg.kind === 'handover_photo' || msg.kind === 'return_photo') {
                return (
                  <div key={msg.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start' }}>
                    {msg.kind !== 'photo' && (
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textAlign: mine ? 'right' : 'left' }}>
                        {msg.kind === 'handover_photo' ? '📸 Photo à la prise en charge' : '📸 Photo au retour'}
                      </div>
                    )}
                    <img src={msg.image_url} alt="balade" style={{ width: 180, height: 180, borderRadius: 14, objectFit: 'cover' }} />
                  </div>
                );
              }
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '75%', background: mine ? '#1D9E75' : '#fff', color: mine ? '#fff' : '#1A1A1A', borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '14px 16px', background: '#fff', borderTop: '1px solid #F0F0F0', textAlign: 'center', fontSize: 12, color: '#AAA' }}>
            Balade terminée — historique en lecture seule
          </div>
        </div>
      )}

      {/* ANNULER LA BALADE */}
      {showCancelWalk && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Annuler la balade</h3>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Pourquoi souhaitez-vous annuler ?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {CANCEL_REASONS.map(r => (
                <div key={r} onClick={() => setCancelWalkReason(r)}
                  style={{ padding: '14px 16px', borderRadius: 12, border: cancelWalkReason === r ? '2px solid #E24B4A' : '1.5px solid #E8E8E8', background: cancelWalkReason === r ? '#FFF0F0' : '#FAFAFA', cursor: 'pointer', fontSize: 14, color: cancelWalkReason === r ? '#E24B4A' : '#555', fontWeight: cancelWalkReason === r ? 600 : 400 }}>
                  {r}
                </div>
              ))}
            </div>
            <button disabled={!cancelWalkReason} onClick={cancelActiveWalk}
              style={{ width: '100%', padding: 16, background: cancelWalkReason ? '#E24B4A' : '#F0F0F0', color: cancelWalkReason ? '#fff' : '#AAA', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: cancelWalkReason ? 'pointer' : 'default', marginBottom: 10, fontFamily: 'inherit' }}>
              Confirmer l'annulation
            </button>
            <button onClick={() => { setShowCancelWalk(false); setCancelWalkReason(''); }}
              style={{ width: '100%', padding: 13, background: 'transparent', color: '#888', border: '1.5px solid #E8E8E8', borderRadius: 14, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              Garder ma balade
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
