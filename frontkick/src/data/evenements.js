// ─────────────────────────────────────────────────────────────────────────────
// FightFocus — Calendrier des événements sports de combat
// ─────────────────────────────────────────────────────────────────────────────
// MISE À JOUR MANUELLE REQUISE : environ une fois par mois
// La page /evenements filtre automatiquement côté client pour n'afficher
// que les événements futurs dans les 60 prochains jours.
//
// CHAMPS :
//   date          → "YYYY-MM-DD" (obligatoire, utilisé pour le tri et le filtre)
//   heure         → texte libre (ex: "Nuit du samedi 9 au dimanche 10")
//   nom           → nom officiel de l'événement
//   sousTitre     → sous-titre ou main event résumé
//   discipline    → slug valide : mma | boxe | kickboxing | muay-thai | grappling | karate | sanda | lethwei | savate | sambo | k1
//   lieu          → ville + pays
//   combatPrincipal → fight principal (peut être "Card complet à confirmer")
//   categorie     → type d'événement (PPV, Fight Night, ONE Event, Glory Collision…)
//   diffusion     → chaîne/plateforme de diffusion
//   source        → URL de la source officielle utilisée pour vérifier
//   confidence    → "haute" | "moyenne" | "basse"
//                   haute   = annoncé officiellement par l'organisation
//                   moyenne = rapporté par sources médias sérieuses, non encore confirmé
//                   basse   = rumeur / non confirmé (à ne pas publier)
// ─────────────────────────────────────────────────────────────────────────────

export const DERNIERE_MAJ = "2026-04-26";

export const evenements = [

  // ── MAI 2026 ────────────────────────────────────────────────────────────────

  {
    date: "2026-05-02",
    heure: "À partir de 16h (heure française)",
    nom: "UFC Fight Night 275",
    sousTitre: "Della Maddalena vs. Prates",
    discipline: "mma",
    lieu: "Perth, Australie",
    combatPrincipal: "Jack Della Maddalena vs. Carlos Prates — Poids Welter",
    categorie: "Fight Night",
    diffusion: "UFC Fight Pass",
    source: "https://www.cbssports.com/ufc/schedule/",
    confidence: "haute",
  },

  {
    date: "2026-05-09",
    heure: "Nuit du samedi au dimanche (2h environ)",
    nom: "UFC 328",
    sousTitre: "Chimaev vs. Strickland — Titre Poids Moyen",
    discipline: "mma",
    lieu: "Newark, New Jersey, États-Unis",
    combatPrincipal: "Khamzat Chimaev vs. Sean Strickland — Championnat Poids Moyen UFC",
    categorie: "PPV",
    diffusion: "UFC Fight Pass / Canal+",
    source: "https://www.cbssports.com/ufc/schedule/",
    confidence: "haute",
  },

  {
    date: "2026-05-15",
    heure: "9h (heure française)",
    nom: "ONE Fight Night 43",
    sousTitre: "Muay Thai & MMA — Lumpinee Stadium",
    discipline: "muay-thai",
    lieu: "Lumpinee Stadium, Bangkok, Thaïlande",
    combatPrincipal: "Programme complet à confirmer",
    categorie: "ONE Fight Night",
    diffusion: "Amazon Prime Video",
    source: "https://www.onefc.com/events/",
    confidence: "haute",
  },

  {
    date: "2026-05-16",
    heure: "Horaire à confirmer",
    nom: "UFC Fight Night 276",
    sousTitre: "Allen vs. Costa",
    discipline: "mma",
    lieu: "Lieu à confirmer",
    combatPrincipal: "Brendan Allen vs. Paulo Costa — Poids Moyen",
    categorie: "Fight Night",
    diffusion: "UFC Fight Pass",
    source: "https://www.cbssports.com/ufc/schedule/",
    confidence: "moyenne",
  },

  // ── JUIN 2026 ────────────────────────────────────────────────────────────────

  {
    date: "2026-06-06",
    heure: "Horaire à confirmer",
    nom: "GLORY x RISE — Tokyo",
    sousTitre: "Last Featherweight Standing — Finale du Tournoi",
    discipline: "kickboxing",
    lieu: "Ota City General Gymnasium, Tokyo, Japon",
    combatPrincipal: "Finale 4 combattants — Tournoi Poids Plume",
    categorie: "Glory / Rise",
    diffusion: "À confirmer",
    source: "https://en.wikipedia.org/wiki/2026_in_Glory",
    confidence: "haute",
  },

  {
    date: "2026-06-13",
    heure: "Horaire à confirmer",
    nom: "Glory Collision 9",
    sousTitre: "Gala de kickboxing premium",
    discipline: "kickboxing",
    lieu: "Rotterdam, Pays-Bas",
    combatPrincipal: "Programme complet à confirmer",
    categorie: "Glory Collision",
    diffusion: "À confirmer",
    source: "https://en.wikipedia.org/wiki/2026_in_Glory",
    confidence: "haute",
  },

  {
    date: "2026-06-14",
    heure: "Nuit du dimanche (2h environ, heure française)",
    nom: "UFC — Washington D.C.",
    sousTitre: "Topuria vs. Gaethje — Titre Poids Léger",
    discipline: "mma",
    lieu: "Washington D.C., États-Unis",
    combatPrincipal: "Ilia Topuria vs. Justin Gaethje — Championnat Poids Léger UFC",
    categorie: "PPV",
    diffusion: "UFC Fight Pass / Canal+",
    source: "https://www.cbssports.com/ufc/schedule/",
    confidence: "haute",
  },

  {
    date: "2026-06-26",
    heure: "Horaire à confirmer",
    nom: "ONE: Denver",
    sousTitre: "MMA, Muay Thai & Kickboxing",
    discipline: "mma",
    lieu: "Ball Arena, Denver, Colorado, États-Unis",
    combatPrincipal: "Programme complet à confirmer",
    categorie: "ONE Event",
    diffusion: "Amazon Prime Video",
    source: "https://www.onefc.com/events/",
    confidence: "haute",
  },

];
