"""Idempotent Stripe catalog setup for KalliTag."""
import os
import stripe
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")
stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

CATALOG = [
    {
        "emergent_product_id": "card_prestige",
        "name": "Carte NFC Prestige",
        "tax_code": "txcd_99999999",
        "prices": [
            {"lookup_key": "card_prestige_onetime", "amount": 3990, "currency": "eur"},
        ],
    },
    {
        "emergent_product_id": "plaque_nfc",
        "name": "Plaque NFC KalliTag",
        "tax_code": "txcd_99999999",
        "prices": [
            {"lookup_key": "plaque_nfc_onetime", "amount": 1990, "currency": "eur"},
        ],
    },
    {
        "emergent_product_id": "medaillon_nfc",
        "name": "Médaillon NFC KalliTag",
        "tax_code": "txcd_99999999",
        "prices": [
            {"lookup_key": "medaillon_nfc_onetime", "amount": 1490, "currency": "eur"},
        ],
    },
]


def ensure_tax_settings():
    """Try to set head office to FR so Stripe Tax works in calc_only mode."""
    try:
        s = stripe.tax.Settings.retrieve()
        if s.head_office and getattr(s.head_office, "address", None):
            return
        stripe.tax.Settings.modify(
            head_office={"address": {"country": "FR", "line1": "1 rue de la Paix",
                                      "city": "Paris", "postal_code": "75001"}},
            defaults={"tax_behavior": "inclusive"},
        )
    except stripe.error.StripeError as e:
        print(f"tax settings skipped: {e}")


def get_or_create_product(entry):
    for p in stripe.Product.list(active=True, limit=100).auto_paging_iter():
        if p.to_dict().get("metadata", {}).get("emergent_product_id") == entry["emergent_product_id"]:
            return p
    return stripe.Product.create(
        name=entry["name"],
        tax_code=entry.get("tax_code"),
        metadata={"managed_by": "emergent", "emergent_product_id": entry["emergent_product_id"]},
    )


def main():
    ensure_tax_settings()
    for entry in CATALOG:
        product = get_or_create_product(entry)
        print(f"product {entry['name']}: {product.id}")
        for p in entry["prices"]:
            existing = stripe.Price.list(lookup_keys=[p["lookup_key"]], active=True, limit=1).data
            if existing and (existing[0].unit_amount != p["amount"] or existing[0].currency != p["currency"]):
                stripe.Price.modify(existing[0].id, active=False)
                existing = []
            if not existing:
                kwargs = dict(product=product.id, unit_amount=p["amount"], currency=p["currency"],
                              lookup_key=p["lookup_key"], transfer_lookup_key=True)
                created = stripe.Price.create(**kwargs)
                print(f"  price {p['lookup_key']}: {created.id}")
            else:
                print(f"  price {p['lookup_key']}: exists {existing[0].id}")


if __name__ == "__main__":
    main()
