import os
import logging
import asyncio
from typing import List, TYPE_CHECKING
from app.config import settings

if TYPE_CHECKING:
    from app.models.schemas import SceneData

logger = logging.getLogger(__name__)

# Thư mục lưu trữ file âm thanh
AUDIO_STORAGE_DIR = "storage/raw_clips"

class VoiceSystem:
    """
    Service xử lý Text-to-Speech (TTS) sử dụng OpenAI.
    Cung cấp API `generate_voice(text, filename)` tương thích với pipeline.
    """
    def __init__(self):
        # Lazy import to avoid import-time failures
        try:
            from openai import AsyncOpenAI

            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        except Exception as exc:  # pragma: no cover - best-effort
            logger.warning(f"OpenAI AsyncOpenAI client not available: {exc}")
            self.client = None

        self.model = "tts-1"
        self.voice = "alloy"

        os.makedirs(AUDIO_STORAGE_DIR, exist_ok=True)

    async def generate_audio_for_scenes(self, scenes: List["SceneData"]) -> List["SceneData"]:
        """
        Nhận danh sách các phân cảnh, kiểm tra cảnh nào có thoại thì tạo file MP3.
        """
        if not scenes:
            logger.warning("Không có cảnh nào để lồng tiếng.")
            return scenes

        logger.info(f"Đang tiến hành thu âm cho {len(scenes)} phân cảnh...")

        # Đưa các cảnh vào mảng tasks để chạy song song
        tasks = [self._process_single_scene(scene) for scene in scenes]
        
        # Đợi tất cả các file tải về cùng lúc
        updated_scenes = await asyncio.gather(*tasks)
        
        logger.info("Hoàn thành lồng tiếng 100%!")
        return list(updated_scenes)

    async def _process_single_scene(self, scene: "SceneData") -> "SceneData":
        """
        Hàm xử lý lồng tiếng cho một cảnh duy nhất.
        """
        # 1. Bỏ qua nếu cảnh này không có lời bình
        if not scene.voiceover or scene.voiceover.strip() == "":
            logger.info(f"[Cảnh {scene.scene_number}]: Bỏ qua (Không có lời thoại).")
            return scene

        # 2. Định nghĩa tên file và đường dẫn
        file_name = f"scene_{scene.scene_number}_voice.mp3"
        file_path = os.path.join(AUDIO_STORAGE_DIR, file_name)

        try:
            logger.info(f"[Cảnh {scene.scene_number}]: Đang gọi OpenAI thu âm...")

            if not self.client:
                raise RuntimeError("OpenAI client unavailable for TTS generation")

            response = await self.client.audio.speech.create(
                model=self.model,
                voice=self.voice,
                input=scene.voiceover,
            )

            def save_file():
                with open(file_path, "wb") as f:
                    f.write(response.content)

            await asyncio.to_thread(save_file)

            # 5. Lưu đường dẫn file vào Object để bước sau (Merge) lấy ra dùng
            scene.audio_path = file_path
            logger.info(f"[Cảnh {scene.scene_number}]: Thu âm XONG -> {file_path}")

        except Exception as e:
            logger.error(f"[Cảnh {scene.scene_number}]: Lỗi khi thu âm: {e}")
            scene.audio_path = None # Đánh dấu lỗi để hệ thống biết

        return scene

    # -------------------------
    # Compatibility helper for pipeline
    # -------------------------
    async def generate_voice(self, text: str, filename: str) -> str:
        """
        Generate a single voice file and return its path.
        This matches the interface expected by `PipelineService`.
        """
        if not text or not text.strip():
            raise ValueError("Text for TTS is empty")

        file_name = f"{filename}.mp3"
        file_path = os.path.join(AUDIO_STORAGE_DIR, file_name)

        try:
            if not self.client:
                raise RuntimeError("OpenAI client unavailable for TTS generation")

            response = await self.client.audio.speech.create(
                model=self.model,
                voice=self.voice,
                input=text,
            )

            def save_file():
                with open(file_path, "wb") as f:
                    f.write(response.content)

            await asyncio.to_thread(save_file)
            return file_path

        except Exception as e:
            logger.error(f"Error generating voice for {filename}: {e}")
            raise