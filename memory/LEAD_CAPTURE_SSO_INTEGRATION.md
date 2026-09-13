# Intégration SSO Lead Capture ↔ KalliTag (v2 — password auth)

Tout le code à coller dans le projet Emergent `lead-capture-pwa-3` pour brancher
l'auth **email + mot de passe KalliTag** + récupérer les leads captés sur les profils NFC.

> ⚠️ **Changement important vs v1** : on n'utilise plus le code OTP à 6 chiffres.
> L'utilisateur se connecte avec ses **identifiants KalliTag** (email + password créés sur kallitag.fr/inscription).

## 🔑 Étape 0 — Secret partagé
Depuis `/app/backend/.env` de kallitag :
```
KALLITAG_SHARED_SECRET=klt_lc_5b3e9a1c7d24f68b0e3a9c5d7f1b4e82
```
URL API KalliTag prod : `https://kallitag.fr`

---

## 📡 Endpoints exposés côté KalliTag (déjà en ligne)

Tous demandent le header `X-LeadCapture-Secret: <KALLITAG_SHARED_SECRET>`.

### 1. `POST /api/lead-capture/auth`  🔄 password
Body : `{ "email": "user@example.com", "password": "<mot de passe KalliTag>" }`

Réponse succès :
```json
{
  "ok": true,
  "lead_capture_active": true,
  "user": { "id": "...", "email": "...", "name": "...", "company": "...", "role": "MANAGER", "nfc_card_id": "..." }
}
```
Erreurs : `401 invalid_credentials`, `401 invalid_shared_secret`

L'endpoint accepte aussi les codes OTP (fallback backward-compat), mais tu peux ignorer.

### 2. `GET /api/lead-capture/leads?email=&limit=&since=`
Récupère TOUS les leads captés via les profils NFC de cet email.
Paramètres :
- `email` (obligatoire)
- `limit` (défaut 500, max 1000)
- `since` (ISO date, optionnel — pour polling incrémental)

---

## 🔧 Étape 1 — Backend Lead Capture

Ajoute dans `.env` :
```
KALLITAG_API_URL=https://kallitag.fr
KALLITAG_SHARED_SECRET=klt_lc_5b3e9a1c7d24f68b0e3a9c5d7f1b4e82
JWT_SECRET=<génère_un_secret_aléatoire_64+_caractères>
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


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def _sign_session(user: dict) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({
        "sub": user["email"], "user": user,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=JWT_TTL_DAYS)).timestamp()),
    }, JWT_SECRET, algorithm=JWT_ALGO)


@router.post("/login")
async def login(body: LoginIn):
    """Vérifie le password KalliTag et signe un JWT local."""
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{KALLITAG_API_URL}/api/lead-capture/auth",
                         headers={"X-LeadCapture-Secret": KALLITAG_SHARED_SECRET},
                         json={"email": body.email, "password": body.password})
    if r.status_code != 200:
        raise HTTPException(r.status_code, r.json().get("detail", "invalid_credentials"))
    data = r.json()
    if not data.get("lead_capture_active"):
        raise HTTPException(402, "subscription_required")
    return {"ok": True, "token": _sign_session(data["user"]), "user": data["user"]}
```

Crée `backend/deps.py` :
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

Crée `backend/routes/leads.py` :
```python
import os, httpx
from fastapi import APIRouter, Depends, HTTPException
from deps import current_user

router = APIRouter(prefix="/api", tags=["leads"])

KALLITAG_API_URL = os.environ["KALLITAG_API_URL"].rstrip("/")
KALLITAG_SHARED_SECRET = os.environ["KALLITAG_SHARED_SECRET"]


@router.get("/leads")
async def list_leads(since: str = "", limit: int = 500, user=Depends(current_user)):
    params = {"email": user["email"], "limit": limit}
    if since: params["since"] = since
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(f"{KALLITAG_API_URL}/api/lead-capture/leads",
                        params=params,
                        headers={"X-LeadCapture-Secret": KALLITAG_SHARED_SECRET})
    if r.status_code != 200:
        raise HTTPException(r.status_code, r.json().get("detail", "leads_fetch_failed"))
    return r.json()
```

Enregistre dans `server.py` :
```python
from routes.auth import router as auth_router
from routes.leads import router as leads_router
app.include_router(auth_router)
app.include_router(leads_router)
```

**Supprime** toute ancienne route register/OTP côté Lead Capture — plus besoin.

---

## 🎨 Étape 2 — Frontend Lead Capture

`frontend/src/pages/Login.jsx` :
```jsx
import { useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/login`, { email, password });
      localStorage.setItem("lc_token", data.token);
      localStorage.setItem("lc_user", JSON.stringify(data.user));
      window.location.href = "/";
    } catch (err) {
      const d = err.response?.data?.detail;
      if (d === "subscription_required") setError("Aucun abonnement Lead Capture actif. Souscrivez sur kallitag.fr/tarifs");
      else setError("Email ou mot de passe incorrect");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F17] text-white p-6">
      <div className="max-w-md w-full bg-[#131926] rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-2 text-[#D4AF37]">Connexion Lead Capture</h1>
        <p className="text-slate-400 text-sm mb-6">Utilisez vos identifiants KalliTag.</p>

        <form onSubmit={submit} className="space-y-4">
          <input
            data-testid="login-email"
            type="email" required autoFocus
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@entreprise.com"
            className="w-full px-4 py-3 rounded-lg bg-[#0B0F17] border border-slate-700 focus:border-[#D4AF37] outline-none"
          />
          <input
            data-testid="login-password"
            type="password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full px-4 py-3 rounded-lg bg-[#0B0F17] border border-slate-700 focus:border-[#D4AF37] outline-none"
          />
          <button
            data-testid="login-submit"
            type="submit" disabled={loading || !email || !password}
            className="w-full py-3 rounded-lg bg-[#D4AF37] text-[#0B0F17] font-semibold disabled:opacity-50"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Pas de compte ? <a href="https://kallitag.fr/inscription" className="text-[#D4AF37] hover:underline">Créez-en un sur kallitag.fr</a>
        </p>
        <p className="mt-2 text-center text-xs text-slate-500">
          Mot de passe oublié ? <a href="https://kallitag.fr/mot-de-passe-oublie" className="text-[#D4AF37] hover:underline">Réinitialiser</a>
        </p>

        {error && (
          <div data-testid="login-error" className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-900 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
```

Hook `frontend/src/hooks/useLeads.js` :
```jsx
import { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function useLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/leads`);
      setLeads(data.leads || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);
  return { leads, loading, refresh };
}
```

Interceptors axios (dans `App.jsx` ou `index.js`) :
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
- [ ] Coller `KALLITAG_SHARED_SECRET`, `KALLITAG_API_URL`, `JWT_SECRET` dans `.env` du projet Lead Capture
- [ ] Créer `routes/auth.py` + `routes/leads.py` + `deps.py`
- [ ] Enregistrer les routers dans `server.py`
- [ ] Protéger chaque route métier avec `Depends(current_user)`
- [ ] **Supprimer** l'ancienne page/route register + OTP
- [ ] Remplacer la page Login avec le composant ci-dessus
- [ ] Ajouter les interceptors axios
- [ ] Créer un compte test sur `https://kallitag.fr/inscription`, confirmer l'email, souscrire à un plan Lead Capture
- [ ] Tester le login sur l'app Lead Capture avec ces identifiants
