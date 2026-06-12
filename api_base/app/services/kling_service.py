import httpx
import logging
import time
import jwt
from typing import Optional, Dict, Any
from app.config import settings
from app.models.settings_store import get_setting

logger = logging.getLogger(__name__)


class KlingService:
    BASE = "https://api-singapore.klingai.com/v1/videos/text2video"

    def __init__(self, api_key: Optional[str] = None):
        # legacy: api_key may be provided, but prefer settings
        self.api_key = api_key or settings.KLING_API_KEY

    def _headers(self) -> Dict[str, str]:
        token = self.generate_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def generate_token(self) -> str:
        # Prefer values stored in system settings (DB) so admin can update keys at runtime
        ak_entry = get_setting('KLING_ACCESS_KEY')
        sk_entry = get_setting('KLING_API_KEY')
        ak = ak_entry.get('value') if ak_entry else getattr(settings, 'KLING_ACCESS_KEY', None)
        sk = sk_entry.get('value') if sk_entry else getattr(settings, 'KLING_API_KEY', None)
        if not ak or not isinstance(ak, str) or not ak.strip():
            raise RuntimeError('KLING_ACCESS_KEY is not configured')
        if not sk or not isinstance(sk, str) or not sk.strip():
            raise RuntimeError('KLING_API_KEY (secret) is not configured')

        headers = {"alg": "HS256", "typ": "JWT"}
        now = int(time.time())
        payload = {"iss": ak, "exp": now + 1800, "nbf": now - 5}

        token = jwt.encode(payload, sk, algorithm="HS256", headers=headers)
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        return token

    async def submit_text2video(
        self,
        prompt: str,
        model_name: str = "kling-v2-6",
        duration: str = "5",
        mode: str = "std",
        sound: str = "off",
        aspect_ratio: str = "9:16",
    ) -> str:
        # ensure keys exist; generate_token will validate

        payload = {
            "model_name": model_name,
            "prompt": prompt,
            "duration": str(duration),
            "mode": mode,
            "sound": sound,
            "aspect_ratio": aspect_ratio,
        }

        timeout = httpx.Timeout(30.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                resp = await client.post(self.BASE, headers=self._headers(), json=payload)
            except httpx.HTTPError as e:
                logger.exception("Kling submit request failed")
                raise RuntimeError(f"Network error when submitting to Kling: {e}")

        if resp.status_code not in (200, 201):
            logger.error("Kling submit error: %s", resp.text)
            raise RuntimeError(f"Kling API returned {resp.status_code}: {resp.text}")

        root = resp.json()
        task_id = root.get("data", {}).get("task_id")
        if not task_id:
            raise RuntimeError(f"Unable to determine task id from Kling response: {root}")
        return str(task_id)

    async def check_status(self, task_id: str) -> Dict[str, Any]:
        # ensure keys exist; generate_token will validate

        url = f"{self.BASE}/{task_id}"
        timeout = httpx.Timeout(20.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                resp = await client.get(url, headers=self._headers())
            except httpx.HTTPError as e:
                logger.exception("Kling status request failed")
                raise RuntimeError(f"Network error when checking Kling status: {e}")

        if resp.status_code != 200:
            logger.error("Kling status returned %s: %s", resp.status_code, resp.text)
            raise RuntimeError(f"Kling status API returned {resp.status_code}: {resp.text}")

        root = resp.json()
        data = root.get("data", {})
        status = data.get("task_status") or data.get("status")
        result_url = None
        task_result = data.get("task_result") or {}
        vids = task_result.get("videos") or []
        if isinstance(vids, list) and len(vids) > 0:
            first = vids[0]
            result_url = first.get("url")
        return {"status": status, "url": result_url, "raw": root}


kling_service = KlingService()
