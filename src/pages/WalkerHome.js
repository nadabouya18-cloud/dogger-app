import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const SIZE_ICONS = { xs: '🐩', s: '🐕', m: '🦮', l: '🐕‍🦺' };

export default function WalkerHome() {
 const navigate = useNavigate();
 const [tab, setTab] = useState('home');
 const [profileLoading, setProfileLoading] = useState(true);
 const [profile, setProfile] = useState(null);
 const [walkerProfile, setWalkerProfile] = useState(null);
 const [available, setAvailable] = useState(false);
 const [phase, setPhase] = useState('idle');
 const [mission, setMission] = useState(null);
 const [missionTimer, setMissionTimer] = useState(30);
 const [walkTime, setWalkTime] = useState(0);
 const [history, setHistory] = useState([]);
 const [rating, setRating] = useState(0);
 const [showRating, setShowRating] = useState(false);
 const [walkerId, setWalkerId] = useState(null);
 const [locationStatus, setLocationStatus] = useState('idle'); // idle | pending | shared | denied | unsupported | error
 const [showCancelledNotice, setShowCancelledNotice] = useState(false);
 const [showIncidentNotice, setShowIncidentNotice] = useState(false);
 const [messages, setMessages] = useState([]);
 const [newMessage, setNewMessage] = useState('');
 const [showChat, setShowChat] = useState(false);
 const [sendingPhoto, setSendingPhoto] = useState(false);
 const chatEndRef = useRef(null);
 const mapRef = useRef(null);
 const mapInstanceRef = useRef(null);
 const walkerTimerRef = useRef(null);
 const missionTimerRef = useRef(null);

 // Charger le profil promeneur connecté
 useEffect(() => {
   const loadProfile = async () => {
     try {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) { navigate('/login?redirect=walker'); return; }
       const { data: profileData } = await supabase
         .from('profiles').select('*').eq('id', session.user.id).single();
       const { data: walkerData } = await supabase
         .from('walker_profiles').select('*').eq('id', session.user.id).maybeSingle();
       if (!walkerData) { navigate('/register-walker'); return; }
       const { data: walksData } = await supabase
         .from('walks').select('*').eq('walker_id', session.user.id)
         .order('created_at', { ascending: false }).limit(200);
       setProfile(profileData);
       setWalkerProfile(walkerData);
       setWalkerId(session.user.id);
       setAvailable(!!walkerData.available);
       if (walksData) {
         setHistory(walksData.map(w => ({
           id: w.id,
           owner: w.owner_name,
           dog: w.dog_name,
           service: w.service,
           duration: w.duration,
           price: Number(w.price),
           rating: w.rating,
           date: new Date(w.created_at).toLocaleDateString('fr-FR'),
           createdAt: w.created_at,
         })));
       }
     } catch (e) {
       console.error(e);
     } finally {
       setProfileLoading(false);
     }
   };
   loadProfile();
 }, [navigate]);

 const handleLogout = async () => {
   await supabase.auth.signOut();
   navigate('/');
 };

 const displayName = profile
   ? `${profile.first_name || ''}${profile.last_name ? ' ' + profile.last_name.charAt(0) + '.' : ''}`.trim() || 'Promeneur'
   : 'Promeneur';
 const totalWalks = history.length;
 const ratedWalks = history.filter(h => h.rating);
 const avgRating = ratedWalks.length > 0
   ? (ratedWalks.reduce((sum, h) => sum + h.rating, 0) / ratedWalks.length).toFixed(1)
   : null;
 const ratingLabel = avgRating ? `⭐ ${avgRating}` : '✨ Nouveau';
 const totalMinutes = history.reduce((sum, h) => sum + (h.duration || 0), 0);
 const hoursLabel = totalMinutes > 0 ? `${(totalMinutes / 60).toFixed(1)}h` : '0h';
 const clientCount = new Set(history.map(h => h.owner)).size;
 const now = new Date();
 const isSameDay = (d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
 const isSameMonth = (d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
 const todayEarnings = history.filter(h => h.createdAt && isSameDay(new Date(h.createdAt))).reduce((sum, h) => sum + h.price, 0);
 const monthEarnings = history.filter(h => h.createdAt && isSameMonth(new Date(h.createdAt))).reduce((sum, h) => sum + h.price, 0);

 // Chercher une vraie demande de balade en attente pendant qu'on est disponible
 useEffect(() => {
   if (!available || phase !== 'idle' || !walkerId) return;
   let cancelled = false;
   const checkForMission = async () => {
     const { data } = await supabase
       .from('bookings')
       .select('*')
       .eq('walker_id', walkerId)
       .eq('status', 'pending')
       .order('created_at', { ascending: true })
       .limit(1);
     if (cancelled || !data || data.length === 0) return;
     const b = data[0];
     setMission({
       bookingId: b.id,
       owner: b.owner_name || 'Propriétaire',
       ownerPhoto: b.owner_photo_url,
       dog: b.dog_name || 'Chien',
       dogBreed: b.dog_breed || '',
       dogSize: b.dog_size || 'm',
       dogPhoto: b.dog_photo_url,
       service: b.service,
       duration: b.duration,
       price: Number(b.price),
       address: b.address || 'Adresse communiquée après acceptation',
       distance: b.distance_km != null ? `${b.distance_km} km` : 'proximité inconnue',
       instructions: b.instructions,
     });
     setMissionTimer(30);
     setPhase('mission_incoming');
   };
   checkForMission();
   const interval = setInterval(checkForMission, 4000);
   return () => { cancelled = true; clearInterval(interval); };
 }, [available, phase, walkerId]);

 // Surveiller la réservation en cours : passer à la balade une fois que
 // le propriétaire confirme la remise du chien, et — surtout — détecter
 // si le propriétaire annule pendant qu'on est en route ou en attente.
 useEffect(() => {
   if (!mission?.bookingId || !['navigating', 'arrived', 'walking', 'returning'].includes(phase)) return;
   let stopped = false;
   const checkBooking = async () => {
     const { data } = await supabase
       .from('bookings').select('status').eq('id', mission.bookingId).single();
     if (stopped || !data) return;
     if (data.status === 'cancelled') {
       clearInterval(walkerTimerRef.current);
       setPhase('idle');
       setMission(null);
       setWalkTime(0);
       mapInstanceRef.current = null;
       setShowCancelledNotice(true);
       if (walkerId) {
         await supabase.from('walker_profiles').update({ available: true }).eq('id', walkerId);
       }
       setAvailable(true);
     } else if (phase === 'arrived' && data.status === 'walking') {
       setWalkTime(0);
       mapInstanceRef.current = null;
       setPhase('walking');
     } else if (phase === 'returning' && data.status === 'completed') {
       // Le propriétaire a confirmé avoir récupéré son chien — la balade
       // est vraiment terminée, on peut passer à la notation.
       setShowRating(true);
     } else if (phase === 'returning' && data.status === 'incident') {
       // Le propriétaire signale ne pas avoir récupéré son chien — on
       // arrête le chrono mais on ne referme rien tout seul le temps que
       // ce soit vu et traité.
       clearInterval(walkerTimerRef.current);
       setShowIncidentNotice(true);
     }
   };
   checkBooking();
   const interval = setInterval(checkBooking, 3000);
   return () => { stopped = true; clearInterval(interval); };
 }, [phase, mission, walkerId]);

 // Vraie discussion avec le propriétaire pendant la mission (texte, photos,
 // et petites notifs "pipi/caca") — un seul fil, partagé avec le vrai
 // propriétaire, plus de fausses réponses automatiques.
 const loadMessages = useCallback(async () => {
   if (!mission?.bookingId) return;
   const { data } = await supabase
     .from('booking_messages').select('*').eq('booking_id', mission.bookingId)
     .order('created_at', { ascending: true });
   if (data) setMessages(data);
 }, [mission?.bookingId]);

 useEffect(() => {
   if (!mission?.bookingId || !['navigating', 'arrived', 'walking', 'returning'].includes(phase)) {
     setMessages([]);
     return;
   }
   loadMessages();
   const interval = setInterval(loadMessages, 4000);
   return () => clearInterval(interval);
 }, [mission?.bookingId, phase, loadMessages]);

 useEffect(() => {
   if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
 }, [messages, showChat]);

 const sendMessage = async () => {
   const text = newMessage.trim();
   if (!text || !mission?.bookingId || !walkerId) return;
   setNewMessage('');
   await supabase.from('booking_messages').insert({
     booking_id: mission.bookingId, sender_id: walkerId, kind: 'text', text,
   });
   loadMessages();
 };

 // Boutons "pipi / caca" — une notification sympa envoyée dans le fil,
 // pour prévenir le propriétaire sans avoir à taper un message.
 const sendPottyEvent = async (type) => {
   if (!mission?.bookingId || !walkerId) return;
   const text = type === 'pee' ? `💦 ${mission.dog} vient de faire pipi !` : `💩 ${mission.dog} vient de faire caca !`;
   await supabase.from('booking_messages').insert({
     booking_id: mission.bookingId, sender_id: walkerId, kind: 'event', text,
   });
   loadMessages();
 };

 // Partager sa position pendant qu'on est disponible, pour qu'on ne nous
 // envoie pas des demandes à l'autre bout de la ville
 useEffect(() => {
   if (!available) { setLocationStatus('idle'); return; }
   if (!walkerId) return;
   if (!navigator.geolocation) { setLocationStatus('unsupported'); return; }
   setLocationStatus('pending');
   const shareLocation = () => {
     navigator.geolocation.getCurrentPosition(
       async (pos) => {
         const { error } = await supabase.from('walker_profiles').update({
           lat: pos.coords.latitude,
           lng: pos.coords.longitude,
           location_updated_at: new Date().toISOString(),
         }).eq('id', walkerId);
         if (error) {
           console.error('Échec de sauvegarde de la position :', error);
           setLocationStatus('error');
         } else {
           setLocationStatus('shared');
         }
       },
       () => { setLocationStatus('denied'); },
       { timeout: 10000 }
     );
   };
   shareLocation();
   const interval = setInterval(shareLocation, 120000);
   return () => clearInterval(interval);
 }, [available, walkerId]);

 // Partager sa position EN DIRECT sur la réservation en cours pendant une
 // mission active, pour que le propriétaire puisse suivre la balade en
 // temps réel de son côté (bien plus fréquent que le partage "disponible").
 useEffect(() => {
   if (!mission?.bookingId || !['navigating', 'arrived', 'walking', 'returning'].includes(phase)) return;
   if (!navigator.geolocation) return;
   let stopped = false;
   const shareLiveLocation = () => {
     navigator.geolocation.getCurrentPosition(
       async (pos) => {
         if (stopped) return;
         await supabase.from('bookings').update({
           walker_lat: pos.coords.latitude,
           walker_lng: pos.coords.longitude,
           walker_location_updated_at: new Date().toISOString(),
         }).eq('id', mission.bookingId);
       },
       () => {},
       { timeout: 10000 }
     );
   };
   shareLiveLocation();
   const interval = setInterval(shareLiveLocation, 10000);
   return () => { stopped = true; clearInterval(interval); };
 }, [mission, phase]);

 // Timer mission 30s
 useEffect(() => {
   if (phase !== 'mission_incoming') return;
   missionTimerRef.current = setInterval(() => {
     setMissionTimer(t => {
       if (t <= 1) {
         clearInterval(missionTimerRef.current);
         if (mission?.bookingId) {
           supabase.from('bookings').update({ status: 'refused' }).eq('id', mission.bookingId);
         }
         setPhase('idle');
         setMission(null);
         return 30;
       }
       return t - 1;
     });
   }, 1000);
   return () => clearInterval(missionTimerRef.current);
 }, [phase, mission]);

 // Timer balade
 useEffect(() => {
   if (phase !== 'walking') return;
   walkerTimerRef.current = setInterval(() => setWalkTime(s => s + 1), 1000);
   return () => clearInterval(walkerTimerRef.current);
 }, [phase]);

 // Init carte
 const initNavMap = useCallback(() => {
   if (!mapRef.current || !window.google) return;
   if (mapInstanceRef.current) return;

   mapRef.current.style.height = '240px';
   mapRef.current.style.width = '100%';

   const destination = { lat: 48.8566, lng: 2.3522 };
   const origin = { lat: 48.8590, lng: 2.3550 };

   const map = new window.google.maps.Map(mapRef.current, {
     center: origin, zoom: 15, disableDefaultUI: true,
     styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
   });
   mapInstanceRef.current = map;

   setTimeout(() => {
     window.google.maps.event.trigger(map, 'resize');
     map.setCenter(origin);
   }, 200);

   new window.google.maps.Marker({
     position: destination, map,
     icon: { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', scaledSize: new window.google.maps.Size(40, 40) },
     title: 'Client'
   });
   new window.google.maps.Marker({
     position: origin, map,
     icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', scaledSize: new window.google.maps.Size(40, 40) },
     title: 'Vous'
   });

   const directionsService = new window.google.maps.DirectionsService();
   const directionsRenderer = new window.google.maps.DirectionsRenderer({
     map, suppressMarkers: true,
     polylineOptions: { strokeColor: '#1D9E75', strokeWeight: 4 }
   });
   directionsService.route({
     origin, destination,
     travelMode: window.google.maps.TravelMode.WALKING,
   }, (result, status) => {
     if (status === 'OK') directionsRenderer.setDirections(result);
   });
 }, []);

 useEffect(() => {
   if (phase === 'navigating' || phase === 'walking') {
     mapInstanceRef.current = null;
     setTimeout(initNavMap, 500);
   }
 }, [phase, initNavMap]);

 const acceptMission = async () => {
   clearInterval(missionTimerRef.current);
   if (mission?.bookingId) {
     // On enregistre qui on est directement sur la réservation : le
     // propriétaire pourra ainsi voir un vrai nom/note sans qu'on ait
     // besoin de lui ouvrir l'accès à la fiche complète du promeneur.
     await supabase.from('bookings').update({
       status: 'accepted',
       walker_name: displayName,
       walker_rating: avgRating ? Number(avgRating) : null,
       walker_total_walks: totalWalks,
     }).eq('id', mission.bookingId);
   }
   if (walkerId) {
     await supabase.from('walker_profiles').update({ available: false }).eq('id', walkerId);
   }
   setAvailable(false);
   setPhase('navigating');
   setTab('mission');
 };

 const refuseMission = async () => {
   clearInterval(missionTimerRef.current);
   if (mission?.bookingId) {
     await supabase.from('bookings').update({ status: 'refused' }).eq('id', mission.bookingId);
   }
   setPhase('idle');
   setMission(null);
 };

 // Le promeneur annule une mission déjà acceptée (empêchement, etc.) —
 // le propriétaire doit en être informé, pas laissé sans nouvelles.
 const cancelActiveMission = async () => {
   if (!window.confirm('Annuler cette balade ? Le propriétaire en sera informé.')) return;
   clearInterval(walkerTimerRef.current);
   if (mission?.bookingId) {
     await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', mission.bookingId);
   }
   if (walkerId) {
     await supabase.from('walker_profiles').update({ available: true }).eq('id', walkerId);
   }
   setAvailable(true);
   setPhase('idle');
   setMission(null);
   setWalkTime(0);
   mapInstanceRef.current = null;
 };

 // Le propriétaire n'a pas confirmé avoir récupéré son chien — on ne remet
 // pas le promeneur "disponible" tant qu'il n'a pas vu et fermé ce message,
 // pour ne pas lui envoyer une nouvelle mission en pleine situation
 // litigieuse.
 const dismissIncidentNotice = async () => {
   setShowIncidentNotice(false);
   if (walkerId) {
     await supabase.from('walker_profiles').update({ available: true }).eq('id', walkerId);
   }
   setAvailable(true);
   setPhase('idle');
   setMission(null);
   setWalkTime(0);
   mapInstanceRef.current = null;
 };

 // On signale son arrivée, mais la balade ne démarre pour de vrai que
 // quand le propriétaire confirme lui avoir remis son chien.
 const confirmArrival = async () => {
   setPhase('arrived');
   if (mission?.bookingId) {
     await supabase.from('bookings').update({ status: 'walker_arrived' }).eq('id', mission.bookingId);
   }
 };

 // Photo prise sur le moment (l'attribut "capture" force l'appareil photo
 // plutôt que la pioche dans d'anciennes photos), envoyée dans le fil de
 // discussion pour que le propriétaire la voie tout de suite.
 const handlePhoto = async (e) => {
   const file = e.target.files[0];
   e.target.value = '';
   if (!file || !mission?.bookingId || !walkerId) return;
   setSendingPhoto(true);
   try {
     const path = `${mission.bookingId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
     const { error: uploadError } = await supabase.storage.from('walk-photos').upload(path, file, {
       contentType: file.type || 'image/jpeg',
     });
     if (uploadError) { console.error(uploadError); return; }
     const { data: pub } = supabase.storage.from('walk-photos').getPublicUrl(path);
     await supabase.from('booking_messages').insert({
       booking_id: mission.bookingId, sender_id: walkerId, kind: 'photo', image_url: pub.publicUrl,
     });
     loadMessages();
   } finally {
     setSendingPhoto(false);
   }
 };

 // Terminer la balade ne clôt plus la réservation tout seul — le
 // propriétaire doit confirmer avoir bien récupéré son chien avant que ce
 // soit considéré comme terminé, exactement comme il a fallu confirmer la
 // remise au départ.
 const endWalk = async () => {
   clearInterval(walkerTimerRef.current);
   if (mission?.bookingId) {
     await supabase.from('bookings').update({
       status: 'walker_returning',
       walk_ended_at: new Date().toISOString(),
     }).eq('id', mission.bookingId);
   }
   setPhase('returning');
 };

 const submitRating = async () => {
   const { data: { session } } = await supabase.auth.getSession();
   if (session && mission) {
     const { data: inserted } = await supabase
       .from('walks')
       .insert({
         walker_id: session.user.id,
         owner_name: mission.owner,
         dog_name: mission.dog,
         service: mission.service,
         duration: mission.duration,
         price: mission.price,
         rating,
       })
       .select()
       .single();
     if (inserted) {
       setHistory(h => [{
         id: inserted.id,
         owner: inserted.owner_name,
         dog: inserted.dog_name,
         service: inserted.service,
         duration: inserted.duration,
         price: Number(inserted.price),
         rating: inserted.rating,
         date: new Date(inserted.created_at).toLocaleDateString('fr-FR'),
         createdAt: inserted.created_at,
       }, ...h]);
     }
     if (mission.bookingId) {
       await supabase.from('bookings').update({ status: 'completed' }).eq('id', mission.bookingId);
     }
     await supabase.from('walker_profiles').update({ available: true }).eq('id', session.user.id);
     setAvailable(true);
   }
   setShowRating(false);
   setPhase('idle');
   setMission(null);
   setRating(0);
   setWalkTime(0);
   mapInstanceRef.current = null;
   setTab('home');
 };

 const formatTime = (s) => {
   const m = Math.floor(s / 60);
   const sec = s % 60;
   return `${m}:${sec.toString().padStart(2, '0')}`;
 };

 const progressPct = mission ? Math.min(100, (walkTime / (mission.duration * 60)) * 100) : 0;

 if (profileLoading) {
   return (
     <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
       <div style={{ fontSize: 48 }}>🐾</div>
     </div>
   );
 }

 return (
   <div style={{ minHeight: '100vh', background: '#F8FAF9', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto', paddingBottom: 80 }}>
     <style>{`
       @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
       @keyframes slidein { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
       @keyframes ring { 0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)} }
     `}</style>

     {/* MODAL MISSION ENTRANTE */}
     {phase === 'mission_incoming' && mission && (
       <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
         <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430, animation: 'slidein 0.3s ease' }}>
           <div style={{ textAlign: 'center', marginBottom: 20 }}>
             <div style={{ width: 64, height: 64, borderRadius: '50%', background: missionTimer > 15 ? '#E1F5EE' : '#FFF0F0', border: `4px solid ${missionTimer > 15 ? '#1D9E75' : '#E24B4A'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', animation: 'ring 1s infinite', fontSize: 22, fontWeight: 700, color: missionTimer > 15 ? '#1D9E75' : '#E24B4A' }}>
               {missionTimer}s
             </div>
             <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Nouvelle mission !</div>
             <div style={{ fontSize: 13, color: '#888' }}>Répondez avant la fin du timer</div>
           </div>

           <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '16px', marginBottom: 16 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
               <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                 {SIZE_ICONS[mission.dogSize] || '🐕'}
               </div>
               <div style={{ flex: 1 }}>
                 <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{mission.dog} · {mission.dogBreed}</div>
                 <div style={{ fontSize: 13, color: '#888' }}>Propriétaire : {mission.owner}</div>
               </div>
               <div style={{ textAlign: 'center', background: '#E1F5EE', borderRadius: 12, padding: '8px 14px' }}>
                 <div style={{ fontSize: 20, fontWeight: 700, color: '#1D9E75' }}>{mission.price}€</div>
                 <div style={{ fontSize: 11, color: '#888' }}>{mission.duration} min</div>
               </div>
             </div>
             <div style={{ height: 1, background: '#EBEBEB', marginBottom: 10 }} />
             <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>📍 {mission.address}</div>
             <div style={{ fontSize: 13, color: '#1D9E75', fontWeight: 600, marginBottom: 4 }}>🚶 À {mission.distance} de vous</div>
             {mission.instructions && (
               <div style={{ fontSize: 12, color: '#888', background: '#FFF8E1', borderRadius: 8, padding: '6px 10px', marginTop: 8 }}>
                 💬 {mission.instructions}
               </div>
             )}
           </div>

           <button onClick={acceptMission}
             style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10, boxShadow: '0 4px 16px rgba(29,158,117,0.4)' }}>
             ✅ Accepter la mission — {mission.price}€
           </button>
           <button onClick={refuseMission}
             style={{ width: '100%', padding: 13, background: 'transparent', color: '#E24B4A', border: '1.5px solid #E24B4A', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
             ❌ Refuser
           </button>
         </div>
       </div>
     )}

     {/* DISCUSSION AVEC LE PROPRIÉTAIRE */}
     {showChat && mission && (
       <div style={{ position: 'fixed', inset: 0, background: '#F8FAF9', zIndex: 400, display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
         <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
           <button onClick={() => setShowChat(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}>← Retour</button>
           <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{mission.ownerPhoto ? <img src={mission.ownerPhoto} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '👤'}</div>
           <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{mission.owner}</div>
         </div>
         <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
           {messages.length === 0 && (
             <div style={{ textAlign: 'center', color: '#AAA', fontSize: 13, marginTop: 20 }}>Aucun message pour l'instant</div>
           )}
           {messages.map(msg => (
             msg.kind === 'event' ? (
               <div key={msg.id} style={{ alignSelf: 'center', background: '#FFF8E1', color: '#B8860B', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600 }}>{msg.text}</div>
             ) : msg.kind === 'photo' ? (
               <div key={msg.id} style={{ alignSelf: msg.sender_id === walkerId ? 'flex-end' : 'flex-start' }}>
                 <img src={msg.image_url} alt="balade" style={{ width: 180, height: 180, borderRadius: 14, objectFit: 'cover' }} />
               </div>
             ) : (
               <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender_id === walkerId ? 'flex-end' : 'flex-start' }}>
                 <div style={{ maxWidth: '75%', background: msg.sender_id === walkerId ? '#1D9E75' : '#fff', color: msg.sender_id === walkerId ? '#fff' : '#1A1A1A', borderRadius: msg.sender_id === walkerId ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                   {msg.text}
                 </div>
               </div>
             )
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
     )}

     {/* MODAL SIGNALEMENT : LE PROPRIÉTAIRE N'A PAS RÉCUPÉRÉ SON CHIEN */}
     {showIncidentNotice && (
       <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 350, padding: 24 }}>
         <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 360, textAlign: 'center', border: '2px solid #E24B4A' }}>
           <div style={{ fontSize: 44, marginBottom: 12 }}>🚨</div>
           <h3 style={{ fontSize: 17, fontWeight: 700, color: '#E24B4A', marginBottom: 8 }}>Signalement du propriétaire</h3>
           <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>{mission?.owner || 'Le propriétaire'} indique ne pas avoir récupéré {mission?.dog || 'son chien'}. Contactez-le tout de suite via la discussion pour clarifier la situation.</p>
           <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>Cette réservation reste ouverte tant que ce n'est pas résolu — vous ne recevrez pas de nouvelle mission d'ici là.</p>
           <button onClick={dismissIncidentNotice}
             style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
             J'ai compris
           </button>
         </div>
       </div>
     )}

     {/* MODAL BALADE ANNULÉE PAR LE PROPRIÉTAIRE */}
     {showCancelledNotice && (
       <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}>
         <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 360, textAlign: 'center' }}>
           <div style={{ fontSize: 44, marginBottom: 12 }}>😕</div>
           <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Balade annulée</h3>
           <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Le propriétaire a annulé cette balade. Vous êtes de nouveau disponible pour recevoir des missions.</p>
           <button onClick={() => setShowCancelledNotice(false)}
             style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
             OK
           </button>
         </div>
       </div>
     )}

     {/* MODAL NOTATION */}
     {showRating && (
       <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
         <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430 }}>
           <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 4, textAlign: 'center' }}>Balade terminée ! 🎉</h3>
           <p style={{ fontSize: 14, color: '#888', marginBottom: 20, textAlign: 'center' }}>Notez votre expérience avec {mission?.owner}</p>
           <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
             {[1,2,3,4,5].map(s => (
               <div key={s} onClick={() => setRating(s)}
                 style={{ fontSize: 36, cursor: 'pointer', filter: s <= rating ? 'none' : 'grayscale(1)', transition: 'all 0.2s', transform: s <= rating ? 'scale(1.2)' : 'scale(1)' }}>
                 ⭐
               </div>
             ))}
           </div>
           <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '16px', marginBottom: 20, textAlign: 'center' }}>
             <div style={{ fontSize: 28, fontWeight: 700, color: '#1D9E75' }}>+{mission?.price}€</div>
             <div style={{ fontSize: 13, color: '#0F6E56' }}>ajoutés à vos gains</div>
           </div>
           <button onClick={submitRating} disabled={!rating}
             style={{ width: '100%', padding: 16, background: rating ? 'linear-gradient(135deg, #1D9E75, #0F6E56)' : '#F0F0F0', color: rating ? '#fff' : '#AAA', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: rating ? 'pointer' : 'default', fontFamily: 'inherit' }}>
             Terminer et encaisser
           </button>
         </div>
       </div>
     )}

     {/* HEADER */}
     <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 24px 24px' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
         <div>
           <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>Espace promeneur</p>
           <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{displayName} 🐾</h1>
         </div>
         <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{todayEarnings}€</div>
           <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>gains aujourd'hui</div>
         </div>
       </div>

       {/* Toggle */}
       <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
         <div>
           <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
             {available ? '🟢 Disponible' : '🔴 Indisponible'}
           </div>
           <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
             {available ? 'Vous recevez des missions' : 'Activez pour recevoir des missions'}
           </div>
         </div>
         <div onClick={async () => {
           const next = !available;
           setAvailable(next);
           if (!next) { setPhase('idle'); setMission(null); }
           if (walkerId) {
             await supabase.from('walker_profiles').update({ available: next }).eq('id', walkerId);
           }
         }}
           style={{ width: 52, height: 28, borderRadius: 14, background: available ? '#fff' : 'rgba(255,255,255,0.3)', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', flexShrink: 0 }}>
           <div style={{ width: 22, height: 22, borderRadius: '50%', background: available ? '#1D9E75' : '#fff', position: 'absolute', top: 3, left: available ? 27 : 3, transition: 'left 0.3s' }} />
         </div>
       </div>

       {available && locationStatus === 'shared' && (
         <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
           📍 Position partagée — vous serez proposé(e) en priorité aux propriétaires proches
         </div>
       )}
       {available && locationStatus === 'pending' && (
         <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
           📍 Demande de position en cours...
         </div>
       )}
       {available && (locationStatus === 'denied' || locationStatus === 'unsupported') && (
         <div style={{ marginTop: 10, fontSize: 12, color: '#FFE9A8', textAlign: 'center' }}>
           ⚠️ Position non partagée — vous recevrez quand même des demandes, mais pas forcément les plus proches
         </div>
       )}
       {available && locationStatus === 'error' && (
         <div style={{ marginTop: 10, fontSize: 12, color: '#FFB3B3', textAlign: 'center' }}>
           ⚠️ Votre position n'a pas pu être enregistrée (erreur technique) — contactez le support
         </div>
       )}

       {available && phase === 'idle' && (
         <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', animation: 'pulse 2s infinite' }}>
           🔍 Recherche de missions à proximité...
         </div>
       )}

       {(phase === 'navigating' || phase === 'arrived' || phase === 'walking' || phase === 'returning') && (
         <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
           onClick={() => setTab('mission')}>
           <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7FFFD4', animation: 'pulse 1s infinite' }} />
           <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#fff' }}>
             {phase === 'navigating' ? `🚶 En route vers ${mission?.owner || 'le client'}`
               : phase === 'arrived' ? '⏳ En attente de confirmation'
               : phase === 'returning' ? '🏠 Retour du chien — en attente'
               : `🐾 Balade en cours — ${formatTime(walkTime)}`}
           </div>
           <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Voir →</div>
         </div>
       )}
     </div>

     {/* TABS */}
     <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #F0F0F0' }}>
       {[
         { id: 'home',    label: '🏠 Accueil' },
         { id: 'mission', label: '🐾 Mission' },
         { id: 'gains',   label: '💶 Gains' },
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
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
             {[
               { label: "Aujourd'hui", value: `${todayEarnings}€`, icon: '💶' },
               { label: 'Ce mois', value: `${monthEarnings}€`, icon: '📅' },
               { label: 'Balades', value: String(totalWalks), icon: '🐾' },
             ].map(s => (
               <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '14px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                 <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                 <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{s.value}</div>
                 <div style={{ fontSize: 10, color: '#888' }}>{s.label}</div>
               </div>
             ))}
           </div>

           {(phase === 'navigating' || phase === 'arrived' || phase === 'walking' || phase === 'returning') && mission && (
             <div style={{ background: '#E1F5EE', borderRadius: 16, padding: '16px', marginBottom: 16, border: '1.5px solid #1D9E75', cursor: 'pointer' }}
               onClick={() => setTab('mission')}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                 <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                 <div style={{ flex: 1 }}>
                   <div style={{ fontSize: 14, fontWeight: 700, color: '#0F6E56' }}>
                     {phase === 'navigating' ? '🚶 En route vers le client'
                       : phase === 'arrived' ? '⏳ En attente de confirmation'
                       : phase === 'returning' ? '🏠 Retour du chien — en attente de confirmation'
                       : `🐾 Balade en cours — ${formatTime(walkTime)}`}
                   </div>
                   <div style={{ fontSize: 12, color: '#555' }}>{mission.dog} · {mission.owner}</div>
                 </div>
                 <div style={{ fontSize: 13, color: '#1D9E75', fontWeight: 700 }}>Voir →</div>
               </div>
             </div>
           )}

           <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>Dernières missions</h3>
           {history.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '32px 20px', background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
               <div style={{ fontSize: 40, marginBottom: 10 }}>🐾</div>
               <p style={{ fontSize: 14, color: '#888' }}>Activez votre disponibilité pour recevoir vos premières missions !</p>
             </div>
           ) : history.map(h => (
             <div key={h.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
               <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🐕</div>
               <div style={{ flex: 1 }}>
                 <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{h.dog} · {h.owner}</div>
                 <div style={{ fontSize: 12, color: '#888' }}>{h.date} · {h.duration} min</div>
                 <div style={{ fontSize: 12 }}>{'⭐'.repeat(h.rating)}</div>
               </div>
               <div style={{ fontSize: 16, fontWeight: 700, color: '#1D9E75' }}>+{h.price}€</div>
             </div>
           ))}
         </div>
       )}

       {/* MISSION */}
       {tab === 'mission' && (
         <div style={{ animation: 'slidein 0.3s ease' }}>
           {!mission || phase === 'idle' ? (
             <div style={{ textAlign: 'center', padding: '48px 20px' }}>
               <div style={{ fontSize: 48, marginBottom: 16 }}>😴</div>
               <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Aucune mission en cours</h3>
               <p style={{ fontSize: 14, color: '#888' }}>
                 {available ? 'En attente d\'une mission...' : 'Activez votre disponibilité depuis l\'accueil'}
               </p>
             </div>
           ) : (
             <div>
               {/* Carte */}
               <div style={{ position: 'relative', marginBottom: 16 }}>
                 <div ref={mapRef} style={{ height: 240, borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', background: '#E8F5F0' }} />
                 <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: '#fff', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 700, color: '#1D9E75', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', whiteSpace: 'nowrap', zIndex: 10 }}>
                   {phase === 'navigating' ? '🚶 En route vers le client'
                     : phase === 'arrived' ? '⏳ En attente de confirmation'
                     : phase === 'returning' ? '🏠 Retour du chien'
                     : `🐾 Balade — ${formatTime(walkTime)}`}
                 </div>
               </div>

               {/* Info */}
               <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                   <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                     {SIZE_ICONS[mission.dogSize] || '🐕'}
                   </div>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{mission.dog}</div>
                     <div style={{ fontSize: 13, color: '#888' }}>{mission.dogBreed} · {mission.owner}</div>
                   </div>
                   <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '8px 14px', textAlign: 'center' }}>
                     <div style={{ fontSize: 18, fontWeight: 700, color: '#1D9E75' }}>{mission.price}€</div>
                     <div style={{ fontSize: 11, color: '#888' }}>{mission.duration} min</div>
                   </div>
                 </div>

                 <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>📍 {mission.address}</div>
                 {mission.instructions && (
                   <div style={{ fontSize: 12, color: '#888', background: '#FFF8E1', borderRadius: 8, padding: '6px 10px' }}>
                     💬 {mission.instructions}
                   </div>
                 )}

                 {phase === 'walking' && (
                   <div style={{ marginTop: 12 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 6 }}>
                       <span>Progression</span>
                       <span>{Math.round(progressPct)}% · {formatTime(walkTime)} / {mission.duration} min</span>
                     </div>
                     <div style={{ background: '#F0F0F0', borderRadius: 10, height: 8 }}>
                       <div style={{ width: `${progressPct}%`, background: '#1D9E75', borderRadius: 10, height: 8, transition: 'width 1s linear' }} />
                     </div>
                   </div>
                 )}
               </div>

               {/* Discussion, photos & petites notifs */}
               {['navigating', 'arrived', 'walking', 'returning'].includes(phase) && (
                 <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                   <button onClick={() => setShowChat(true)}
                     style={{ width: '100%', padding: '11px', background: '#E1F5EE', color: '#0F6E56', border: '1.5px solid #1D9E75', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: phase === 'walking' ? 12 : 0, fontFamily: 'inherit' }}>
                     💬 Discuter avec {mission.owner} {messages.length > 0 && <span style={{ marginLeft: 8, background: '#1D9E75', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 11 }}>{messages.length}</span>}
                   </button>
                   {phase === 'walking' && (
                     <div style={{ display: 'flex', gap: 8 }}>
                       <button onClick={() => sendPottyEvent('pee')}
                         style={{ flex: 1, padding: 12, background: '#F0F9FF', color: '#0369A1', border: '1.5px solid #BAE6FD', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                         💦 Pipi fait
                       </button>
                       <button onClick={() => sendPottyEvent('poop')}
                         style={{ flex: 1, padding: 12, background: '#FDF6EC', color: '#92600C', border: '1.5px solid #F5DEB3', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                         💩 Caca fait
                       </button>
                       <button onClick={() => document.getElementById('walkerPhoto').click()} disabled={sendingPhoto}
                         style={{ flex: 1, padding: 12, background: '#F0F9F5', color: '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: sendingPhoto ? 'default' : 'pointer', fontFamily: 'inherit', opacity: sendingPhoto ? 0.6 : 1 }}>
                         {sendingPhoto ? '⏳...' : '📷 Photo'}
                       </button>
                       <input id="walkerPhoto" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
                     </div>
                   )}
                 </div>
               )}

               {phase === 'navigating' && (
                 <button onClick={confirmArrival}
                   style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.4)' }}>
                   🐾 Je suis arrivé
                 </button>
               )}
               {phase === 'arrived' && (
                 <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '14px 16px', textAlign: 'center', fontSize: 13, color: '#B8860B', fontWeight: 600, animation: 'pulse 2s infinite' }}>
                   ⏳ En attente que {mission.owner} confirme vous avoir remis {mission.dog}...
                 </div>
               )}
               {phase === 'walking' && (
                 <button onClick={endWalk}
                   style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.4)' }}>
                   ✅ Terminer la balade
                 </button>
               )}
               {phase === 'returning' && (
                 <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '14px 16px', textAlign: 'center', fontSize: 13, color: '#B8860B', fontWeight: 600, animation: 'pulse 2s infinite' }}>
                   ⏳ En attente que {mission.owner} confirme avoir récupéré {mission.dog}...
                 </div>
               )}
               {(phase === 'navigating' || phase === 'arrived') && (
                 <button onClick={cancelActiveMission}
                   style={{ width: '100%', padding: 13, background: 'transparent', color: '#E24B4A', border: '1.5px solid #E24B4A', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 10, fontFamily: 'inherit' }}>
                   ❌ Annuler cette balade
                 </button>
               )}
             </div>
           )}
         </div>
       )}

       {/* GAINS */}
       {tab === 'gains' && (
         <div style={{ animation: 'slidein 0.3s ease' }}>
           <div style={{ background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', borderRadius: 18, padding: '24px', marginBottom: 20, textAlign: 'center' }}>
             <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>Gains ce mois</div>
             <div style={{ fontSize: 40, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{monthEarnings}€</div>
             <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>dont {todayEarnings}€ aujourd'hui</div>
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
             {[
               { label: 'Balades', value: String(totalWalks), icon: '🐾' },
               { label: 'Note moy.', value: avgRating ? `${avgRating} ⭐` : 'Nouveau', icon: '⭐' },
               { label: 'Heures', value: hoursLabel, icon: '⏱️' },
               { label: 'Clients', value: String(clientCount), icon: '👥' },
             ].map(s => (
               <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                 <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                 <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>{s.value}</div>
                 <div style={{ fontSize: 12, color: '#888' }}>{s.label}</div>
               </div>
             ))}
           </div>
           <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Historique</h3>
           {history.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '24px', background: '#fff', borderRadius: 16, fontSize: 14, color: '#888' }}>
               Aucune mission terminée pour l'instant
             </div>
           ) : history.map(h => (
             <div key={h.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
               <div style={{ flex: 1 }}>
                 <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{h.dog} · {h.owner}</div>
                 <div style={{ fontSize: 12, color: '#888' }}>{h.date} · {h.duration} min · {'⭐'.repeat(h.rating)}</div>
               </div>
               <div style={{ fontSize: 16, fontWeight: 700, color: '#1D9E75' }}>+{h.price}€</div>
             </div>
           ))}
         </div>
       )}

       {/* PROFIL */}
       {tab === 'profile' && (
         <div style={{ animation: 'slidein 0.3s ease' }}>
           <div style={{ background: '#fff', borderRadius: 18, padding: '24px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
             <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 12px', overflow: 'hidden' }}>
               {profile?.photo_url ? <img src={profile.photo_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🧑'}
             </div>
             <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>{displayName}</div>
             <div style={{ fontSize: 14, color: '#1D9E75', marginBottom: 4 }}>{ratingLabel} · {totalWalks} balade{totalWalks > 1 ? 's' : ''}</div>
             <div style={{ fontSize: 13, color: '#888' }}>Promeneur Dogger 🐾</div>
             {walkerProfile?.bio && (
               <div style={{ marginTop: 16, textAlign: 'left', background: '#F8FAF9', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                 {walkerProfile.bio}
               </div>
             )}
           </div>
           <div style={{ background: '#fff', borderRadius: 16, padding: '4px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
             {[
               { icon: '📋', label: 'Mes disponibilités' },
               { icon: '🏦', label: 'Informations bancaires' },
               { icon: '📱', label: 'Notifications' },
               { icon: '❓', label: 'Aide & Support' },
               { icon: '🚪', label: 'Se déconnecter', color: '#E24B4A', onClick: handleLogout },
             ].map((item, idx, arr) => (
               <div key={item.label} onClick={item.onClick}
                 style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: idx < arr.length - 1 ? '1px solid #F0F0F0' : 'none', cursor: 'pointer' }}>
                 <span style={{ fontSize: 20 }}>{item.icon}</span>
                 <span style={{ fontSize: 15, color: item.color || '#1A1A1A', fontWeight: 500 }}>{item.label}</span>
                 <span style={{ marginLeft: 'auto', color: '#CCC', fontSize: 18 }}>›</span>
               </div>
             ))}
           </div>
         </div>
       )}

     </div>

     {/* BOTTOM NAV */}
     <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#fff', borderTop: '1px solid #F0F0F0', display: 'flex', padding: '8px 0 16px' }}>
       {[
         { id: 'home',    icon: '🏠', label: 'Accueil' },
         { id: 'mission', icon: '🐾', label: 'Mission' },
         { id: 'gains',   icon: '💶', label: 'Gains' },
         { id: 'profile', icon: '👤', label: 'Profil' },
       ].map(t => (
         <button key={t.id} onClick={() => setTab(t.id)}
           style={{ flex: 1, border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px 0', fontFamily: 'inherit', position: 'relative' }}>
           {t.id === 'mission' && (phase === 'navigating' || phase === 'arrived' || phase === 'walking' || phase === 'returning') && (
             <div style={{ position: 'absolute', top: 4, right: '25%', width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 1s infinite' }} />
           )}
           <div style={{ fontSize: 20, marginBottom: 2 }}>{t.icon}</div>
           <div style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? '#1D9E75' : '#AAA' }}>{t.label}</div>
         </button>
       ))}
     </div>

   </div>
 );
}
