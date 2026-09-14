import React, { useState } from 'react';

// Textes légaux de Dogger, partagés par l'espace propriétaire et l'espace
// promeneur (un seul endroit à modifier). LEGAL_VERSION sert à horodater
// l'acceptation des conditions à l'inscription : si le texte change de façon
// significative, on incrémente cette date et on peut redemander l'accord.
export const LEGAL_VERSION = '2026-09-12';

// Tout ce qui est entre crochets doit être complété avant toute ouverture au
// public — c'est volontairement visible plutôt que masqué par une formule
// vague.
const DOCS = [
  {
    id: 'mentions',
    icon: '🏛️',
    title: 'Mentions légales',
    intro: "Qui édite Dogger et comment nous joindre.",
    sections: [
      {
        h: 'Éditeur',
        p: [
          "Dogger — [À COMPLÉTER : forme juridique, raison sociale, adresse du siège, numéro SIREN/SIRET].",
          "Directeur de la publication : [À COMPLÉTER : nom].",
          "Contact : [À COMPLÉTER : adresse e-mail de contact].",
        ],
      },
      {
        h: 'État du service',
        p: [
          "Dogger est en phase de test. Le service n'encaisse aucun paiement et n'est pas ouvert au grand public.",
          "Ces mentions doivent être complétées et le service doit disposer d'une structure juridique déclarée avant toute ouverture au public.",
        ],
      },
      {
        h: 'Hébergement',
        p: [
          "L'application est hébergée par Vercel Inc. et les données par Supabase Inc. — [À COMPLÉTER : coordonnées complètes et pays d'hébergement des données, à reprendre sur les sites de ces prestataires].",
        ],
      },
      {
        h: 'Signalement et réclamations',
        p: [
          "Tout contenu illicite, comportement dangereux ou litige peut être signalé depuis le menu Aide & Support de l'application. Chaque demande est enregistrée et reçoit une réponse dans ce même écran.",
          "Médiation de la consommation : [À COMPLÉTER : médiateur à désigner avant l'ouverture au public — obligation dès lors que le service s'adresse à des consommateurs].",
        ],
      },
    ],
  },
  {
    id: 'cgu',
    icon: '📘',
    title: "Conditions d'utilisation",
    intro: "Le rôle de Dogger, le vôtre, et celui du promeneur.",
    sections: [
      {
        h: "1. Ce qu'est Dogger",
        p: [
          "Dogger est un service de mise en relation entre des propriétaires de chiens et des promeneurs.",
          "Dogger n'effectue pas les balades, n'est pas partie au contrat conclu entre le propriétaire et le promeneur, et ne perçoit aucun paiement à ce stade.",
        ],
      },
      {
        h: '2. Qui sont les promeneurs',
        p: [
          "Les promeneurs sont des particuliers, non professionnels.",
          "Dogger ne vérifie ni leur identité, ni leur casier judiciaire, ni leurs compétences, ni leur assurance. Aucune enquête n'est menée sur eux.",
          "La note et le nombre de balades affichés reflètent uniquement l'historique enregistré dans l'application — ce n'est pas un agrément.",
          "Le choix du promeneur appartient au propriétaire, y compris lorsqu'il utilise la recherche automatique : celle-ci ne fait que proposer le promeneur disponible le plus proche.",
        ],
      },
      {
        h: '3. Une relation entre particuliers',
        p: [
          "Le contrat se forme entre deux particuliers. Les garanties propres au droit de la consommation (garantie légale de conformité, droit de rétractation) ne s'appliquent pas à ce type de relation.",
        ],
      },
      {
        h: '4. Pendant la balade',
        p: [
          "Le promeneur assume la garde de l'animal au sens de l'article 1243 du Code civil : il répond des dommages causés par l'animal pendant qu'il en a la garde, et doit le restituer à son propriétaire.",
          "La remise et la restitution du chien sont confirmées par les deux parties dans l'application, avec une photo à chaque étape.",
        ],
      },
      {
        h: '5. Vos obligations en tant que propriétaire',
        p: [
          "Votre chien doit être identifié (puce ou tatouage) et à jour de ses vaccinations.",
          "Vous devez signaler tout problème de santé, traitement en cours, ou comportement à risque (peur, fugue, réactivité envers les autres chiens ou les personnes).",
          "Les chiens de 1re et 2e catégorie sont soumis à un permis de détention, au port de la muselière et à la laisse : vous devez le signaler au promeneur et fournir les documents requis.",
          "Vous devez indiquer une adresse exacte et rester joignable pendant toute la durée de la balade.",
        ],
      },
      {
        h: '6. Responsabilité de Dogger',
        p: [
          "Dogger répond de ses propres manquements dans les conditions du droit commun.",
          "En revanche, Dogger ne répond pas des actes ou des fautes des utilisateurs entre eux, n'est pas assureur, et ne garantit ni le bon déroulement de la balade ni la restitution de l'animal.",
          "Concrètement : l'application ne peut pas empêcher matériellement une perte, une fuite ou un vol, ni se substituer à la police ou à une assurance. Ce qu'elle fournit, c'est une trace — conversation, photos horodatées, dernière position connue — et une orientation vers les bons interlocuteurs.",
          "Il est vivement recommandé à chaque utilisateur de vérifier auprès de son assureur l'étendue de sa responsabilité civile.",
        ],
      },
      {
        h: '7. En cas de problème',
        p: [
          "Si votre chien ne vous est pas rendu, ne confirmez pas la restitution dans l'application et utilisez le signalement : la balade passe en incident et l'ensemble des éléments est conservé.",
          "En cas d'urgence, appelez la police (17) sans attendre, puis déposez plainte.",
          "Prévenez votre assurance, et signalez la situation via Aide & Support pour que la balade soit bloquée.",
        ],
      },
      {
        h: '8. Comportement et suspension',
        p: [
          "Sont interdits : les contenus illicites, le harcèlement, l'usurpation d'identité, la demande de coordonnées bancaires à un autre utilisateur, et toute mise en danger d'un animal.",
          "Dogger peut suspendre ou supprimer un compte en cas de manquement grave.",
        ],
      },
      {
        h: '9. Données personnelles et droit applicable',
        p: [
          "Le traitement de vos données est décrit dans la politique de confidentialité, accessible depuis ce même écran.",
          "Les présentes conditions sont soumises au droit français.",
        ],
      },
    ],
  },
  {
    id: 'walker',
    icon: '🚶',
    title: 'Conditions promeneur',
    intro: "À lire avant d'accepter votre première mission.",
    sections: [
      {
        h: '1. Vous intervenez en tant que particulier indépendant',
        p: [
          "Dogger n'est pas votre employeur. Aucune mission ne vous est imposée : vous restez libre d'accepter, de refuser et de fixer vos disponibilités.",
          "Aucun lien de subordination n'existe entre vous et Dogger.",
        ],
      },
      {
        h: '2. Vos obligations fiscales et sociales',
        p: [
          "Les sommes que vous percevez sont vos revenus : il vous appartient de les déclarer.",
          "Une activité rémunérée exercée de façon régulière relève d'un statut professionnel (micro-entreprise le plus souvent). Au-delà du dépannage occasionnel, vous devez vous déclarer.",
        ],
      },
      {
        h: '3. Assurance',
        p: [
          "Vous devez être couvert par une assurance responsabilité civile.",
          "Vérifiez explicitement auprès de votre assureur que la garde d'un animal qui vous est confié est couverte : de nombreux contrats de responsabilité civile vie privée excluent les animaux confiés.",
        ],
      },
      {
        h: '4. Garde à domicile',
        p: [
          "La garde d'animaux contre rémunération est une activité réglementée : elle exige l'ACACED (attestation de connaissances pour les animaux de compagnie d'espèces domestiques) et une déclaration à la DDPP.",
          "La simple promenade n'est pas soumise à cette obligation.",
          "N'acceptez aucune garde tant que vous ne disposez pas de ces éléments.",
        ],
      },
      {
        h: '5. Pendant la mission',
        p: [
          "Vous avez la garde de l'animal et en répondez.",
          "Le chien reste en laisse, vous ramassez ses déjections et respectez les arrêtés municipaux (zones interdites, muselière pour les chiens concernés).",
          "Vous ne confiez le chien à personne d'autre et ne le restituez qu'à son propriétaire.",
          "Les photos de prise en charge et de retour sont obligatoires : elles vous protègent autant qu'elles protègent le propriétaire.",
          "En cas d'accident ou de blessure, contactez un vétérinaire et prévenez immédiatement le propriétaire via la discussion.",
        ],
      },
      {
        h: '6. Interdits',
        p: [
          "Demander ou communiquer des coordonnées bancaires via l'application.",
          "Réclamer au propriétaire des informations sans rapport avec la balade.",
          "Publier ou diffuser hors de l'application les photos prises pendant une mission.",
        ],
      },
    ],
  },
  {
    id: 'privacy',
    icon: '🔐',
    title: 'Politique de confidentialité',
    intro: "Quelles données sont collectées, pourquoi, et vos droits.",
    sections: [
      {
        h: 'Responsable du traitement',
        p: [
          "[À COMPLÉTER : identité et coordonnées du responsable de traitement, une fois la structure juridique créée].",
        ],
      },
      {
        h: 'Données collectées',
        p: [
          "Compte : prénom, nom, adresse e-mail, numéro de téléphone, photo de profil, présentation (promeneurs).",
          "Chien : nom, race, âge, gabarit, photo.",
          "Balade : adresse de prise en charge, date et heure, durée, prix.",
          "Position du promeneur pendant une mission en cours.",
          "Messages, photos de prise en charge et de retour, notes attribuées, demandes envoyées à Aide & Support.",
        ],
      },
      {
        h: 'Pourquoi ces données',
        p: [
          "Exécuter le service et permettre la mise en relation (exécution du contrat).",
          "Assurer la sécurité de l'animal et conserver une trace en cas de litige (intérêt légitime).",
          "Respecter nos obligations légales.",
        ],
      },
      {
        h: 'Géolocalisation',
        p: [
          "La position du promeneur n'est collectée que pendant une mission en cours, et uniquement partagée avec le propriétaire concerné.",
          "Aucun historique de déplacement n'est conservé en dehors des missions.",
        ],
      },
      {
        h: 'Qui y a accès',
        p: [
          "L'autre partie à la balade (le propriétaire et le promeneur concernés), et personne d'autre parmi les utilisateurs.",
          "Nos hébergeurs techniques : Supabase (base de données) et Vercel (application).",
          "Aucune donnée n'est vendue, ni utilisée à des fins publicitaires.",
        ],
      },
      {
        h: 'Durée de conservation',
        p: [
          "Les données de compte sont conservées tant que le compte existe.",
          "Les éléments d'une balade (messages, photos, dernière position) sont conservés [À COMPLÉTER : durée à fixer — une durée de l'ordre de trois ans est cohérente avec les délais de prescription] afin de pouvoir servir de preuve en cas de litige.",
        ],
      },
      {
        h: 'Vos droits',
        p: [
          "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité, ainsi que du droit d'introduire une réclamation auprès de la CNIL.",
          "Le prénom et le nom ne sont pas modifiables directement dans l'application, afin que les balades passées restent cohérentes : une demande de rectification se fait via Aide & Support.",
          "La suppression du compte n'est pas encore automatisée dans l'application : elle se demande via Aide & Support.",
        ],
      },
      {
        h: 'Cookies',
        p: [
          "Dogger n'utilise aucun cookie publicitaire ni traceur de mesure d'audience. Seul un stockage technique nécessaire à votre connexion est utilisé.",
        ],
      },
    ],
  },
  {
    id: 'safety',
    icon: '🛟',
    title: 'Sécurité et incidents',
    intro: "Les bons réflexes avant, pendant et après une balade.",
    sections: [
      {
        h: 'Avant',
        p: [
          "Regardez le profil du promeneur, sa présentation et ses avis. Vous pouvez lui écrire avant d'accepter une balade planifiée.",
          "Dites tout ce qui compte : comportement en laisse, peurs, traitement en cours, habitudes de fugue.",
        ],
      },
      {
        h: 'Pendant',
        p: [
          "La position du promeneur et la discussion restent accessibles depuis l'écran de suivi.",
          "Les photos de prise en charge et de retour sont obligatoires et horodatées.",
        ],
      },
      {
        h: 'En cas de problème',
        p: [
          "Danger immédiat, chien non rendu : police (17). Urgence générale : 112.",
          "Chien blessé ou malade : vétérinaire, puis prévenir l'autre partie via la discussion.",
          "Dans tous les cas : signaler depuis l'application pour que la balade soit marquée et que les éléments soient conservés.",
        ],
      },
    ],
  },
];

const CARD = { background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };

// Écran "Informations légales", identique des deux côtés de l'app.
export default function LegalScreen({ onBack }) {
  const [openDoc, setOpenDoc] = useState(null);
  const doc = DOCS.find(d => d.id === openDoc);

  if (doc) {
    return (
      <div style={{ animation: 'slidein 0.3s ease' }}>
        <div onClick={() => setOpenDoc(null)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1D9E75', fontWeight: 600, fontSize: 14, marginBottom: 14, cursor: 'pointer' }}>
          ← Tous les documents
        </div>
        <div style={{ ...CARD, padding: '22px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>{doc.icon} {doc.title}</div>
          <div style={{ fontSize: 12, color: '#AAA', marginBottom: 18 }}>Version du {LEGAL_VERSION}</div>
          {doc.sections.map(s => (
            <div key={s.h} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F6E56', marginBottom: 6 }}>{s.h}</div>
              {s.p.map((line, i) => (
                <p key={i} style={{ fontSize: 13, color: '#555', lineHeight: 1.65, margin: '0 0 8px' }}>{line}</p>
              ))}
            </div>
          ))}
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

      <div style={{ background: '#FFF8E1', borderRadius: 16, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: '#8A6D1F', lineHeight: 1.6 }}>
        ⚠️ Dogger est en phase de test : aucun paiement n'est encaissé et certains éléments de ces documents restent à compléter avant une ouverture au public.
      </div>

      <div style={{ ...CARD, padding: '4px 16px', marginBottom: 24 }}>
        {DOCS.map((d, idx) => (
          <div key={d.id} onClick={() => setOpenDoc(d.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: idx < DOCS.length - 1 ? '1px solid #F0F0F0' : 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: 20 }}>{d.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: '#1A1A1A', fontWeight: 600 }}>{d.title}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{d.intro}</div>
            </div>
            <span style={{ color: '#CCC', fontSize: 18 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

