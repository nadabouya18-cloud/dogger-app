// Fonction serveur Vercel : suppression du compte par son propriétaire.
//
// Le droit à l'effacement (RGPD) suppose que la personne puisse partir sans
// passer par nous. La suppression d'un compte Supabase Auth exige la clé de
// service, qui ne doit JAMAIS se trouver dans le navigateur : elle reste ici,
// dans la variable d'environnement SUPABASE_SERVICE_ROLE_KEY de Vercel.
//
// Seul le titulaire du compte peut se supprimer : on n'accepte aucun
// identifiant passé dans la requête, on lit celui du jeton d'authentification.
//
// Les réservations ne sont pas effacées : elles appartiennent aussi à l'autre
// partie, qui a le droit de garder son propre historique. Le nom de la
// personne partie y est remplacé par "Compte supprimé".

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) return res.status(500).json({ error: 'not_configured' });

  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'missing_token' });

  const admin = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } });

  // Identité réelle de l'appelant, vérifiée côté serveur.
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const userId = userData?.user?.id;
  if (userError || !userId) return res.status(401).json({ error: 'invalid_token' });

  try {
    // 1. Anonymiser ce qui est partagé avec quelqu'un d'autre.
    await admin.from('bookings').update({ owner_name: 'Compte supprimé' }).eq('owner_id', userId);
    await admin.from('bookings').update({ walker_name: 'Compte supprimé' }).eq('walker_id', userId);
    await admin.from('walks').update({ owner_name: 'Compte supprimé' }).eq('walker_id', userId);
    await admin.from('favorite_walkers').update({ walker_name: 'Compte supprimé' }).eq('walker_id', userId);

    // 2. Effacer ce qui n'appartient qu'à cette personne. Chaque table est
    //    traitée séparément : si l'une n'existe pas ou refuse, les autres
    //    passent quand même.
    const ownTables = [
      ['dogs', 'owner_id'],
      ['favorite_walkers', 'owner_id'],
      ['walker_availability', 'walker_id'],
      ['identity_verifications', 'user_id'],
      ['support_tickets', 'user_id'],
      ['terms_acceptances', 'user_id'],
      ['walker_profiles', 'id'],
      ['profiles', 'id'],
    ];
    for (const [table, column] of ownTables) {
      await admin.from(table).delete().eq(column, userId);
    }

    // 3. Supprimer le compte lui-même. Tant que cette étape n'a pas réussi,
    //    on ne dit pas à la personne que son compte est supprimé.
    const { error: delError } = await admin.auth.admin.deleteUser(userId);
    if (delError) {
      return res.status(500).json({ error: 'auth_delete_failed', message: delError.message });
    }

    return res.status(200).json({ deleted: true });
  } catch (e) {
    return res.status(500).json({ error: 'delete_failed', message: String(e?.message || e).slice(0, 200) });
  }
};
