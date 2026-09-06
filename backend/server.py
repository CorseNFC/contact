"""KalliTag backend — landing + configurator + Stripe checkout + Resend emails."""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File, Header, Response
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import os
import io
import logging
import uuid
import secrets
import stripe
import httpx
import jwt
import qrcode
import requests
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
import ipaddress
import re
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- Mongo ---
mongo_url = os.environ["MONGO_URL"]
mongo_client = MongoClient(mongo_url)
db = mongo_client[os.environ["DB_NAME"]]
orders_col = db["orders"]
payment_transactions = db["payment_transactions"]
magic_tokens_col = db["magic_tokens"]
scans_col = db["profile_scans"]
subscriptions_col = db["subscriptions"]
leads_col = db["leads"]

# --- Stripe ---
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")

# --- Email ---
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "KalliTag")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "sandrosantinacci7@gmail.com")

# --- Auth / session ---
SESSION_SECRET = os.environ.get("SESSION_SECRET", "")
SESSION_ALGO = "HS256"
MAGIC_LINK_TTL = timedelta(minutes=20)
SESSION_TTL = timedelta(days=30)

# --- Object storage (Emergent) ---
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = os.environ.get("APP_NAME", "kallitag")
_storage_key: Optional[str] = None

app = FastAPI(title="KalliTag API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("kallitag")

# ---------- Product catalog (source of truth for prices via Stripe lookup_key) ----------
PRODUCT_CATALOG = {
    "card_prestige": {
        "id": "card_prestige",
        "kind": "profile",
        "name": "Carte NFC Prestige",
        "tagline": "Votre page profil pro à vie sur une carte métal",
        "description": "Notre carte signature. Métal brossé, 3 finitions (Noir mat, Métal, Or brossé). Personnalisez votre page profil web à volonté.",
        "price_cents": 3990,
        "currency": "eur",
        "lookup_key": "card_prestige_onetime",
        "image": "/products/prestige.png",
        "features": ["Métal massif 30g", "3 finitions premium", "Profil web à vie", "Livré sous 5 jours"],
    },
    "plaque_nfc": {
        "id": "plaque_nfc",
        "kind": "reviews",
        "name": "Plaque Avis Google",
        "tagline": "Récoltez des avis Google en un tap",
        "description": "Plaque NFC à coller au comptoir. Le client tape, votre page d'avis Google s'ouvre. Vous choisissez seulement l'URL cible.",
        "price_cents": 1990,
        "currency": "eur",
        "lookup_key": "plaque_nfc_onetime",
        "image": "/products/plaque.png",
        "features": ["Format 35mm", "Adhésif 3M longue durée", "Résiste à l'eau", "Boost avis Google"],
    },
    "medaillon_nfc": {
        "id": "medaillon_nfc",
        "kind": "pet",
        "name": "Médaillon Animal",
        "tagline": "La médaille NFC qui ramène votre animal à la maison",
        "description": "Médaillon élégant pour chien ou chat. Si votre animal est perdu, celui qui le trouve tape le médaillon et accède à ses infos + votre contact.",
        "price_cents": 1490,
        "currency": "eur",
        "lookup_key": "medaillon_nfc_onetime",
        "image": "/products/medaillon.png",
        "features": ["Métal massif 30mm", "Anneau titane", "Infos animal + contact", "Gravé sans usure"],
    },
}

# Finitions physiques de la carte (aucune inscription — juste la texture + logo KalliTag discret).
# La personnalisation se fait sur la page web profil, pas sur la carte.
FINISHES = [
    {"id": "noir_mat", "name": "Noir Mat", "desc": "Toucher soft-touch, sobre et absolu.", "swatch": "#0A0A0A"},
    {"id": "metal_brosse", "name": "Métal Brossé", "desc": "Aluminium anodisé argenté, brossé fin.", "swatch": "#C0C6CC"},
    {"id": "or_brosse", "name": "Or Brossé", "desc": "Or champagne brossé, chaleureux et discret.", "swatch": "#D4AF37"},
]

# Thèmes visuels de la page profil web (le vrai produit personnalisable)
PROFILE_THEMES = [
    {"id": "onyx", "name": "Onyx", "bg": "#0B0F17", "accent": "#D4AF37", "text": "#F8FAFC"},
    {"id": "ivory", "name": "Ivoire", "bg": "#F7F3EC", "accent": "#0B0F17", "text": "#0B0F17"},
    {"id": "midnight", "name": "Midnight", "bg": "#0F172A", "accent": "#10B981", "text": "#F8FAFC"},
    {"id": "rose", "name": "Rose Nude", "bg": "#F5E6DE", "accent": "#8B3A2E", "text": "#2A1810"},
]


# ---------- Models ----------
class ProfileConfig(BaseModel):
    theme_id: str = "onyx"
    finish_id: str = "noir_mat"
    # Profile card fields
    first_name: str = ""
    last_name: str = ""
    job_title: Optional[str] = ""
    company: Optional[str] = ""
    tagline: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = ""
    logo_url: Optional[str] = ""
    links: Dict[str, str] = Field(default_factory=dict)
    # Google reviews plaque fields
    business_name: Optional[str] = ""
    reviews_url: Optional[str] = ""
    reviews_message: Optional[str] = ""
    # Pet medallion fields
    pet_name: Optional[str] = ""
    pet_species: Optional[str] = ""  # "chien" | "chat" | "autre"
    pet_breed: Optional[str] = ""
    pet_birthdate: Optional[str] = ""
    pet_sex: Optional[str] = ""
    chip_number: Optional[str] = ""
    owner_name: Optional[str] = ""
    owner_phone: Optional[str] = ""
    owner_email: Optional[EmailStr] = None
    vet_contact: Optional[str] = ""
    medical_notes: Optional[str] = ""
    lost_message: Optional[str] = ""

    @field_validator("email", "owner_email", mode="before")
    @classmethod
    def _empty_email_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v


class ShippingAddress(BaseModel):
    full_name: str
    line1: str
    line2: Optional[str] = ""
    city: str
    postal_code: str
    country: str = "FR"


class CheckoutRequest(BaseModel):
    product_id: Literal["card_prestige", "plaque_nfc", "medaillon_nfc"]
    quantity: int = Field(1, ge=1, le=10)
    profile: ProfileConfig
    shipping: ShippingAddress
    contact_email: EmailStr
    origin_url: str


def _slugify(s: str) -> str:
    import re, unicodedata
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or "profil"


# ---------- Auth helpers ----------
def make_session_token(email: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": email.lower(), "iat": int(now.timestamp()), "exp": int((now + SESSION_TTL).timestamp())},
        SESSION_SECRET, algorithm=SESSION_ALGO,
    )


def decode_session_token(token: str) -> Optional[str]:
    try:
        data = jwt.decode(token, SESSION_SECRET, algorithms=[SESSION_ALGO])
        return data.get("sub")
    except jwt.PyJWTError:
        return None


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Non authentifié")
    token = authorization.split(" ", 1)[1].strip()
    email = decode_session_token(token)
    if not email:
        raise HTTPException(401, "Session expirée")
    return {"email": email}


# ---------- Object storage helpers ----------
def init_storage(force: bool = False) -> Optional[str]:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    if not EMERGENT_LLM_KEY:
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialized")
        return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None


def storage_put(path: str, data: bytes, content_type: str) -> Dict[str, Any]:
    key = init_storage()
    if not key:
        raise HTTPException(503, "Stockage indisponible")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:  # key may be stale
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def storage_get(path: str) -> tuple:
    key = init_storage()
    if not key:
        raise HTTPException(503, "Stockage indisponible")
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        raise HTTPException(404, "Fichier introuvable")
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "KalliTag API", "status": "ok"}


@api_router.get("/products")
async def get_products():
    # Only Carte NFC Prestige is publicly available now — legacy kinds hidden
    active_products = [p for p in PRODUCT_CATALOG.values() if p.get("id") == "card_prestige"]
    return {"products": active_products, "finishes": FINISHES, "themes": PROFILE_THEMES}


@api_router.get("/profile/{slug}")
async def get_public_profile(slug: str):
    order = orders_col.find_one({"profile_slug": slug, "payment_status": "paid"}, {"_id": 0})
    if not order:
        # Preview mode: also allow drafts to be seen (dev-friendly), but not in prod ideally
        order = orders_col.find_one({"profile_slug": slug}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Profil introuvable")
    product = PRODUCT_CATALOG.get(order.get("product_id"), {})
    return {"slug": slug, "profile": order.get("profile", {}),
            "product_name": order.get("product_name"), "product_id": order.get("product_id"),
            "product_kind": product.get("kind", "profile")}


@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    if product_id not in PRODUCT_CATALOG:
        raise HTTPException(404, "Produit introuvable")
    return PRODUCT_CATALOG[product_id]


@api_router.post("/checkout")
async def create_checkout(req: CheckoutRequest):
    """Create Stripe Checkout Session for a single product + save order draft."""
    product = PRODUCT_CATALOG.get(req.product_id)
    if not product:
        raise HTTPException(404, "Produit introuvable")

    prices = stripe.Price.list(lookup_keys=[product["lookup_key"]], active=True, limit=1).data
    if not prices:
        raise HTTPException(500, f"Prix Stripe manquant pour {product['lookup_key']}")
    price = prices[0]

    order_id = str(uuid.uuid4())
    base_slug = _slugify(f"{req.profile.first_name}-{req.profile.last_name}")
    slug = f"{base_slug}-{order_id[:6]}"
    order_doc = {
        "order_id": order_id,
        "profile_slug": slug,
        "product_id": req.product_id,
        "product_name": product["name"],
        "quantity": req.quantity,
        "amount_cents": price.unit_amount * req.quantity,
        "currency": price.currency,
        "profile": req.profile.model_dump(),
        "shipping": req.shipping.model_dump(),
        "contact_email": req.contact_email,
        "status": "draft",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    orders_col.insert_one(dict(order_doc))

    kwargs = dict(
        line_items=[{"price": price.id, "quantity": req.quantity}],
        mode="payment",
        success_url=f"{req.origin_url}/paiement/succes?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{req.origin_url}/paiement/annule",
        customer_email=req.contact_email,
        metadata={"order_id": order_id, "product_id": req.product_id},
        shipping_address_collection={"allowed_countries": ["FR", "BE", "LU", "CH", "MC"]},
    )
    # Physical goods in FR → OCS + Stripe Tax (calc_only). If Stripe Tax isn't
    # enabled on the sandbox, fall back to DIY so checkout still works.
    try:
        session = stripe.checkout.Session.create(**kwargs, automatic_tax={"enabled": True},
                                                  billing_address_collection="required")
    except stripe.error.InvalidRequestError:
        session = stripe.checkout.Session.create(**kwargs)

    payment_transactions.insert_one({
        "session_id": session.id,
        "order_id": order_id,
        "product_id": req.product_id,
        "amount": order_doc["amount_cents"],
        "currency": price.currency,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    orders_col.update_one({"order_id": order_id}, {"$set": {"session_id": session.id}})
    return {"checkout_url": session.url, "session_id": session.id, "order_id": order_id}


@api_router.get("/payments/status/{session_id}")
async def get_status(session_id: str):
    record = payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Transaction introuvable")
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid",
                              "stripe_payment_intent_id": s.payment_intent,
                              "updated_at": datetime.now(timezone.utc).isoformat()}},
                )
                orders_col.update_one(
                    {"order_id": record.get("order_id"), "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "paid", "payment_status": "paid",
                              "updated_at": datetime.now(timezone.utc).isoformat()}},
                )
                await _on_paid(record.get("order_id"))
                record = payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except stripe.error.StripeError:
            pass
    order = orders_col.find_one({"order_id": record.get("order_id")}, {"_id": 0}) if record.get("order_id") else None
    return {"session_id": record["session_id"], "status": record["status"],
            "payment_status": record["payment_status"], "order": order}


@api_router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Signature invalide")
    obj, t = event["data"]["object"], event["type"]
    if t == "checkout.session.completed":
        result = payment_transactions.update_one(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "completed", "payment_status": obj.get("payment_status", "paid"),
                      "stripe_payment_intent_id": obj.get("payment_intent"),
                      "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        pt = payment_transactions.find_one({"session_id": obj["id"]})
        if pt and pt.get("order_id"):
            orders_col.update_one(
                {"order_id": pt["order_id"], "payment_status": {"$ne": "paid"}},
                {"$set": {"status": "paid", "payment_status": "paid",
                          "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            if result.modified_count:  # only send once
                await _on_paid(pt["order_id"])
    elif t == "checkout.session.async_payment_failed":
        payment_transactions.update_one({"session_id": obj["id"]},
            {"$set": {"status": "failed", "payment_status": "failed",
                      "updated_at": datetime.now(timezone.utc).isoformat()}})
    elif t == "checkout.session.expired":
        payment_transactions.update_one({"session_id": obj["id"]},
            {"$set": {"status": "expired", "payment_status": "expired",
                      "updated_at": datetime.now(timezone.utc).isoformat()}})
    elif t == "customer.subscription.created" or t == "customer.subscription.updated":
        cust_email = (obj.get("metadata") or {}).get("email") or ""
        if not cust_email:
            try:
                c = stripe.Customer.retrieve(obj["customer"])
                cust_email = (c.get("email") or "").lower()
            except stripe.error.StripeError:
                cust_email = ""
        subscriptions_col.update_one(
            {"stripe_subscription_id": obj["id"]},
            {"$set": {
                "stripe_subscription_id": obj["id"],
                "stripe_customer_id": obj.get("customer"),
                "email": (cust_email or "").lower(),
                "status": obj.get("status"),
                "current_period_end": obj.get("current_period_end"),
                "cancel_at_period_end": obj.get("cancel_at_period_end", False),
                "price_lookup_key": ((obj.get("items", {}).get("data") or [{}])[0].get("price", {}) or {}).get("lookup_key"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
    elif t == "customer.subscription.deleted":
        subscriptions_col.update_one(
            {"stripe_subscription_id": obj["id"]},
            {"$set": {"status": "canceled", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
    return {"status": "ok"}


# --------- Email sending (Resend via Emergent proxy) ---------
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> Optional[str]:
    if not EMAIL_KEY:
        logger.warning("EMERGENT_EMAIL_KEY missing — email skipped")
        return None
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                     headers={"X-Email-Key": EMAIL_KEY}, json=payload)
        resp.raise_for_status()
        return resp.json().get("id")
    except Exception as e:
        logger.error(f"email send failed: {e}")
        return None


async def _on_paid(order_id: str):
    if not order_id:
        return
    order = orders_col.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        return
    if order.get("email_sent"):
        return
    profile = order.get("profile", {})
    name = f"{profile.get('first_name','')} {profile.get('last_name','')}".strip() or "cher client"
    amount = f"{order['amount_cents']/100:.2f} €"
    subject = f"Commande KalliTag confirmée — #{order_id[:8].upper()}"
    html = f"""<table role="presentation" width="100%" style="background:#0B0F17;padding:24px">
<tr><td style="max-width:560px;margin:0 auto;background:#131926;border-radius:16px;padding:32px;font-family:Arial,sans-serif;color:#F8FAFC">
<h1 style="color:#D4AF37;margin:0 0 8px;font-size:24px">Merci {escape(name)} !</h1>
<p style="color:#94A3B8;margin:0 0 20px">Votre commande KalliTag est confirmée. Nous préparons votre {escape(order.get('product_name',''))} personnalisé et vous l'expédions sous 5 jours ouvrés.</p>
<div style="background:#0B0F17;border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:20px;margin:20px 0">
<p style="margin:0 0 6px;color:#94A3B8;font-size:12px;text-transform:uppercase;letter-spacing:0.15em">Récapitulatif</p>
<p style="margin:0;color:#F8FAFC;font-size:16px"><strong>{escape(order.get('product_name',''))}</strong> × {order.get('quantity',1)}</p>
<p style="margin:8px 0 0;color:#D4AF37;font-size:20px;font-weight:bold">{amount}</p>
<p style="margin:12px 0 0;color:#64748B;font-size:12px">Commande #{order_id[:8].upper()}</p>
</div>
<p style="color:#94A3B8;font-size:14px;margin:0">Un email de suivi de livraison vous sera envoyé dès l'expédition.</p>
<p style="color:#64748B;font-size:12px;margin:24px 0 0;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px">Envoyé par {escape(EMAIL_FROM_NAME)}. Nous ne demandons jamais votre mot de passe ni vos coordonnées bancaires par email.</p>
</td></tr></table>"""
    email_id = await send_email(to=order["contact_email"], subject=subject, html=html)

    # admin notif
    admin_html = f"""<table role="presentation" width="100%" style="padding:24px;font-family:Arial,sans-serif">
<tr><td>
<h2>Nouvelle commande #{order_id[:8].upper()}</h2>
<p>Produit : {escape(order.get('product_name',''))} × {order.get('quantity',1)} — <strong>{amount}</strong></p>
<p>Client : {escape(name)} — {escape(order.get('contact_email',''))}</p>
<p>Livraison : {escape(order.get('shipping',{}).get('line1',''))}, {escape(order.get('shipping',{}).get('postal_code',''))} {escape(order.get('shipping',{}).get('city',''))}</p>
<p>Finition : {escape(profile.get('finish_id',''))} · Thème profil : {escape(profile.get('theme_id',''))}</p>
<p style="color:#64748B;font-size:12px">Notification admin — {escape(EMAIL_FROM_NAME)}</p>
</td></tr></table>"""
    await send_email(to=ADMIN_EMAIL, subject=f"[ADMIN] Commande #{order_id[:8].upper()}", html=admin_html)

    orders_col.update_one({"order_id": order_id}, {"$set": {"email_sent": True, "email_id": email_id}})


# ---------- Auth (magic link) ----------
class MagicLinkRequest(BaseModel):
    email: EmailStr
    origin_url: str


@api_router.post("/auth/request-link")
async def request_magic_link(req: MagicLinkRequest):
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    magic_tokens_col.insert_one({
        "token": token,
        "email": req.email.lower(),
        "used": False,
        "expires_at": (now + MAGIC_LINK_TTL).isoformat(),
        "created_at": now.isoformat(),
    })
    origin = req.origin_url.rstrip("/")
    if not origin.startswith("https://"):
        raise HTTPException(400, "origin_url must be https")
    link = f"{origin}/auth/callback?token={token}"
    subject = f"Votre lien de connexion {EMAIL_FROM_NAME}"
    html = f"""<table role="presentation" width="100%" style="background:#0B0F17;padding:24px">
<tr><td style="max-width:520px;margin:0 auto;background:#131926;border-radius:16px;padding:32px;font-family:Arial,sans-serif;color:#F8FAFC">
<h1 style="color:#D4AF37;margin:0 0 8px;font-size:22px">Se connecter à votre espace</h1>
<p style="color:#94A3B8;margin:0 0 20px;font-size:14px">Cliquez sur le bouton ci-dessous pour accéder à votre profil KalliTag. Ce lien expire dans 20 minutes.</p>
<p style="margin:24px 0"><a href="{escape(link)}" style="display:inline-block;padding:14px 28px;background:#D4AF37;color:#0B0F17;text-decoration:none;border-radius:9999px;font-weight:bold">Ouvrir mon espace</a></p>
<p style="color:#64748B;font-size:12px;margin:24px 0 0;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Envoyé par {escape(EMAIL_FROM_NAME)}. Nous ne demandons jamais votre mot de passe.</p>
</td></tr></table>"""
    email_id = await send_email(to=req.email, subject=subject, html=html)
    return {"status": "sent", "email_id": email_id}


@api_router.get("/auth/verify")
async def verify_magic_link(token: str):
    doc = magic_tokens_col.find_one({"token": token, "used": False})
    if not doc:
        raise HTTPException(400, "Lien invalide ou déjà utilisé")
    if datetime.fromisoformat(doc["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(400, "Lien expiré")
    magic_tokens_col.update_one({"token": token}, {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}})
    session = make_session_token(doc["email"])
    return {"session_token": session, "email": doc["email"]}


@api_router.get("/me")
async def get_me(user=Depends(get_current_user)):
    email = user["email"]
    orders = list(orders_col.find(
        {"contact_email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
        {"_id": 0},
    ).sort("created_at", -1))
    return {"email": email, "orders": orders}


class ProfileUpdate(BaseModel):
    profile: ProfileConfig


@api_router.patch("/me/profile/{slug}")
async def update_my_profile(slug: str, body: ProfileUpdate, user=Depends(get_current_user)):
    order = orders_col.find_one({"profile_slug": slug}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Profil introuvable")
    if (order.get("contact_email") or "").lower() != user["email"].lower():
        raise HTTPException(403, "Ce profil ne vous appartient pas")
    orders_col.update_one(
        {"profile_slug": slug},
        {"$set": {"profile": body.profile.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"status": "ok"}


# ---------- Avatar upload ----------
@api_router.post("/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), user=Depends(get_current_user)):
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(400, "Format non supporté (JPEG, PNG ou WebP uniquement)")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Fichier trop volumineux (5 Mo max)")
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[file.content_type]
    safe_email = re.sub(r"[^a-z0-9]+", "-", user["email"].lower()).strip("-")
    path = f"{APP_NAME}/avatars/{safe_email}/{uuid.uuid4()}.{ext}"
    result = storage_put(path, data, file.content_type)
    return {"path": result["path"], "url": f"/api/files/{result['path']}", "size": result["size"]}


@api_router.post("/upload-avatar-guest")
async def upload_avatar_guest(file: UploadFile = File(...)):
    """Anonymous avatar upload for the pre-checkout configurator."""
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(400, "Format non supporté (JPEG, PNG ou WebP uniquement)")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Fichier trop volumineux (5 Mo max)")
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[file.content_type]
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    path = f"{APP_NAME}/guest/{day}/{uuid.uuid4()}.{ext}"
    result = storage_put(path, data, file.content_type)
    return {"path": result["path"], "url": f"/api/files/{result['path']}", "size": result["size"]}


@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    if not path.startswith(f"{APP_NAME}/"):
        raise HTTPException(400, "Chemin invalide")
    data, ct = storage_get(path)
    return Response(content=data, media_type=ct)


# ---------- QR code ----------
@api_router.get("/profile/{slug}/qr.png")
async def profile_qr(slug: str, request: Request):
    order = orders_col.find_one({"profile_slug": slug}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Profil introuvable")
    origin = request.headers.get("origin") or request.headers.get("referer") or str(request.base_url)
    origin = origin.rstrip("/")
    if origin.endswith("/api"):
        origin = origin[:-4]
    url = f"{origin}/p/{slug}"
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=2)
    qr.add_data(url); qr.make(fit=True)
    img = qr.make_image(fill_color="#0B0F17", back_color="#FFFFFF")
    buf = io.BytesIO(); img.save(buf, format="PNG"); buf.seek(0)
    return StreamingResponse(
        buf, media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="kallitag-{slug}.png"'},
    )


# ---------- Scan analytics ----------
class ScanEvent(BaseModel):
    referrer: Optional[str] = ""
    user_agent: Optional[str] = ""


@api_router.post("/profile/{slug}/scan")
async def track_scan(slug: str, evt: ScanEvent, request: Request):
    order = orders_col.find_one({"profile_slug": slug}, {"_id": 0, "profile_slug": 1, "contact_email": 1})
    if not order:
        return {"status": "noop"}
    fwd = request.headers.get("x-forwarded-for", "")
    ip = (fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")) or ""
    scans_col.insert_one({
        "profile_slug": slug,
        "owner_email": (order.get("contact_email") or "").lower(),
        "ts": datetime.now(timezone.utc).isoformat(),
        "hour": datetime.now(timezone.utc).hour,
        "referrer": (evt.referrer or "")[:200],
        "user_agent": (evt.user_agent or "")[:200],
        "ip": ip,
    })
    return {"status": "ok"}


# ---------- Pro subscriptions ----------
def user_is_pro(email: str) -> bool:
    sub = subscriptions_col.find_one({"email": (email or "").lower(), "status": {"$in": ["active", "trialing", "past_due"]}}, {"_id": 0})
    return bool(sub)


class ProCheckoutRequest(BaseModel):
    plan: Literal["monthly", "yearly"]
    origin_url: str


@api_router.post("/pro/checkout")
async def pro_checkout(req: ProCheckoutRequest, user=Depends(get_current_user)):
    lookup_key = "kallitag_pro_monthly" if req.plan == "monthly" else "kallitag_pro_yearly"
    prices = stripe.Price.list(lookup_keys=[lookup_key], active=True, limit=1).data
    if not prices:
        raise HTTPException(500, f"Prix Stripe manquant: {lookup_key}")
    price = prices[0]
    session = stripe.checkout.Session.create(
        line_items=[{"price": price.id, "quantity": 1}],
        mode="subscription",
        customer_email=user["email"],
        success_url=f"{req.origin_url.rstrip('/')}/mon-profil?pro=success",
        cancel_url=f"{req.origin_url.rstrip('/')}/tarifs?pro=cancel",
        metadata={"email": user["email"], "plan": req.plan},
        subscription_data={"metadata": {"email": user["email"], "plan": req.plan}},
    )
    return {"checkout_url": session.url, "session_id": session.id}


@api_router.get("/me/pro")
async def get_my_pro(user=Depends(get_current_user)):
    sub = subscriptions_col.find_one({"email": user["email"].lower()}, {"_id": 0}, sort=[("updated_at", -1)])
    active = user_is_pro(user["email"])
    return {"active": active, "subscription": sub}


class PortalRequest(BaseModel):
    return_url: str


@api_router.post("/pro/portal")
async def pro_portal(req: PortalRequest, user=Depends(get_current_user)):
    sub = subscriptions_col.find_one({"email": user["email"].lower()}, {"_id": 0}, sort=[("updated_at", -1)])
    if not sub or not sub.get("stripe_customer_id"):
        raise HTTPException(404, "Aucun abonnement trouvé")
    portal = stripe.billing_portal.Session.create(
        customer=sub["stripe_customer_id"],
        return_url=req.return_url,
    )
    return {"url": portal.url}


# ---------- Card release / reclaim ----------
def _gen_code(n: int = 8) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # human-friendly (no O/0/I/1)
    return "".join(secrets.choice(alphabet) for _ in range(n))


@api_router.post("/me/orders/{slug}/release")
async def release_card(slug: str, user=Depends(get_current_user)):
    order = orders_col.find_one({"profile_slug": slug}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Commande introuvable")
    if (order.get("contact_email") or "").lower() != user["email"].lower():
        raise HTTPException(403, "Non autorisé")
    code = _gen_code(8)
    orders_col.update_one(
        {"profile_slug": slug},
        {"$set": {
            "transfer_code": code,
            "transfer_code_created_at": datetime.now(timezone.utc).isoformat(),
            "previous_owner_email": order.get("contact_email"),
            "contact_email": "",
            "status": "unclaimed",
            "profile": {"theme_id": "onyx", "finish_id": order.get("profile", {}).get("finish_id", "noir_mat"),
                        "first_name": "", "last_name": "", "links": {}},
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"transfer_code": code}


class ReclaimRequest(BaseModel):
    code: str
    email: EmailStr


@api_router.post("/reclaim")
async def reclaim_card(req: ReclaimRequest):
    code = (req.code or "").strip().upper()
    if not code:
        raise HTTPException(400, "Code requis")
    order = orders_col.find_one({"transfer_code": code}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Code invalide ou déjà utilisé")
    orders_col.update_one(
        {"transfer_code": code},
        {"$set": {
            "contact_email": req.email.lower(),
            "status": "paid",  # transferred but paid (owner switch)
            "transfer_code": None,
            "transferred_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    session = make_session_token(req.email.lower())
    return {"session_token": session, "slug": order["profile_slug"]}


# ---------- Leads (lead capture on public profile) ----------
class LeadIn(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = ""
    message: Optional[str] = ""

    @field_validator("email", mode="before")
    @classmethod
    def _e2n(cls, v):
        return None if (v == "" or v is None) else v


@api_router.post("/profile/{slug}/lead")
async def create_lead(slug: str, lead: LeadIn):
    order = orders_col.find_one({"profile_slug": slug}, {"_id": 0, "contact_email": 1})
    if not order:
        raise HTTPException(404, "Profil introuvable")
    doc = {
        "id": str(uuid.uuid4()),
        "profile_slug": slug,
        "owner_email": (order.get("contact_email") or "").lower(),
        "name": lead.name[:120],
        "email": lead.email,
        "phone": (lead.phone or "")[:40],
        "message": (lead.message or "")[:2000],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    leads_col.insert_one(dict(doc))
    return {"status": "ok"}


@api_router.get("/me/leads/{slug}")
async def list_leads(slug: str, user=Depends(get_current_user)):
    order = orders_col.find_one({"profile_slug": slug}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Profil introuvable")
    if (order.get("contact_email") or "").lower() != user["email"].lower():
        raise HTTPException(403, "Non autorisé")
    total = leads_col.count_documents({"profile_slug": slug})
    is_pro = user_is_pro(user["email"])
    limit = 500 if is_pro else 3
    leads = list(leads_col.find({"profile_slug": slug}, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"total": total, "leads": leads, "is_pro": is_pro, "free_limit": 3}


@api_router.get("/me/leads/{slug}/export.csv")
async def export_leads_csv(slug: str, user=Depends(get_current_user)):
    order = orders_col.find_one({"profile_slug": slug}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Profil introuvable")
    if (order.get("contact_email") or "").lower() != user["email"].lower():
        raise HTTPException(403, "Non autorisé")
    if not user_is_pro(user["email"]):
        raise HTTPException(402, "Export CSV réservé à KalliTag Pro")
    leads = list(leads_col.find({"profile_slug": slug}, {"_id": 0}).sort("created_at", -1))
    import csv as _csv
    buf = io.StringIO()
    w = _csv.writer(buf)
    w.writerow(["Date", "Nom", "Email", "Téléphone", "Message"])
    for l in leads:
        w.writerow([l.get("created_at", ""), l.get("name", ""), l.get("email") or "", l.get("phone", ""), l.get("message", "")])
    return Response(content=buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="leads-{slug}.csv"'})

# ---------- Multi-profils (Pro only) ----------
class ProfileVariantIn(BaseModel):
    label: str
    profile: ProfileConfig


def _find_owned_order(slug: str, email: str) -> Dict[str, Any]:
    order = orders_col.find_one({"profile_slug": slug}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Profil introuvable")
    if (order.get("contact_email") or "").lower() != email.lower():
        raise HTTPException(403, "Non autorisé")
    return order


@api_router.get("/me/orders/{slug}/variants")
async def list_variants(slug: str, user=Depends(get_current_user)):
    order = _find_owned_order(slug, user["email"])
    return {"variants": order.get("profile_variants") or [], "is_pro": user_is_pro(user["email"])}


@api_router.post("/me/orders/{slug}/variants")
async def add_variant(slug: str, v: ProfileVariantIn, user=Depends(get_current_user)):
    order = _find_owned_order(slug, user["email"])
    if not user_is_pro(user["email"]):
        raise HTTPException(402, "Multi-profils réservé à KalliTag Pro")
    variants = order.get("profile_variants") or []
    if len(variants) >= 5:
        raise HTTPException(400, "Maximum 5 profils par carte")
    vid = str(uuid.uuid4())[:8]
    variants.append({"id": vid, "label": v.label[:40] or "Sans nom", "profile": v.profile.model_dump()})
    orders_col.update_one({"profile_slug": slug}, {"$set": {"profile_variants": variants,
        "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"id": vid, "variants": variants}


@api_router.delete("/me/orders/{slug}/variants/{vid}")
async def delete_variant(slug: str, vid: str, user=Depends(get_current_user)):
    order = _find_owned_order(slug, user["email"])
    variants = [x for x in (order.get("profile_variants") or []) if x.get("id") != vid]
    orders_col.update_one({"profile_slug": slug}, {"$set": {"profile_variants": variants,
        "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"variants": variants}


@api_router.post("/me/orders/{slug}/activate/{vid}")
async def activate_variant(slug: str, vid: str, user=Depends(get_current_user)):
    order = _find_owned_order(slug, user["email"])
    if not user_is_pro(user["email"]):
        raise HTTPException(402, "Multi-profils réservé à KalliTag Pro")
    variants = order.get("profile_variants") or []
    v = next((x for x in variants if x.get("id") == vid), None)
    if not v:
        raise HTTPException(404, "Variante introuvable")
    orders_col.update_one({"profile_slug": slug}, {"$set": {"profile": v["profile"],
        "active_variant_id": vid, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"status": "ok", "profile": v["profile"], "active_variant_id": vid}



@api_router.get("/me/analytics/{slug}")
async def get_analytics(slug: str, user=Depends(get_current_user)):
    order = orders_col.find_one({"profile_slug": slug}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Profil introuvable")
    if (order.get("contact_email") or "").lower() != user["email"].lower():
        raise HTTPException(403, "Non autorisé")
    cur = scans_col.find({"profile_slug": slug}, {"_id": 0}).sort("ts", -1).limit(500)
    scans = list(cur)
    total = scans_col.count_documents({"profile_slug": slug})
    now = datetime.now(timezone.utc)
    last_7 = scans_col.count_documents({
        "profile_slug": slug,
        "ts": {"$gte": (now - timedelta(days=7)).isoformat()},
    })
    by_hour = [0] * 24
    for s in scans:
        try:
            by_hour[int(s.get("hour", 0))] += 1
        except Exception:
            pass
    return {"total": total, "last_7_days": last_7, "by_hour": by_hour, "recent": scans[:50]}



app.include_router(api_router)


@app.on_event("startup")
async def _init_on_startup():
    init_storage()


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client.close()
