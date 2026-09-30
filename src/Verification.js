import React, { useState } from 'react';
import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Vérification d'identité — socle.
//
// Aucun document n'est stocké par Dogger : la table ne contient qu'un statut.
// Tant qu'aucun prestataire (Stripe Identity, Ubble…) n'est branché, c'est une
// vérification manuelle : l'utilisateur demande, et le statut est passé à
// "verified" depuis la console Supabase après contrôle. Le jour où un
// prestataire arrive, seule la façon de remplir le statut change — cet écran,
// le badge et les blocages restent identiques.
// ─────────────────────────────────────────────────────────────────────────────

// Interrupteur unique du blocage.
//   false → la vérification existe, s'affiche et se demande, mais n'empêche
//           personne d'utiliser l'app (phase de test).
//   true  → un compte non vérifié ne peut plus ni commander (propriétaire),
//           ni se rendre disponible (promeneur).
// À passer à true seulement après avoir vérifié les comptes existants, sinon
// plus personne ne peut rien faire — y compris vous.
export const VERIFICATION_REQUIRED = false;

export const VERIF_BADGES = {
  none:     { label: 'Non vérifiée',   color: '#B8860B', bg: '#FFF8E1', icon: '○' },
  pending:  { label: 'En cours',       color: '#B8860B', bg: '#FFF8E1', icon: '⏳' },
  verified: { label: 'Vérifiée',       color: '#1D9E75', bg: '#E1F5EE', icon: '✅' },
  rejected: { label: 'Refusée',        color: '#E24B4A', bg: '#FFF0F0', icon: '⚠️' },
};

// Statut de l'utilisateur connecté. Aucune ligne en base = 'none'.
export const fetchMyVerification = async (userId) => {
  if (!userId) return { status: 'none' };
  const { data } = await supabase
    .from('identity_verifications')
    .select('status, reject_reason, verified_at')
    .eq('user_id', userId)
    .maybeSingle();
  return data || { status: 'none' };
};

export const isBlocked = (status) => VERIFICATION_REQUIRED && status !== 'verified';

// Petit badge réutilisable — il ne s'affiche JAMAIS "vérifié" sans que la
// base le dise.
export function VerifBadge({ status }) {
  const b = VERIF_BADGES[status] || VERIF_BADGES.none;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: b.color, background: b.bg, borderRadius: 10, padding: '3px 9px', whiteSpace: 'nowrap' }}>
      {b.icon} {b.label}
    </span>
  );
}

// Écran affiché à la place de l'action bloquée.
export function VerificationBlock({ onVerify, onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🪪</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Vérifiez votre identité pour continuer</h3>
      <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, marginBottom: 24 }}>
        Chaque compte doit être vérifié avant de confier un chien ou d'en prendre un en charge. C'est ce qui permet à l'autre personne de savoir à qui elle a affaire.
      </p>
      <button onClick={onVerify}
        style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10, fontFamily: 'inherit' }}>
        Vérifier mon identité
      </button>
      <button onClick={onBack}
        style={{ width: '100%', padding: 13, background: 'transparent', color: '#888', border: '1.5px solid #E8E8E8', borderRadius: 14, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
        Retour
      </button>
    </div>
  );
}

const CARD = { background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };

// Écran "Vérification d'identité" du menu Profil, identique des deux côtés.
export default function VerificationScreen({ userId, verification, onChange, onBack }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const status = verification?.status || 'none';
  const b = VERIF_BADGES[status] || VERIF_BADGES.none;

  const requestVerification = async () => {
    if (!userId) return;
    setError('');
    setSending(true);
    const { error: err } = await supabase
      .from('identity_verifications')
      .upsert({ user_id: userId, status: 'pending', method: 'manual', requested_at: new Date().toISOString() },
        { onConflict: 'user_id' });
    setSending(false);
    if (err) { setError("La demande n'a pas pu être envoyée — réessayez."); return; }
    onChange({ status: 'pending' });
  };

  return (
    <div style={{ animation: 'slidein 0.3s ease' }}>
      <div onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1D9E75', fontWeight: 600, fontSize: 14, marginBottom: 14, cursor: 'pointer' }}>
        ← Retour au profil
      </div>

      <div style={{ ...CARD, padding: '22px 20px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🪪</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>Vérification d'identité</div>
        <div style={{ display: 'inline-block', fontSize: 13, fontWeight: 700, color: b.color, background: b.bg, borderRadius: 12, padding: '6px 14px' }}>
          {b.icon} {b.label}
        </div>
        {status === 'verified' && verification?.verified_at && (
          <div style={{ fontSize: 12, color: '#AAA', marginTop: 10 }}>
            Depuis le {new Date(verification.verified_at).toLocaleDateString('fr-FR')}
          </div>
        )}
        {status === 'rejected' && verification?.reject_reason && (
          <div style={{ fontSize: 13, color: '#8A3B3A', marginTop: 12, lineHeight: 1.5 }}>{verification.reject_reason}</div>
        )}
      </div>

      <div style={{ ...CARD, padding: '20px', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Ce qui est vérifié</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          Votre identité et le fait que vous soyez majeur(e). C'est tout.<br /><br />
          Dogger ne vérifie ni vos compétences, ni votre casier judiciaire — une plateforme n'y a pas accès, seule la personne concernée peut demander son propre extrait.
          La vérification dit qui vous êtes, pas ce que vous valez comme promeneur : pour ça, il y a les avis.
        </div>
      </div>

      <div style={{ ...CARD, padding: '20px', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>🔒 Vos documents ne sont pas conservés</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          Dogger ne stocke aucune copie de pièce d'identité. Seul le résultat de la vérification est enregistré.
          N'envoyez jamais de photo de votre pièce d'identité dans une discussion ou par message : ce n'est jamais comme ça qu'une vérification se fait.
        </div>
      </div>

      {error && (
        <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 12 }}>
          ⚠️ {error}
        </div>
      )}

      {status === 'pending' && (
        <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '14px 16px', marginBottom: 24, fontSize: 13, color: '#8A6D1F', lineHeight: 1.6 }}>
          ⏳ Votre demande est enregistrée. Nous revenons vers vous via Aide &amp; Support pour convenir des modalités.
        </div>
      )}

      {(status === 'none' || status === 'rejected') && (
        <button onClick={requestVerification} disabled={sending}
          style={{ width: '100%', padding: 15, background: sending ? '#A8D5C4' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit', marginBottom: 24 }}>
          {sending ? 'Envoi...' : status === 'rejected' ? 'Refaire une demande' : 'Demander la vérification'}
        </button>
      )}
    </div>
  );
}

