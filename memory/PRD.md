# KalliTag — Product Requirements Document

## Statut Global
**🟢 EN PRODUCTION** — kallitag.fr (Vercel) + api.kallitag.fr (Railway) + MongoDB Atlas

- **Frontend prod** : https://kallitag.fr (+ www redirect)
- **Backend prod** : https://api.kallitag.fr (custom domain OK, SSL Let's Encrypt)
- **Repo GitHub** : CorseNFC/contact (branche main auto-deploy)
- **DB** : MongoDB Atlas cluster `kallitag.ynpw6pz.mongodb.net`

## Original Problem Statement
KalliTag e-commerce NFC platform. React + FastAPI + MongoDB. Landing page, configurator, Stripe (one-shot + subscriptions), Magic Link auth, freemium (Pro unlocks analytics + multi-profiles), déploiement GitHub + Vercel/Railway.

## Architecture Production
- **Frontend** : React (Vercel, framework CRA, root `frontend`, install `yarn install --frozen-lockfile`)
- **Backend** : FastAPI Python 3.11.9 (Railway, `MISE_PYTHON_GITHUB_ATTESTATIONS=false` + `mise.toml`)
- **DB** : MongoDB Atlas M0 (`kallitag`)
- **Payments** : Stripe LIVE keys (webhook `whsec_...` configuré)
- **Emails** : Resend
- **Storage** : Cloudinary (URLs absolues renvoyées par le backend)
- **Auth** : Magic link via Resend + JWT

## Fonctionnalités livrées
- [x] Landing page (design KalliTag, français)
- [x] Configurateur carte NFC Prestige (3 finitions : Noir/Métal/Or)
- [x] Aperçu iPhone temps réel avec 4 thèmes profil (avatar upload OK)
- [x] Stripe checkout one-shot (39.90€/carte)
- [x] Page `/entreprise` bulk B2B avec paliers de remise
- [x] Stripe Subscriptions Pro (mensuel 4.99€ + annuel 39€)
- [x] Auth magic link (email lien 20min) → JWT 30j
- [x] Page `/mon-profil` avec édition profil, upload photo Cloudinary, QR code
- [x] Analytics scans (débloqué Pro)
- [x] Multi-profiles Pro (transfert ownership)
- [x] Admin dashboard `/admin`
- [x] CORS configuré pour kallitag.fr + www + vercel legacy
- [x] Custom domains kallitag.fr + api.kallitag.fr (SSL Let's Encrypt)
- [x] Webhook Stripe configuré

## Variables d'env Railway
```
MONGO_URL=mongodb+srv://sandrosantinacci7_db_user:***@kallitag.ynpw6pz.mongodb.net/?appName=kallitag
DB_NAME=kallitag
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_yPoFyXz9aCIB3WqDFiNQHG8Voj6YyQDG
RESEND_API_KEY=re_gRJf...
CLOUDINARY_URL=cloudinary://...
CORS_ORIGINS=https://kallitag.fr,https://www.kallitag.fr,https://frontend-azure-three-67.vercel.app,http://localhost:3000
FRONTEND_URL=https://kallitag.fr
ADMIN_TOKEN=JYm-5t_6kI1_rpyz3RJPUNOYDrmclaQg
MISE_PYTHON_GITHUB_ATTESTATIONS=false
```

## Variables Vercel
```
REACT_APP_BACKEND_URL=https://api.kallitag.fr  (à vérifier : bundle actuel utilise encore contact-production-3cd3.up.railway.app)
```

## Backlog / Prochaines évolutions

### 🟡 P1 — À faire prochainement
- **Vercel env var REACT_APP_BACKEND_URL** : le bundle Vercel actuel appelle encore `contact-production-3cd3.up.railway.app`. Vérifier que la var est bien en type "Config" (pas Secret), Production+Preview, puis Redeploy manuel.
- **Rotation mot de passe MongoDB** : password partagé en clair dans le chat, à rotate sur Atlas → Database Access
- **Rotation Stripe webhook secret** : également partagé en clair
- **Admin bulk orders** : afficher les N URLs NFC individuelles pour les commandes B2B

### 🟢 P2 — Nice to have
- Test E2E full : achat carte live → email → magic link → édition profil → scan NFC → apparition dans admin
- Rate limiting sur `/api/auth/request-link` (anti-spam magic link)
- Migration vers `noreply@kallitag.fr` sur Resend (au lieu de `onboarding@resend.dev`)
- Backup automatique MongoDB (snapshots Atlas)
- Programme de parrainage (5€ filleul + 5€ parrain) pour viraliser chaque carte NFC

## Historique déploiement — 08/02/2026
1. Push initial GitHub CorseNFC/contact ✅
2. Config Railway → fix dependency conflicts + mise.toml (attestations) ✅
3. Build Railway ✅ (URL: contact-production-3cd3.up.railway.app)
4. Webhook Stripe créé & secret ajouté ✅
5. Deploy Vercel avec fix `.npmrc legacy-peer-deps=true` ✅
6. CORS Vercel → ajout `CORS_ORIGINS` + `FRONTEND_URL` ✅
7. Magic link 500 → fix MONGO_URL (bad auth password corrigé) ✅
8. **Domaines custom kallitag.fr + api.kallitag.fr** avec DNS OVH + Let's Encrypt ✅
9. **Fix upload photo Cloudinary** : backend renvoyait `/api/files/{path}` (410 Cloudinary) au lieu de l'URL absolue → correction dans `server.py`, `Configurator.jsx`, `MyProfile.jsx` ✅
10. **PROD OK** — tous les flows testés : magic link, checkout Stripe live, upload avatar avec preview live, admin dashboard ✅
