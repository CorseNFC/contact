# KalliTag — NFC Business Cards Platform

React 19 + FastAPI + MongoDB e-commerce with Stripe payments, magic-link auth, dashboard, QR codes and analytics.

## Structure

```
/frontend       # React 19 (CRA + Craco + Tailwind + shadcn/ui)
/backend        # FastAPI + PyMongo + Stripe + Resend
/frontend/public/products/*.png   # AI-generated product mockups (Gemini Nano Banana)
```

## Local development

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env    # fill Stripe / Resend / Mongo keys
uvicorn server:app --reload --port 8001

# Frontend
cd frontend
yarn install
yarn start
```

## Deploy to Vercel (frontend) + Railway (backend) + MongoDB Atlas

### 1. MongoDB Atlas
- Create free M0 cluster (europe region)
- Copy the SRV connection string

### 2. Backend on Railway
1. railway.app → New Project → Deploy from GitHub → this repo
2. Root directory: `backend`
3. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Environment variables:
   - `MONGO_URL` (from Atlas)
   - `DB_NAME=kallitag`
   - `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY` (create your own on resend.com, 3k free/month)
   - `SESSION_SECRET` (generate: `python3 -c "import secrets;print(secrets.token_urlsafe(48))"`)
   - `EMAIL_FROM_NAME=KalliTag`, `ADMIN_EMAIL=<your email>`
   - `APP_NAME=kallitag`
   - `CORS_ORIGINS=https://kallitag.fr,https://<your-vercel-preview>.vercel.app`
   - (optional) `EMERGENT_LLM_KEY` for Nano Banana — or drop AI image regeneration
5. Copy the Railway public URL (`kallitag-api.up.railway.app`).

### 3. Frontend on Vercel
1. vercel.com → New Project → Import repo
2. Root directory: `frontend`
3. Framework preset: Create React App
4. Environment variable: `REACT_APP_BACKEND_URL=https://<railway-url>`
5. Deploy.

### 4. Custom domain kallitag.fr
- Vercel → Project → Settings → Domains → add `kallitag.fr`
- At your registrar (OVH/Gandi/etc.): A record `@` → `76.76.21.21`
- Wait 5–15 min for HTTPS provisioning.

### 5. Stripe webhook
- Stripe Dashboard → Developers → Webhooks → Add endpoint
- URL: `https://<railway-url>/api/stripe/webhook`
- Events: `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copy the signing secret → set `STRIPE_WEBHOOK_SECRET` on Railway.

## Stripe products setup

```bash
cd backend && python setup_stripe.py
```

Idempotent — creates the Prestige card + Pro subscription (monthly + yearly) prices.
