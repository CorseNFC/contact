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
