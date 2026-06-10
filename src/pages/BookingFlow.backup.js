import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BookingFlow from './pages/BookingFlow';
import WalkerHome from './pages/WalkerHome';
import AddDog from './pages/AddDog';
import { supabase } from './supabase';

function ProtectedRoute({ children }) {
  const [session, setSession] = React.useState(undefined);
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);
  if (session === undefined) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <div style={{ fontSize: 48 }}>🐾</div>
    </div>
  );
  if (!session) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/book" element={<ProtectedRoute><BookingFlow /></ProtectedRoute>} />
        <Route path="/book/:flowType" element={<ProtectedRoute><BookingFlow /></ProtectedRoute>} />
        <Route path="/book/:flowType/:step" element={<ProtectedRoute><BookingFlow /></ProtectedRoute>} />
        <Route path="/walker" element={<WalkerHome />} />
        <Route path="/add-dog" element={<ProtectedRoute><AddDog /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
Confirmed(true);
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
  if (!flowType) {
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