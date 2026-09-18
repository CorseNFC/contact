"""Feature-gating: plan / seats / trial ledger on /api/lead-capture/auth."""
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

pytestmark = pytest.mark.skipif(not LC_SECRET, reason="KALLITAG_SHARED_SECRET not set")

_db = MongoClient(MONGO_URL)[DB_NAME]
users_col = _db["users"]
subs_col = _db["subscriptions"]
ledger_col = _db["lead_capture_trial_ledger"]


def _register(email, pw="strongpw1234"):
    return requests.post(f"{API}/auth/register", json={"email": email, "password": pw}, timeout=10)


def _lc_auth(email, pw="strongpw1234"):
    return requests.post(f"{API}/lead-capture/auth",
                         headers={"X-LeadCapture-Secret": LC_SECRET},
                         json={"email": email, "password": pw}, timeout=10)


@pytest.fixture
def fresh_email():
    email = f"gate_{uuid.uuid4().hex[:8]}@test.kallitag.fr"
    yield email
    users_col.delete_one({"email": email})
    subs_col.delete_many({"email": email})
    ledger_col.delete_one({"email": email})  # cleanup only for tests


def test_new_email_gets_trial_and_solo_plan(fresh_email):
    _register(fresh_email)
    d = _lc_auth(fresh_email).json()
    assert d["ok"] is True
    assert d["lead_capture_active"] is True   # trial grants access
    assert d["user"]["plan"] == "solo"
    assert d["user"]["seats"] == {"allowed": 1, "used": 1}
    assert d["trial"]["on_trial"] is True
    assert d["trial"]["days_left"] in (6, 7)  # depending on clock rounding
    assert d["subscription"]["status"] is None
    assert d["subscription"]["plan"] is None  # no paid sub yet


def test_trial_ledger_survives_account_deletion(fresh_email):
    """The whole anti-abuse point — delete the user, re-register: no new trial."""
    _register(fresh_email)
    _lc_auth(fresh_email)  # starts + records the trial
    # Simulate expiring the trial in the ledger + deleting the user account
    ledger_col.update_one({"email": fresh_email},
                          {"$set": {"ends_at": "2020-01-01T00:00:00+00:00"}})
    users_col.delete_one({"email": fresh_email})
    # Recreate the account
    _register(fresh_email)
    d = _lc_auth(fresh_email).json()
    assert d["trial"]["on_trial"] is False, "Trial must NOT restart after deletion"
    assert d["lead_capture_active"] is False  # no paid plan + expired trial


def test_active_sub_solo_returns_solo_plan(fresh_email):
    _register(fresh_email)
    subs_col.insert_one({
        "email": fresh_email, "status": "active", "seats": 1,
        "current_period_end": 1893456000,  # 2030-01-01
        "updated_at": "2026-02-15T10:00:00+00:00",
    })
    d = _lc_auth(fresh_email).json()
    assert d["subscription"]["status"] == "active"
    assert d["subscription"]["plan"] == "solo"
    assert d["subscription"]["seats_allowed"] == 1
    assert d["subscription"]["unit_price_eur"] == 24.90
    assert d["user"]["plan"] == "solo"


def test_active_sub_equipe_5_seats_returns_equipe_plan(fresh_email):
    _register(fresh_email)
    subs_col.insert_one({
        "email": fresh_email, "status": "active", "seats": 5,
        "updated_at": "2026-02-15T10:00:00+00:00",
    })
    d = _lc_auth(fresh_email).json()
    assert d["subscription"]["plan"] == "equipe"
    assert d["subscription"]["seats_allowed"] == 5
    assert d["subscription"]["unit_price_eur"] == 21.90
    assert d["user"]["plan"] == "equipe"
    assert d["user"]["seats"]["allowed"] == 5


def test_active_sub_entreprise_15_seats_returns_floor_price(fresh_email):
    _register(fresh_email)
    subs_col.insert_one({
        "email": fresh_email, "status": "active", "seats": 15,
        "updated_at": "2026-02-15T10:00:00+00:00",
    })
    d = _lc_auth(fresh_email).json()
    assert d["subscription"]["plan"] == "entreprise"
    assert d["subscription"]["seats_allowed"] == 15
    assert d["subscription"]["unit_price_eur"] == 19.90   # floor
    assert d["user"]["plan"] == "entreprise"


def test_canceled_sub_and_expired_trial_denies_access(fresh_email):
    _register(fresh_email)
    _lc_auth(fresh_email)  # start trial
    ledger_col.update_one({"email": fresh_email},
                          {"$set": {"ends_at": "2020-01-01T00:00:00+00:00"}})
    subs_col.insert_one({
        "email": fresh_email, "status": "canceled", "seats": 1,
        "updated_at": "2026-02-15T10:00:00+00:00",
    })
    users_col.update_one({"email": fresh_email}, {"$set": {"lead_capture_active": False}})
    d = _lc_auth(fresh_email).json()
    assert d["lead_capture_active"] is False
    assert d["trial"]["on_trial"] is False
    assert d["subscription"]["plan"] is None


def test_backward_compat_response_keeps_original_keys(fresh_email):
    _register(fresh_email)
    d = _lc_auth(fresh_email).json()
    # v1 keys must remain
    for key in ("ok", "lead_capture_active", "user"):
        assert key in d
    for key in ("id", "email", "name", "company", "company_id", "role", "nfc_card_id"):
        assert key in d["user"]
