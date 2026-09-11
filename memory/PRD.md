# KalliTag — Product Requirements Document

## Statut Global
**🟢 EN PRODUCTION** — kallitag.fr (Vercel) + api.kallitag.fr (Railway) + MongoDB Atlas

## Design v2 — Cream Premium
- Fond `#FAF7F0` chaud, cartes blanches, texte brun-noir chaud
- Or `#B8860B` en accent
- `/admin` conservé en dark mode (classes hardcodées)

## 3 Layouts profil (nouvelle version radicalement distincte)
1. **Hero** — Photo edge-to-edge 4:5 + nom en gros bold overlay avec dégradé, boutons ronds colorés (WhatsApp vert, IG rose, LinkedIn bleu) qui débordent sur la photo, cartes réseaux "Retrouvez-moi"
2. **Carte** — Grande carte à bordure dorée, ornement top, filigrane initiales en fond, avatar rond + lignes filetées + italique tagline — style carton d'invitation premium
3. **Liste** — Style Linktree : petit avatar + @handle + gros boutons pleine largeur empilés (call, email, social...)

## Nouveaux champs profil
`bio` (paragraphe long), `hero_photo_url` (portrait plein cadre), `logo_url` (entreprise), `layout_id`, `accent_color`, `facebook`, `twitter`

## Codes promo Stripe
`allow_promotion_codes=True` activé sur :
- `POST /api/checkout` (one-shot)
- `POST /api/bulk-checkout` (B2B)
- `POST /api/pro/checkout` (subscription)

## Backlog

### 🟡 P1
- **Debug checkout kallitag.fr** : "Impossible de démarrer le paiement" reporté par user — backend OK, à investiguer via console browser après nouveau deploy
- **Vercel REACT_APP_BACKEND_URL** : bundle appelle encore `contact-production-3cd3.up.railway.app` au lieu de `api.kallitag.fr` (marche mais moins propre)
- **Rotation credentials** : Mongo password + Stripe webhook secret
- **Admin bulk URLs** : afficher les N URLs NFC pour B2B

### 🟢 P2
- Rate limiting `/api/auth/request-link`
- Migration `noreply@kallitag.fr` sur Resend
- Programme parrainage
- Éditeur de recadrage photo
- Galerie photo secondaire sur layout Hero
