#!/usr/bin/env python3

import sys
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, PROJECT_ROOT)

from app.models.user_models import UserCreate
from app.models.user_store import create_user


def main():
    username = input("Nhập username: ")
    password = input("Nhập password: ")

    payload = UserCreate(
        username=username,
        password=password,
        email=None,
        role="user"
    )

    try:
        user = create_user(payload)
        print(f"Tạo thành công user: {user['username']}")
    except Exception as e:
        print(f"Lỗi: {e}")


if __name__ == "__main__":
    main()