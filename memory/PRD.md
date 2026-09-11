# KalliTag — Product Requirements Document

## Statut Global
**🟢 EN PRODUCTION** — kallitag.fr (Vercel) + api.kallitag.fr (Railway) + MongoDB Atlas

## Design v3.4 — Cadrage, Compression, Galerie (Feb 2026)
- **Cadrage cohérent preview/public** : `objectPosition: "center 25%"` sur photo hero (Hero + Split) → visages du tiers supérieur toujours visibles indépendamment de la largeur (300px preview vs 390-448px public)
- **Compression client automatique** : helper `/app/frontend/src/lib/imageCompress.js` (canvas resize + JPEG re-encode) — avatar 800px, hero 1600px, logo 512px (PNG transparency preservée), galerie 1200px, qualité 82-90%
- **Galerie universelle** : rendue dans TOUS les layouts (Hero embedded via section_order · Card/List/Split/Gradient/Brutal via bloc `gallery-outer` unifié) — même rendu en preview et sur profil public
- **Persistance galerie confirmée** : les URLs `gallery_urls[]` sont sauvegardées via `req.profile.model_dump()` dans l'ordre Stripe

## Design v3.3 — Couleurs granulaires + Persistance (Feb 2026)
- **7 couleurs par élément** : Prénom · Nom · Poste · Entreprise · Bio · Bouton CTA · Libellé liens (fallback thème si vide)
- **Mise à jour temps réel** : les 6 layouts (Hero, Card, List, Split, Gradient, Brutal) appliquent maintenant `text_colors` — helper `useColors(p,t)` centralisé
- **Persistance localStorage** : clé `kt_configurator_state_v2` — le state (profil complet, shipping, contactEmail, product, quantity) survit à toute navigation ou rafraîchissement
- **Mobile dialog aperçu** : bouton "Retour" en header sticky + gros bouton doré "Retour à la personnalisation" en bas + X classique — 3 sorties évidentes

## Design v3.2 — Personnalisation avancée + Admin B2B (Feb 2026)
- **Couleurs perso par élément** : color pickers pour nom/prénom, poste, bio, bouton CTA, libellé réseaux — fallback thème si vide (`text_colors: Dict[str,str]` en base)
- **Galerie 3-6 photos** : upload multiple sur Cloudinary via `/upload-avatar-guest` — rendu grid dans layout Hero uniquement (première photo en 2×2 si ≥ 3 photos)
- **Ordre des sections Hero** : réorganisation `quick/about/gallery/cta/socials` via flèches ↑↓ (5 blocs) — `section_order: List[str]`
- **Prix sticky mobile agrandi** : gold-text, taille base, mise à jour live à chaque changement quantité (testé : 39,90 → 119,70 €)
- **Admin B2B** : affichage grand format des N URLs NFC par commande bulk avec badge "B2B · N cartes", numérotation #01/#02, copie individuelle ou copie groupée (endpoint enrichi `nfc_urls: [{slug, url, first_name, last_name, job_title}]`)

## Design v3.1 — UX Mobile Configurateur (Feb 2026)
- **Aperçu sticky mobile** : mini-thumbnail live + résumé (thème, layout, finition, prix) + bouton "Aperçu" en haut de page sur mobile — toujours visible pendant scroll
- **Dialog plein écran** : tap sur "Aperçu" ouvre modale avec phone frame complet + tabs Profil/Carte + résumé commande
- **Sélection carte physique** : badge doré ✓ (dégradé D4AF37→8B6508) + ring-2 amber-500 + label "SÉLECTIONNÉ"
- **Icônes layouts** : remplacé emojis arc-en-ciel par 6 wireframes SVG monochromes cream/gold (`/app/frontend/src/components/LayoutIcon.jsx`) — style premium cohérent

## Design v3 — Bibliothèque riche
- **8 thèmes** (Onyx, Ivoire, Midnight, Rose Nude, Neon, Forêt, Champagne, Mono)
- **6 layouts** (Hero, Carte, Liste, Split, Gradient, Brutalist)
- **48 combinaisons** possibles
- Chaque thème a un "vibe" descriptif (sobre & or, cyberpunk électrique, brutaliste, etc.)
- Site global en crème premium (`/admin` conservé dark)

## Layouts détaillés
1. **Hero** — Photo edge-to-edge 4:5 + nom géant overlay avec dégradé bas
2. **Carte** — Cadre bordure dorée + filigrane initiales + italique tagline (invitation)
3. **Liste** — Linktree : @handle + gros boutons pleine largeur empilés
4. **Split** — Diagonale photo top (clip-path) + nom bicolore
5. **Gradient** — Full gradient immersif + orbs blur animés + boutons glass
6. **Brutalist** — Bordures nettes noires, typo massive avec contour stroke, mono uppercase

## Nouveaux champs profil
`bio`, `hero_photo_url`, `logo_url`, `layout_id`, `accent_color`, `facebook`, `twitter`, `text_colors` (Dict), `gallery_urls` (List, max 6), `section_order` (List — Hero)

## Codes promo Stripe
`allow_promotion_codes=True` sur `/checkout`, `/bulk-checkout`, `/pro/checkout`

## Backlog

### 🟡 P1
- **Debug checkout kallitag.fr** : "Impossible de démarrer le paiement" — backend OK, à investiguer via console browser après push
- **Vercel REACT_APP_BACKEND_URL** : bundle appelle encore ancien URL Railway (marche mais moins propre)
- **Rotation credentials** : Mongo password + Stripe webhook secret

### 🟢 P2
- Rate limiting `/api/auth/request-link`
- `noreply@kallitag.fr` sur Resend
- Programme parrainage
- Éditeur de recadrage photo
- Thèmes user-customisables niveau accent (choix couleur perso global — le picker par élément couvre déjà les besoins texte)
- Section reorder pour tous les layouts (actuellement Hero uniquement)
- Éditeur libre canvas (drag & drop pixel-perfect des éléments)
