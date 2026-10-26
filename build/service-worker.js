/* Service worker de Dogger.
 *
 * Il ne met RIEN en cache, volontairement. Un service worker qui met l'app en
 * cache est la cause classique d'utilisateurs bloqués sur une vieille version
 * après un déploiement — inacceptable sur une app qui change tous les jours.
 *
 * Il existe pour deux raisons :
 *   • rendre l'application installable (« Ajouter à l'écran d'accueil »), ce
 *     qui donne un vrai plein écran et une icône ;
 *   • servir de point d'entrée aux notifications push le jour où elles seront
 *     branchées — sur iOS, elles ne fonctionnent QUE dans une app installée.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Pas de handler 'fetch' : les requêtes partent au réseau normalement.

// Notification push reçue alors que l'application est fermée.
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) { payload = {}; }
  const title = payload.title || '🐕 Dogger';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || 'Vous avez une nouvelle demande.',
      tag: payload.tag || 'dogger',
      renotify: true,
      requireInteraction: true,
      data: { url: payload.url || '/' },
    })
  );
});

// Un appui sur la notification ramène sur l'onglet déjà ouvert s'il existe,
// plutôt que d'en ouvrir un deuxième.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
