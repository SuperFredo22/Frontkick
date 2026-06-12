// Fonction serverless Vercel — relais d'inscription newsletter vers Brevo.
// La clé API reste côté serveur : configurer BREVO_API_KEY (et
// éventuellement BREVO_LIST_ID, défaut 2) dans Vercel → Settings →
// Environment Variables. Ne jamais exposer la clé dans le code front.
// NB : indisponible avec `astro dev` (utiliser `vercel dev` pour tester).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ORIGIN_RE = /^https:\/\/((www\.)?fightfocus\.fr|[a-z0-9-]+\.vercel\.app)$|^https?:\/\/localhost(:\d+)?$/;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée.' });
  }

  // Le formulaire est servi par le site : on refuse les origines tierces.
  const origin = req.headers.origin;
  if (origin && !ORIGIN_RE.test(origin)) {
    return res.status(403).json({ ok: false, error: 'Origine non autorisée.' });
  }

  const body = req.body ?? {};

  // Honeypot : un bot qui remplit le champ caché est accepté silencieusement.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return res.status(200).json({ ok: true, status: 'subscribed' });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, error: 'Email invalide.' });
  }

  const allowedSources = { accueil: 'FightFocus Accueil', article: 'FightFocus Article', footer: 'FightFocus Footer' };
  const source = allowedSources[body.source] || 'FightFocus';

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: 'Newsletter en cours de configuration — réessaie bientôt.' });
  }

  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email,
        listIds: [Number(process.env.BREVO_LIST_ID || 2)],
        updateEnabled: true,
        attributes: { SOURCE: source },
      }),
    });

    if (r.ok || r.status === 204) {
      return res.status(200).json({ ok: true, status: 'subscribed' });
    }
    if (r.status === 400) {
      // Contact probablement déjà existant
      return res.status(200).json({ ok: true, status: 'exists' });
    }
    return res.status(502).json({ ok: false, error: 'Service indisponible — réessaie dans quelques instants.' });
  } catch {
    return res.status(502).json({ ok: false, error: 'Service indisponible — réessaie dans quelques instants.' });
  }
}
