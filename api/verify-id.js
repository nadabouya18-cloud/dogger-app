// Fonction serveur Vercel : vérifie par IA qu'une image est bien une pièce
// d'identité. La clé Anthropic reste ICI, côté serveur (variable d'environnement
// ANTHROPIC_API_KEY dans Vercel) — elle n'est plus jamais envoyée au navigateur.
//
// Le prompt, le modèle et la taille de réponse sont fixés ici : un visiteur ne
// peut envoyer qu'une image, pas poser une question libre avec ta clé.

const MAX_IMAGE_CHARS = 3_000_000;           // ~2,2 Mo d'image (le site réduit avant l'envoi)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PER_HOUR_PER_IP = 12;              // frein anti-abus (par instance, au mieux)
const hits = new Map();

const PROMPT =
  'Analyse cette image et réponds UNIQUEMENT en JSON sans markdown:\n' +
  '{"isIdCard":true/false,"type":"carte_identite/passeport/permis/autre","valid":true/false,"message":"explication courte en français max 10 mots"}\n\n' +
  'Règles STRICTES:\n' +
  "- isIdCard: true UNIQUEMENT si c'est une vraie pièce d'identité officielle (carte nationale d'identité, passeport, permis de conduire)\n" +
  '- Si c\'est un animal, objet, photo de personne sans document officiel: isIdCard=false, valid=false\n' +
  "- valid: true UNIQUEMENT si c'est un document d'identité officiel clairement visible\n" +
  '- Sois très strict';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'not_configured' });

  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 3600 * 1000);
  if (recent.length >= MAX_PER_HOUR_PER_IP) return res.status(429).json({ error: 'too_many_requests' });
  recent.push(now);
  hits.set(ip, recent);

  const { image, mediaType } = req.body || {};
  if (typeof image !== 'string' || image.length === 0 || image.length > MAX_IMAGE_CHARS) {
    return res.status(400).json({ error: 'bad_image' });
  }
  if (!ALLOWED_TYPES.includes(mediaType)) return res.status(400).json({ error: 'bad_type' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'upstream_error' });
    const data = await r.json();
    const text = data.content?.[0]?.text || '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    // On ne renvoie au navigateur que ces trois champs, rien d'autre.
    return res.status(200).json({
      isIdCard: !!parsed.isIdCard,
      valid: !!parsed.valid,
      message: typeof parsed.message === 'string' ? parsed.message.slice(0, 120) : '',
    });
  } catch (e) {
    return res.status(502).json({ error: 'analysis_failed' });
  }
};
