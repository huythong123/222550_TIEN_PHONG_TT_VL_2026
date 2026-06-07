#!/usr/bin/env python3
"""Create an admin user in the application's database.
Usage: python create_admin.py USERNAME PASSWORD [EMAIL]
If EMAIL is omitted the user will be created without an email (email_verified=True).
"""
import sys
import os

# Ensure package imports work when running from scripts/
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, PROJECT_ROOT)

from app.models.user_models import UserCreate
from app.models.user_store import create_user


def main():
    if len(sys.argv) < 3:
        print("Usage: python create_admin.py USERNAME PASSWORD [EMAIL]")
        return

    username = sys.argv[1]
    password = sys.argv[2]
    email = sys.argv[3] if len(sys.argv) > 3 else None

    payload = UserCreate(username=username, password=password, email=email, role='admin')
    try:
        u = create_user(payload)
        print("Admin created:")
        print(f"  id: {u['id']}")
        print(f"  username: {u['username']}")
        print(f"  email: {u.get('email')}")
    except Exception as e:
        print("Failed to create admin:", e)


if __name__ == '__main__':
    main()
