import os
import time
import base64
import httpx
import logging
import asyncio
from pathlib import Path
from app.config import settings
from app.services.kling_service import kling_service
from app.services.render_storage_service import RENDER_ROOT

logger = logging.getLogger(__name__)


class VideoSystem:
    def __init__(self):
        # Runway integration removed — use Kling for text-to-video
        # Default output directory: API's storage/renders so files are served at /renders
        self.output_dir = str(RENDER_ROOT)
        os.makedirs(self.output_dir, exist_ok=True)

    async def generate_video(
        self,
        prompt: str,
        output_filename: str,
        output_dir: str | None = None,
        model_name: str = "kling-v2-6",
        duration: str = "5",
        mode: str = "std",
        sound: str = "off",
        aspect_ratio: str = "16:9",
    ) -> str:
        """Submit prompt to Kling, poll status, and download final MP4.

        Replaces previous Runway-based implementation.
        """

        logger.info(f"🎥 Submitting Kling render for: {output_filename}")

        # 1) Submit job to Kling
        task_id = await kling_service.submit_text2video(
            prompt=prompt,
            model_name=model_name,
            duration=str(duration),
            mode=mode,
            sound=sound,
            aspect_ratio=aspect_ratio,
        )

        logger.info(f"Submitted Kling task {task_id}; polling for result...")

        # 2) Poll for status
        max_attempts = 90
        video_url = None
        for attempt in range(max_attempts):
            info = await kling_service.check_status(task_id)
            status = (info.get("status") or "").lower() if info.get("status") else None
            if status in ("succeed", "succeeded", "success"):
                video_url = info.get("url")
                logger.info(f"Kling render succeeded, url={video_url}")
                break
            if status in ("failed", "error"):
                logger.error("Kling reported failure: %s", info.get("raw"))
                raise Exception("Kling reported render failure")
            logger.info(f"[{attempt + 1}/{max_attempts}] Kling status: {status or 'pending'}")
            await asyncio.sleep(5)

        if not video_url:
            raise Exception("Timeout waiting for Kling render to finish")

        # 3) Download resulting MP4
        target_dir = Path(output_dir) if output_dir else Path(self.output_dir)
        target_dir.mkdir(parents=True, exist_ok=True)
        final_path = str(target_dir / f"{output_filename}.mp4")

        timeout = httpx.Timeout(60.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("GET", video_url) as resp:
                if resp.status_code == 200:
                    with open(final_path, "wb") as f:
                        async for chunk in resp.aiter_bytes():
                            f.write(chunk)
                    logger.info(f"Downloaded Kling video to: {final_path}")
                    return final_path
                else:
                    logger.error("Failed to download Kling video: %s", resp.status_code)
                    raise Exception("Failed to download resulting MP4 from Kling URL")