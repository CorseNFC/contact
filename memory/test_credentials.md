# KalliTag — Credentials de test

## Admin Dashboard (production Railway)
- **URL** : https://frontend-azure-three-67.vercel.app/admin
- **Token admin** : `JYm-5t_6kI1_rpyz3RJPUNOYDrmclaQg`
- **Email admin (owner)** : sandrosantinacci7@gmail.com
- **API admin login** : `POST /api/admin/login` body `{"token":"..."}`
- **API admin auth header** : `X-Admin-Token: ...`

## Auth email + password (kallitag.fr) — Feb 2026
- **Register** : `POST /api/auth/register` body `{"email","password","name?"}` → `{session_token, has_password}`
- **Login** : `POST /api/auth/login` body `{"email","password"}` → `{session_token, has_password}`
- **Set password (via magic link)** : `POST /api/auth/set-password` body `{"token","password"}`
- **Change password** : `POST /api/auth/change-password` (Bearer) body `{"old_password","new_password"}`
- **Delete account** : `DELETE /api/auth/delete-account` (Bearer) body `{"password"}`
- **Brute force** : 5 failed attempts / 15 min lockout (identifier = `ip:email`)
- **Password rules** : 8 chars min, bcrypt hashed
- **Session token** : JWT HS256, 30 days TTL, header `Authorization: Bearer <token>`

## Magic link fallback (mot de passe oublié)
- **Request** : `POST /api/auth/request-link` body `{"email","origin_url"}`
- **Verify** : `GET /api/auth/verify?token=...` → returns `{session_token, has_password}` — if `has_password=false`, the frontend redirects to `/definir-mot-de-passe?token=...`

## Lead Capture SSO (server-to-server)
- **Header** : `X-LeadCapture-Secret: klt_lc_5b3e9a1c7d24f68b0e3a9c5d7f1b4e82`
- **Auth** : `POST /api/lead-capture/auth` body `{"email","password"}` (password = kallitag account password; OTP path kept as backward-compat fallback)
- **Fetch leads** : `GET /api/lead-capture/leads?email=&limit=&since=`
- **Request OTP** (legacy fallback) : `POST /api/lead-capture/request-otp` body `{"email"}`

## Frontend routes
- `/connexion` — login (password + magic-link fallback)
- `/inscription` — signup (email + password)
- `/definir-mot-de-passe?token=...` — set-password (after magic link for legacy users)
- `/mon-compte` — dashboard (change password · Stripe billing portal · view orders · delete account)
- `/auth/callback?token=...` — magic-link verify endpoint

## MongoDB Atlas
- **User** : `sandrosantinacci7_db_user`
- **Cluster** : `kallitag.ynpw6pz.mongodb.net`
- **DB** : `kallitag`
- ⚠️ Le password a été partagé en clair dans le chat le 08/02/2026 → à faire tourner
- Network Access : `0.0.0.0/0` (allow all)

## Collections notables
- `users` — `{id, email, role, name, password_hash, password_set_at, stripe_customer_id, lead_capture_active, lead_capture_active_at, subscription_plan}`
- `login_attempts` — `{identifier: "ip:email", attempts, locked_until}` (brute force)
- `magic_tokens` — magic link tokens (TTL 20min)
- `lead_capture_otp` — OTP fallback (TTL 10min)

## URLs de test
- **Frontend prod** : https://frontend-azure-three-67.vercel.app
- **Backend prod** : https://contact-production-3cd3.up.railway.app
- **Backend API root** : https://contact-production-3cd3.up.railway.app/api/
- **Preview backend** : https://stabilise-pro.preview.emergentagent.com
