"""Iteration 3 backend tests: product.kind, new profile schemas, pro subscription,
release/reclaim flow, leads capture, CSV export gating."""
import os
import re
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://stabilise-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _token():
    try:
        with open("/tmp/session_tok") as f:
            return f.read().strip()
    except Exception:
        return None


@pytest.fixture(scope="module")
def token():
    t = _token()
    if not t:
        pytest.skip("No /tmp/session_tok available")
    return t


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def current_slug(auth_headers):
    r = requests.get(f"{API}/me", headers=auth_headers)
    assert r.status_code == 200, r.text
    orders = r.json().get("orders", [])
    # Prefer a paid order owned by user
    paid = [o for o in orders if o.get("payment_status") == "paid" and o.get("profile_slug")]
    if not paid:
        paid = [o for o in orders if o.get("profile_slug")]
    if not paid:
        pytest.skip("No slug available for authed user")
    return paid[0]["profile_slug"]


# ---------- Product catalog with kind ----------
def test_products_have_kind_field():
    r = requests.get(f"{API}/products")
    assert r.status_code == 200
    d = r.json()
    kinds = {p["id"]: p.get("kind") for p in d["products"]}
    assert kinds["card_prestige"] == "profile"
    assert kinds["card_prestige"] == "profile"


# ---------- Checkout for 3 product kinds ----------
BASE_SHIP = {
    "full_name": "Test Buyer", "line1": "1 rue Test", "city": "Paris",
    "postal_code": "75001", "country": "FR",
}


def _post_checkout(payload):
    r = requests.post(f"{API}/checkout", json=payload)
    return r


def test_checkout_prestige_profile_schema():
    r = _post_checkout({
        "product_id": "card_prestige", "quantity": 1,
        "profile": {"theme_id": "onyx", "finish_id": "noir_mat", "first_name": "Jean",
                    "last_name": "Dupont", "links": {"linkedin": "https://ln.com/x"}},
        "shipping": BASE_SHIP,
        "contact_email": "TEST_prestige@example.com", "origin_url": BASE_URL,
    })
    assert r.status_code == 200, r.text
    d = r.json()
    assert "checkout.stripe.com" in d["checkout_url"]
    assert d.get("order_id")


def test_checkout_plaque_reviews_schema():
    # Legacy product removed — kept as skipped for history
    import pytest
    pytest.skip("plaque_nfc retired")


def test_checkout_medaillon_pet_schema():
    import pytest
    pytest.skip("medaillon_nfc retired")


# ---------- Public profile returns product_kind ----------
def test_public_profile_returns_kind(current_slug):
    r = requests.get(f"{API}/profile/{current_slug}")
    assert r.status_code == 200, r.text
    d = r.json()
    assert "product_kind" in d
    assert d["product_kind"] in ("profile", "reviews", "pet")


# ---------- Pro checkout ----------
def test_pro_checkout_monthly(auth_headers):
    r = requests.post(f"{API}/pro/checkout",
                      json={"plan": "monthly", "origin_url": BASE_URL},
                      headers=auth_headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "checkout.stripe.com" in d["checkout_url"]


def test_pro_checkout_yearly(auth_headers):
    r = requests.post(f"{API}/pro/checkout",
                      json={"plan": "yearly", "origin_url": BASE_URL},
                      headers=auth_headers)
    assert r.status_code == 200, r.text
    assert "checkout.stripe.com" in r.json()["checkout_url"]


def test_pro_checkout_requires_auth():
    r = requests.post(f"{API}/pro/checkout", json={"plan": "monthly", "origin_url": BASE_URL})
    assert r.status_code == 401


def test_me_pro_inactive(auth_headers):
    r = requests.get(f"{API}/me/pro", headers=auth_headers)
    assert r.status_code == 200
    d = r.json()
    assert d.get("active") is False
    # subscription may be None or a dict — but not active
    if d.get("subscription"):
        assert d["subscription"].get("status") not in ("active", "trialing", "past_due")


# ---------- Leads (before release, while user still owns slug) ----------
def test_create_lead_public(current_slug):
    r = requests.post(f"{API}/profile/{current_slug}/lead",
                      json={"name": "Prospect Test", "email": "prospect@example.com",
                            "phone": "+33600000000", "message": "Bonjour"})
    assert r.status_code == 200, r.text
    assert r.json().get("status") == "ok"


def test_list_leads_non_pro(auth_headers, current_slug):
    r = requests.get(f"{API}/me/leads/{current_slug}", headers=auth_headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "total" in d and "leads" in d and "is_pro" in d and "free_limit" in d
    assert d["free_limit"] == 3
    assert d["is_pro"] is False
    assert len(d["leads"]) <= 3


def test_export_csv_402_non_pro(auth_headers, current_slug):
    r = requests.get(f"{API}/me/leads/{current_slug}/export.csv", headers=auth_headers)
    assert r.status_code == 402


# ---------- Release + Reclaim chain ----------
CODE_RE = re.compile(r"^[A-Z0-9]{8}$")


@pytest.fixture(scope="module")
def released_code(auth_headers, current_slug):
    r = requests.post(f"{API}/me/orders/{current_slug}/release", headers=auth_headers)
    assert r.status_code == 200, r.text
    code = r.json()["transfer_code"]
    assert CODE_RE.match(code), f"bad code {code}"
    return {"code": code, "slug": current_slug}


def test_release_wipes_profile(released_code, auth_headers):
    # After release the order is no longer owned by user → /me should not include this slug anymore
    r = requests.get(f"{API}/me", headers=auth_headers)
    slugs = {o.get("profile_slug") for o in r.json().get("orders", [])}
    assert released_code["slug"] not in slugs


def test_reclaim_transfers_and_invalidates_code(released_code):
    new_email = "sandrosantinacci7+new@gmail.com"
    r = requests.post(f"{API}/reclaim", json={"code": released_code["code"], "email": new_email})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "session_token" in d and d.get("slug") == released_code["slug"]

    # Same code should now be invalid (404)
    r2 = requests.post(f"{API}/reclaim", json={"code": released_code["code"], "email": new_email})
    assert r2.status_code == 404

    # New owner can see the slug via /me
    r3 = requests.get(f"{API}/me", headers={"Authorization": f"Bearer {d['session_token']}"})
    assert r3.status_code == 200
    slugs = {o.get("profile_slug") for o in r3.json().get("orders", [])}
    assert released_code["slug"] in slugs

    # Now transfer it BACK to original owner so subsequent test runs stay stable
    # Release again with new owner then reclaim with original email
    rel = requests.post(f"{API}/me/orders/{released_code['slug']}/release",
                        headers={"Authorization": f"Bearer {d['session_token']}"})
    assert rel.status_code == 200
    back_code = rel.json()["transfer_code"]
    rec = requests.post(f"{API}/reclaim", json={"code": back_code, "email": "sandrosantinacci7@gmail.com"})
    assert rec.status_code == 200


def test_reclaim_bad_code():
    r = requests.post(f"{API}/reclaim", json={"code": "ZZZZZZZZ", "email": "x@example.com"})
    assert r.status_code == 404
