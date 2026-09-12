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
users_col = db["users"]
lead_capture_otp_col = db["lead_capture_otp"]
nfc_claims_col = db["nfc_claims"]
# TTL index — OTP auto-purge after 20 min
try:
    lead_capture_otp_col.create_index("expires_at", expireAfterSeconds=0)
except Exception:
    pass
scans_col = db["profile_scans"]
subscriptions_col = db["subscriptions"]
leads_col = db["leads"]

# --- Stripe ---
# Support both STRIPE_API_KEY (per LC spec) and legacy STRIPE_SECRET_KEY
stripe.api_key = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
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
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
KALLITAG_SHARED_SECRET = os.environ.get("KALLITAG_SHARED_SECRET", "")
LEAD_CAPTURE_OTP_TTL = timedelta(minutes=10)

# --- Object storage (Emergent OR Cloudinary depending on env) ---
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = os.environ.get("APP_NAME", "kallitag")
_storage_key: Optional[str] = None

# Cloudinary (used when CLOUDINARY_* env vars are set — for external hosting)
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")
USE_CLOUDINARY = bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)
if USE_CLOUDINARY:
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(cloud_name=CLOUDINARY_CLOUD_NAME, api_key=CLOUDINARY_API_KEY,
                      api_secret=CLOUDINARY_API_SECRET, secure=True)

# Resend direct API (used when RESEND_API_KEY set — otherwise falls back to Emergent proxy)
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM = os.environ.get("RESEND_FROM", "KalliTag <onboarding@resend.dev>")

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

# ---------- Subscription catalog ----------
SUBSCRIPTION_PLANS = {
    "lead_capture": {
        "id": "lead_capture",
        "name": "Lead Capture",
        "tagline": "Le module qui transforme vos rencontres en clients",
        "price_monthly_cents": 1990,
        "price_yearly_cents": 19900,   # ≈ 2 mois offerts
        "lookup_key_monthly": "sub_lead_capture_monthly",
        "lookup_key_yearly":  "sub_lead_capture_yearly",
        "features": [
            "Capture illimitée de leads via NFC",
            "Dashboard temps réel",
            "Export CSV / synchro CRM",
            "Emails automatiques aux prospects",
            "1 utilisateur",
        ],
        "activates_lead_capture": True,
        "includes_nfc_card_qty": 0,
        "min_seats": 1,
        "max_seats": 1,
    },
    "all_in_one": {
        "id": "all_in_one",
        "name": "All-in-One",
        "tagline": "Logiciel Lead Capture + carte NFC Prestige offerte",
        "price_monthly_cents": 2990,
        "price_yearly_cents": 29900,
        "lookup_key_monthly": "sub_all_in_one_monthly",
        "lookup_key_yearly":  "sub_all_in_one_yearly",
        "features": [
            "Tout Lead Capture",
            "1 Carte NFC Prestige offerte (39,90 €)",
            "Profil web KalliTag illimité",
            "Statistiques avancées",
            "Support prioritaire",
        ],
        "activates_lead_capture": True,
        "includes_nfc_card_qty": 1,
        "min_seats": 1,
        "max_seats": 1,
        "badge": "PLUS POPULAIRE",
    },
    "team": {
        "id": "team",
        "name": "Équipe / Entreprise",
        "tagline": "Pour équipes commerciales (3 licences minimum)",
        "price_monthly_cents": 3990,   # par licence
        "price_yearly_cents": 39900,
        "lookup_key_monthly": "sub_team_monthly",
        "lookup_key_yearly":  "sub_team_yearly",
        "features": [
            "Tout All-in-One × N licences",
            "N cartes NFC Prestige offertes",
            "Dashboard multi-utilisateurs",
            "Rôles Manager / Commercial",
            "SSO KalliTag intégré",
            "Support dédié + onboarding",
        ],
        "activates_lead_capture": True,
        "includes_nfc_card_qty": 1,   # per seat
        "min_seats": 3,
        "max_seats": 50,
        "badge": "ENTREPRISE",
    },
}


def _resolve_lookup(plan_id: str, interval: str) -> tuple:
    plan = SUBSCRIPTION_PLANS.get(plan_id)
    if not plan:
        raise HTTPException(404, "Plan introuvable")
    if interval == "yearly":
        return plan, plan["lookup_key_yearly"], plan["price_yearly_cents"]
    return plan, plan["lookup_key_monthly"], plan["price_monthly_cents"]

# Finitions physiques de la carte (aucune inscription — juste la texture + logo KalliTag discret).
# La personnalisation se fait sur la page web profil, pas sur la carte.
FINISHES = [
    {"id": "noir_mat", "name": "Noir Mat", "desc": "Toucher soft-touch, sobre et absolu.", "swatch": "#0A0A0A"},
    {"id": "metal_brosse", "name": "Métal Brossé", "desc": "Aluminium anodisé argenté, brossé fin.", "swatch": "#C0C6CC"},
    {"id": "or_brosse", "name": "Or Brossé", "desc": "Or champagne brossé, chaleureux et discret.", "swatch": "#D4AF37"},
]

# Thèmes visuels de la page profil web (le vrai produit personnalisable)
PROFILE_THEMES = [
    {"id": "onyx",       "name": "Onyx",        "bg": "#0B0F17", "accent": "#D4AF37", "text": "#F8FAFC", "vibe": "sobre & or"},
    {"id": "ivory",      "name": "Ivoire",      "bg": "#F7F3EC", "accent": "#B8860B", "text": "#1F1B16", "vibe": "papeterie luxe"},
    {"id": "midnight",   "name": "Midnight",    "bg": "#0F172A", "accent": "#10B981", "text": "#F8FAFC", "vibe": "nuit émeraude"},
    {"id": "rose",       "name": "Rose Nude",   "bg": "#F5E6DE", "accent": "#8B3A2E", "text": "#2A1810", "vibe": "terracotta chaleureux"},
    {"id": "neon",       "name": "Neon",        "bg": "#0A0014", "accent": "#00F0FF", "text": "#F5F0FF", "vibe": "cyberpunk électrique"},
    {"id": "forest",     "name": "Forêt",       "bg": "#0B1F14", "accent": "#C9A66B", "text": "#F5EED8", "vibe": "bois précieux"},
    {"id": "champagne",  "name": "Champagne",   "bg": "#FFF8E7", "accent": "#8B6508", "text": "#3D2E00", "vibe": "célébration doré"},
    {"id": "monochrome", "name": "Mono",        "bg": "#FFFFFF", "accent": "#000000", "text": "#000000", "vibe": "brutaliste"},
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
    bio: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = ""
    hero_photo_url: Optional[str] = ""
    logo_url: Optional[str] = ""
    layout_id: Optional[str] = "hero"  # hero | classic | minimal
    accent_color: Optional[str] = ""
    text_colors: Dict[str, str] = Field(default_factory=dict)  # name, job, bio, cta, links
    gallery_urls: List[str] = Field(default_factory=list)      # up to 6 photos (Hero layout)
    section_order: List[str] = Field(default_factory=list)     # order of sections in Hero
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


# Bulk B2B pricing tiers (percentage discount by minimum quantity)
BULK_TIERS = [
    {"min": 50, "pct": 25, "label": "50+ cartes · −25%"},
    {"min": 20, "pct": 20, "label": "20+ cartes · −20%"},
    {"min": 10, "pct": 15, "label": "10+ cartes · −15%"},
    {"min": 5,  "pct": 10, "label": "5+ cartes · −10%"},
]


def bulk_discount_pct(qty: int) -> int:
    for t in BULK_TIERS:
        if qty >= t["min"]:
            return t["pct"]
    return 0


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
    # Cloudinary path (preferred outside Emergent)
    if USE_CLOUDINARY:
        # Use the object path as public_id under a folder to keep organization
        # path example: "kallitag/avatars/user/uuid.jpg" → public_id "kallitag/avatars/user/uuid"
        public_id = path.rsplit(".", 1)[0]
        result = cloudinary.uploader.upload(
            data, public_id=public_id, resource_type="image", overwrite=True,
        )
        return {"path": path, "url": result["secure_url"], "size": result.get("bytes", len(data))}
    # Emergent object storage
    key = init_storage()
    if not key:
        raise HTTPException(503, "Stockage indisponible")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def storage_get(path: str) -> tuple:
    if USE_CLOUDINARY:
        # With Cloudinary, /api/files/{path} is unused — the frontend gets the
        # secure_url returned by storage_put directly. If someone hits this
        # endpoint, redirect via 404 to force them to use the Cloudinary URL.
        raise HTTPException(410, "Cloudinary sert les fichiers directement — utilisez l'URL retournée par /api/upload-avatar")
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
        order = orders_col.find_one({"profile_slug": slug}, {"_id": 0})
    if not order:
        # Fall back to bulk order card lookup
        order = orders_col.find_one({"profile_cards.slug": slug}, {"_id": 0})
        if order:
            card = next((c for c in (order.get("profile_cards") or []) if c.get("slug") == slug), None)
            if card:
                product = PRODUCT_CATALOG.get(order.get("product_id"), {})
                return {"slug": slug, "profile": card.get("profile", {}),
                        "product_name": order.get("product_name"),
                        "product_id": order.get("product_id"),
                        "product_kind": product.get("kind", "profile")}
    if not order:
        raise HTTPException(404, "Profil introuvable")
    product = PRODUCT_CATALOG.get(order.get("product_id"), {})
    return {"slug": slug, "profile": order.get("profile", {}),
            "product_name": order.get("product_name"), "product_id": order.get("product_id"),
            "product_kind": product.get("kind", "profile")}


# ---------- Bulk B2B checkout ----------
class BulkCard(BaseModel):
    finish_id: str = "noir_mat"
    theme_id: str = "onyx"
    first_name: str
    last_name: str
    job_title: Optional[str] = ""
    company: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[EmailStr] = None
    links: Dict[str, str] = Field(default_factory=dict)

    @field_validator("email", mode="before")
    @classmethod
    def _e2n(cls, v):
        return None if v == "" or v is None else v


class BulkCheckoutRequest(BaseModel):
    company_name: str
    cards: List[BulkCard]
    shipping: ShippingAddress
    contact_email: EmailStr
    origin_url: str


@api_router.get("/bulk/pricing")
async def bulk_pricing():
    base = PRODUCT_CATALOG["card_prestige"]["price_cents"]
    return {"base_price_cents": base, "tiers": BULK_TIERS, "currency": "eur"}


@api_router.post("/bulk-checkout")
async def bulk_checkout(req: BulkCheckoutRequest):
    if not req.cards:
        raise HTTPException(400, "Au moins 1 carte requise")
    if len(req.cards) > 200:
        raise HTTPException(400, "Max 200 cartes par commande")
    product = PRODUCT_CATALOG["card_prestige"]
    base_price = product["price_cents"]
    qty = len(req.cards)
    pct = bulk_discount_pct(qty)
    unit_price = int(round(base_price * (100 - pct) / 100))
    total_cents = unit_price * qty
    order_id = str(uuid.uuid4())
    profile_cards = []
    for c in req.cards:
        card_slug = f"{_slugify(c.first_name + '-' + c.last_name)}-{order_id[:4]}-{uuid.uuid4().hex[:4]}"
        profile_cards.append({
            "slug": card_slug,
            "profile": {
                "theme_id": c.theme_id, "finish_id": c.finish_id,
                "first_name": c.first_name, "last_name": c.last_name,
                "job_title": c.job_title or "", "company": c.company or req.company_name,
                "phone": c.phone or "", "email": c.email,
                "links": c.links or {},
            },
        })
    order_doc = {
        "order_id": order_id,
        "product_id": "card_prestige",
        "product_name": f"Pack Entreprise · {qty} cartes",
        "quantity": qty,
        "amount_cents": total_cents,
        "currency": "eur",
        "profile_slug": profile_cards[0]["slug"],
        "profile": profile_cards[0]["profile"],
        "profile_cards": profile_cards,
        "shipping": req.shipping.model_dump(),
        "contact_email": req.contact_email,
        "company_name": req.company_name,
        "is_bulk": True,
        "bulk_discount_pct": pct,
        "status": "draft", "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    orders_col.insert_one(dict(order_doc))
    session = stripe.checkout.Session.create(
        line_items=[{
            "price_data": {
                "currency": "eur",
                "product_data": {
                    "name": f"KalliTag Pack Entreprise · {qty} cartes NFC",
                    "description": f"{qty} cartes personnalisées" + (f" · remise {pct}%" if pct else ""),
                },
                "unit_amount": unit_price,
            },
            "quantity": qty,
        }],
        mode="payment",
        success_url=f"{req.origin_url.rstrip('/')}/paiement/succes?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{req.origin_url.rstrip('/')}/paiement/annule",
        customer_email=req.contact_email,
        metadata={"order_id": order_id, "bulk": "true", "qty": str(qty)},
        shipping_address_collection={"allowed_countries": ["FR", "BE", "LU", "CH", "MC"]},
        allow_promotion_codes=True,
    )
    payment_transactions.insert_one({
        "session_id": session.id, "order_id": order_id, "amount": total_cents,
        "currency": "eur", "status": "initiated", "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    orders_col.update_one({"order_id": order_id}, {"$set": {"session_id": session.id}})
    return {"checkout_url": session.url, "session_id": session.id, "order_id": order_id,
            "unit_price_cents": unit_price, "total_cents": total_cents, "discount_pct": pct}


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
        allow_promotion_codes=True,
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


# ---------- Lead Capture activation helpers (idempotent, Stripe-driven) ----------
def _lc_set_active(email: Optional[str] = None, active: bool = True,
                   stripe_customer_id: Optional[str] = None,
                   client_reference_id: Optional[str] = None,
                   plan_id: Optional[str] = None) -> None:
    """Idempotently upsert a user row with the LC flag + Stripe customer mapping.
    Match priority: stripe_customer_id → client_reference_id (user.id) → email.
    Missing every identifier → no-op (Stripe still receives 200 to avoid retries)."""
    set_fields: Dict[str, Any] = {
        "lead_capture_active": bool(active),
        "lead_capture_active_at": datetime.now(timezone.utc).isoformat(),
    }
    if stripe_customer_id:
        set_fields["stripe_customer_id"] = stripe_customer_id
    if plan_id:
        set_fields["subscription_plan"] = plan_id

    # 1) Match by stripe_customer_id (fastest, doesn't need email)
    if stripe_customer_id:
        r = users_col.update_one(
            {"stripe_customer_id": stripe_customer_id},
            {"$set": set_fields},
        )
        if r.matched_count:
            return

    # 2) Match by client_reference_id → users_col.id (from Checkout session)
    if client_reference_id:
        r = users_col.update_one(
            {"id": client_reference_id},
            {"$set": set_fields},
        )
        if r.matched_count:
            return

    # 3) Fallback: match by email (or upsert if it's a fresh subscriber)
    if email:
        email_l = email.lower()
        users_col.update_one(
            {"email": email_l},
            {"$set": set_fields, "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "email": email_l,
                "role": "MANAGER",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
    # else: nothing to do — respond 200, don't retry


def _lc_email_from_customer(customer_id: Optional[str]) -> Optional[str]:
    """Fetch the customer email from Stripe (fallback when metadata is missing)."""
    if not customer_id:
        return None
    # Cache-first: our own users_col already stores stripe_customer_id
    u = users_col.find_one({"stripe_customer_id": customer_id}, {"_id": 0, "email": 1})
    if u and u.get("email"):
        return u["email"]
    try:
        c = stripe.Customer.retrieve(customer_id)
        return (c.get("email") or "").lower() or None
    except stripe.error.StripeError:
        return None


def _lc_has_other_active_sub(email: str, exclude_sub_id: Optional[str] = None) -> bool:
    """True if the user still has ANY other active/trialing subscription that
    activates Lead Capture — used to avoid deactivating on partial cancellations."""
    q: Dict[str, Any] = {"email": email.lower(), "status": {"$in": ["active", "trialing"]}}
    if exclude_sub_id:
        q["stripe_subscription_id"] = {"$ne": exclude_sub_id}
    for s in subscriptions_col.find(q, {"_id": 0, "plan_id": 1}):
        pid = s.get("plan_id")
        if pid and SUBSCRIPTION_PLANS.get(pid, {}).get("activates_lead_capture"):
            return True
    return False


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
        # Subscription-mode checkout → immediately mark LC active + persist customer mapping
        if obj.get("mode") == "subscription":
            cust_email = (obj.get("customer_email")
                          or (obj.get("customer_details") or {}).get("email")
                          or (obj.get("metadata") or {}).get("email")
                          or _lc_email_from_customer(obj.get("customer")))
            plan_id = (obj.get("metadata") or {}).get("plan_id")
            _lc_set_active(
                email=cust_email,
                active=True,
                stripe_customer_id=obj.get("customer"),
                client_reference_id=obj.get("client_reference_id"),
                plan_id=plan_id,
            )
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
        price_data = ((obj.get("items", {}).get("data") or [{}])[0].get("price", {}) or {})
        lk = price_data.get("lookup_key") or ""
        # Which plan does this lookup key belong to?
        plan_id = None
        for pid, p in SUBSCRIPTION_PLANS.items():
            if lk in (p.get("lookup_key_monthly"), p.get("lookup_key_yearly")):
                plan_id = pid; break
        subscriptions_col.update_one(
            {"stripe_subscription_id": obj["id"]},
            {"$set": {
                "stripe_subscription_id": obj["id"],
                "stripe_customer_id": obj.get("customer"),
                "email": (cust_email or "").lower(),
                "status": obj.get("status"),
                "plan_id": plan_id,
                "current_period_end": obj.get("current_period_end"),
                "cancel_at_period_end": obj.get("cancel_at_period_end", False),
                "price_lookup_key": lk,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        # Toggle LC based on sub status (active/trialing → true, else false)
        is_active = obj.get("status") in {"active", "trialing"}
        # For LC-enabled plans only (avoid activating unrelated Stripe products)
        plan_activates = plan_id and SUBSCRIPTION_PLANS[plan_id].get("activates_lead_capture")
        if plan_activates:
            _lc_set_active(
                email=cust_email or None,
                active=is_active,
                stripe_customer_id=obj.get("customer"),
                plan_id=plan_id if is_active else None,
            )
        if plan_activates and is_active and cust_email:
            # Provision free NFC card claims — one per included seat×card
            plan_def = SUBSCRIPTION_PLANS[plan_id]
            nfc_qty = int(plan_def.get("includes_nfc_card_qty", 0) or 0)
            seats = int((obj.get("items", {}).get("data") or [{}])[0].get("quantity", 1) or 1)
            total_cards = nfc_qty * seats
            already = nfc_claims_col.count_documents({"subscription_id": obj["id"]})
            to_create = max(0, total_cards - already)
            for _ in range(to_create):
                claim_token = secrets.token_urlsafe(24)
                nfc_claims_col.insert_one({
                    "token": claim_token,
                    "subscription_id": obj["id"],
                    "plan_id": plan_id,
                    "email": cust_email.lower(),
                    "status": "pending",  # pending | claimed | cancelled
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
            if to_create > 0 and PUBLIC_BASE_URL:
                claim_url = f"{PUBLIC_BASE_URL.rstrip('/')}/mon-profil?claims=1"
                subject = f"Votre{'s' if total_cards > 1 else ''} carte{'s' if total_cards > 1 else ''} NFC offerte{'s' if total_cards > 1 else ''} — abonnement {plan_def['name']}"
                html = f"""<table role="presentation" width="100%" style="background:#0B0F17;padding:24px">
<tr><td style="max-width:520px;margin:0 auto;background:#131926;border-radius:16px;padding:32px;font-family:Arial,sans-serif;color:#F8FAFC">
<h1 style="color:#D4AF37;margin:0 0 12px;font-size:22px">🎉 Bienvenue chez KalliTag {escape(plan_def['name'])}</h1>
<p style="color:#94A3B8;line-height:1.6;font-size:14px">Votre abonnement est actif. En cadeau, <strong style="color:#D4AF37">{to_create} carte{'s' if to_create > 1 else ''} NFC Prestige offerte{'s' if to_create > 1 else ''}</strong> vous attend{'ent' if to_create > 1 else ''}.</p>
<p style="margin:28px 0;text-align:center"><a href="{escape(claim_url)}" style="display:inline-block;padding:14px 32px;background:#D4AF37;color:#0B0F17;border-radius:999px;font-weight:bold;text-decoration:none;font-size:14px">Réclamer ma carte offerte →</a></p>
<p style="color:#64748B;font-size:12px;margin:16px 0 0">Vous personnaliserez chaque carte (nom, thème, photo) puis nous vous l'expédi{'erons' if to_create > 1 else 'erons'} gratuitement.</p>
</td></tr></table>"""
                try: await send_email(to=cust_email, subject=subject, html=html)
                except Exception: logger.exception("claim email failed")
    elif t == "customer.subscription.deleted":
        sub = subscriptions_col.find_one({"stripe_subscription_id": obj["id"]}) or {}
        subscriptions_col.update_one(
            {"stripe_subscription_id": obj["id"]},
            {"$set": {"status": "canceled", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        cust_id = obj.get("customer")
        email_l = (sub.get("email") or _lc_email_from_customer(cust_id) or "").lower() or None
        # Deactivate — helper matches by customer_id first (no email needed)
        if not _lc_has_other_active_sub(email_l, exclude_sub_id=obj["id"]) if email_l else True:
            _lc_set_active(email=email_l, active=False, stripe_customer_id=cust_id)
    elif t == "invoice.paid":
        # Renewal succeeded → keep / restore LC access
        cust_id = obj.get("customer")
        sub_id = obj.get("subscription")
        plan_id = None
        row = subscriptions_col.find_one({"stripe_subscription_id": sub_id}) if sub_id else None
        if row:
            plan_id = row.get("plan_id")
        cust_email = obj.get("customer_email") or (row.get("email") if row else None)
        _lc_set_active(email=cust_email, active=True,
                       stripe_customer_id=cust_id, plan_id=plan_id)
    elif t == "invoice.payment_failed":
        # Payment failed → revoke LC access if no other active sub remains
        cust_id = obj.get("customer")
        sub_id = obj.get("subscription")
        cust_email = obj.get("customer_email") or _lc_email_from_customer(cust_id)
        if not cust_email or not _lc_has_other_active_sub(cust_email, exclude_sub_id=sub_id):
            _lc_set_active(email=cust_email, active=False, stripe_customer_id=cust_id)
    return {"received": True}


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
    _assert_safe_email(subject, html)
    # Direct Resend (preferred outside Emergent)
    if RESEND_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post("https://api.resend.com/emails",
                                         headers={"Authorization": f"Bearer {RESEND_API_KEY}",
                                                  "Content-Type": "application/json"},
                                         json={"from": RESEND_FROM, "to": [to],
                                               "subject": subject, "html": html})
            resp.raise_for_status()
            return resp.json().get("id")
        except Exception as e:
            logger.error(f"resend send failed: {e}")
            return None
    # Emergent Resend proxy fallback
    if not EMAIL_KEY:
        logger.warning("EMERGENT_EMAIL_KEY missing — email skipped")
        return None
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
    try:
        origin = req.origin_url.rstrip("/")
        if not origin.startswith("https://"):
            raise HTTPException(400, "origin_url must be https")
        token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        magic_tokens_col.insert_one({
            "token": token,
            "email": req.email.lower(),
            "used": False,
            "expires_at": (now + MAGIC_LINK_TTL).isoformat(),
            "created_at": now.isoformat(),
        })
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
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"magic link request failed: {type(e).__name__}: {e}")
        raise HTTPException(500, "magic link failed")


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
    url = result.get("url") if str(result.get("url", "")).startswith("http") else f"/api/files/{result['path']}"
    return {"path": result["path"], "url": url, "size": result["size"]}


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
    url = result.get("url") if str(result.get("url", "")).startswith("http") else f"/api/files/{result['path']}"
    return {"path": result["path"], "url": url, "size": result["size"]}


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
        allow_promotion_codes=True,
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


# ---------- Admin dashboard ----------
async def require_admin(x_admin_token: Optional[str] = Header(None)):
    if not ADMIN_TOKEN or x_admin_token != ADMIN_TOKEN:
        raise HTTPException(401, "Admin token invalide")
    return True


@api_router.post("/admin/login")
async def admin_login(payload: Dict[str, str]):
    token = (payload or {}).get("token", "")
    if not ADMIN_TOKEN or token != ADMIN_TOKEN:
        raise HTTPException(401, "Token invalide")
    return {"status": "ok"}


@api_router.get("/admin/stats")
async def admin_stats(admin=Depends(require_admin)):
    # Only "counted" (or missing = legacy) revenue statuses contribute to CA
    counted_filter = {
        "payment_status": "paid",
        "$or": [{"revenue_status": {"$exists": False}}, {"revenue_status": "counted"}],
    }
    paid = orders_col.count_documents({"payment_status": "paid"})
    to_ship = orders_col.count_documents({**counted_filter, "shipped": {"$ne": True}})
    unclaimed = orders_col.count_documents({"status": "unclaimed"})
    active_subs = subscriptions_col.count_documents({"status": {"$in": ["active", "trialing"]}})

    revenue_cents = 0
    for o in orders_col.find(counted_filter, {"amount_cents": 1, "_id": 0}):
        revenue_cents += int(o.get("amount_cents") or 0)

    # Breakdown so the admin can see what was excluded
    excluded_counts = {
        "gift":      orders_col.count_documents({"payment_status": "paid", "revenue_status": "gift"}),
        "refunded":  orders_col.count_documents({"payment_status": "paid", "revenue_status": "refunded"}),
        "cancelled": orders_col.count_documents({"payment_status": "paid", "revenue_status": "cancelled"}),
    }

    total_scans = scans_col.estimated_document_count()
    total_leads = leads_col.estimated_document_count()
    return {
        "paid_orders": paid, "to_ship": to_ship, "unclaimed": unclaimed,
        "revenue_cents": revenue_cents, "active_subs": active_subs,
        "total_scans": total_scans, "total_leads": total_leads,
        "excluded_counts": excluded_counts,
    }


class AdminRevenueStatusIn(BaseModel):
    status: str = "counted"  # counted | refunded | cancelled | gift


@api_router.post("/admin/orders/{order_id}/revenue-status")
async def admin_set_revenue_status(order_id: str, body: AdminRevenueStatusIn, admin=Depends(require_admin)):
    allowed = {"counted", "refunded", "cancelled", "gift"}
    if body.status not in allowed:
        raise HTTPException(400, f"Statut invalide (attendu : {sorted(allowed)})")
    r = orders_col.update_one({"order_id": order_id}, {"$set": {
        "revenue_status": body.status,
        "revenue_status_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    if r.matched_count == 0:
        raise HTTPException(404, "Commande introuvable")
    return {"status": "ok", "revenue_status": body.status}


# ================================================================
# SUBSCRIPTIONS — plans list + checkout
# ================================================================

@api_router.get("/subscription-plans")
async def list_subscription_plans():
    """Public — returns the pricing catalog for /tarifs and Landing."""
    return {"plans": list(SUBSCRIPTION_PLANS.values())}


class SubscribeIn(BaseModel):
    plan_id: Literal["lead_capture", "all_in_one", "team"]
    interval: Literal["monthly", "yearly"] = "monthly"
    email: EmailStr
    seats: int = 1
    origin_url: str


@api_router.post("/subscribe/checkout")
async def subscribe_checkout(req: SubscribeIn):
    plan, lookup_key, unit_cents = _resolve_lookup(req.plan_id, req.interval)
    seats = max(int(plan.get("min_seats", 1)), min(int(plan.get("max_seats", 50)), int(req.seats or 1)))

    prices = stripe.Price.list(lookup_keys=[lookup_key], active=True, limit=1, expand=["data.product"]).data
    if not prices:
        raise HTTPException(500, f"Prix Stripe manquant pour '{lookup_key}'. Créez ce prix dans le Dashboard Stripe (produit Recurring · lookup_key={lookup_key}) puis réessayez.")
    price = prices[0]

    # Pre-provision the user row so we can pass its id as client_reference_id
    email_l = req.email.lower()
    existing = users_col.find_one({"email": email_l}, {"_id": 0, "id": 1})
    user_id = existing["id"] if existing else str(uuid.uuid4())
    if not existing:
        users_col.insert_one({
            "id": user_id,
            "email": email_l,
            "role": "MANAGER",
            "lead_capture_active": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    origin = req.origin_url.rstrip("/")
    kwargs = dict(
        mode="subscription",
        line_items=[{"price": price.id, "quantity": seats}],
        success_url=f"{origin}/paiement/succes?session_id={{CHECKOUT_SESSION_ID}}&sub=1",
        cancel_url=f"{origin}/tarifs?cancelled=1",
        customer_email=req.email,
        client_reference_id=user_id,
        metadata={"plan_id": plan["id"], "interval": req.interval, "seats": str(seats), "email": email_l, "user_id": user_id},
        subscription_data={"metadata": {"plan_id": plan["id"], "seats": str(seats), "email": email_l, "user_id": user_id}},
        allow_promotion_codes=True,
    )
    try:
        session = stripe.checkout.Session.create(**kwargs)
    except stripe.error.StripeError as e:
        logger.exception(f"subscribe checkout failed: {e}")
        raise HTTPException(500, "Impossible de démarrer le paiement Stripe")

    return {"checkout_url": session.url, "session_id": session.id, "plan_id": plan["id"], "seats": seats}


@api_router.get("/admin/orders")
async def admin_list_orders(admin=Depends(require_admin), status: Optional[str] = None, limit: int = 200):
    q = {}
    if status == "paid":
        q = {"payment_status": "paid"}
    elif status == "to_ship":
        q = {"payment_status": "paid", "shipped": {"$ne": True}}
    elif status == "shipped":
        q = {"shipped": True}
    elif status == "pending":
        q = {"payment_status": {"$ne": "paid"}}
    orders = list(orders_col.find(q, {"_id": 0}).sort("created_at", -1).limit(max(1, min(limit, 500))))
    base = PUBLIC_BASE_URL or ""
    for o in orders:
        slug = o.get("profile_slug")
        o["nfc_url"] = f"{base}/p/{slug}" if slug else ""
        # For bulk B2B orders: include ALL card URLs so admin can encode each NFC chip
        if o.get("is_bulk") and o.get("profile_cards"):
            o["nfc_urls"] = [
                {
                    "slug": c.get("slug"),
                    "url": f"{base}/p/{c.get('slug')}" if c.get("slug") else "",
                    "first_name": (c.get("profile") or {}).get("first_name", ""),
                    "last_name": (c.get("profile") or {}).get("last_name", ""),
                    "job_title": (c.get("profile") or {}).get("job_title", ""),
                }
                for c in o.get("profile_cards", [])
            ]
        else:
            o["nfc_urls"] = []
    return {"orders": orders, "count": len(orders)}


class AdminNoteIn(BaseModel):
    note: str = ""


@api_router.post("/admin/orders/{order_id}/mark-shipped")
async def admin_mark_shipped(order_id: str, body: AdminNoteIn, admin=Depends(require_admin)):
    r = orders_col.update_one({"order_id": order_id}, {"$set": {
        "shipped": True,
        "shipped_at": datetime.now(timezone.utc).isoformat(),
        "admin_note": body.note[:500],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    if r.matched_count == 0:
        raise HTTPException(404, "Commande introuvable")
    return {"status": "ok"}


@api_router.post("/admin/orders/{order_id}/unship")
async def admin_unship(order_id: str, admin=Depends(require_admin)):
    r = orders_col.update_one({"order_id": order_id}, {"$set": {
        "shipped": False, "updated_at": datetime.now(timezone.utc).isoformat(),
    }, "$unset": {"shipped_at": ""}})
    if r.matched_count == 0:
        raise HTTPException(404, "Commande introuvable")
    return {"status": "ok"}


@api_router.get("/admin/orders/export.csv")
async def admin_export_csv(x_admin_token: Optional[str] = Header(None)):
    if not ADMIN_TOKEN or x_admin_token != ADMIN_TOKEN:
        raise HTTPException(401, "Admin token invalide")
    orders = list(orders_col.find({"payment_status": "paid"}, {"_id": 0}).sort("created_at", -1))
    import csv as _csv
    buf = io.StringIO()
    w = _csv.writer(buf)
    w.writerow(["Date", "Order ID", "Slug", "Client", "Email", "Produit", "Finition", "Montant (EUR)",
                "Statut", "Expédié", "URL NFC", "Adresse", "CP", "Ville", "Pays"])
    base = PUBLIC_BASE_URL or ""
    for o in orders:
        prof = o.get("profile") or {}
        ship = o.get("shipping") or {}
        name = f"{prof.get('first_name','')} {prof.get('last_name','')}".strip()
        nfc = f"{base}/p/{o.get('profile_slug','')}"
        w.writerow([o.get("created_at",""), o.get("order_id",""), o.get("profile_slug",""),
                    name, o.get("contact_email",""), o.get("product_name",""),
                    prof.get("finish_id",""), f"{(o.get('amount_cents',0)/100):.2f}",
                    o.get("status",""), "oui" if o.get("shipped") else "non", nfc,
                    ship.get("line1",""), ship.get("postal_code",""), ship.get("city",""), ship.get("country","")])
    return Response(content=buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="kallitag-orders.csv"'})



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


# ================================================================
# LEAD CAPTURE — SSO endpoint (email + OTP by email, shared secret)
# ================================================================

def _lc_hash(code: str, email: str) -> str:
    """Deterministic hash of the OTP bound to the email (10-min TTL doc)."""
    import hashlib
    payload = f"{code}|{email.lower()}|{KALLITAG_SHARED_SECRET or 'nosalt'}"
    return hashlib.sha256(payload.encode()).hexdigest()


def _lc_user_snapshot(email: str) -> Dict[str, Any]:
    """Build the user snapshot from users_col (source of truth for
    lead_capture_active) + most recent order (for name / company / slug)."""
    email_l = (email or "").lower()
    user = users_col.find_one({"email": email_l}, {"_id": 0}) or {}
    latest = orders_col.find_one(
        {"contact_email": {"$regex": f"^{re.escape(email_l)}$", "$options": "i"}},
        {"_id": 0}, sort=[("created_at", -1)],
    ) or {}
    prof = latest.get("profile", {}) or {}
    first = prof.get("first_name", "") or ""
    last  = prof.get("last_name", "")  or ""
    name  = (f"{first} {last}").strip() or user.get("name", "") or email_l.split("@")[0]
    return {
        "id":         user.get("id") or email_l,   # stable id
        "email":      email_l,
        "name":       name,
        "company":    prof.get("company", "") or user.get("company", "") or "",
        "company_id": user.get("company_id") or None,
        "role":       user.get("role", "MANAGER"),
        "nfc_card_id": latest.get("profile_slug", "") or "",
    }


def _lc_require_secret(x_leadcapture_secret: Optional[str]) -> None:
    if not KALLITAG_SHARED_SECRET or x_leadcapture_secret != KALLITAG_SHARED_SECRET:
        raise HTTPException(401, "invalid_shared_secret")


class LeadCaptureRequestOTPIn(BaseModel):
    email: EmailStr


class LeadCaptureAuthIn(BaseModel):
    email: EmailStr
    password: str  # OTP code sent by email


@api_router.post("/lead-capture/request-otp")
async def lead_capture_request_otp(
    body: LeadCaptureRequestOTPIn,
    x_leadcapture_secret: Optional[str] = Header(None, alias="X-LeadCapture-Secret"),
):
    """Step 1 — Lead Capture asks kallitag.fr to send an OTP to the user."""
    _lc_require_secret(x_leadcapture_secret)
    email_l = body.email.lower()
    # Ensure a user row exists (idempotent) — default lead_capture_active=false
    users_col.update_one(
        {"email": email_l},
        {"$setOnInsert": {
            "id": str(uuid.uuid4()),
            "email": email_l,
            "role": "MANAGER",
            "lead_capture_active": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    # Generate 6-digit code, store hash + TTL, invalidate previous ones
    code = f"{secrets.randbelow(1_000_000):06d}"
    now = datetime.now(timezone.utc)
    lead_capture_otp_col.delete_many({"email": email_l})
    lead_capture_otp_col.insert_one({
        "email": email_l,
        "code_hash": _lc_hash(code, email_l),
        "created_at": now.isoformat(),
        "expires_at": now + LEAD_CAPTURE_OTP_TTL,  # BSON date → TTL index
        "attempts": 0,
        "used": False,
    })
    subject = "Votre code Lead Capture KalliTag"
    html = f"""<table role="presentation" width="100%" style="background:#0B0F17;padding:24px">
<tr><td style="max-width:520px;margin:0 auto;background:#131926;border-radius:16px;padding:32px;font-family:Arial,sans-serif;color:#F8FAFC">
<h1 style="color:#D4AF37;margin:0 0 8px;font-size:22px">Code de connexion Lead Capture</h1>
<p style="color:#94A3B8;margin:0 0 20px;font-size:14px">Saisissez ce code dans l'application Lead Capture pour vous connecter. Il expire dans 10 minutes.</p>
<p style="margin:24px 0;text-align:center"><span style="display:inline-block;padding:16px 32px;background:#D4AF37;color:#0B0F17;border-radius:12px;font-size:32px;font-weight:bold;letter-spacing:6px;font-family:monospace">{code}</span></p>
<p style="color:#64748B;font-size:12px;margin:24px 0 0;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Envoyé par {escape(EMAIL_FROM_NAME)}. Nous ne demandons jamais votre mot de passe.</p>
</td></tr></table>"""
    try:
        email_id = await send_email(to=email_l, subject=subject, html=html)
    except Exception as e:
        logger.exception(f"lead-capture OTP email failed: {type(e).__name__}: {e}")
        raise HTTPException(500, "email_delivery_failed")
    return {"ok": True, "sent": True, "email_id": email_id, "ttl_seconds": int(LEAD_CAPTURE_OTP_TTL.total_seconds())}


@api_router.post("/lead-capture/auth")
async def lead_capture_auth(
    body: LeadCaptureAuthIn,
    x_leadcapture_secret: Optional[str] = Header(None, alias="X-LeadCapture-Secret"),
):
    """Step 2 — Lead Capture verifies credentials and reads subscription status."""
    _lc_require_secret(x_leadcapture_secret)
    email_l = body.email.lower()

    otp_doc = lead_capture_otp_col.find_one({"email": email_l, "used": False})
    if not otp_doc:
        raise HTTPException(401, "invalid_credentials")

    # Expiry (BSON date compare; also handle rare case where TTL index hasn't purged yet)
    exp = otp_doc.get("expires_at")
    if isinstance(exp, str):
        try: exp = datetime.fromisoformat(exp)
        except Exception: exp = datetime.now(timezone.utc) - timedelta(seconds=1)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        lead_capture_otp_col.delete_one({"_id": otp_doc["_id"]})
        raise HTTPException(401, "invalid_credentials")

    # Brute force guard: 5 attempts max per code
    if int(otp_doc.get("attempts", 0)) >= 5:
        lead_capture_otp_col.delete_one({"_id": otp_doc["_id"]})
        raise HTTPException(401, "too_many_attempts")

    if _lc_hash(body.password.strip(), email_l) != otp_doc.get("code_hash"):
        lead_capture_otp_col.update_one({"_id": otp_doc["_id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(401, "invalid_credentials")

    # Consume OTP
    lead_capture_otp_col.update_one({"_id": otp_doc["_id"]}, {"$set": {
        "used": True, "used_at": datetime.now(timezone.utc).isoformat(),
    }})

    user_doc = users_col.find_one({"email": email_l}, {"_id": 0}) or {}
    active = bool(user_doc.get("lead_capture_active", False))
    return {
        "ok": True,
        "lead_capture_active": active,
        "user": _lc_user_snapshot(email_l),
    }


@api_router.get("/lead-capture/leads")
async def lead_capture_leads(
    email: EmailStr,
    limit: int = 500,
    since: Optional[str] = None,
    x_leadcapture_secret: Optional[str] = Header(None, alias="X-LeadCapture-Secret"),
):
    """SSO endpoint — the Lead Capture app fetches leads captured across ALL
    NFC profiles owned by this email. Requires the shared secret (server-to-server)."""
    _lc_require_secret(x_leadcapture_secret)
    email_l = email.lower()
    q: Dict[str, Any] = {"owner_email": email_l}
    if since:
        q["created_at"] = {"$gt": since}
    limit = max(1, min(int(limit or 500), 1000))
    leads = list(
        leads_col.find(q, {"_id": 0}).sort("created_at", -1).limit(limit)
    )
    return {"ok": True, "email": email_l, "count": len(leads), "leads": leads}


# ---- Admin: activate / deactivate Lead Capture subscription for a user ----
class AdminLeadCaptureIn(BaseModel):
    email: EmailStr
    active: bool


@api_router.post("/admin/lead-capture/set-active")
async def admin_set_lead_capture(body: AdminLeadCaptureIn, admin=Depends(require_admin)):
    email_l = body.email.lower()
    r = users_col.update_one(
        {"email": email_l},
        {"$set": {
            "lead_capture_active": bool(body.active),
            "lead_capture_active_at": datetime.now(timezone.utc).isoformat(),
        }, "$setOnInsert": {
            "id": str(uuid.uuid4()),
            "email": email_l,
            "role": "MANAGER",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True, "email": email_l, "lead_capture_active": bool(body.active),
            "created": r.upserted_id is not None}


@api_router.get("/admin/lead-capture/users")
async def admin_list_lead_capture_users(admin=Depends(require_admin)):
    users = list(users_col.find({}, {"_id": 0}).sort("created_at", -1).limit(500))
    return {"users": users, "count": len(users)}

# ================================================================
# NFC CARD CLAIMS (free cards included in subscriptions)
# ================================================================

@api_router.get("/nfc-claim/{token}")
async def nfc_claim_info(token: str):
    doc = nfc_claims_col.find_one({"token": token}, {"_id": 0})
    if not doc: raise HTTPException(404, "Bon de carte introuvable")
    plan = SUBSCRIPTION_PLANS.get(doc.get("plan_id", ""), {})
    return {"token": token, "email": doc.get("email"), "status": doc.get("status"), "plan_name": plan.get("name", "")}


class NfcClaimIn(BaseModel):
    profile: ProfileConfig
    shipping: ShippingAddress


@api_router.post("/nfc-claim/{token}")
async def nfc_claim_submit(token: str, body: NfcClaimIn):
    doc = nfc_claims_col.find_one({"token": token})
    if not doc: raise HTTPException(404, "Bon introuvable")
    if doc.get("status") == "claimed":
        raise HTTPException(409, "Cette carte a déjà été réclamée")
    order_id = str(uuid.uuid4())
    base_slug = _slugify(f"{body.profile.first_name}-{body.profile.last_name}") or "carte"
    slug = f"{base_slug}-{order_id[:6]}"
    email_l = (doc.get("email") or "").lower()
    order_doc = {
        "order_id": order_id, "product_id": "card_prestige", "product_name": "Carte NFC Prestige (offerte)",
        "quantity": 1, "amount_cents": 0, "profile_slug": slug,
        "profile": body.profile.model_dump(), "shipping": body.shipping.model_dump(),
        "contact_email": email_l, "status": "paid", "payment_status": "paid",
        "revenue_status": "gift", "revenue_status_at": datetime.now(timezone.utc).isoformat(),
        "shipped": False, "is_bulk": False,
        "claim_token": token, "claim_subscription_id": doc.get("subscription_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    orders_col.insert_one(order_doc)
    nfc_claims_col.update_one({"token": token}, {"$set": {
        "status": "claimed", "claimed_at": datetime.now(timezone.utc).isoformat(),
        "order_id": order_id, "profile_slug": slug,
    }})
    return {"ok": True, "order_id": order_id, "profile_slug": slug}


@api_router.get("/user/pending-claims")
async def list_my_claims(user=Depends(get_current_user)):
    claims = list(nfc_claims_col.find({"email": user["email"].lower()}, {"_id": 0}).sort("created_at", -1))
    return {"claims": claims, "pending": sum(1 for c in claims if c.get("status") == "pending")}


# ================================================================
# TEAM ONBOARDING (managers invite commerciaux)
# ================================================================

def _require_manager(email: str) -> Dict[str, Any]:
    u = users_col.find_one({"email": email.lower()}, {"_id": 0}) or {}
    role = (u.get("role") or "").upper()
    if role and role != "MANAGER":
        raise HTTPException(403, "Réservé aux managers d'équipe")
    return u


class TeamInviteIn(BaseModel):
    email: EmailStr
    name: Optional[str] = ""


@api_router.post("/team/invite")
async def team_invite(body: TeamInviteIn, user=Depends(get_current_user)):
    manager_email = user["email"].lower()
    _require_manager(manager_email)
    invitee = body.email.lower()
    if invitee == manager_email:
        raise HTTPException(400, "Vous ne pouvez pas vous inviter vous-même")

    # Upsert commercial user attached to this manager
    users_col.update_one(
        {"email": invitee},
        {"$set": {
            "role": "COMMERCIAL",
            "manager_email": manager_email,
            "name": (body.name or "").strip(),
            "lead_capture_active": True,   # inherits from manager's plan
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }, "$setOnInsert": {
            "id": str(uuid.uuid4()),
            "email": invitee,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    # Send magic link so the commercial can access their dashboard
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    magic_tokens_col.insert_one({
        "token": token, "email": invitee, "expires_at": expires.isoformat(),
        "used": False, "created_at": datetime.now(timezone.utc).isoformat(),
        "invited_by": manager_email,
    })
    base = PUBLIC_BASE_URL or ""
    link = f"{base}/auth/verify?token={token}"
    manager_name = (user.get("name") or manager_email).strip()
    subject = f"Vous êtes invité(e) sur l'équipe KalliTag de {manager_name}"
    html = f"""<table role="presentation" width="100%" style="background:#0B0F17;padding:24px">
<tr><td style="max-width:520px;margin:0 auto;background:#131926;border-radius:16px;padding:32px;font-family:Arial,sans-serif;color:#F8FAFC">
<h1 style="color:#D4AF37;margin:0 0 12px;font-size:22px">Bienvenue dans l'équipe</h1>
<p style="color:#94A3B8;line-height:1.6;font-size:14px">{escape(manager_email)} vous a invité(e) à rejoindre son équipe KalliTag Lead Capture. Cliquez ci-dessous pour activer votre accès (lien valide 30 min).</p>
<p style="margin:28px 0;text-align:center"><a href="{escape(link)}" style="display:inline-block;padding:14px 32px;background:#D4AF37;color:#0B0F17;border-radius:999px;font-weight:bold;text-decoration:none;font-size:14px">Activer mon accès →</a></p>
<p style="color:#64748B;font-size:12px;margin:16px 0 0">Rôle attribué : <strong style="color:#D4AF37">COMMERCIAL</strong>. Vous pourrez capturer des leads via votre carte NFC.</p>
</td></tr></table>"""
    try: await send_email(to=invitee, subject=subject, html=html)
    except Exception: logger.exception("team invite email failed")
    return {"ok": True, "invited": invitee, "role": "COMMERCIAL"}


@api_router.get("/team/members")
async def team_members(user=Depends(get_current_user)):
    manager_email = user["email"].lower()
    _require_manager(manager_email)
    members = list(users_col.find(
        {"manager_email": manager_email},
        {"_id": 0, "email": 1, "name": 1, "role": 1, "lead_capture_active": 1, "created_at": 1, "id": 1}
    ).sort("created_at", -1))
    return {"members": members, "count": len(members)}


@api_router.delete("/team/members/{email}")
async def team_remove(email: str, user=Depends(get_current_user)):
    manager_email = user["email"].lower()
    _require_manager(manager_email)
    r = users_col.update_one(
        {"email": email.lower(), "manager_email": manager_email},
        {"$set": {"manager_email": None, "role": "MANAGER", "lead_capture_active": False,
                  "removed_at": datetime.now(timezone.utc).isoformat()}}
    )
    if r.matched_count == 0: raise HTTPException(404, "Membre introuvable")
    return {"ok": True, "removed": email.lower()}




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
