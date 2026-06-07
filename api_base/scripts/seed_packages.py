"""
Seed default packages for admin payments.

Run with:
    py scripts\seed_packages.py

This will create three default packages only if none exist.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.models.package_store import list_packages, create_package

def main():
    existing = list_packages()
    if existing and len(existing) > 0:
        print('Packages already exist:')
        for p in existing:
            print(f" - {p['id']}: {p['name']} ({p['credits']} credits) {p['price_cents']} cents")
        return

    defaults = [
        {'name': 'Starter', 'credits': 30, 'price_vnd': 2000},
        {'name': 'Standard', 'credits': 80, 'price_vnd': 5000},
        {'name': 'Pro', 'credits': 200, 'price_vnd': 10000},
    ]

    for d in defaults:
        price_cents = int(d['price_vnd'] * 100)
        p = create_package(d['name'], d['credits'], price_cents, description='Default seed package')
        print(f"Created package {p['id']}: {p['name']} {p['credits']} credits, {p['price_cents']} cents")

    print('Seeding complete.')

if __name__ == '__main__':
    main()
