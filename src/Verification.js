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

// ─────────────────────────────────────────────────────────────────────────────
// Vérification du numéro de téléphone (demandée par Nada) — un vrai code
// envoyé par SMS, via Supabase Auth relié à un fournisseur SMS (Twilio par
// exemple — à configurer côté Supabase : Authentication → Providers → Phone).
// Le statut vit directement sur le compte Supabase Auth (phone_confirmed_at),
// pas dans une table à nous : aucun risque que la base et le vrai statut se
// désynchronisent, et rien à ajouter en SQL.
// ─────────────────────────────────────────────────────────────────────────────

// Interrupteur du téléphone obligatoire (demandé par Nada, sécurité).
//   true  → un compte créé à partir de PHONE_REQUIRED_SINCE ne peut rien faire
//           dans l'app tant que son numéro n'est pas confirmé par SMS.
//   false → coupe-circuit : plus personne n'est bloqué (utile si le fournisseur
//           SMS tombe en panne).
// Les comptes plus anciens que la date ne sont jamais bloqués : ils peuvent
// vérifier leur numéro quand ils veulent depuis le menu Profil.
export const PHONE_VERIFICATION_REQUIRED = false;
export const PHONE_REQUIRED_SINCE = '2026-10-07T00:00:00Z';

export const needsPhoneVerification = (user) =>
  PHONE_VERIFICATION_REQUIRED &&
  !!user &&
  !user.phone_confirmed_at &&
  new Date(user.created_at) >= new Date(PHONE_REQUIRED_SINCE);

// Numéro français saisi à la main → format international attendu par Supabase.
export const toE164 = (raw) => {
  const cleaned = (raw || '').replace(/\D/g, '').replace(/^0/, '');
  return cleaned ? `+33${cleaned}` : '';
};

// Numéro + statut du compte connecté, lus directement depuis Supabase Auth.
export const fetchPhoneVerification = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return { phone: user?.phone || '', verified: !!user?.phone_confirmed_at, verifiedAt: user?.phone_confirmed_at || null };
};

export function PhoneVerifBadge({ verified }) {
  return verified
    ? <span style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', background: '#E1F5EE', borderRadius: 10, padding: '3px 9px', whiteSpace: 'nowrap' }}>✅ Vérifié</span>
    : <span style={{ fontSize: 11, fontWeight: 700, color: '#B8860B', background: '#FFF8E1', borderRadius: 10, padding: '3px 9px', whiteSpace: 'nowrap' }}>○ Non vérifié</span>;
}

// Écran "Vérification du téléphone" du menu Profil, identique des deux côtés.
export function PhoneVerificationScreen({ defaultPhone, phoneVerification, onChange, onBack, backLabel }) {
  const [step, setStep] = useState(phoneVerification?.verified ? 'done' : 'phone'); // 'phone' | 'code' | 'done'
  const [phone, setPhone] = useState(defaultPhone || '');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async () => {
    setError('');
    const cleaned = phone.replace(/\s/g, '');
    if (!/^0?[67]\d{8}$/.test(cleaned)) { setError('Numéro invalide — commence par 6 ou 7'); return; }
    setSending(true);
    const { error: err } = await supabase.auth.updateUser({ phone: toE164(cleaned) });
    setSending(false);
    if (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('already')) setError('Ce numéro est déjà vérifié sur un autre compte.');
      else if (msg.includes('provider') || msg.includes('unsupported') || msg.includes('sms')) setError("L'envoi de SMS n'est pas encore configuré côté Supabase — contactez le support.");
      else setError("Impossible d'envoyer le code — réessayez.");
      return;
    }
    setStep('code');
  };

  const confirmCode = async () => {
    setError('');
    if (!/^\d{6}$/.test(code)) { setError('Entrez le code à 6 chiffres reçu par SMS'); return; }
    setSending(true);
    const { error: err } = await supabase.auth.verifyOtp({ phone: toE164(phone), token: code, type: 'phone_change' });
    setSending(false);
    if (err) { setError('Code incorrect ou expiré — réessayez ou renvoyez un code.'); return; }
    const fresh = await fetchPhoneVerification();
    onChange(fresh);
    setStep('done');
  };

  return (
    <div style={{ animation: 'slidein 0.3s ease' }}>
      <div onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1D9E75', fontWeight: 600, fontSize: 14, marginBottom: 14, cursor: 'pointer' }}>
        {backLabel || '← Retour au profil'}
      </div>

      <div style={{ ...CARD, padding: '22px 20px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📱</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>Vérification du téléphone</div>
        <PhoneVerifBadge verified={phoneVerification?.verified} />
      </div>

      <div style={{ ...CARD, padding: '20px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          Un code à 6 chiffres est envoyé par SMS à ce numéro. Le confirmer prouve qu'il vous appartient vraiment.
        </div>
      </div>

      {error && (
        <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 12 }}>
          ⚠️ {error}
        </div>
      )}

      {step === 'done' ? (
        <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '14px 16px', marginBottom: 24, fontSize: 13, color: '#0F6E56', lineHeight: 1.6 }}>
          ✅ Votre numéro est vérifié.
        </div>
      ) : step === 'phone' ? (
        <>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, display: 'block' }}>Numéro de téléphone</label>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#555' }}>🇫🇷 +33</span>
            <input style={{ width: '100%', padding: '14px 16px 14px 80px', borderRadius: 12, border: '1.5px solid #E8E8E8', fontSize: 15, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', color: '#1A1A1A', boxSizing: 'border-box' }}
              type="tel" placeholder="6 12 34 56 78" value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ''))} />
          </div>
          <button onClick={sendCode} disabled={sending}
            style={{ width: '100%', padding: 15, background: sending ? '#A8D5C4' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit', marginBottom: 24 }}>
            {sending ? 'Envoi...' : 'Envoyer le code'}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Code envoyé au +33 {phone.replace(/\s/g, '')}</div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, display: 'block' }}>Code à 6 chiffres</label>
          <input style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #E8E8E8', fontSize: 20, letterSpacing: 6, textAlign: 'center', fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', color: '#1A1A1A', marginBottom: 16, boxSizing: 'border-box' }}
            type="text" inputMode="numeric" maxLength={6} placeholder="••••••" value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <button onClick={confirmCode} disabled={sending}
            style={{ width: '100%', padding: 15, background: sending ? '#A8D5C4' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
            {sending ? 'Vérification...' : 'Confirmer'}
          </button>
          <button onClick={() => setStep('phone')} disabled={sending}
            style={{ width: '100%', padding: 13, background: 'transparent', color: '#888', border: '1.5px solid #E8E8E8', borderRadius: 14, fontSize: 14, cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            Changer de numéro / renvoyer un code
          </button>
        </>
      )}
    </div>
  );
}

// Page plein écran affichée à la place de l'app tant que le téléphone d'un
// compte récent n'est pas confirmé (voir needsPhoneVerification ci-dessus).
export function PhoneGate({ user, onVerified }) {
  const [pv, setPv] = useState({ phone: user?.phone || '', verified: false });
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.assign('/login');
  };
  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#0F6E56', lineHeight: 1.6 }}>
        🔒 Pour la sécurité de tous, votre numéro de téléphone doit être confirmé par SMS avant d'utiliser Dogger.
      </div>
      <PhoneVerificationScreen
        defaultPhone={user?.user_metadata?.phone || ''}
        phoneVerification={pv}
        onChange={(fresh) => { setPv(fresh); if (fresh.verified) onVerified(); }}
        onBack={logout}
        backLabel="← Se déconnecter"
      />
    </div>
  );
}
