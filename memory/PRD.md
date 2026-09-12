# KalliTag — Product Requirements Document

## Statut Global
**🟢 EN PRODUCTION** — kallitag.fr (Vercel) + api.kallitag.fr (Railway) + MongoDB Atlas

## Design v4.3 — Résolution user prioritaire par `stripe_customer_id` (Feb 2026)
- **`_lc_set_active` refactoré** : ordre de résolution user = `stripe_customer_id` → `client_reference_id` (matches `users_col.id`) → `email` (fallback + upsert)
- **`client_reference_id` passé au Checkout** : `subscribe_checkout` pré-provisionne l'user row et transmet `user.id` comme `client_reference_id` à Stripe → identification garantie même sans customer_id retour
- **Support `STRIPE_API_KEY`** (spec LC) + fallback `STRIPE_SECRET_KEY` (legacy) — aucune casse en prod
- **Gain** : les événements `invoice.paid`, `subscription.updated` qui ne contiennent QUE `customer` (pas d'email) toggle maintenant directement le flag sans appel Stripe API supplémentaire
- **Tests ajoutés** : 9/9 passants (dont `customer_id_priority_no_email_needed` et `client_reference_id_activates_user`)

## Design v4.2 — Admin Lead Capture + endpoint `/leads` SSO (Feb 2026)
- **Admin UI onglet Lead Capture** (`/admin` → tab "Lead Capture") : liste tous les users (`GET /api/admin/lead-capture/users`), recherche par email/nom, filtre "Actifs uniquement", toggle activation manuelle avec confirmation
- **3 stats headers** : Comptes total · LC actifs · Managers/Commerciaux
- **Nouvel endpoint SSO `GET /api/lead-capture/leads?email=&limit=&since=`** — protégé par `X-LeadCapture-Secret`, renvoie tous les leads captés sur les profils NFC du user (`owner_email` match)
- **Support `since=<iso>` pour polling incrémental** (l'app Lead Capture peut fetch uniquement les nouveaux leads)
- **Guide d'intégration mis à jour** : `/app/memory/LEAD_CAPTURE_SSO_INTEGRATION.md` — ajoute `routes/leads.py` (proxy) + hook React `useLeads`
- **Tests** : 7/7 passants (`tests/test_stripe_webhook.py`) — 2 nouveaux cas pour `/leads` (secret requis + tri desc + filtre since)
- **Formulaire public déjà en place** : `POST /api/profile/{slug}/lead` + form ouvrant dans `PublicProfile.jsx` → capture immédiate, remonte via `/lead-capture/leads`

## Design v4.1 — Webhook Stripe pilote `lead_capture_active` (Feb 2026)
- **Helper `_lc_set_active(email, active, customer_id, plan_id)`** — upsert idempotent sur `users_col` (crée l'user si absent, MAJ `lead_capture_active` + `stripe_customer_id` + `lead_capture_active_at`)
- **Helper `_lc_email_from_customer(cust_id)`** — cache-first (`users_col.stripe_customer_id`) puis `stripe.Customer.retrieve` en fallback
- **Helper `_lc_has_other_active_sub(email)`** — empêche la désactivation quand l'user a une autre sub LC active
- **Événements webhook gérés** (tous répondent `{"received": true}` en 200 pour éviter les retries Stripe) :
  - `checkout.session.completed` mode=subscription → active immédiatement (avant même `subscription.created`)
  - `customer.subscription.created/updated` → active si status ∈ {active, trialing} + plan LC-enabled + provisionne les cartes NFC offertes
  - `customer.subscription.deleted` → désactive si aucune autre sub LC active
  - `invoice.paid` → active défensivement (renouvellement)
  - `invoice.payment_failed` → désactive si aucune autre sub LC active
- **Sécurité** : signature vérifiée avec `STRIPE_WEBHOOK_SECRET` (400 si invalide). Email inconnu → no-op silencieux (200). Idempotent (chaque event peut être rejoué).
- **Tests** : `/app/backend/tests/test_stripe_webhook.py` — 5 cas passants (signature invalide, checkout sub, invoice.paid, invoice.payment_failed, email inconnu)

## Design v4.0 — SSO externe Lead Capture (Feb 2026)
- **Décision archi** : l'app Lead Capture est un **projet Emergent séparé** (`lead-capture-pwa-3.preview.emergentagent.com`), pas intégrée à kallitag.fr
- **kallitag.fr = source de vérité** pour `lead_capture_active` + envoi OTP. L'app Lead Capture est un client SSO du backend kallitag
- **Rien à afficher sur kallitag** (pas de bouton "Accéder à Lead Capture") — les utilisateurs vont directement sur l'URL Lead Capture
- **Guide d'intégration livré** : `/app/memory/LEAD_CAPTURE_SSO_INTEGRATION.md` (362 lignes) — code backend proxy + Login frontend prêt à coller dans le projet Lead Capture
- **Endpoints SSO kallitag testés en prod** : `POST /api/lead-capture/request-otp` (200 OK) + `POST /api/lead-capture/auth` (401 sur mauvais code, 200 avec snapshot user + lead_capture_active)
- **Pas d'admin UI Lead Capture pour le moment** (reporté — activation via curl `/api/admin/lead-capture/set-active`)

## Design v3.9 — Cartes offertes + Onboarding équipe (Feb 2026)
- **Nouvelle collection** `nfc_claims_col` — 1 doc par carte NFC gratuite provisionnée
- **Webhook Stripe enrichi** : sur `subscription.created/updated` (active), crée automatiquement N claims selon `plan.includes_nfc_card_qty × seats` + envoie email de bienvenue avec bouton "Réclamer"
- **Endpoints publics** : `GET /api/nfc-claim/{token}` (info) · `POST /api/nfc-claim/{token}` (soumission profil+adresse → crée order avec `revenue_status=gift`, `amount_cents=0`)
- **Endpoint utilisateur** : `GET /api/user/pending-claims` (auth magic-link)
- **Page** `/reclamer-carte/:token` : formulaire 3 étapes (coordonnées, thème, livraison) + aperçu profil live
- **Bannière MyProfile** : liste des cartes à réclamer avec CTA "Réclamer →" par carte
- **Team endpoints** : `POST /api/team/invite` (auth manager) — upsert user COMMERCIAL + envoi magic link avec rôle · `GET /api/team/members` · `DELETE /api/team/members/{email}`
- **Page** `/mon-espace/equipe` : formulaire d'invitation + liste membres avec badges rôle + suppression
- **Sécurité** : replay bloqué (409 sur claim déjà consommé), managers-only sur endpoints team
- **Test cURL complet validé** : provisioning → claim → gift order créé → apparaît dans /admin avec amount barré 0€

## Design v3.8 — Abonnements & page /tarifs (Feb 2026)
- **3 plans** dans `SUBSCRIPTION_PLANS` : Lead Capture 19,90€/mois (199€/an) · All-in-One 29,90€/mois (299€/an, "Plus Populaire") · Équipe 39,90€/mois par licence (399€/an, min 3)
- **Nouvelle page** `/tarifs` avec toggle mensuel/annuel, calcul économie live, sélecteur licences pour Team, email pré-checkout obligatoire
- **Endpoint** `GET /api/subscription-plans` (public) + `POST /api/subscribe/checkout` (crée Stripe Checkout session mode=subscription avec quantity=seats)
- **Webhook enrichi** : `subscription.created/updated` (status active/trialing) → auto-set `lead_capture_active=True` sur `users_col` · `subscription.deleted` → désactive si aucun autre abonnement actif
- **Landing teaser** : bloc premium sous le hero (bouton "Voir les formules" + "Pack All-in-One 29,90€/mois")
- **Navbar** : lien "Tarifs" pointe vers `/tarifs` (avant c'était un anchor)
- **Requiert côté Stripe** : 6 prix récurrents avec lookup_key `sub_{plan_id}_{monthly|yearly}`

## Design v3.7 — SSO Lead Capture module (Feb 2026)
- **Nouveau shared secret** : `KALLITAG_SHARED_SECRET` en env — `klt_lc_5b3e9a1c7d24f68b0e3a9c5d7f1b4e82`
- **Auth OTP à 2 étapes** :
  1. `POST /api/lead-capture/request-otp` `{email}` + header → envoie code 6 chiffres par email (Resend), TTL 10min
  2. `POST /api/lead-capture/auth` `{email, password:code}` + header → vérifie code, retourne `{ok, lead_capture_active, user}` au format spec
- **Nouvelle collection `users_col`** avec `lead_capture_active: bool` (défaut false), auto-créée à la 1ère demande d'OTP
- **Nouvelle collection `lead_capture_otp_col`** avec TTL index MongoDB (auto-purge après 20min), brute-force guard 5 tentatives max
- **Endpoints admin** : `POST /api/admin/lead-capture/set-active` + `GET /api/admin/lead-capture/users`
- **Hash OTP** : SHA256(code + email + secret) — jamais stocké en clair, code consommé à l'usage

## Design v3.6 — Panel aperçu mobile refondu (Feb 2026)
- **Panel plein écran** `fixed inset-0 z-[100]` remplace shadcn Dialog (contournement des soucis de centrage/max-height)
- **3 boutons sortie visibles simultanément** : "← Retour" doré 44px en header + X en header + gros "Retour à la personnalisation" en footer sticky
- **Bouton back navigateur intercepté** via `history.pushState({ktPreview: true})` + `popstate` → ferme le panel au lieu de quitter la page (aucune perte de données)
- **Body scroll lock** pendant l'ouverture (`document.body.style.overflow = "hidden"`)
- **Safe-area bottom** respectée via `env(safe-area-inset-bottom)` — pas de bouton masqué par la barre iOS

## Design v3.5 — Admin classification revenus (Feb 2026)
- **4 statuts par commande** : `counted` (défaut) · `gift` · `refunded` · `cancelled` — champ `revenue_status` en base
- **CA net dynamique** : `/api/admin/stats` exclut les statuts non-counted du calcul revenue_cents — testé : 39,90 € → 0,00 € après passage en "Offerte"
- **Endpoint** `POST /admin/orders/{id}/revenue-status` (Bearer admin) avec whitelist statuts
- **UI Admin** : dropdown par ligne, badge coloré (Offerte vert / Remboursée violet / Annulée rouge), montant barré + ligne dimmée si exclue
- **Résumé exclusions** : bande sous les stats "Exclus du CA : N offerts · N remboursés · N annulés"
- **Label CA renommé** "CA net" avec hint "hors offerts / remboursés / annulés"

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
