import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Dogger v1.1
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker : il ne met rien en cache (voir public/service-worker.js).
// Il rend l'application installable et servira de point d'entrée aux
// notifications push.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // Pas de service worker (navigateur ancien, mode privé) : l'app
      // fonctionne normalement, simplement non installable.
    });
  });
}
