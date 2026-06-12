from app.models.settings_store import get_setting
from app.config import settings

def get_db_setting(key: str, default: str = '') -> str:
    s = get_setting(key)
    if s and s.get('value'):
        return s['value']
    return str(getattr(settings, key, default) or default)
