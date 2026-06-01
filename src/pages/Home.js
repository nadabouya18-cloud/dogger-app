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
  { id: 'xs',     icon: '🐩', name: 'Dogger XS',   desc: 'Petits gabarits −10 kg', price: 'Dès 12€', popular: false },
  { id: 'solo',   icon: '🐕', name: 'Dogger Solo', desc: 'Balade individuelle',     price: 'Dès 15€', popular: false },
  { id: 'shared', icon: '🐕‍🦺', name: 'Shared',     desc: 'Balade en groupe',       price: 'Dès 8€',  popular: true  },
  { id: 'home',   icon: '🏠', name: 'Dogger Home', desc: 'Garde à domicile',       price: 'Dès 25€', popular: false },
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
          Des promeneurs vérifiés, disponibles en 30 minutes — suivi GPS en direct.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/register')} style={{ flex: 1, padding:
