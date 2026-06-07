#!/usr/bin/env python3
"""Create two local test users: test1 and test2 with password '123'.
Usage: python create_test_users.py
"""
import sys
import os

# Ensure package imports work when running from scripts/
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, PROJECT_ROOT)

from app.models.user_models import UserCreate
from app.models.user_store import create_user


def make_user(username, password):
    payload = UserCreate(username=username, password=password, email=None, role='user')
    try:
        u = create_user(payload)
        print(f"Created user {username} (id={u['id']})")
    except Exception as e:
        print(f"Could not create {username}: {e}")


def main():
    make_user('test1', '123')
    make_user('test2', '123')


if __name__ == '__main__':
    main()
