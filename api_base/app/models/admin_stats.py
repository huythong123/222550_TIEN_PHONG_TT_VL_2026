from typing import Dict, Any, List
from datetime import datetime, timedelta
from app.db import SessionLocal
from app.models.user_entity import UserEntity
from app.models.video_entity import VideoEntity
from app.models.package_entity import PackageEntity
from app.models.credit_transaction_entity import CreditTransactionEntity
from app.models.admin_entity import AdminActionLog
import re


def get_dashboard_stats() -> Dict[str, Any]:
    with SessionLocal() as db:
        total_users = db.query(UserEntity).count()
        total_videos = db.query(VideoEntity).count()
        total_packages = db.query(PackageEntity).count()
        total_transactions = db.query(CreditTransactionEntity).count()

        # credits_used: sum of negative deltas
        credits_used_row = db.query(CreditTransactionEntity).with_entities(
            (CreditTransactionEntity.delta).label('delta')
        ).all()
        credits_used = sum([-r.delta for r in credits_used_row if r.delta and r.delta < 0])

        # total_revenue_vnd: parse amount_vnd=NUMBER from reason for positive transactions
        total_revenue_vnd = 0
        rows_with_reason = db.query(CreditTransactionEntity).filter(CreditTransactionEntity.reason != None).with_entities(CreditTransactionEntity.reason, CreditTransactionEntity.delta).all()
        for reason, delta in rows_with_reason:
            if not reason:
                continue
            # look for amount_vnd=NUMBER in reason string
            m = re.search(r"amount_vnd=([0-9]+)", reason)
            if m:
                try:
                    amt = int(m.group(1))
                    # only count positive payment amounts
                    if amt > 0:
                        total_revenue_vnd += amt
                except Exception:
                    pass

        today = datetime.utcnow().date()
        tomorrow = today + timedelta(days=1)
        videos_today = db.query(VideoEntity).filter(VideoEntity.created_at >= datetime(today.year, today.month, today.day)).count()
        users_today = db.query(UserEntity).filter(UserEntity.created_at >= datetime(today.year, today.month, today.day)).count()

        return {
            'total_users': int(total_users),
            'total_videos': int(total_videos),
            'total_packages': int(total_packages),
            'total_transactions': int(total_transactions),
            'credits_used': int(credits_used),
            'total_revenue_vnd': int(total_revenue_vnd),
            'videos_today': int(videos_today),
            'users_today': int(users_today),
        }


def list_recent_activities(limit: int = 50) -> List[dict]:
    # Combine admin logs and credit transactions for a simple recent activity feed
    with SessionLocal() as db:
        admin_logs = db.query(AdminActionLog).order_by(AdminActionLog.id.desc()).limit(limit).all()
        tx = db.query(CreditTransactionEntity).order_by(CreditTransactionEntity.id.desc()).limit(limit).all()

        activities = []
        for a in admin_logs:
            activities.append({
                'type': 'admin_action',
                'id': a.id,
                'admin_user_id': a.admin_user_id,
                'action': a.action_type,
                'target_user_id': a.target_user_id,
                'details': a.details,
                'created_at': a.created_at.isoformat(),
            })
        for t in tx:
            activities.append({
                'type': 'transaction',
                'id': t.id,
                'user_id': t.user_id,
                'delta': t.delta,
                'reason': t.reason,
                'created_by': t.created_by,
                'created_at': t.created_at.isoformat(),
            })

        # sort by created_at desc
        activities.sort(key=lambda x: x.get('created_at') or '', reverse=True)
        return activities[:limit]


def list_recent_users(limit: int = 50) -> List[dict]:
    with SessionLocal() as db:
        rows = db.query(UserEntity).order_by(UserEntity.created_at.desc()).limit(limit).all()
        return [
            {
                'id': r.id,
                'username': r.username,
                'email': r.email,
                'created_at': r.created_at.isoformat(),
            }
            for r in rows
        ]
