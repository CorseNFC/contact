"""Public /api/profile/{slug} shape + Lead Capture alias tests."""
import os
import uuid

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")

API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
LC_SECRET = os.environ.get("KALLITAG_SHARED_SECRET", "")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

_db = MongoClient(MONGO_URL)[DB_NAME]
orders_col = _db["orders"]


@pytest.fixture
def seeded_slug():
    slug = f"itest-{uuid.uuid4().hex[:8]}"
    orders_col.insert_one({
        "profile_slug": slug,
        "payment_status": "paid",
        "product_id": "kt_prestige",
        "product_name": "Carte NFC Prestige",
        "profile": {
            "first_name": "Jean",
            "last_name": "Dupont",
            "job_title": "CEO",
            "company": "Acme SA",
            "email": "jean@acme.com",
            "phone": "+33 6 00 00 00 00",
            "links": {"website": "https://acme.com", "linkedin": "https://www.linkedin.com/in/jean"},
        },
    })
    yield slug
    orders_col.delete_one({"profile_slug": slug})


def test_profile_returns_normalized_shape(seeded_slug):
    r = requests.get(f"{API}/profile/{seeded_slug}", timeout=10)
    assert r.status_code == 200
    p = r.json()["profile"]
    assert set(["firstName", "lastName", "company", "role", "email", "phone", "website", "linkedin"]).issubset(p.keys())
    assert p["firstName"] == "Jean"
    assert p["lastName"] == "Dupont"
    assert p["company"] == "Acme SA"
    assert p["role"] == "CEO"
    assert p["email"] == "jean@acme.com"
    assert p["website"] == "https://acme.com"
    assert p["linkedin"] == "https://www.linkedin.com/in/jean"


def test_profile_missing_returns_404():
    r = requests.get(f"{API}/profile/does-not-exist-{uuid.uuid4().hex[:8]}", timeout=10)
    assert r.status_code == 404


def test_profile_splits_full_name_when_no_first_last():
    slug = f"itest-fn-{uuid.uuid4().hex[:8]}"
    orders_col.insert_one({
        "profile_slug": slug, "payment_status": "paid", "product_id": "kt_prestige",
        "profile": {"name": "Marie Curie", "company": "Sorbonne"},
    })
    try:
        r = requests.get(f"{API}/profile/{slug}", timeout=10)
        p = r.json()["profile"]
        assert p["firstName"] == "Marie"
        assert p["lastName"] == "Curie"
    finally:
        orders_col.delete_one({"profile_slug": slug})


@pytest.mark.skipif(not LC_SECRET, reason="KALLITAG_SHARED_SECRET not set")
def test_leadcapture_alias_no_hyphen_works():
    """LC spec uses /api/leadcapture/auth (no hyphen) — must also work."""
    r = requests.post(f"{API}/leadcapture/auth",
                      json={"email": "nobody@example.com", "password": "nope"}, timeout=10)
    assert r.status_code == 401  # invalid_shared_secret

    r2 = requests.post(f"{API}/leadcapture/auth",
                       headers={"X-LeadCapture-Secret": LC_SECRET},
                       json={"email": "nobody@example.com", "password": "nope"}, timeout=10)
    assert r2.status_code == 401
    assert r2.json()["detail"] == "invalid_credentials"


@pytest.mark.skipif(not LC_SECRET, reason="KALLITAG_SHARED_SECRET not set")
def test_leadcapture_hyphen_still_works():
    """Backward-compat: /api/lead-capture/auth must keep working."""
    r = requests.post(f"{API}/lead-capture/auth",
                      headers={"X-LeadCapture-Secret": LC_SECRET},
                      json={"email": "nobody@example.com", "password": "nope"}, timeout=10)
    assert r.status_code == 401
