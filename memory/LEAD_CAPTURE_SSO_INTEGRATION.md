# Intégration SSO Lead Capture ↔ KalliTag

Tout le code à coller dans le projet Emergent `lead-capture-pwa-3` pour brancher
l'auth OTP KalliTag + récupérer les leads capturés sur les profils NFC.

## 🔑 Étape 0 — Secret partagé
Dans `/app/backend/.env` de ce projet (kallitag) :
```
KALLITAG_SHARED_SECRET=klt_lc_5b3e9a1c7d24f68b0e3a9c5d7f1b4e82
```
URL API KalliTag prod : `https://kallitag.fr`

---

## 📡 Endpoints exposés côté KalliTag (déjà en ligne, ne rien changer)

Tous demandent le header `X-LeadCapture-Secret: <KALLITAG_SHARED_SECRET>`.

### 1. `POST /api/lead-capture/request-otp`
Body : `{ "email": "user@example.com" }`
Réponse : `{ "ok": true, "sent": true, "ttl_seconds": 600 }`

### 2. `POST /api/lead-capture/auth`
Body : `{ "email": "user@example.com", "password": "123456" }` *(password = OTP)*
Réponse succès :
```json
{
  "ok": true,
  "lead_capture_active": true,
  "user": { "id": "...", "email": "...", "name": "...", "company": "...", "role": "MANAGER", "nfc_card_id": "..." }
}
```

### 3. `GET /api/lead-capture/leads?email=<email>&limit=500&since=<iso>`  🆕
Récupère TOUS les leads captés via les profils NFC de cet email.
Réponse :
```json
{
  "ok": true,
  "email": "user@example.com",
  "count": 3,
  "leads": [
    { "id": "...", "profile_slug": "jean-abc123", "owner_email": "...",
      "name": "Visiteur X", "email": "visitor@ex.com", "phone": "+336...",
      "message": "Intéressé par vos services", "created_at": "2026-02-13T14:22:10+00:00" }
  ]
}
```
Paramètres :
- `email` (obligatoire)
- `limit` (défaut 500, max 1000)
- `since` (ISO date — optionnel, ne renvoie que les leads plus récents → **utile pour du polling incrémental**)

---

## 🔧 Étape 1 — Backend Lead Capture

Ajoute dans `.env` :
```
KALLITAG_API_URL=https://kallitag.fr
KALLITAG_SHARED_SECRET=klt_lc_5b3e9a1c7d24f68b0e3a9c5d7f1b4e82
JWT_SECRET=<génère_un_secret_aléatoire_long_de_64+_caractères>
```

Crée `backend/routes/auth.py` :
```python
import os, httpx, jwt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/auth", tags=["auth"])

KALLITAG_API_URL = os.environ["KALLITAG_API_URL"].rstrip("/")
KALLITAG_SHARED_SECRET = os.environ["KALLITAG_SHARED_SECRET"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
JWT_TTL_DAYS = 30


class RequestOTPIn(BaseModel):
    email: EmailStr


class VerifyOTPIn(BaseModel):
    email: EmailStr
    code: str


def _sign_session(user: dict) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": user["email"], "user": user,
               "iat": int(now.timestamp()),
               "exp": int((now + timedelta(days=JWT_TTL_DAYS)).timestamp())}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


@router.post("/request-otp")
async def request_otp(body: RequestOTPIn):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{KALLITAG_API_URL}/api/lead-capture/request-otp",
                         headers={"X-LeadCapture-Secret": KALLITAG_SHARED_SECRET},
                         json={"email": body.email})
    if r.status_code != 200:
        raise HTTPException(r.status_code, r.json().get("detail", "otp_send_failed"))
    return {"ok": True, "ttl_seconds": r.json().get("ttl_seconds", 600)}


@router.post("/verify-otp")
async def verify_otp(body: VerifyOTPIn):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{KALLITAG_API_URL}/api/lead-capture/auth",
                         headers={"X-LeadCapture-Secret": KALLITAG_SHARED_SECRET},
                         json={"email": body.email, "password": body.code.strip()})
    if r.status_code != 200:
        raise HTTPException(r.status_code, r.json().get("detail", "invalid_credentials"))
    data = r.json()
    if not data.get("lead_capture_active"):
        raise HTTPException(402, "subscription_required")
    return {"ok": True, "token": _sign_session(data["user"]), "user": data["user"]}
```

Crée `backend/deps.py` (middleware) :
```python
import os, jwt
from typing import Optional
from fastapi import Header, HTTPException

JWT_SECRET = os.environ["JWT_SECRET"]

def current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "missing_token")
    try:
        return jwt.decode(authorization.split(" ", 1)[1], JWT_SECRET,
                          algorithms=["HS256"])["user"]
    except jwt.PyJWTError:
        raise HTTPException(401, "invalid_token")
```

Crée `backend/routes/leads.py` (récupère les leads depuis KalliTag) :
```python
import os, httpx
from fastapi import APIRouter, Depends, HTTPException
from deps import current_user

router = APIRouter(prefix="/api", tags=["leads"])

KALLITAG_API_URL = os.environ["KALLITAG_API_URL"].rstrip("/")
KALLITAG_SHARED_SECRET = os.environ["KALLITAG_SHARED_SECRET"]


@router.get("/leads")
async def list_leads(since: str = "", limit: int = 500,
                     user=Depends(current_user)):
    """Proxy — fetch leads captured on KalliTag NFC profiles for this user."""
    params = {"email": user["email"], "limit": limit}
    if since:
        params["since"] = since
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(f"{KALLITAG_API_URL}/api/lead-capture/leads",
                        params=params,
                        headers={"X-LeadCapture-Secret": KALLITAG_SHARED_SECRET})
    if r.status_code != 200:
        raise HTTPException(r.status_code, r.json().get("detail", "leads_fetch_failed"))
    return r.json()
```

Enregistre les routers dans `server.py` :
```python
from routes.auth import router as auth_router
from routes.leads import router as leads_router
app.include_router(auth_router)
app.include_router(leads_router)
```

---

## 🎨 Étape 2 — Frontend Lead Capture

Page `frontend/src/pages/Login.jsx` (identique à la version précédente — je te la renvoie sur demande).

Nouveau hook `frontend/src/hooks/useLeads.js` :
```jsx
import { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function useLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await axios.get(`${API}/api/leads`);
      setLeads(data.leads || []);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);
  return { leads, loading, error, refresh };
}
```

Utilisation dans un composant :
```jsx
const { leads, loading, refresh } = useLeads();
// leads = [{ id, name, email, phone, message, profile_slug, created_at }, …]
```

Ajoute l'interceptor axios (une fois dans `App.jsx` ou `index.js`) :
```js
import axios from "axios";
axios.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("lc_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
axios.interceptors.response.use(r => r, (e) => {
  if (e.response?.status === 401) {
    localStorage.clear();
    if (!location.pathname.startsWith("/login")) location.href = "/login";
  }
  return Promise.reject(e);
});
```

---

## ✅ Checklist
- [ ] Copier `KALLITAG_SHARED_SECRET` + `KALLITAG_API_URL` + `JWT_SECRET` dans le `.env` du projet Lead Capture
- [ ] Créer `routes/auth.py` + `routes/leads.py` + `deps.py`
- [ ] Enregistrer les routers dans `server.py`
- [ ] Protéger les autres routes métier avec `Depends(current_user)`
- [ ] Remplacer la page Login + ajouter le hook `useLeads`
- [ ] Interceptors axios pour attacher le token
- [ ] Tester : activer un compte via l'admin kallitag (`/admin` → onglet Lead Capture → toggle), demander OTP, se connecter, voir les leads
