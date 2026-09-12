# Intégration SSO Lead Capture ↔ KalliTag

Ce document contient **tout le code à coller dans le projet Emergent `lead-capture-pwa-3`** pour remplacer l'auth email/password actuelle par l'auth par OTP KalliTag.

---

## 🔑 Étape 0 — Récupérer le secret partagé

Sur ce projet (kallitag), ouvre `/app/backend/.env` et copie la valeur de :

```
KALLITAG_SHARED_SECRET=...
```

Tu vas la coller dans le `.env` du projet Lead Capture à l'étape 2.

**URL API KalliTag (production)** : `https://kallitag.fr`
*(Ou l'URL de ton backend Railway si différente.)*

---

## 📡 Étape 1 — Comprendre les 2 endpoints exposés côté KalliTag

Les 2 endpoints suivants existent déjà sur kallitag.fr — **ne rien changer** dessus :

### 1. `POST /api/lead-capture/request-otp`
Envoie un code à 6 chiffres par email (Resend) via KalliTag.

**Headers :**
```
Content-Type: application/json
X-LeadCapture-Secret: <KALLITAG_SHARED_SECRET>
```

**Body :**
```json
{ "email": "user@example.com" }
```

**Réponse 200 :**
```json
{ "ok": true, "sent": true, "email_id": "...", "ttl_seconds": 600 }
```

**Erreurs :** 401 `invalid_shared_secret`, 500 `email_delivery_failed`

---

### 2. `POST /api/lead-capture/auth`
Vérifie le code et renvoie le statut d'abonnement + snapshot utilisateur.

**Headers :** idem ci-dessus.

**Body :**
```json
{ "email": "user@example.com", "password": "123456" }
```
> ⚠️ Le champ s'appelle `password` mais c'est bien **le code OTP à 6 chiffres**.

**Réponse 200 (abonné) :**
```json
{
  "ok": true,
  "lead_capture_active": true,
  "user": {
    "id": "uuid-...",
    "email": "user@example.com",
    "name": "Jean Dupont",
    "company": "Acme",
    "company_id": null,
    "role": "MANAGER",
    "nfc_card_id": "jean-dupont-abc123"
  }
}
```

**Réponse 200 (non abonné)** : idem mais `lead_capture_active: false` → l'app doit refuser l'accès et rediriger vers `https://kallitag.fr/tarifs`.

**Erreurs :** 401 `invalid_credentials`, 401 `too_many_attempts`, 401 `invalid_shared_secret`

---

## 🔧 Étape 2 — Backend Lead Capture : ajouter un proxy SSO

Dans le projet **lead-capture-pwa-3**, ajoute dans `.env` :

```
KALLITAG_API_URL=https://kallitag.fr
KALLITAG_SHARED_SECRET=<colle_le_secret_ici>
JWT_SECRET=<génère_un_secret_aléatoire_long>
```

Puis crée/mets à jour la route auth (exemple FastAPI — adapte au routeur existant) :

```python
# lead-capture-pwa-3/backend/routes/auth.py
import os
import httpx
import jwt
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
    payload = {
        "sub": user["email"],
        "user": user,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=JWT_TTL_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


@router.post("/request-otp")
async def request_otp(body: RequestOTPIn):
    """Demande à KalliTag d'envoyer un code OTP par email."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{KALLITAG_API_URL}/api/lead-capture/request-otp",
            headers={"X-LeadCapture-Secret": KALLITAG_SHARED_SECRET},
            json={"email": body.email},
        )
    if r.status_code != 200:
        raise HTTPException(r.status_code, r.json().get("detail", "otp_send_failed"))
    return {"ok": True, "ttl_seconds": r.json().get("ttl_seconds", 600)}


@router.post("/verify-otp")
async def verify_otp(body: VerifyOTPIn):
    """Vérifie le code auprès de KalliTag et signe un JWT local."""
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            f"{KALLITAG_API_URL}/api/lead-capture/auth",
            headers={"X-LeadCapture-Secret": KALLITAG_SHARED_SECRET},
            json={"email": body.email, "password": body.code.strip()},
        )
    if r.status_code != 200:
        raise HTTPException(r.status_code, r.json().get("detail", "invalid_credentials"))

    data = r.json()
    if not data.get("lead_capture_active"):
        # L'utilisateur existe mais n'a pas d'abonnement actif
        raise HTTPException(402, "subscription_required")

    token = _sign_session(data["user"])
    return {"ok": True, "token": token, "user": data["user"]}
```

**Middleware pour protéger les routes existantes** (à réutiliser sur tous les endpoints Lead Capture) :

```python
# lead-capture-pwa-3/backend/deps.py
import os, jwt
from fastapi import Header, HTTPException
from typing import Optional

JWT_SECRET = os.environ["JWT_SECRET"]

def current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "missing_token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "invalid_token")
    return payload["user"]
```

Puis sur chaque endpoint protégé :
```python
@router.get("/leads")
async def list_leads(user=Depends(current_user)):
    return leads_col.find({"owner_email": user["email"]})
```

**Supprimer** l'ancienne route `POST /api/auth/register` et `POST /api/auth/login` (email/password), on n'en a plus besoin.

---

## 🎨 Étape 3 — Frontend Lead Capture : nouvelle page de connexion

Remplace le formulaire email/password actuel par un flux à 2 étapes :

```jsx
// lead-capture-pwa-3/frontend/src/pages/Login.jsx
import { useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function Login() {
  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestCode = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await axios.post(`${API}/api/auth/request-otp`, { email });
      setStep("code");
    } catch (err) {
      setError("Impossible d'envoyer le code. Vérifiez votre email.");
    } finally { setLoading(false); }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/verify-otp`, { email, code });
      localStorage.setItem("lc_token", data.token);
      localStorage.setItem("lc_user", JSON.stringify(data.user));
      window.location.href = "/";
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail === "subscription_required") {
        setError("Aucun abonnement Lead Capture actif. Souscrivez sur kallitag.fr/tarifs");
      } else if (detail === "too_many_attempts") {
        setError("Trop de tentatives. Demandez un nouveau code.");
        setStep("email");
      } else {
        setError("Code invalide ou expiré.");
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F17] text-white p-6">
      <div className="max-w-md w-full bg-[#131926] rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-2 text-[#D4AF37]">Connexion Lead Capture</h1>
        <p className="text-slate-400 text-sm mb-6">
          Connectez-vous avec votre email KalliTag. Un code à 6 chiffres vous sera envoyé.
        </p>

        {step === "email" && (
          <form onSubmit={requestCode} className="space-y-4">
            <input
              data-testid="login-email-input"
              type="email" required autoFocus
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.com"
              className="w-full px-4 py-3 rounded-lg bg-[#0B0F17] border border-slate-700 focus:border-[#D4AF37] outline-none"
            />
            <button
              data-testid="login-send-code-btn"
              type="submit" disabled={loading || !email}
              className="w-full py-3 rounded-lg bg-[#D4AF37] text-[#0B0F17] font-semibold disabled:opacity-50"
            >
              {loading ? "Envoi..." : "Recevoir le code"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verifyCode} className="space-y-4">
            <p className="text-sm text-slate-400">Code envoyé à <b>{email}</b></p>
            <input
              data-testid="login-otp-input"
              type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full px-4 py-3 rounded-lg bg-[#0B0F17] border border-slate-700 focus:border-[#D4AF37] outline-none text-center text-2xl tracking-widest"
            />
            <button
              data-testid="login-verify-btn"
              type="submit" disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-lg bg-[#D4AF37] text-[#0B0F17] font-semibold disabled:opacity-50"
            >
              {loading ? "Vérification..." : "Se connecter"}
            </button>
            <button
              type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }}
              className="w-full text-sm text-slate-400 hover:text-white"
            >
              Changer d'email
            </button>
          </form>
        )}

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

**Axios interceptor pour attacher le token** (à ajouter dans `src/index.js` ou `App.jsx`) :

```js
import axios from "axios";
axios.interceptors.request.use((config) => {
  const t = localStorage.getItem("lc_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
axios.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401) {
      localStorage.clear();
      if (!location.pathname.startsWith("/login")) location.href = "/login";
    }
    return Promise.reject(e);
  }
);
```

---

## ✅ Étape 4 — Tests bout-en-bout

1. Sur ton admin kallitag, active un compte demo : bouton "Activer Lead Capture" ou via curl :
   ```bash
   curl -X POST https://kallitag.fr/api/admin/lead-capture/set-active \
     -H "Content-Type: application/json" -H "Cookie: session=<admin_cookie>" \
     -d '{"email":"demo@kallitag.fr","active":true}'
   ```
2. Sur l'app Lead Capture, saisis `demo@kallitag.fr` → tu reçois le code par email.
3. Saisis le code → tu es connecté, token JWT stocké.
4. Teste avec un email non-abonné → doit afficher "Aucun abonnement Lead Capture actif".

---

## 📋 Checklist

- [ ] Copier `KALLITAG_SHARED_SECRET` depuis kallitag `.env` vers Lead Capture `.env`
- [ ] Ajouter `KALLITAG_API_URL=https://kallitag.fr` dans Lead Capture `.env`
- [ ] Générer un `JWT_SECRET` aléatoire pour Lead Capture
- [ ] Créer `routes/auth.py` avec les 2 endpoints proxy
- [ ] Créer `deps.py` avec `current_user`
- [ ] Protéger toutes les routes métier avec `Depends(current_user)`
- [ ] Supprimer les anciennes routes register/login
- [ ] Remplacer la page Login frontend
- [ ] Ajouter les interceptors axios
- [ ] Tester avec un compte activé + un compte non activé
