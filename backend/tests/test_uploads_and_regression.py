"""Backend tests for KalliTag iteration 2: avatar uploads (guest + auth), file serving,
and regression on products/auth/QR/scan/analytics endpoints."""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://stabilise-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SEEDED_SLUG = "sandro-santinacci-e2de7e"


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


# ---------------- 1x1 PNG bytes ----------------
PNG_1x1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf"
    b"\xc0\x00\x00\x00\x03\x00\x01\x00\x00\x18\xdd\x8d\xb0\x00\x00\x00"
    b"\x00IEND\xaeB`\x82"
)


# ============ /api/upload-avatar-guest ============
class TestGuestAvatarUpload:
    def test_guest_upload_png_ok(self):
        files = {"file": ("test.png", io.BytesIO(PNG_1x1), "image/png")}
        r = requests.post(f"{API}/upload-avatar-guest", files=files)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "path" in d and "url" in d
        assert d["url"].startswith("/api/files/")
        # verify served
        r2 = requests.get(f"{BASE_URL}{d['url']}")
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("image/")
        pytest.guest_uploaded_path = d["path"]

    def test_guest_upload_rejects_bad_content_type(self):
        files = {"file": ("bad.txt", io.BytesIO(b"hello"), "text/plain")}
        r = requests.post(f"{API}/upload-avatar-guest", files=files)
        assert r.status_code == 400

    def test_guest_upload_rejects_oversize(self):
        big = b"\x00" * (5 * 1024 * 1024 + 10)
        files = {"file": ("big.png", io.BytesIO(big), "image/png")}
        r = requests.post(f"{API}/upload-avatar-guest", files=files)
        assert r.status_code == 400


# ============ /api/upload-avatar (auth) ============
class TestAuthAvatarUpload:
    def test_upload_requires_auth(self):
        files = {"file": ("t.png", io.BytesIO(PNG_1x1), "image/png")}
        r = requests.post(f"{API}/upload-avatar", files=files)
        assert r.status_code == 401

    def test_upload_with_token_ok(self, token):
        files = {"file": ("t.png", io.BytesIO(PNG_1x1), "image/png")}
        r = requests.post(f"{API}/upload-avatar", files=files, headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["url"].startswith("/api/files/")
        # Serve
        r2 = requests.get(f"{BASE_URL}{d['url']}")
        assert r2.status_code == 200

    def test_upload_bad_type_auth(self, token):
        files = {"file": ("f.txt", io.BytesIO(b"hi"), "text/plain")}
        r = requests.post(f"{API}/upload-avatar", files=files, headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 400


# ============ /api/files ============
class TestFilesServe:
    def test_files_invalid_path(self):
        r = requests.get(f"{API}/files/../etc/passwd")
        assert r.status_code in (400, 404)


# ============ Regression /api/products ============
def test_products_regression():
    r = requests.get(f"{API}/products")
    assert r.status_code == 200
    d = r.json()
    finish_ids = {f["id"] for f in d["finishes"]}
    theme_ids = {t["id"] for t in d["themes"]}
    assert finish_ids == {"noir_mat", "metal_brosse", "or_brosse"}
    assert {"onyx", "ivory", "midnight", "rose"}.issubset(theme_ids)


# ============ Regression /api/checkout with new schema ============
def test_checkout_with_avatar_url():
    payload = {
        "product_id": "card_prestige",
        "quantity": 1,
        "profile": {
            "theme_id": "onyx",
            "finish_id": "metal_brosse",
            "first_name": "Alice",
            "last_name": "Test",
            "avatar_url": "https://example.com/a.png",
        },
        "shipping": {
            "full_name": "Alice Test",
            "line1": "1 rue de Test",
            "city": "Paris",
            "postal_code": "75001",
            "country": "FR",
        },
        "contact_email": "TEST_alice@example.com",
        "origin_url": BASE_URL,
    }
    r = requests.post(f"{API}/checkout", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "checkout_url" in d and "checkout.stripe.com" in d["checkout_url"]


# ============ Regression auth ============
def test_request_link():
    r = requests.post(f"{API}/auth/request-link", json={"email": "TEST_someone@example.com", "origin_url": BASE_URL})
    assert r.status_code == 200
    assert r.json().get("status") in ("ok", "sent")


def test_me_requires_auth():
    r = requests.get(f"{API}/me")
    assert r.status_code == 401


def test_me_with_token(token):
    r = requests.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    d = r.json()
    assert "email" in d


# ============ Regression QR + scan + analytics ============
def test_qr_png():
    r = requests.get(f"{API}/profile/{SEEDED_SLUG}/qr.png")
    assert r.status_code == 200
    assert r.headers.get("content-type") == "image/png"
    assert r.content[:8] == b"\x89PNG\r\n\x1a\n"


def test_scan_event():
    r = requests.post(f"{API}/profile/{SEEDED_SLUG}/scan", json={"referrer": "test", "user_agent": "pytest"})
    assert r.status_code == 200


def test_analytics_requires_auth():
    r = requests.get(f"{API}/me/analytics/{SEEDED_SLUG}")
    assert r.status_code == 401


def test_analytics_with_token(token):
    r = requests.get(f"{API}/me/analytics/{SEEDED_SLUG}", headers={"Authorization": f"Bearer {token}"})
    # 200 if owner match, else 403; must not 500
    assert r.status_code in (200, 403, 404)
