import requests
from app.config import settings

SEPAY_BASE_URL = "https://my.sepay.vn/userapi/transactions/list"


def get_last_transactions(limit: int = 20) -> list:
    headers = {
        "Authorization": f"Bearer {getattr(settings, 'SEPAY_API_KEY', '')}",
        "Content-Type": "application/json"
    }
    params = {
        "account_number": getattr(settings, 'SEPAY_ACCOUNT_NUMBER', ''),
        "limit": limit
    }

    try:
        response = requests.get(SEPAY_BASE_URL, headers=headers, params=params, timeout=10)
        try:
            response.raise_for_status()
        except requests.RequestException as re:
            # Log status and body for easier debugging (e.g., 401 Unauthorized)
            try:
                body = response.text
            except Exception:
                body = '<unreadable body>'
            print(f"SePay API returned HTTP {response.status_code}: {body}")
            raise
        data = response.json()
        return data.get("transactions", [])
    except requests.RequestException as e:
        print(f"Loi goi SePay API: {e}")
        return []
