"""Iteration 4 backend tests: multi-profile variants (Pro gated)."""
import os
import pytest
import requests
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://stabilise-pro.preview.emergentagent.com"
API = f"{BASE_URL}/api"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
_client = MongoClient(MONGO_URL)
_db = _client[DB_NAME]
subscriptions_col = _db["subscriptions"]
orders_col = _db["orders"]

USER_EMAIL = "sandrosantinacci7@gmail.com"
SEED_SUB_ID = "sub_test_seed"


def _token():
    with open("/tmp/session_tok") as f:
        return f.read().strip()


@pytest.fixture(scope="module")
def auth_headers():
    return {"Authorization": f"Bearer {_token()}"}


@pytest.fixture(scope="module")
def slug(auth_headers):
    import time
    # Retry to avoid race with concurrent release/reclaim test in another worker
    for _ in range(20):
        r = requests.get(f"{API}/me", headers=auth_headers)
        assert r.status_code == 200, r.text
        orders = r.json().get("orders", [])
        paid = [o for o in orders if o.get("payment_status") == "paid" and o.get("profile_slug")]
        if paid:
            return paid[0]["profile_slug"]
        time.sleep(1)
    pytest.skip("No slug available after retries")


def _seed_pro():
    subscriptions_col.insert_one({
        "email": USER_EMAIL,
        "status": "active",
        "stripe_subscription_id": SEED_SUB_ID,
        "stripe_customer_id": "cus_test_seed",
        "price_lookup_key": "kallitag_pro_monthly",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })


def _unseed_pro():
    subscriptions_col.delete_one({"stripe_subscription_id": SEED_SUB_ID})


# ---------- Non-Pro path ----------
def test_list_variants_non_pro_returns_empty(auth_headers, slug):
    _unseed_pro()  # ensure not pro
    r = requests.get(f"{API}/me/orders/{slug}/variants", headers=auth_headers)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "variants" in d and isinstance(d["variants"], list)
    assert d["is_pro"] is False


def test_add_variant_non_pro_402(auth_headers, slug):
    _unseed_pro()
    r = requests.post(f"{API}/me/orders/{slug}/variants", headers=auth_headers,
                      json={"label": "Perso", "profile": {"theme_id": "onyx", "finish_id": "noir_mat", "first_name": "S", "last_name": "S"}})
    assert r.status_code == 402, r.text
    assert "Multi-profils réservé à KalliTag Pro" in r.json().get("detail", "")


# ---------- Pro path ----------
def test_pro_flow_full(auth_headers, slug):
    _seed_pro()
    try:
        # (a) create Perso
        r = requests.post(f"{API}/me/orders/{slug}/variants", headers=auth_headers,
                          json={"label": "Perso", "profile": {"theme_id": "onyx", "finish_id": "noir_mat",
                                                                "first_name": "Sandro", "last_name": "Perso"}})
        assert r.status_code == 200, r.text
        d = r.json()
        vid_perso = d["id"]
        assert isinstance(vid_perso, str) and len(vid_perso) > 0
        assert len(d["variants"]) >= 1

        # (b) create Pro variant
        r = requests.post(f"{API}/me/orders/{slug}/variants", headers=auth_headers,
                          json={"label": "Pro", "profile": {"theme_id": "midnight", "finish_id": "metal_brosse",
                                                             "first_name": "Sandro", "last_name": "Pro",
                                                             "job_title": "CEO", "company": "KalliTag"}})
        assert r.status_code == 200, r.text
        vid_pro = r.json()["id"]

        # (c) GET variants → 2 + is_pro=True
        r = requests.get(f"{API}/me/orders/{slug}/variants", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["is_pro"] is True
        labels = [v["label"] for v in d["variants"]]
        assert "Perso" in labels and "Pro" in labels
        assert len([v for v in d["variants"] if v["id"] in (vid_perso, vid_pro)]) == 2

        # (d) Activate Pro variant
        r = requests.post(f"{API}/me/orders/{slug}/activate/{vid_pro}", headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "ok"
        assert d["active_variant_id"] == vid_pro
        assert d["profile"]["first_name"] == "Sandro"
        assert d["profile"]["last_name"] == "Pro"

        # (e) Public profile now reflects Pro variant
        r = requests.get(f"{API}/profile/{slug}")
        assert r.status_code == 200
        pub = r.json()
        assert pub["profile"]["last_name"] == "Pro"
        assert pub["profile"]["job_title"] == "CEO"

        # (f) Delete Perso
        r = requests.delete(f"{API}/me/orders/{slug}/variants/{vid_perso}", headers=auth_headers)
        assert r.status_code == 200
        remaining_ids = [v["id"] for v in r.json()["variants"]]
        assert vid_perso not in remaining_ids
        assert vid_pro in remaining_ids

        # (g) Max 5: add until 5 total, then 6th should fail
        # Currently 1 remaining (Pro). Add 4 more → 5 total. Then 6th → 400.
        added_ids = []
        for i in range(4):
            r = requests.post(f"{API}/me/orders/{slug}/variants", headers=auth_headers,
                              json={"label": f"V{i}", "profile": {"theme_id": "onyx", "finish_id": "noir_mat",
                                                                    "first_name": "X", "last_name": str(i)}})
            assert r.status_code == 200, f"add #{i} failed: {r.text}"
            added_ids.append(r.json()["id"])

        r = requests.post(f"{API}/me/orders/{slug}/variants", headers=auth_headers,
                          json={"label": "TooMany", "profile": {"theme_id": "onyx", "finish_id": "noir_mat",
                                                                  "first_name": "X", "last_name": "6"}})
        assert r.status_code == 400, r.text
        assert "Maximum 5" in r.json().get("detail", "")

        # Cleanup all variants for a stable env for next iteration
        r = requests.get(f"{API}/me/orders/{slug}/variants", headers=auth_headers)
        for v in r.json()["variants"]:
            requests.delete(f"{API}/me/orders/{slug}/variants/{v['id']}", headers=auth_headers)
    finally:
        _unseed_pro()


# ---------- Ownership ----------
def test_add_variant_wrong_slug(auth_headers):
    _seed_pro()
    try:
        r = requests.post(f"{API}/me/orders/nonexistent-slug-xyz-999/variants",
                          headers=auth_headers,
                          json={"label": "X", "profile": {"theme_id": "onyx", "finish_id": "noir_mat",
                                                            "first_name": "X", "last_name": "Y"}})
        assert r.status_code in (403, 404), r.text
    finally:
        _unseed_pro()


def test_add_variant_someone_elses_slug(auth_headers):
    # Find any slug NOT owned by our user
    _seed_pro()
    try:
        other = orders_col.find_one({
            "profile_slug": {"$exists": True, "$ne": None},
            "contact_email": {"$not": {"$regex": f"^{USER_EMAIL}$", "$options": "i"}},
        }, {"_id": 0, "profile_slug": 1})
        if not other:
            pytest.skip("No other-owner slug to test")
        r = requests.post(f"{API}/me/orders/{other['profile_slug']}/variants",
                          headers=auth_headers,
                          json={"label": "X", "profile": {"theme_id": "onyx", "finish_id": "noir_mat",
                                                            "first_name": "X", "last_name": "Y"}})
        assert r.status_code in (403, 404), r.text
    finally:
        _unseed_pro()


# ---------- Auth ----------
def test_variants_requires_auth(slug):
    r = requests.get(f"{API}/me/orders/{slug}/variants")
    assert r.status_code == 401


def test_final_cleanup_pro_seed():
    # Absolutely ensure the seeded subscription is gone at end
    _unseed_pro()
    assert subscriptions_col.find_one({"stripe_subscription_id": SEED_SUB_ID}) is None
