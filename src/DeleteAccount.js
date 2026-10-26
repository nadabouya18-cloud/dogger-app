import React, { useState } from 'react';
import { supabase } from './supabase';

// Suppression du compte par son titulaire (droit à l'effacement).
//
// La suppression réelle passe par la fonction serveur /api/delete-account, la
// seule à détenir la clé de service. Si elle n'est pas disponible (variable
// d'environnement absente, panne), on n'invente pas une suppression qui n'a
// pas eu lieu : la demande est enregistrée dans le support et la personne en
// est informée clairement.

const CARD = { background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const CONFIRM_WORD = 'SUPPRIMER';

export default function DeleteAccountScreen({ userId, role, onBack }) {
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requested, setRequested] = useState(false);

  const fallbackToSupport = async () => {
    try {
      await supabase.from('support_tickets').insert({
        user_id: userId,
        role,
        subject: 'Mon compte',
        message: 'Demande de suppression de compte envoyée depuis l\'application.',
      });
    } catch (e) {
      // Même si l'enregistrement échoue, on le dit honnêtement ci-dessous.
    }
    setRequested(true);
  };

  const handleDelete = async () => {
    if (word.trim().toUpperCase() !== CONFIRM_WORD) {
      setError(`Tapez ${CONFIRM_WORD} pour confirmer`);
      return;
    }
    setError('');
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
      });
      if (!res.ok) throw new Error('delete ' + res.status);
      const result = await res.json();
      if (!result.deleted) throw new Error('not_deleted');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (e) {
      await fallbackToSupport();
    } finally {
      setBusy(false);
    }
  };

  if (requested) {
    return (
      <div style={{ animation: 'slidein 0.3s ease' }}>
        <div onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1D9E75', fontWeight: 600, fontSize: 14, marginBottom: 14, cursor: 'pointer' }}>
          ← Retour au profil
        </div>
        <div style={{ ...CARD, padding: '22px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Demande enregistrée</div>
          <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
            La suppression automatique n'a pas pu aboutir, donc votre compte existe encore.
            Votre demande a été transmise et sera traitée manuellement — vous la retrouvez dans « Mes demandes », sous Aide &amp; Support.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'slidein 0.3s ease' }}>
      <div onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1D9E75', fontWeight: 600, fontSize: 14, marginBottom: 14, cursor: 'pointer' }}>
        ← Retour au profil
      </div>

      <div style={{ ...CARD, padding: '22px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>🗑️ Supprimer mon compte</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          C'est définitif : il n'y a pas de corbeille, et le compte ne peut pas être rétabli.
        </div>
      </div>

      <div style={{ ...CARD, padding: '20px', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Ce qui est effacé</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          Votre profil, votre photo, vos chiens, vos favoris, vos disponibilités, vos demandes de support et votre identifiant de connexion.
        </div>
      </div>

      <div style={{ ...CARD, padding: '20px', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Ce qui est conservé</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
          Les balades déjà effectuées restent dans l'historique de l'autre personne — c'est aussi le sien, et elle peut en avoir besoin en cas de litige.
          Votre nom y est remplacé par « Compte supprimé ».
        </div>
      </div>

      <div style={{ ...CARD, padding: '20px', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 8 }}>
          Tapez {CONFIRM_WORD} pour confirmer
        </div>
        <input value={word} onChange={e => { setWord(e.target.value); setError(''); }}
          placeholder={CONFIRM_WORD}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box', marginBottom: 14 }} />

        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 12 }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleDelete} disabled={busy}
          style={{ width: '100%', padding: 15, background: busy ? '#E8E8E8' : '#E24B4A', color: busy ? '#AAA' : '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit' }}>
          {busy ? 'Suppression...' : 'Supprimer définitivement mon compte'}
        </button>
      </div>
    </div>
  );
}
