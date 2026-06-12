import json
import re
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime, timedelta
from app.db import SessionLocal
from app.models.user_entity import UserEntity
from app.models.video_entity import VideoEntity
from app.models.package_entity import PackageEntity
from app.models.credit_transaction_entity import CreditTransactionEntity
from app.models.admin_entity import AdminActionLog
from app.services.render_storage_service import RENDER_ROOT


def _count_step6_video_scenes(since: datetime | None = None) -> int:
    total = 0
    if not RENDER_ROOT.exists():
        return 0

    for history_path in RENDER_ROOT.rglob('history.jsonl'):
        try:
            with history_path.open('r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        event = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    if event.get('step') != 'step6-video':
                        continue

                    timestamp = event.get('timestamp')
                    if since and timestamp:
                        try:
                            event_time = datetime.fromisoformat(timestamp)
                        except ValueError:
                            continue
                        if event_time < since:
                            continue

                    data = event.get('data') or {}
                    try:
                        scene_count = int(data.get('scene_count') or 0)
                    except (TypeError, ValueError):
                        scene_count = 0

                    if scene_count > 0:
                        total += scene_count
        except (OSError, IOError):
            continue

    return total


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
            m = re.search(r"amount_vnd=([0-9]+)", reason)
            if m:
                try:
                    amt = int(m.group(1))
                    if amt > 0:
                        total_revenue_vnd += amt
                except Exception:
                    pass

        today = datetime.utcnow().date()
        videos_today = db.query(VideoEntity).filter(VideoEntity.created_at >= datetime(today.year, today.month, today.day)).count()
        users_today = db.query(UserEntity).filter(UserEntity.created_at >= datetime(today.year, today.month, today.day)).count()

        first_of_month = datetime(today.year, today.month, 1)
        videos_created_total = _count_step6_video_scenes()
        videos_created_this_month = _count_step6_video_scenes(first_of_month)
        users_created_this_month = db.query(UserEntity).filter(UserEntity.created_at >= first_of_month).count()
        recent_users = list_recent_users(7, created_since=first_of_month)
        revenue_by_month = _get_monthly_revenue()

        return {
            'users': int(users_created_this_month),
            'users_total': int(total_users),
            'total_videos': int(total_videos),
            'packages': int(total_packages),
            'transactions': int(total_transactions),
            'credits_used': int(credits_used),
            'total_revenue_vnd': int(total_revenue_vnd),
            'videos_today': int(videos_today),
            'users_today': int(users_today),
            'users_created_this_month': int(users_created_this_month),
            'videos_created_total': int(videos_created_total),
            'videos_created_this_month': int(videos_created_this_month),
            'recent_users': recent_users,
            'revenue_by_month': revenue_by_month,
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


def list_recent_users(limit: int = 50, created_since: datetime | None = None) -> List[dict]:
    with SessionLocal() as db:
        query = db.query(UserEntity)
        if created_since is not None:
            query = query.filter(UserEntity.created_at >= created_since)
        rows = query.order_by(UserEntity.created_at.desc()).limit(limit).all()
        return [
            {
                'id': r.id,
                'username': r.username,
                'email': r.email,
                'created_at': r.created_at.isoformat(),
            }
            for r in rows
        ]


def _get_monthly_revenue() -> List[Dict[str, Any]]:
    today = datetime.utcnow().date()
    first_of_month = datetime(today.year, today.month, 1)
    days_passed = today.day
    daily_revenue = {day: 0 for day in range(1, days_passed + 1)}

    with SessionLocal() as db:
        rows = db.query(CreditTransactionEntity).filter(
            CreditTransactionEntity.reason != None,
            CreditTransactionEntity.created_at >= first_of_month,
            CreditTransactionEntity.created_at < datetime(today.year, today.month, today.day, 23, 59, 59, 999999)
        ).with_entities(CreditTransactionEntity.reason, CreditTransactionEntity.delta, CreditTransactionEntity.created_at).all()

        for reason, delta, created_at in rows:
            if not reason or not created_at:
                continue
            m = re.search(r"amount_vnd=([0-9]+)", reason)
            if not m:
                continue
            try:
                amt = int(m.group(1))
            except Exception:
                continue
            if amt <= 0:
                continue
            day = created_at.day
            if day in daily_revenue:
                daily_revenue[day] += amt

    return [
        {
            'key': f"day-{day}",
            'label': str(day),
            'amount': daily_revenue[day],
        }
        for day in range(1, days_passed + 1)
    ]
