import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const COLORS = {
  green: '#1D9E75',
  darkGreen: '#0F6E56',
  lightGreen: '#E1F5EE',
  dark: '#1A1A1A',
  mid: '#555555',
  light: '#888888',
  bg: '#F8FAF9',
  white: '#FFFFFF',
};

const SERVICES = [
  { id: 'walk',   icon: '🐕',  name: 'Balade',           desc: 'Promenade dans le quartier',   price: 'Dès 6€',  popular: false },
  { id: 'shared', icon: '🐕‍🦺', name: 'Balade Shared',    desc: 'Balade en groupe économique',  price: 'Dès 4€',  popular: true  },
  { id: 'parc',   icon: '🌳',  name: 'Dogger Parc',      desc: 'Session de jeu en parc canin', price: 'Dès 5€',  popular: false },
  { id: 'home',   icon: '🏠',  name: 'Garde à domicile', desc: 'Garde chez le promeneur',      price: 'Dès 25€', popular: false },
];

const STEPS = [
  { num: 1, title: 'Commandez en 3 taps',    desc: "Choisissez votre formule, adresse et heure." },
  { num: 2, title: 'Un promeneur accepte',   desc: "Profil vérifié, réponse en moins de 90 secondes." },
  { num: 3, title: 'Suivez en temps réel',   desc: "GPS live, photos pendant la balade." },
  { num: 4, title: 'Paiement automatique',   desc: "Débit en fin de balade. Notez votre promeneur." },
];

export default function Home() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('shared');

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto' }}>

      {/* HERO */}
      <div style={{ background: 'linear-gradient(160deg, #0F6E56 0%, #1D9E75 100%)', padding: '60px 24px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', top: -80, right: -80 }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '5px 14px', fontSize: 13, color: '#fff', marginBottom: 20 }}>
          🐾 Bientôt disponible à Paris
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 12 }}>
          Votre chien<br />mérite mieux
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: 32 }}>
          Des promeneurs vérifiés, disponibles en moins de 5 minutes — suivi GPS en direct.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/login?redirect=book')} style={{ flex: 1, padding: '14px 20px', background: '#fff', color: '#0F6E56', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Commander 🐾
          </button>
          <button onClick={() => navigate('/walker')} style={{ flex: 1, padding: '14px 20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Promener
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'flex', background: '#fff', margin: '0 16px', marginTop: -20, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', position: 'relative', zIndex: 10 }}>
        {[{ num: '7M+', label: 'chiens en France' }, { num: '~5 min', label: 'délai de réponse' }, { num: 'GPS', label: 'suivi live' }].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '16px 8px', textAlign: 'center', borderRight: i < 2 ? '1px solid #F0F0F0' : 'none' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#1D9E75', display: 'block' }}>{s.num}</span>
            <span style={{ fontSize: 11, color: '#888', marginTop: 2, display: 'block' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* SERVICES */}
      <div style={{ padding: '32px 20px 0' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 16 }}>Choisissez votre formule</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {SERVICES.map(s => (
            <div key={s.id} onClick={() => setSelected(s.id)}
              style={{ background: selected === s.id ? '#E1F5EE' : '#F8FAF9', borderRadius: 16, padding: '18px 14px', cursor: 'pointer', border: selected === s.id ? '1.5px solid #1D9E75' : '1.5px solid transparent', position: 'relative' }}>
              {s.popular && <span style={{ position: 'absolute', top: 10, right: 10, background: '#1D9E75', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>Populaire</span>}
              <span style={{ fontSize: 28, marginBottom: 8, display: 'block' }}>{s.icon}</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 3 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4, marginBottom: 6 }}>{s.desc}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75' }}>{s.price}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ padding: '32px 20px', background: '#F8FAF9', margin: '28px 0 0' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 16 }}>Comment ça marche</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {STEPS.map(s => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1D9E75', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.num}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WALKER BANNER */}
      <div onClick={() => navigate('/walker')} style={{ margin: '20px 20px 0', background: 'linear-gradient(135deg, #0F6E56, #0A4D3A)', borderRadius: 16, padding: '20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
        <span style={{ fontSize: 36 }}>🚶</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Devenez promeneur Dogger</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Gagnez jusqu'à 800€/mois à votre rythme</div>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 24 }}>›</span>
      </div>

      {/* CTA */}
      <div style={{ padding: '28px 20px 48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Prêt à essayer ?</h2>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 24, lineHeight: 1.5 }}>Rejoignez la liste d'attente et soyez<br />parmi les premiers à Paris.</p>
        <button onClick={() => navigate('/register')} style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12, boxShadow: '0 4px 16px rgba(29,158,117,0.35)' }}>
          Créer mon compte gratuit
        </button>
        <button onClick={() => navigate('/login')} style={{ width: '100%', padding: 15, background: 'transparent', color: '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          J'ai déjà un compte
        </button>
      </div>

    </div>
  );
}
