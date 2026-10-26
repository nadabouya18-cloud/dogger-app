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
