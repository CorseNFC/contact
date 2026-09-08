# KalliTag — Credentials de test

## Admin Dashboard (production Railway)
- **URL** : https://frontend-azure-three-67.vercel.app/admin
- **Token admin** : `JYm-5t_6kI1_rpyz3RJPUNOYDrmclaQg`
- **Email admin** : sandrosantinacci7@gmail.com
- **API admin login** : `POST /api/admin/login` body `{"token":"..."}`
- **API admin auth header** : `X-Admin-Token: ...`

## User (Magic Link)
- **Test email** : sandrosantinacci7@gmail.com (recevra le magic link)
- **Endpoint** : `POST /api/auth/request-link` body `{"email":"...","origin_url":"https://frontend-azure-three-67.vercel.app"}`
- Le lien magique expire après 20 minutes

## MongoDB Atlas
- **User** : `sandrosantinacci7_db_user`
- **Cluster** : `kallitag.ynpw6pz.mongodb.net`
- **DB** : `kallitag`
- ⚠️ Le password a été partagé en clair dans le chat le 08/02/2026 → à faire tourner
- Network Access : `0.0.0.0/0` (allow all)

## URLs de test
- **Frontend prod** : https://frontend-azure-three-67.vercel.app
- **Backend prod** : https://contact-production-3cd3.up.railway.app
- **Backend API root** : https://contact-production-3cd3.up.railway.app/api/
