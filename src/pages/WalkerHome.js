import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_MISSION = {
 id: 'mission_001',
 owner: 'Nada B.',
 ownerPhoto: null,
 dog: 'Oya',
 dogBreed: 'Bichon Maltais',
 dogSize: 'xs',
 dogPhoto: null,
 service: 'Balade',
 duration: 30,
 price: 13,
 address: '12 rue de la Paix, Paris 75001',
 distance: '320m',
 instructions: 'Elle tire un peu en laisse, sinon très gentille 🐾',
};

const SIZE_ICONS = { xs: '🐩', s: '🐕', m: '🦮', l: '🐕‍🦺' };

export default function WalkerHome() {
 const navigate = useNavigate();
 const [tab, setTab] = useState('home');
 const [available, setAvailable] = useState(false);
 const [phase, setPhase] = useState('idle');
 const [mission, setMission] = useState(null);
 const [missionTimer, setMissionTimer] = useState(30);
 const [walkTime, setWalkTime] = useState(0);
 const [earnings, setEarnings] = useState(0);
 const [history, setHistory] = useState([]);
 const [photos, setPhotos] = useState([]);
 const [rating, setRating] = useState(0);
 const [showRating, setShowRating] = useState(false);
 const mapRef = useRef(null);
 const mapInstanceRef = useRef(null);
 const walkerTimerRef = useRef(null);
 const missionTimerRef = useRef(null);

 // Simuler réception mission après 5s si disponible
 useEffect(() => {
   if (!available || phase !== 'idle') return;
   const timeout = setTimeout(() => {
     setMission(MOCK_MISSION);
     setMissionTimer(30);
     setPhase('mission_incoming');
   }, 5000);
   return () => clearTimeout(timeout);
 }, [available, phase]);

 // Timer mission 30s
 useEffect(() => {
   if (phase !== 'mission_incoming') return;
   missionTimerRef.current = setInterval(() => {
     setMissionTimer(t => {
       if (t <= 1) {
         clearInterval(missionTimerRef.current);
         setPhase('idle');
         setMission(null);
         return 30;
       }
       return t - 1;
     });
   }, 1000);
   return () => clearInterval(missionTimerRef.current);
 }, [phase]);

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

 const acceptMission = () => {
   clearInterval(missionTimerRef.current);
   setPhase('navigating');
   setTab('mission');
 };

 const refuseMission = () => {
   clearInterval(missionTimerRef.current);
   setPhase('idle');
   setMission(null);
 };

 const startWalk = () => {
   setWalkTime(0);
   mapInstanceRef.current = null;
   setPhase('walking');
 };

 const handlePhoto = (e) => {
   const file = e.target.files[0];
   if (!file) return;
   const reader = new FileReader();
   reader.onload = (ev) => setPhotos(p => [...p, ev.target.result]);
   reader.readAsDataURL(file);
 };

 const endWalk = () => {
   clearInterval(walkerTimerRef.current);
   setShowRating(true);
 };

 const submitRating = () => {
   const newEntry = {
     id: Date.now(),
     owner: mission.owner,
     dog: mission.dog,
     service: mission.service,
     duration: mission.duration,
     price: mission.price,
     date: new Date().toLocaleDateString('fr-FR'),
     rating,
   };
   setHistory(h => [newEntry, ...h]);
   setEarnings(e => e + mission.price);
   setShowRating(false);
   setPhase('idle');
   setMission(null);
   setPhotos([]);
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
           <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Thomas M. 🐾</h1>
         </div>
         <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{earnings}€</div>
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
         <div onClick={() => { setAvailable(a => !a); if (available) { setPhase('idle'); setMission(null); } }}
           style={{ width: 52, height: 28, borderRadius: 14, background: available ? '#fff' : 'rgba(255,255,255,0.3)', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', flexShrink: 0 }}>
           <div style={{ width: 22, height: 22, borderRadius: '50%', background: available ? '#1D9E75' : '#fff', position: 'absolute', top: 3, left: available ? 27 : 3, transition: 'left 0.3s' }} />
         </div>
       </div>

       {available && phase === 'idle' && (
         <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', animation: 'pulse 2s infinite' }}>
           🔍 Recherche de missions à proximité...
         </div>
       )}

       {(phase === 'navigating' || phase === 'walking') && (
         <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
           onClick={() => setTab('mission')}>
           <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7FFFD4', animation: 'pulse 1s infinite' }} />
           <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#fff' }}>
             {phase === 'navigating' ? '🚶 En route vers Nada B.' : `🐾 Balade en cours — ${formatTime(walkTime)}`}
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
               { label: "Aujourd'hui", value: `${earnings}€`, icon: '💶' },
               { label: 'Ce mois', value: `${243 + earnings}€`, icon: '📅' },
               { label: 'Balades', value: String(history.length + 127), icon: '🐾' },
             ].map(s => (
               <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '14px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                 <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                 <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{s.value}</div>
                 <div style={{ fontSize: 10, color: '#888' }}>{s.label}</div>
               </div>
             ))}
           </div>

           {(phase === 'navigating' || phase === 'walking') && mission && (
             <div style={{ background: '#E1F5EE', borderRadius: 16, padding: '16px', marginBottom: 16, border: '1.5px solid #1D9E75', cursor: 'pointer' }}
               onClick={() => setTab('mission')}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                 <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                 <div style={{ flex: 1 }}>
                   <div style={{ fontSize: 14, fontWeight: 700, color: '#0F6E56' }}>
                     {phase === 'navigating' ? '🚶 En route vers le client' : `🐾 Balade en cours — ${formatTime(walkTime)}`}
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
                   {phase === 'navigating' ? '🚶 En route vers le client' : `🐾 Balade — ${formatTime(walkTime)}`}
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

               {/* Photos */}
               {phase === 'walking' && (
                 <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                   <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>📸 Envoyer des photos au propriétaire</div>
                   <div style={{ display: 'flex', gap: 8, marginBottom: 10, overflowX: 'auto', paddingBottom: 4 }}>
                     {photos.map((p, i) => (
                       <img key={i} src={p} alt="balade" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                     ))}
                     <div onClick={() => document.getElementById('walkerPhoto').click()}
                       style={{ width: 72, height: 72, borderRadius: 12, background: '#F0F9F5', border: '1.5px dashed #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 24 }}>
                       📷
                     </div>
                   </div>
                   <input id="walkerPhoto" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                   {photos.length > 0 && (
                     <div style={{ fontSize: 12, color: '#1D9E75', fontWeight: 600 }}>
                       ✅ {photos.length} photo{photos.length > 1 ? 's' : ''} envoyée{photos.length > 1 ? 's' : ''} au propriétaire
                     </div>
                   )}
                 </div>
               )}

               {phase === 'navigating' && (
                 <button onClick={startWalk}
                   style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.4)' }}>
                   🐾 Je suis arrivé — Démarrer la balade
                 </button>
               )}
               {phase === 'walking' && (
                 <button onClick={endWalk}
                   style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.4)' }}>
                   ✅ Terminer la balade
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
             <div style={{ fontSize: 40, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{243 + earnings}€</div>
             <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>dont {earnings}€ aujourd'hui</div>
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
             {[
               { label: 'Balades', value: String(history.length + 127), icon: '🐾' },
               { label: 'Note moy.', value: '4.9 ⭐', icon: '⭐' },
               { label: 'Heures', value: '34h', icon: '⏱️' },
               { label: 'Clients', value: '23', icon: '👥' },
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
             <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 12px' }}>🧑</div>
             <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>Thomas M.</div>
             <div style={{ fontSize: 14, color: '#1D9E75', marginBottom: 4 }}>⭐ 4.9 · {history.length + 127} balades</div>
             <div style={{ fontSize: 13, color: '#888' }}>Promeneur certifié Dogger 🐾</div>
           </div>
           <div style={{ background: '#fff', borderRadius: 16, padding: '4px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
             {[
               { icon: '📋', label: 'Mes disponibilités' },
               { icon: '🏦', label: 'Informations bancaires' },
               { icon: '📱', label: 'Notifications' },
               { icon: '❓', label: 'Aide & Support' },
               { icon: '🚪', label: 'Se déconnecter', color: '#E24B4A' },
             ].map((item, idx, arr) => (
               <div key={item.label}
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
           {t.id === 'mission' && (phase === 'navigating' || phase === 'walking') && (
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
