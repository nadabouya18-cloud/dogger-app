import React, { useState } from 'react';
import { primeAlerts, alertsReady, notifyGeneric } from './alerts';

// Écran "Notifications" du menu Profil, identique des deux côtés.
//
// Il sert surtout à dire la vérité sur ce que l'app sait faire et ne sait pas
// faire : tant qu'il n'y a pas de notifications push, une application
// complètement fermée ne reçoit rien. Autant que le promeneur le sache avant
// de rater une mission, plutôt qu'après.

const CARD = { background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };

const isInstalled = () =>
  window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;

const isIOS = () => /iPad|iPhone|iPod/.test(window.navigator.userAgent);

export default function NotificationsScreen({ role, onBack }) {
  const [granted, setGranted] = useState(alertsReady());
  const [busy, setBusy] = useState(false);
  const supported = 'Notification' in window;
  const denied = supported && Notification.permission === 'denied';
  const installed = isInstalled();

  const enable = async () => {
    setBusy(true);
    await primeAlerts();
    const ok = alertsReady();
    setGranted(ok);
    setBusy(false);
    if (ok) notifyGeneric('🔔 Notifications activées', 'Voilà à quoi ressemblera une alerte Dogger.', 'dogger-test');
  };

  return (
    <div style={{ animation: 'slidein 0.3s ease' }}>
      <div onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1D9E75', fontWeight: 600, fontSize: 14, marginBottom: 14, cursor: 'pointer' }}>
        ← Retour au profil
      </div>

      <div style={{ ...CARD, padding: '22px 20px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{granted ? '🔔' : '🔕'}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>Alertes</div>
        <div style={{ display: 'inline-block', fontSize: 13, fontWeight: 700, borderRadius: 12, padding: '6px 14px',
          color: granted ? '#1D9E75' : '#B8860B', background: granted ? '#E1F5EE' : '#FFF8E1' }}>
          {granted ? '✅ Activées' : denied ? '⚠️ Refusées' : '○ Non activées'}
        </div>
      </div>

      {!supported && (
        <div style={{ ...CARD, padding: '20px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
            Votre navigateur ne gère pas les notifications. Vous serez tout de même averti(e) par un son si l'application est ouverte.
          </div>
        </div>
      )}

      {supported && !granted && !denied && (
        <button onClick={enable} disabled={busy}
          style={{ width: '100%', padding: 15, background: busy ? '#A8D5C4' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', marginBottom: 16 }}>
          {busy ? 'Activation...' : 'Activer les alertes'}
        </button>
      )}

      {denied && (
        <div style={{ background: '#FFF0F0', border: '1.5px solid #FFD0D0', borderRadius: 16, padding: '16px 18px', marginBottom: 16, fontSize: 13, color: '#8A3B3A', lineHeight: 1.6 }}>
          Les notifications ont été refusées pour ce site. L'application ne peut pas les réactiver elle-même : passez par les réglages de votre navigateur, à la ligne « Notifications » pour ce site.
        </div>
      )}

      <div style={{ ...CARD, padding: '20px', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Ce que vous recevez</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          {role === 'walker'
            ? "Une nouvelle demande de balade, une annulation, un signalement. Un son, une vibration et une notification, pour que les 60 secondes de réponse ne passent pas inaperçues."
            : "Un promeneur a accepté votre balade, il est arrivé, il ramène votre chien."}
        </div>
      </div>

      <div style={{ background: '#FFF8E1', borderRadius: 16, padding: '16px 18px', marginBottom: 16, fontSize: 13, color: '#8A6D1F', lineHeight: 1.6 }}>
        <strong>La limite à connaître :</strong> si vous fermez complètement l'application, plus rien ne vous parvient.
        {role === 'walker'
          ? " Tant que vous êtes disponible, laissez-la ouverte — en arrière-plan suffit."
          : " Pendant une balade en cours, laissez-la ouverte pour suivre votre chien en direct."}
      </div>

      {!installed && (
        <div style={{ ...CARD, padding: '20px', marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>📲 Installer Dogger</div>
          <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
            Installée sur votre écran d'accueil, l'application s'ouvre en plein écran et les alertes sont plus fiables.
            <br /><br />
            {isIOS()
              ? "Sur iPhone : bouton Partager (le carré avec la flèche), puis « Sur l'écran d'accueil »."
              : "Sur Android : menu ⋮ de votre navigateur, puis « Installer l'application » ou « Ajouter à l'écran d'accueil »."}
          </div>
        </div>
      )}

      {installed && (
        <div style={{ ...CARD, padding: '20px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
            ✅ Dogger est installée sur cet appareil.
          </div>
        </div>
      )}
    </div>
  );
}
