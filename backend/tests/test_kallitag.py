"""Backend tests for KalliTag MVP: products, checkout, payments status, webhook."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://stabilise-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


VALID_PAYLOAD = {
    "product_id": "card_prestige",
    "quantity": 1,
    "profile": {
        "theme_id": "onyx",
        "finish_id": "noir_mat",
        "first_name": "Jean",
        "last_name": "Dupont",
        "job_title": "CEO",
        "company": "Acme",
        "phone": "+33612345678",
        "email": "jean@acme.fr",
        "links": {"linkedin": "https://linkedin.com/in/jd"},
    },
    "shipping": {
        "full_name": "Jean Dupont",
        "line1": "12 rue de Paris",
        "line2": "",
        "city": "Paris",
        "postal_code": "75001",
        "country": "FR",
    },
    "contact_email": "TEST_jean@example.com",
    "origin_url": "https://stabilise-pro.preview.emergentagent.com",
}


# --- /api/products ---
def test_get_products(s):
    r = s.get(f"{API}/products")
    assert r.status_code == 200
    data = r.json()
    assert "products" in data and "finishes" in data and "themes" in data
    ids = {p["id"] for p in data["products"]}
    assert ids == {"card_prestige"}
    for p in data["products"]:
        assert p["currency"] == "eur"
        assert isinstance(p["price_cents"], int) and p["price_cents"] > 0
    finish_ids = {f["id"] for f in data["finishes"]}
    assert finish_ids == {"noir_mat", "metal_brosse", "or_brosse"}
    theme_ids = {t["id"] for t in data["themes"]}
    assert {"onyx", "ivory", "midnight", "rose"}.issubset(theme_ids)


def test_get_product_by_id(s):
    r = s.get(f"{API}/products/card_prestige")
    assert r.status_code == 200
    d = r.json()
    assert d["id"] == "card_prestige"
    assert d["currency"] == "eur"


def test_get_product_not_found(s):
    r = s.get(f"{API}/products/unknown_xxx")
    assert r.status_code == 404


# --- /api/checkout ---
@pytest.fixture(scope="module")
def checkout_session(s):
    r = s.post(f"{API}/checkout", json=VALID_PAYLOAD)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "checkout_url" in d and "session_id" in d and "order_id" in d
    assert "checkout.stripe.com" in d["checkout_url"]
    return d


def test_checkout_creates_stripe_session(checkout_session):
    assert checkout_session["session_id"].startswith("cs_")


def test_checkout_persists_order_and_transaction(s, checkout_session):
    # Verify via status endpoint that order + payment_transaction exist
    r = s.get(f"{API}/payments/status/{checkout_session['session_id']}")
    assert r.status_code == 200
    d = r.json()
    assert d["session_id"] == checkout_session["session_id"]
    assert d["payment_status"] == "pending"
    assert d["status"] == "initiated"
    assert d["order"] is not None
    assert d["order"]["order_id"] == checkout_session["order_id"]
    assert d["order"]["product_id"] == "card_prestige"


def test_checkout_invalid_product(s):
    bad = dict(VALID_PAYLOAD)
    bad["product_id"] = "no_such_product"
    r = s.post(f"{API}/checkout", json=bad)
    # Pydantic Literal validation → 422
    assert r.status_code in (404, 422)


def test_checkout_invalid_email(s):
    bad = {**VALID_PAYLOAD, "contact_email": "not-an-email"}
    r = s.post(f"{API}/checkout", json=bad)
    assert r.status_code == 422


# --- /api/stripe/webhook ---
def test_webhook_invalid_signature(s):
    r = s.post(f"{API}/stripe/webhook",
               data=b'{"type":"checkout.session.completed","data":{"object":{"id":"cs_test"}}}',
               headers={"Content-Type": "application/json", "stripe-signature": "t=1,v1=deadbeef"})
    assert r.status_code == 400


# --- /api/payments/status/{session_id} ---
def test_status_unknown_session(s):
    r = s.get(f"{API}/payments/status/cs_test_unknown_xyz")
    assert r.status_code == 404
