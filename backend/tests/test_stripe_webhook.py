"""End-to-end test: Stripe webhook toggles users_col.lead_capture_active.

Run locally with:
    cd /app/backend && python -m pytest tests/test_stripe_webhook.py -v

Requires STRIPE_WEBHOOK_SECRET in /app/backend/.env (any non-empty string works
here since we sign the payload ourselves with that same secret).
"""
import os
import json
import time
import hmac
import hashlib
import uuid

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")

API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
WH_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

_db = MongoClient(MONGO_URL)[DB_NAME]
users_col = _db["users"]


def _sign(payload: str, secret: str) -> str:
    """Reproduce Stripe's signature scheme: t=<ts>,v1=<hmac-sha256>."""
    ts = str(int(time.time()))
    signed = f"{ts}.{payload}".encode()
    v1 = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f"t={ts},v1={v1}"


def _post_event(event_type: str, obj: dict) -> requests.Response:
    body = json.dumps({
        "id": f"evt_test_{uuid.uuid4().hex[:12]}",
        "type": event_type,
        "data": {"object": obj},
    }, separators=(",", ":"))
    return requests.post(
        f"{API}/api/stripe/webhook",
        data=body,
        headers={
            "Content-Type": "application/json",
            "stripe-signature": _sign(body, WH_SECRET),
        },
        timeout=15,
    )


@pytest.fixture
def test_email():
    email = f"lc_wh_{uuid.uuid4().hex[:8]}@test.kallitag.fr"
    yield email
    users_col.delete_one({"email": email})


def _read_user(email: str) -> dict:
    return users_col.find_one({"email": email}, {"_id": 0}) or {}


@pytest.mark.skipif(not WH_SECRET, reason="STRIPE_WEBHOOK_SECRET not set")
def test_bad_signature_returns_400():
    r = requests.post(
        f"{API}/api/stripe/webhook",
        data='{"type":"invoice.paid"}',
        headers={"stripe-signature": "t=1,v1=deadbeef"},
        timeout=10,
    )
    assert r.status_code == 400


@pytest.mark.skipif(not WH_SECRET, reason="STRIPE_WEBHOOK_SECRET not set")
def test_checkout_subscription_activates_lc(test_email):
    r = _post_event("checkout.session.completed", {
        "id": "cs_test_" + uuid.uuid4().hex[:12],
        "mode": "subscription",
        "customer": "cus_test_" + uuid.uuid4().hex[:12],
        "customer_email": test_email,
        "customer_details": {"email": test_email},
        "metadata": {"plan_id": "lead_capture", "email": test_email},
    })
    assert r.status_code == 200
    assert r.json() == {"received": True}
    u = _read_user(test_email)
    assert u.get("lead_capture_active") is True
    assert u.get("stripe_customer_id", "").startswith("cus_test_")


@pytest.mark.skipif(not WH_SECRET, reason="STRIPE_WEBHOOK_SECRET not set")
def test_invoice_paid_activates_lc(test_email):
    r = _post_event("invoice.paid", {
        "id": "in_test_" + uuid.uuid4().hex[:12],
        "customer": "cus_test_" + uuid.uuid4().hex[:12],
        "customer_email": test_email,
        "subscription": "sub_test_" + uuid.uuid4().hex[:12],
    })
    assert r.status_code == 200
    assert _read_user(test_email).get("lead_capture_active") is True


@pytest.mark.skipif(not WH_SECRET, reason="STRIPE_WEBHOOK_SECRET not set")
def test_invoice_payment_failed_deactivates_lc(test_email):
    # First activate
    _post_event("invoice.paid", {
        "id": "in_test_" + uuid.uuid4().hex[:12],
        "customer": "cus_test_" + uuid.uuid4().hex[:12],
        "customer_email": test_email,
    })
    assert _read_user(test_email).get("lead_capture_active") is True
    # Then fail
    r = _post_event("invoice.payment_failed", {
        "id": "in_test_" + uuid.uuid4().hex[:12],
        "customer": "cus_test_" + uuid.uuid4().hex[:12],
        "customer_email": test_email,
    })
    assert r.status_code == 200
    assert _read_user(test_email).get("lead_capture_active") is False


@pytest.mark.skipif(not WH_SECRET, reason="STRIPE_WEBHOOK_SECRET not set")
def test_unknown_email_returns_200_no_crash():
    """Stripe must never retry — always respond 200 even when we can't map the user."""
    r = _post_event("invoice.paid", {
        "id": "in_test_" + uuid.uuid4().hex[:12],
        "customer": "cus_ghost_" + uuid.uuid4().hex[:12],
        # no customer_email → helper _lc_set_active is a no-op
    })
    assert r.status_code == 200
    assert r.json() == {"received": True}


@pytest.mark.skipif(not WH_SECRET, reason="STRIPE_WEBHOOK_SECRET not set")
def test_customer_id_priority_no_email_needed():
    """When a user already has stripe_customer_id, subsequent events with only
    'customer' (no email) must still toggle the flag."""
    email = f"lc_prio_{uuid.uuid4().hex[:8]}@test.kallitag.fr"
    cust_id = "cus_prio_" + uuid.uuid4().hex[:12]
    # Seed: user with the mapping already known
    users_col.insert_one({
        "id": str(uuid.uuid4()),
        "email": email,
        "role": "MANAGER",
        "stripe_customer_id": cust_id,
        "lead_capture_active": False,
        "created_at": "2026-02-01T00:00:00+00:00",
    })
    try:
        # invoice.paid with ONLY the customer id
        r = _post_event("invoice.paid", {
            "id": "in_" + uuid.uuid4().hex[:12],
            "customer": cust_id,
        })
        assert r.status_code == 200
        u = users_col.find_one({"email": email}, {"_id": 0}) or {}
        assert u.get("lead_capture_active") is True, "customer_id lookup should have activated"
        # invoice.payment_failed with ONLY the customer id → should deactivate
        r = _post_event("invoice.payment_failed", {
            "id": "in_" + uuid.uuid4().hex[:12],
            "customer": cust_id,
        })
        assert r.status_code == 200
        u = users_col.find_one({"email": email}, {"_id": 0}) or {}
        assert u.get("lead_capture_active") is False
    finally:
        users_col.delete_one({"email": email})


@pytest.mark.skipif(not WH_SECRET, reason="STRIPE_WEBHOOK_SECRET not set")
def test_client_reference_id_activates_user():
    """checkout.session.completed with client_reference_id must match users_col.id."""
    email = f"lc_cref_{uuid.uuid4().hex[:8]}@test.kallitag.fr"
    user_id = str(uuid.uuid4())
    users_col.insert_one({
        "id": user_id,
        "email": email,
        "role": "MANAGER",
        "lead_capture_active": False,
        "created_at": "2026-02-01T00:00:00+00:00",
    })
    try:
        r = _post_event("checkout.session.completed", {
            "id": "cs_" + uuid.uuid4().hex[:12],
            "mode": "subscription",
            "customer": "cus_" + uuid.uuid4().hex[:12],
            "client_reference_id": user_id,
            # no customer_email → forces client_reference_id path
            "metadata": {"plan_id": "lead_capture"},
        })
        assert r.status_code == 200
        u = users_col.find_one({"id": user_id}, {"_id": 0}) or {}
        assert u.get("lead_capture_active") is True
        assert u.get("stripe_customer_id", "").startswith("cus_")
    finally:
        users_col.delete_one({"id": user_id})


# ============================================================
# Lead Capture SSO — /api/lead-capture/leads
# ============================================================
LC_SECRET = os.environ.get("KALLITAG_SHARED_SECRET", "")
leads_col = _db["leads"]


@pytest.mark.skipif(not LC_SECRET, reason="KALLITAG_SHARED_SECRET not set")
def test_lc_leads_requires_shared_secret():
    r = requests.get(f"{API}/api/lead-capture/leads",
                     params={"email": "x@example.com"}, timeout=10)
    assert r.status_code == 401
    r = requests.get(f"{API}/api/lead-capture/leads",
                     params={"email": "x@example.com"},
                     headers={"X-LeadCapture-Secret": "WRONG"}, timeout=10)
    assert r.status_code == 401


@pytest.mark.skipif(not LC_SECRET, reason="KALLITAG_SHARED_SECRET not set")
def test_lc_leads_returns_owner_leads():
    owner = f"lc_leads_owner_{uuid.uuid4().hex[:8]}@test.kallitag.fr"
    # Seed 3 leads across two slugs owned by this user
    inserted_ids = []
    for i in range(3):
        doc = {
            "id": str(uuid.uuid4()),
            "profile_slug": f"slug-{i % 2}",
            "owner_email": owner,
            "name": f"Visitor {i}",
            "email": f"v{i}@example.com",
            "phone": "",
            "message": "hello",
            "created_at": f"2026-02-0{i+1}T10:00:00+00:00",
        }
        leads_col.insert_one(doc)
        inserted_ids.append(doc["id"])
    try:
        r = requests.get(f"{API}/api/lead-capture/leads",
                         params={"email": owner},
                         headers={"X-LeadCapture-Secret": LC_SECRET},
                         timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["email"] == owner
        assert data["count"] == 3
        assert data["leads"][0]["created_at"] > data["leads"][-1]["created_at"]  # sorted desc
        # since filter
        r2 = requests.get(f"{API}/api/lead-capture/leads",
                          params={"email": owner, "since": "2026-02-02T00:00:00+00:00"},
                          headers={"X-LeadCapture-Secret": LC_SECRET}, timeout=10)
        assert r2.json()["count"] == 2
    finally:
        leads_col.delete_many({"owner_email": owner})
