# KalliTag — Product Requirements Document

## Statut Global
**🟢 EN PRODUCTION** — déployé sur Vercel (frontend) + Railway (backend) + MongoDB Atlas — le 08/02/2026

- **Frontend prod** : https://frontend-azure-three-67.vercel.app
- **Backend prod** : https://contact-production-3cd3.up.railway.app
- **Repo GitHub** : CorseNFC/contact
- **DB** : MongoDB Atlas cluster `kallitag.ynpw6pz.mongodb.net`

## Original Problem Statement
KalliTag e-commerce NFC platform. React + FastAPI + MongoDB. Landing page, configurator, Stripe (one-shot + subscriptions), Magic Link auth, freemium (Pro unlocks analytics + multi-profiles), déploiement GitHub + Vercel/Railway.

## Architecture Production
- **Frontend** : React (Vercel, framework CRA, root `frontend`, install `yarn install --frozen-lockfile`)
- **Backend** : FastAPI Python 3.11.9 (Railway, `MISE_PYTHON_GITHUB_ATTESTATIONS=false`)
- **DB** : MongoDB Atlas M0 (`kallitag`)
- **Payments** : Stripe LIVE keys (webhook `whsec_...` configuré)
- **Emails** : Resend (`re_gRJf...`)
- **Storage** : Cloudinary
- **Auth** : Magic link via Resend + JWT

## Fonctionnalités livrées
- [x] Landing page (design KalliTag, français, FR)
- [x] Configurateur carte NFC Prestige (3 finitions : Noir/Métal/Or)
- [x] Aperçu iPhone temps réel avec 4 thèmes profil
- [x] Stripe checkout one-shot (39.90€/carte)
- [x] Page `/entreprise` bulk B2B avec paliers de remise (5+/10+/20+/50+)
- [x] Stripe Subscriptions Pro (mensuel 4.99€ + annuel 39€)
- [x] Auth magic link (email lien 20min) → JWT 30j
- [x] Page `/mon-profil` avec édition profil, upload photo Cloudinary, QR code
- [x] Analytics scans (dashboard heures + 7 derniers jours) → **débloqué Pro**
- [x] Multi-profiles Pro (transfert d'ownership carte)
- [x] Admin dashboard `/admin` (orders, stats, mark shipped, NFC URL generation)
- [x] CORS configuré pour Vercel + localhost
- [x] Déploiement Railway + Vercel + Atlas
- [x] Webhook Stripe configuré et fonctionnel

## Variables d'env Railway
```
MONGO_URL=mongodb+srv://sandrosantinacci7_db_user:***@kallitag.ynpw6pz.mongodb.net/?appName=kallitag
DB_NAME=kallitag
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_yPoFyXz9aCIB3WqDFiNQHG8Voj6YyQDG
RESEND_API_KEY=re_gRJf...
RESEND_FROM="KalliTag <onboarding@resend.dev>"
EMAIL_FROM_NAME=KalliTag
CLOUDINARY_URL=cloudinary://...
CORS_ORIGINS=https://frontend-azure-three-67.vercel.app,http://localhost:3000
FRONTEND_URL=https://frontend-azure-three-67.vercel.app
ADMIN_TOKEN=JYm-5t_6kI1_rpyz3RJPUNOYDrmclaQg
ADMIN_EMAIL=sandrosantinacci7@gmail.com
MISE_PYTHON_GITHUB_ATTESTATIONS=false
```

## Variables Vercel
```
REACT_APP_BACKEND_URL=https://contact-production-3cd3.up.railway.app
```

## Backlog / Prochaines évolutions

### 🟡 P1 — À faire prochainement
- **Rotation mot de passe MongoDB** : le password `10nMDtJ8jOesANoA` a été partagé en clair dans le chat le 08/02, à faire tourner sur MongoDB Atlas → Database Access → user → Autogenerate Password
- **Domaine custom** : brancher `kallitag.fr` sur Vercel (frontend) + sous-domaine `api.kallitag.fr` sur Railway (backend), + mettre à jour `CORS_ORIGINS` et `FRONTEND_URL`
- **Admin bulk orders** : afficher les N URLs NFC individuelles pour les commandes B2B au lieu d'une seule dans le tableau `/admin`

### 🟢 P2 — Nice to have
- Test E2E full : achat carte live → email → magic link → édition profil → scan NFC → apparition dans admin
- Rotation `STRIPE_WEBHOOK_SECRET` (a été partagé en clair)
- Backup automatique MongoDB (Atlas propose des snapshots quotidiens sur M0+)
- Rate limiting sur `/api/auth/request-link` (anti-spam magic link)
- Migration progressive vers un vrai domaine `noreply@kallitag.fr` sur Resend (au lieu de `onboarding@resend.dev`)

## Historique déploiement — 08/02/2026
1. Push initial GitHub CorseNFC/contact ✅
2. Config Railway → build initial échoué (dependency conflict google-api-core/pydantic/requests) → fix requirements.txt ✅
3. Build Railway ✅ (URL: contact-production-3cd3.up.railway.app)
4. Webhook Stripe créé & secret ajouté à Railway ✅
5. Deploy Vercel échoué (peer deps date-fns) → fix `.npmrc legacy-peer-deps=true` + `vercel.json installCommand yarn` ✅
6. Deploy Vercel ✅ (URL: frontend-azure-three-67.vercel.app)
7. CORS bloque Vercel → ajout `CORS_ORIGINS` + `FRONTEND_URL` sur Railway ✅
8. Magic link 500 → wrap try/except pour logging détaillé + fix MONGO_URL (bad auth) ✅
9. Deploy Railway échoue (mise Python attestation) → `MISE_PYTHON_GITHUB_ATTESTATIONS=false` ✅
10. **PROD OK** — magic link envoyé, Stripe live session créée, admin dashboard opérationnel ✅
