#!/usr/bin/env python3
import sys, json
sys.path.insert(0, r'D:\NghienCuuBaoCaoKhoaHoc\AutoAds_System\api_base')
from app.db import SessionLocal
from app.models.user_entity import UserEntity

s = SessionLocal()
try:
    u = s.query(UserEntity).filter(UserEntity.username == 'admin').first()
    if not u:
        print('ADMIN_NOT_FOUND')
        sys.exit(2)
    u.is_admin = False
    s.commit()
    print(json.dumps({'id': u.id, 'username': u.username, 'is_admin': bool(u.is_admin)}, ensure_ascii=False))
finally:
    s.close()
