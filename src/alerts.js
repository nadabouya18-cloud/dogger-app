import { useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Alertes du promeneur.
//
// L'app détecte une nouvelle mission en interrogeant la base toutes les 4
// secondes. Ce code ne tourne que tant que la page est vivante : si le
// promeneur verrouille son téléphone ou change d'application, le navigateur
// suspend le minuteur et la demande expire sans qu'il ait rien vu.
//
// Ce module ne supprime pas cette limite — seule une vraie notification push
// le ferait — mais il couvre le cas le plus fréquent : l'app est ouverte,
// l'écran est allumé ou la page est passée en arrière-plan. Trois canaux,
// volontairement redondants, parce qu'aucun n'est fiable partout :
//   • un son, qui marche même téléphone dans la poche ;
//   • une vibration (Android ; iOS l'ignore) ;
//   • une notification système, visible quand la page n'est pas au premier plan.
// ─────────────────────────────────────────────────────────────────────────────

let audioCtx = null;

// Les navigateurs refusent de jouer un son tant que l'utilisateur n'a pas
// interagi avec la page. On prépare donc le contexte audio au moment où le
// promeneur se déclare disponible — c'est un vrai geste de sa part.
export const primeAlerts = async () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx && !audioCtx) audioCtx = new Ctx();
    if (audioCtx?.state === 'suspended') await audioCtx.resume();
  } catch (e) {
    audioCtx = null;
  }
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch (e) {
    // Permission refusée ou API absente : les autres canaux prennent le relais.
  }
};

export const alertsReady = () => {
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
};

// Trois bips montants, assez distincts pour ne pas passer pour une notification
// quelconque. Son synthétisé plutôt qu'un fichier : rien à télécharger, et le
// son part instantanément.
const playBeeps = () => {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    [0, 0.22, 0.44].forEach((offset, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660 + i * 220, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  } catch (e) {
    // Contexte audio fermé par le navigateur : on ne bloque rien.
  }
};

export const notifyNewMission = (mission) => {
  playBeeps();
  try { navigator.vibrate?.([300, 120, 300, 120, 500]); } catch (e) { /* non supporté */ }
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification('🐕 Nouvelle balade !', {
        body: `${mission?.dog || 'Un chien'} · ${mission?.duration || ''} min · ${mission?.price || ''}€ — vous avez 60 secondes pour répondre.`,
        tag: 'dogger-mission',
        renotify: true,
        requireInteraction: true,
      });
      n.onclick = () => { window.focus(); n.close(); };
    }
  } catch (e) {
    // Certaines versions d'iOS lèvent une exception sur `new Notification`
    // hors application installée : le son et la vibration suffisent alors.
  }
};

export const notifyGeneric = (title, body, tag) => {
  playBeeps();
  try { navigator.vibrate?.([200, 100, 200]); } catch (e) { /* non supporté */ }
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(title, { body, tag: tag || 'dogger', renotify: true });
      n.onclick = () => { window.focus(); n.close(); };
    }
  } catch (e) { /* idem */ }
};

// Empêche l'écran de s'éteindre pendant une mission en cours. Sans cela,
// l'écran s'éteint au bout de quelques dizaines de secondes, le navigateur
// suspend la page, et la position du promeneur cesse d'être envoyée au
// propriétaire — qui voit son suivi se figer en pleine balade.
//
// Le verrou est relâché par le navigateur chaque fois que la page passe en
// arrière-plan : il faut le reprendre au retour.
export function useScreenWakeLock(active) {
  const lockRef = useRef(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;
    let cancelled = false;

    const acquire = async () => {
      try {
        if (document.visibilityState !== 'visible') return;
        lockRef.current = await navigator.wakeLock.request('screen');
      } catch (e) {
        // Refusé (batterie faible, onglet masqué…) : la balade continue,
        // simplement sans garantie que l'écran reste allumé.
      }
    };

    const onVisible = () => { if (!cancelled) acquire(); };

    acquire();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      try { lockRef.current?.release(); } catch (e) { /* déjà relâché */ }
      lockRef.current = null;
    };
  }, [active]);
}
