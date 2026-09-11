# KalliTag — Product Requirements Document

## Statut Global
**🟢 EN PRODUCTION** — kallitag.fr (Vercel) + api.kallitag.fr (Railway) + MongoDB Atlas

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
`bio`, `hero_photo_url`, `logo_url`, `layout_id`, `accent_color`, `facebook`, `twitter`

## Codes promo Stripe
`allow_promotion_codes=True` sur `/checkout`, `/bulk-checkout`, `/pro/checkout`

## Backlog

### 🟡 P1
- **Debug checkout kallitag.fr** : "Impossible de démarrer le paiement" — backend OK, à investiguer via console browser après push
- **Vercel REACT_APP_BACKEND_URL** : bundle appelle encore ancien URL Railway (marche mais moins propre)
- **Rotation credentials** : Mongo password + Stripe webhook secret
- **Admin bulk URLs** : afficher N URLs NFC pour B2B

### 🟢 P2
- Rate limiting `/api/auth/request-link`
- `noreply@kallitag.fr` sur Resend
- Programme parrainage
- Éditeur de recadrage photo
- Galerie photo secondaire layout Hero
- Thèmes user-customisables (choix couleur perso)
