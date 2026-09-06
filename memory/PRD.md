# KalliTag — Product Requirement Document

## Original problem statement
Site e-commerce NFC KalliTag. Refonte UX izitouch, monétisation freemium (carte + profil de base à vie gratuit + option KalliTag Pro 4,99€/mois ou 39€/an). 7 phases planifiées. FR only.

## Choix utilisateur (2026-02)
- MVP = Phases 1–3 : Landing + Configurateur + Tunnel Stripe one-shot
- Repartir sur le template `/app` (FastAPI + Mongo + React)
- Resend managé par Emergent (emails transactionnels)
- Stripe sandbox Emergent (Flow A)
- Images produit générées via Gemini Nano Banana (reportées — Unsplash pour l'instant)

## User personas
- **Indépendant / freelance** — veut faire forte impression en RDV, capter des leads.
- **Cadre commercial** — remplace les cartes papier périmées, met à jour son poste sans réimprimer.
- **Entrepreneur DTC** — cherche un canal de contact durable, monétisation Pro plus tard.

## Architecture
- Frontend : React 19 (CRA + Craco) + Tailwind + shadcn/ui + framer-motion + lucide-react. Routes : `/`, `/configurateur`, `/paiement/succes`, `/paiement/annule`.
- Backend : FastAPI + PyMongo. Endpoints `/api/products`, `/api/products/{id}`, `/api/checkout`, `/api/payments/status/{session_id}`, `/api/stripe/webhook`.
- DB : Mongo — collections `orders`, `payment_transactions`.
- Paiement : Stripe Checkout (Flow A sandbox claimable). Tax mode `calc_only` avec fallback `diy` si Stripe Tax indisponible.
- Emails : Resend via Emergent proxy (client + admin, envoi sur webhook + fallback polling).

## Réalisé (2026-02-XX)
- Landing haut de gamme : hero animé, comparaison papier/LinkedIn/KalliTag, 6 features, tarifs (gratuit à vie / Pro teaser), testimonials, FAQ.
- Configurateur 3 étapes : produit + template (6 skins) + infos pro + livraison. Aperçu carte live (framer-motion).
- Tunnel Stripe : création session avec metadata, redirection, page succès avec polling status, page annulé.
- Webhook Stripe (`/api/stripe/webhook`) idempotent + fallback status inline.
- Emails confirmation client + notification admin (Resend proxy, guardrails G1–G5).
- Catalog Stripe seedé : 3 produits (39,90€ / 19,90€ / 14,90€ EUR) via `setup_stripe.py`.
- Bugfix Pydantic : `ProfileConfig.email=""` → coercé en `None`.

## Backlog priorisé
### P0 (prochaine itération)
- Phase 4 : Abonnement KalliTag Pro (Stripe Subscriptions mensuel + annuel, magic link email, portail client Stripe).
- Phase 5 : Dashboard utilisateur `/dashboard` (analytics scans, leads, multi-profils).
- Mockups produits via Gemini Nano Banana (remplacer Unsplash).

### P1
- Phase 6 : Dashboard admin `/admin` (commandes, statut, export config, MRR).
- Profil web NFC public : URL `kallitag.fr/{slug}` rendant la vCard.
- Reset profil via code admin (edge case carte revendue).
- Refund auto + email d'alerte si config perdue post-paiement (edge case tranché).

### P2
- Codes promo Stripe.
- Sous-domaines perso `prenom.kallitag.fr` (Pro).
- Webhook CRM (Pro).
- Multilingue (reporté selon problem statement).

## Test credentials
Voir `/app/memory/test_credentials.md`. Aucune auth en MVP. Carte test Stripe : `4242 4242 4242 4242`.
