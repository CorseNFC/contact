"""Email verification + password reset + subscription gating tests.
Run: cd /app/backend && python -m pytest tests/test_auth_verify_reset.py -v
"""
import os
import uuid

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")

API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

_db = MongoClient(MONGO_URL)[DB_NAME]
users_col = _db["users"]
magic_tokens_col = _db["magic_tokens"]
login_attempts_col = _db["login_attempts"]


@pytest.fixture
def fresh_email():
    email = f"vtest_{uuid.uuid4().hex[:10]}@test.kallitag.fr"
    yield email
    users_col.delete_one({"email": email})
    magic_tokens_col.delete_many({"email": email})
    login_attempts_col.delete_many({"identifier": {"$regex": email}})


def _register(email, password="strongpw1234", name=""):
    return requests.post(f"{API}/auth/register",
                         json={"email": email, "password": password, "name": name}, timeout=10)


def test_register_sets_email_verified_false(fresh_email):
    r = _register(fresh_email)
    assert r.status_code == 200
    d = r.json()
    assert d["email_verified"] is False
    assert d["verification_sent"] is True


def test_register_creates_verify_token(fresh_email):
    _register(fresh_email)
    tok_doc = magic_tokens_col.find_one({"email": fresh_email, "purpose": "verify"})
    assert tok_doc is not None
    assert tok_doc["used"] is False


def test_verify_email_flips_flag(fresh_email):
    _register(fresh_email)
    tok = magic_tokens_col.find_one({"email": fresh_email, "purpose": "verify"})["token"]
    r = requests.post(f"{API}/auth/verify-email", json={"token": tok}, timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert d["email_verified"] is True
    urow = users_col.find_one({"email": fresh_email}, {"_id": 0}) or {}
    assert urow.get("email_verified") is True


def test_verify_email_invalid_token_returns_400():
    r = requests.post(f"{API}/auth/verify-email", json={"token": "not-a-real-token"}, timeout=10)
    assert r.status_code == 400


def test_verify_email_reuse_token_returns_400(fresh_email):
    _register(fresh_email)
    tok = magic_tokens_col.find_one({"email": fresh_email, "purpose": "verify"})["token"]
    requests.post(f"{API}/auth/verify-email", json={"token": tok}, timeout=10)
    r = requests.post(f"{API}/auth/verify-email", json={"token": tok}, timeout=10)
    assert r.status_code == 400


def test_resend_verification_authed(fresh_email):
    tok_login = _register(fresh_email).json()["session_token"]
    r = requests.post(f"{API}/auth/resend-verification",
                      headers={"Authorization": f"Bearer {tok_login}", "origin": "https://kallitag.fr"},
                      timeout=10)
    assert r.status_code == 200
    assert r.json()["ok"] is True
    # a new verify token should have been created (previous one deleted)
    count = magic_tokens_col.count_documents({"email": fresh_email, "purpose": "verify", "used": False})
    assert count == 1


def test_subscribe_blocked_when_unverified(fresh_email):
    _register(fresh_email)
    r = requests.post(f"{API}/subscribe/checkout", json={
        "plan_id": "lead_capture", "interval": "monthly",
        "email": fresh_email, "seats": 1,
        "origin_url": "https://stabilise-pro.preview.emergentagent.com",
    }, timeout=15)
    assert r.status_code == 403
    assert r.json()["detail"] == "email_not_verified"


def test_forgot_password_always_returns_200(fresh_email):
    _register(fresh_email)
    r = requests.post(f"{API}/auth/forgot-password", json={
        "email": fresh_email,
        "origin_url": "https://stabilise-pro.preview.emergentagent.com",
    }, timeout=10)
    assert r.status_code == 200
    # Non-existent user must also return 200 (no email enumeration)
    r2 = requests.post(f"{API}/auth/forgot-password", json={
        "email": f"ghost_{uuid.uuid4().hex[:6]}@nope.com",
        "origin_url": "https://stabilise-pro.preview.emergentagent.com",
    }, timeout=10)
    assert r2.status_code == 200


def test_reset_password_full_flow(fresh_email):
    _register(fresh_email, password="initpw1234")
    requests.post(f"{API}/auth/forgot-password", json={
        "email": fresh_email,
        "origin_url": "https://stabilise-pro.preview.emergentagent.com",
    }, timeout=10)
    tok = magic_tokens_col.find_one({"email": fresh_email, "purpose": "reset"})["token"]
    r = requests.post(f"{API}/auth/reset-password",
                      json={"token": tok, "password": "newpw5678"}, timeout=10)
    assert r.status_code == 200
    assert "session_token" in r.json()
    # Old password no longer works
    assert requests.post(f"{API}/auth/login",
                         json={"email": fresh_email, "password": "initpw1234"}, timeout=10).status_code == 401
    # New password works
    assert requests.post(f"{API}/auth/login",
                         json={"email": fresh_email, "password": "newpw5678"}, timeout=10).status_code == 200


def test_reset_password_invalid_token_returns_400():
    r = requests.post(f"{API}/auth/reset-password",
                      json={"token": "invalid-xyz", "password": "somepw1234"}, timeout=10)
    assert r.status_code == 400
