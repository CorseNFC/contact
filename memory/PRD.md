# KalliTag — Product Requirements Document

## Statut Global
**🟢 EN PRODUCTION** — kallitag.fr (Vercel) + api.kallitag.fr (Railway) + MongoDB Atlas
- Frontend prod : https://kallitag.fr (cream premium theme)
- Backend prod : https://api.kallitag.fr

## Architecture
React + FastAPI + MongoDB Atlas + Stripe LIVE + Resend + Cloudinary + Magic Link + JWT

## Design System (v2 — cream premium)
- Fond : `#FAF7F0` (crème chaud)
- Cartes : `#FFFFFF` avec bordures brunes très légères
- Texte principal : `#1F1B16` (brun-noir chaud)
- Texte secondaire : `#4A3F2E` / `#6B5F4E` / `#8B7F6E`
- Accent : `#B8860B` (or soutenu pour contraste sur crème)
- Admin : conservé en dark mode (scope `.admin-dark` + classes hardcodées Admin.jsx)

## Fonctionnalités livrées
- [x] Landing + Configurator + PublicProfile en thème crème
- [x] Stripe promo codes activés (100% off pour amis, etc.)
- [x] 3 layouts profil : **Hero** (photo plein cadre premium), **Classic** (portrait rond élégant), **Minimal** (grille épurée)
- [x] Champs profil enrichis : bio, hero_photo_url, logo_url, layout_id, accent_color, Facebook, Twitter
- [x] Boutons ronds colorés d'action rapide (WhatsApp vert, Instagram rose, LinkedIn bleu)
- [x] Section "Retrouvez-moi" avec cartes réseaux détaillées
- [x] Admin dashboard en dark mode (isolé)
- [x] Custom domains kallitag.fr + api.kallitag.fr avec SSL Let's Encrypt
- [x] Upload photo Cloudinary fonctionnel (URL absolue)

## Variables d'env (inchangées vs v1)
Voir historique. `MONGO_URL`, `STRIPE_*`, `RESEND_*`, `CLOUDINARY_URL`, `CORS_ORIGINS`, `FRONTEND_URL`.

## Backlog / Prochaines évolutions

### 🟡 P1
- **Rotation credentials** : Mongo password + Stripe webhook secret partagés en clair
- **Admin bulk URLs** : afficher les N URLs NFC pour les commandes B2B (~10 lignes Admin.jsx)
- **Vercel var propre** : le bundle actuel appelle encore `contact-production-3cd3.up.railway.app` au lieu de `api.kallitag.fr` — vérifier `REACT_APP_BACKEND_URL` en type Config + Redeploy

### 🟢 P2
- Test E2E complet en prod : achat live → magic link → édition → scan NFC → admin
- Rate limiting sur `/api/auth/request-link` (anti-spam)
- Migration `noreply@kallitag.fr` sur Resend (au lieu de `onboarding@resend.dev`)
- Backup MongoDB Atlas
- Programme parrainage (5€/5€) pour viraliser
- Éditeur de recadrage photo pré-upload

## Historique déploiement
1. Deploy initial Vercel + Railway + Atlas
2. Custom domains kallitag.fr + api.kallitag.fr + SSL
3. Fix upload photo Cloudinary (URL absolue)
4. **Refonte design v2** : theme crème premium + 3 layouts profil + Stripe promo codes + nouveaux champs (bio, hero photo, logo)
