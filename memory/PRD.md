# KalliTag — Product Requirements Document

## Statut Global
**🟢 EN PRODUCTION** — kallitag.fr (Vercel) + api.kallitag.fr (Railway) + MongoDB Atlas

## Design v4.10 — Alignement Stripe Products avec la grille marketing (Feb 2026)

- **`SUBSCRIPTION_PLANS` refondu** avec les 3 tiers alignés `/tarifs` :
  - `solo` — 2490 cents/siège/mois · lookup `sub_solo_monthly` / `sub_solo_yearly` · 1 siège
  - `equipe` — 2190 cents/siège/mois · lookup `sub_equipe_monthly` / `sub_equipe_yearly` · 2 à 9 sièges · badge POPULAIRE
  - `entreprise` — 1990 cents/siège/mois · lookup `sub_entreprise_monthly` / `sub_entreprise_yearly` · 10-50 sièges · badge MEILLEUR TARIF
- **Backward compat** : `LEGACY_PLAN_ALIASES` mappe `lead_capture` → `solo`, `all_in_one` → `solo`, `team` → `equipe`. Les anciens liens de checkout continuent de fonctionner.
- **`_resolve_lookup` accepte les alias** en entrée avant de résoudre le plan.
- **`Literal[plan_id]` élargi** aux 3 nouveaux + 3 legacy pour Pydantic validation.
- **Tarifs.jsx CTA** : `plan_id` mis à jour → `solo`, `equipe`, `entreprise` (correspond aux nouveaux Stripe products).

## ⚠️ Action Stripe Dashboard requise
Pour que le checkout charge réellement les nouveaux montants, il faut créer 6 Prices dans Stripe (Products → Add product OR Add Price to existing) :

| Produit | Récurrence | Prix | Lookup key |
|---------|-----------|------|-----------|
| Kallitag Lead Capture Solo | Mensuel | 24,90 € | `sub_solo_monthly` |
| Kallitag Lead Capture Solo | Annuel | 249,00 € | `sub_solo_yearly` |
| Kallitag Lead Capture Équipe | Mensuel (par siège) | 21,90 € | `sub_equipe_monthly` |
| Kallitag Lead Capture Équipe | Annuel (par siège) | 219,00 € | `sub_equipe_yearly` |
| Kallitag Lead Capture Entreprise | Mensuel (par siège) | 19,90 € | `sub_entreprise_monthly` |
| Kallitag Lead Capture Entreprise | Annuel (par siège) | 199,00 € | `sub_entreprise_yearly` |

Chaque Price doit être `Recurring` et pour Équipe/Entreprise `Quantity` (le nombre de sièges est envoyé par le Checkout). Tant que ces Prices n'existent pas côté Stripe, le CTA renverra une 500 "Prix Stripe manquant pour 'sub_solo_monthly'".

## Design v4.9 — Refonte pricing marketing (Feb 2026)

- **`/tarifs` réécrit** avec grille dégressive hardcodée (display only, Stripe intact) :
  - **Solo** — 24,90 € / mois · 1 utilisateur
  - **Équipe** — 21,90 € / licence / mois · 2 à 9 licences · badge **POPULAIRE** (mis en avant, ring amber)
  - **Entreprise** — 19,90 € / licence / mois · 10 licences et + · badge **MEILLEUR TARIF**
- **Badge global** "Essai gratuit 7 jours · sans carte bancaire" en tête de page + mention "Tarif dégressif : le prix par licence baisse dès 2 licences"
- **Slugs `?plan=solo|equipe|entreprise`** (aliases legacy `lead-capture/all-in-one/team` conservés)
- **CTA S'abonner** → toujours `/subscribe/checkout` avec plan_id Stripe correct (`lead_capture` pour solo, `team` avec seats 2-9 pour equipe, `team` avec seats 10+ pour entreprise). **Tunnel Stripe intact**.
- **Features par palier** (chaque niveau inclut le précédent) : Solo = OCR/NFC/débriefs vocaux/score/export · Équipe = + dashboard manager + sync CRM HubSpot/Salesforce · Entreprise = + archivage auto CRM + comparateur IA + synthèse compte + graphe
- **Compteur licences** actif sur Équipe (2-9) et Entreprise (10-50) — le nombre alimente Stripe seats
- Vérifié desktop 1920px + mobile 390px (zéro overflow, cards empilées proprement)

## Design v4.8 — Feature-gating LC (plan / sièges / essai anti-abus) (Feb 2026)

- **Nouvelle collection `lead_capture_trial_ledger`** — index unique sur `email`, permanent, **survit à la suppression du compte** (anti-abus : 1 essai par email à vie)
- **Helpers ajoutés** (`server.py`) :
  - `_lc_derive_plan(seats)` → renvoie `(plan_slug, unit_price_eur)` selon la grille : 1→solo 24.90€, 2-9→equipe 21.90€, 10+→entreprise 19.90€ (plancher)
  - `_lc_get_or_start_trial(email)` → lit ou crée le ledger, renvoie `{on_trial, days_left, ends_at}` (7 jours par défaut à la première visite)
  - `_lc_seats_used(company_id)` → compte users actifs sur le même `company_id`
  - `_lc_subscription_block(email)` → shape `{status, plan, seats_allowed, seats_used, unit_price_eur, current_period_end}`
  - `_lc_build_auth_response(email)` → shape enrichie complète pour l'auth
- **Endpoint `POST /api/lead-capture/auth` enrichi** (additif — les clés v1 `ok`, `lead_capture_active`, `user{id,email,name,company,company_id,role,nfc_card_id}` restent) :
  - `user.plan` ∈ {solo, equipe, entreprise}
  - `user.seats: {allowed, used}`
  - `subscription: {status, plan, seats_allowed, seats_used, unit_price_eur, current_period_end}`
  - `trial: {on_trial, days_left, ends_at}`
- **Règles de priorité pour `lead_capture_active`** : sub active/trialing OU essai valide → `true`, sinon `false`
- **Alias `/api/leadcapture/auth`** hérite automatiquement (délègue à la même fonction)
- **Tests** : 7 nouveaux dans `tests/test_lc_feature_gating.py` — trial 7j sur fresh user, ledger survit à la suppression + recréation (pas de re-trial), sub solo/equipe/entreprise renvoie plan + unit_price corrects, expired trial + canceled sub bloquent l'accès, backward-compat des clés v1
- ⚠️ **Stripe tiered pricing** : la grille dégressive doit être implémentée côté Stripe Dashboard via un unique Price avec des paliers (1: 2490 cents, 2-9: 2190 cents, 10+: 1990 cents). Aujourd'hui le prix est calculé côté kallitag depuis la quantité de sièges enregistrée dans `subscriptions_col.seats` — la source Stripe doit être configurée manuellement.

## Design v4.7 — Intégration Lead Capture complète (Feb 2026)

- **Alias endpoint `/api/leadcapture/auth`** (sans tiret) — identique à `/api/lead-capture/auth`, pour s'aligner sur la spec côté LC
- **`GET /api/profile/{slug}` normalisé** : renvoie désormais `profile: {firstName, lastName, company, role, email, phone, website, linkedin}` (shape attendue par l'importer LC), avec fallback split du champ `name` si `first_name/last_name` absents. `profile_raw` conservé pour compat
- **Email de vérification enrichi** : bouton bleu "⚡ Accéder à Lead Capture" (link `leadcapture.kallitag.fr/decouvrir`) + tagline "7 jours d'essai gratuit sans carte bancaire" en tête d'email, le bouton "Confirmer mon email" reste en secondaire
- **`/tarifs?plan=<slug>` pré-sélectionne** un plan avec un ring amber renforcé + ruban "RECOMMANDÉ POUR VOUS" + scroll auto sur la carte. Mapping :
  - `lead-capture` → `lead_capture`
  - `all-in-one` → `all_in_one`
  - `entreprise` (ou `team`) → `team`
- **Inscription sans CB** : `/inscription` ne demande jamais de CB — le paiement démarre uniquement quand l'utilisateur choisit un plan sur `/tarifs`. La logique "7 jours d'essai" est portée par Lead Capture (kallitag renvoie `lead_capture_active=false` pour un compte fresh)
- **Tests régression** : 5/5 passants dans `tests/test_lc_integration.py` — profil normalisé, split fullname, 404, alias sans tiret 401 sans secret, alias 401 sur invalid_credentials, endpoint historique avec tiret intact

## Design v4.6 — Email verification + password reset dédiés (Feb 2026)
- **Email verification à l'inscription** :
  - `/auth/register` génère un token `purpose="verify"` (TTL 7 jours) et envoie un email dédié "Confirmez votre email" via Resend
  - Nouveau endpoint `POST /api/auth/verify-email` `{token}` → flip `email_verified=true` + retourne session_token
  - Nouveau endpoint `POST /api/auth/resend-verification` (authed) — invalide l'ancien token + renvoie l'email
  - **Blocage** : `POST /api/subscribe/checkout` renvoie `403 email_not_verified` si l'user a un password mais pas d'email vérifié
- **Password reset flow dédié** (distinct des magic-links de login) :
  - `POST /api/auth/forgot-password` `{email, origin_url}` — toujours 200 (anti-enumeration), envoie un email "🔑 Réinitialiser votre mot de passe" (TTL 30 min)
  - `POST /api/auth/reset-password` `{token, password}` — flip password + retourne session, clear login_attempts
  - Utilise le même `magic_tokens_col` mais avec `purpose="reset"` (différent des tokens de login `purpose=None`)
- **Nouvelles pages frontend** : `/verifier-email?token=` · `/mot-de-passe-oublie` · `/reinitialiser-mot-de-passe?token=`
- **Login.jsx simplifié** : plus de "recevoir un lien" ambigu, remplacé par lien "Mot de passe oublié ?" → route `/mot-de-passe-oublie` dédiée
- **Signup.jsx** : après register, écran "📧 Vérifiez vos emails" avec email pré-rempli + explicitation du blocage subscription
- **Account.jsx** : bannière ambrée si `email_verified=false` avec bouton "Renvoyer l'email" (`authResendVerification`)
- **Guide LC v2 mis à jour** : `LEAD_CAPTURE_SSO_INTEGRATION.md` — auth par password (fini l'OTP), lien vers `kallitag.fr/inscription` + `kallitag.fr/mot-de-passe-oublie` dans la page Login LC
- **Tests régression** : 22/22 passants (12 existants + 10 nouveaux dans `test_auth_verify_reset.py`) — verify OK/invalid/reuse, resend, subscribe blocked when unverified, forgot 200 always, reset full flow

## Design v4.5 — Auth email + password + espace compte (Feb 2026)
- **bcrypt** pour hasher les mots de passe (8 chars min), stockage `users_col.password_hash`
- **Endpoints** (`/app/backend/server.py`) :
  - `POST /api/auth/register` `{email, password, name?}` → `{session_token, has_password}`
  - `POST /api/auth/login` `{email, password}` → `{session_token, has_password}` — brute force 5 essais / 15 min lockout via `login_attempts_col`
  - `POST /api/auth/set-password` `{token, password}` — pour les users legacy qui avaient magic link seul
  - `POST /api/auth/change-password` (Bearer) `{old_password, new_password}`
  - `DELETE /api/auth/delete-account` (Bearer) `{password}` — supprime user + magic tokens + OTP
  - `GET /api/me` enrichi : `name, role, has_password, lead_capture_active, stripe_customer_id, subscription_plan, subscription_status, orders`
- **`POST /api/lead-capture/auth` refactoré** : vérifie d'abord le password kallitag (via `verify_password` bcrypt), OTP conservé en fallback backward-compat
- **Magic link redirection** : `/auth/callback` détecte `has_password=false` → redirige vers `/definir-mot-de-passe?token=...`
- **Pages frontend** :
  - `/connexion` — password + bouton "Recevoir un lien" en fallback (mot de passe oublié)
  - `/inscription` — signup complet avec show/hide password
  - `/definir-mot-de-passe?token=...` — set-password pour users legacy
  - `/mon-compte` — 3 cards overview (LC status · abonnement · commandes) + Stripe billing portal + change password + zone danger (delete)
- **Navbar** : "Mon compte" (loggé) · "Connexion / S'inscrire" (invité), lien mobile aussi
- **Sécurité** : rate limiting brute force par `ip:email`, bcrypt cost par défaut, JWT session 30 jours (existant)
- **Tests** : 12/12 passants (`tests/test_auth_password.py`) — register, login, wrong pw, /me, change-password, delete-account, brute force lockout, LC auth par password
- **test_credentials.md mis à jour** avec les nouveaux endpoints

## Design v4.4 — Page présentation Lead Capture + lien navbar (Feb 2026)
- **Nouvelle page publique** `/lead-capture` (`/app/frontend/src/pages/LeadCapture.jsx`) : hero, 3 stats clés (80% cartes jamais rappelées, 5s/lead, 3× plus de leads), 6 features détaillées (scan NFC, OCR carte papier, notes vocales, synthèse IA, offline PWA, multi-commerciaux), flow 4 étapes, dual CTA (ouvrir l'app vs voir tarifs)
- **Lien navbar `Lead Capture`** (desktop & mobile) ajouté dans `/app/frontend/src/components/Navbar.jsx` entre "Configurer" et "Tarifs"
- **URL app externe** : `https://leadcapture.kallitag.fr` (bouton "Ouvrir l'application" → `target="_blank"`)
- **Route** enregistrée dans `App.js` : `/lead-capture` → `<LeadCapture />`
- Design cohérent avec Tarifs.jsx : fond `#FAF7F0`, gradients or, motion animations, blur decorations, testids `lc-*`
- Vérifié responsive : desktop 1920px OK, mobile 390px OK (blur décoratif clippé par `overflow-hidden` parent)

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
