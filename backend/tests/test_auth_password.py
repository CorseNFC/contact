"""End-to-end tests: email + password auth on kallitag.
Run: cd /app/backend && python -m pytest tests/test_auth_password.py -v
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
LC_SECRET = os.environ.get("KALLITAG_SHARED_SECRET", "")

_db = MongoClient(MONGO_URL)[DB_NAME]
users_col = _db["users"]
login_attempts_col = _db["login_attempts"]


@pytest.fixture
def fresh_email():
    email = f"authtest_{uuid.uuid4().hex[:10]}@test.kallitag.fr"
    yield email
    users_col.delete_one({"email": email})
    login_attempts_col.delete_many({"identifier": {"$regex": email}})


def _register(email, password="testpass123", name=""):
    r = requests.post(f"{API}/auth/register",
                      json={"email": email, "password": password, "name": name}, timeout=10)
    return r


def _login(email, password):
    return requests.post(f"{API}/auth/login",
                         json={"email": email, "password": password}, timeout=10)


def test_register_returns_session_token(fresh_email):
    r = _register(fresh_email)
    assert r.status_code == 200
    d = r.json()
    assert d["email"] == fresh_email
    assert d["has_password"] is True
    assert len(d["session_token"]) > 40


def test_register_duplicate_returns_409(fresh_email):
    _register(fresh_email)
    r = _register(fresh_email)
    assert r.status_code == 409


def test_password_too_short_returns_422(fresh_email):
    r = _register(fresh_email, password="short")
    assert r.status_code == 422


def test_login_ok(fresh_email):
    _register(fresh_email, password="strongpass1")
    r = _login(fresh_email, "strongpass1")
    assert r.status_code == 200
    assert r.json()["has_password"] is True


def test_login_wrong_password_returns_401(fresh_email):
    _register(fresh_email, password="rightone")
    r = _login(fresh_email, "wrongone")
    assert r.status_code == 401


def test_me_returns_profile(fresh_email):
    _register(fresh_email, password="mepass1234", name="John Doe")
    tok = _login(fresh_email, "mepass1234").json()["session_token"]
    r = requests.get(f"{API}/me", headers={"Authorization": f"Bearer {tok}"}, timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert d["email"] == fresh_email
    assert d["name"] == "John Doe"
    assert d["has_password"] is True
    assert d["lead_capture_active"] is False


def test_change_password_flow(fresh_email):
    _register(fresh_email, password="initial1234")
    tok = _login(fresh_email, "initial1234").json()["session_token"]
    r = requests.post(f"{API}/auth/change-password",
                      headers={"Authorization": f"Bearer {tok}"},
                      json={"old_password": "initial1234", "new_password": "updated1234"},
                      timeout=10)
    assert r.status_code == 200
    # Old password no longer works
    assert _login(fresh_email, "initial1234").status_code == 401
    # New password works
    assert _login(fresh_email, "updated1234").status_code == 200


def test_change_password_wrong_old_returns_401(fresh_email):
    _register(fresh_email, password="secret1234")
    tok = _login(fresh_email, "secret1234").json()["session_token"]
    r = requests.post(f"{API}/auth/change-password",
                      headers={"Authorization": f"Bearer {tok}"},
                      json={"old_password": "WRONG_OLD", "new_password": "other1234"},
                      timeout=10)
    assert r.status_code == 401


def test_delete_account(fresh_email):
    _register(fresh_email, password="delme1234")
    tok = _login(fresh_email, "delme1234").json()["session_token"]
    r = requests.request("DELETE", f"{API}/auth/delete-account",
                         headers={"Authorization": f"Bearer {tok}"},
                         json={"password": "delme1234"}, timeout=10)
    assert r.status_code == 200
    # Cannot log in after deletion
    assert _login(fresh_email, "delme1234").status_code == 401


def test_bruteforce_lockout_after_5_failures(fresh_email):
    _register(fresh_email, password="lockme1234")
    for _ in range(5):
        _login(fresh_email, "WRONG")
    r = _login(fresh_email, "lockme1234")
    # After 5 failures the identifier is locked → 429 even with correct password
    assert r.status_code == 429


@pytest.mark.skipif(not LC_SECRET, reason="KALLITAG_SHARED_SECRET not set")
def test_lc_auth_accepts_kallitag_password(fresh_email):
    _register(fresh_email, password="lcpass1234")
    r = requests.post(f"{API}/lead-capture/auth",
                      headers={"X-LeadCapture-Secret": LC_SECRET},
                      json={"email": fresh_email, "password": "lcpass1234"}, timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True
    assert d["user"]["email"] == fresh_email


@pytest.mark.skipif(not LC_SECRET, reason="KALLITAG_SHARED_SECRET not set")
def test_lc_auth_rejects_wrong_password(fresh_email):
    _register(fresh_email, password="realpass123")
    r = requests.post(f"{API}/lead-capture/auth",
                      headers={"X-LeadCapture-Secret": LC_SECRET},
                      json={"email": fresh_email, "password": "wrongpass"}, timeout=10)
    assert r.status_code == 401
