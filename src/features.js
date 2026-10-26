// Interrupteurs de fonctionnalités.
//
// Un seul endroit pour allumer ou éteindre une formule dans toute l'app :
// l'accueil public, le tableau de bord du propriétaire, le parcours de
// réservation et les disponibilités du promeneur lisent tous cette valeur.

// Garde à domicile ("Dogger Home").
//
// Éteinte pour l'instant : contrairement à la Balade, cette formule n'est pas
// connectée au vrai système de matching — les gardiens affichés sont encore
// écrits en dur dans BookingFlow.js. La laisser visible donnerait à un vrai
// utilisateur l'impression de réserver, sans que personne ne reçoive rien.
//
// Rappel avant de la rallumer : garder un animal contre rémunération exige
// l'ACACED et une déclaration à la DDPP, ce que de simples particuliers n'ont
// pas. Ce n'est donc pas qu'une question de code.
export const HOME_SERVICE_ENABLED = false;

// Date du jour au format AAAA-MM-JJ, en heure locale. new Date().toISOString()
// renvoie la date UTC : à Paris, après 23h (ou 22h en été), elle désigne déjà
// le lendemain — une balade planifiée paraissait démarrable une journée trop
// tôt.
export const localDateStr = (d = new Date()) => {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Combien de temps avant l'heure prévue le promeneur peut démarrer sa mission.
export const SCHEDULED_START_EARLY_MINUTES = 30;

// Une balade planifiée est "démarrable" si sa date est passée, ou si c'est
// aujourd'hui et qu'on est à moins de 30 minutes de l'heure prévue. Avant ce
// correctif, une balade de 18h apparaissait démarrable dès minuit.
export const isScheduledDue = (booking, now = new Date()) => {
  if (!booking?.scheduled_date) return false;
  const today = localDateStr(now);
  if (booking.scheduled_date < today) return true;
  if (booking.scheduled_date > today) return false;
  if (!booking.scheduled_time) return true;
  const [h, m] = String(booking.scheduled_time).split(':').map(Number);
  if (Number.isNaN(h)) return true;
  const start = new Date(now);
  start.setHours(h, m || 0, 0, 0);
  return now.getTime() >= start.getTime() - SCHEDULED_START_EARLY_MINUTES * 60 * 1000;
};
