import logging
import asyncio
from pathlib import Path
from typing import List
from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_videoclips
import moviepy.video.fx.all as vfx
from app.models.schemas import SceneData

logger = logging.getLogger(__name__)

EXPORT_DIR = Path("utils/download")
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

class MergeService:
    def __init__(self):
        pass

    async def merge_tvc(self, scenes: List[SceneData], output_filename: str = "final_tvc") -> str:
        if not scenes:
            raise ValueError("Không có dữ liệu phân cảnh để merge.")

        output_path = EXPORT_DIR / f"{output_filename}.mp4"
        logger.info(f"Bắt đầu quá trình Hậu kỳ. File dự kiến: {output_path}")

        final_video_path = await asyncio.to_thread(self._sync_merge_logic, scenes, str(output_path))
        return final_video_path

    def _sync_merge_logic(self, scenes: List[SceneData], output_path: str) -> str:
        clips_to_concat = []

        try:
            for scene in scenes:
                if not scene.video_path or not Path(scene.video_path).exists():
                    logger.warning(f"[Cảnh {scene.scene_number}] Thiếu Video, bỏ qua cảnh này.")
                    continue

                video_clip = VideoFileClip(scene.video_path)

                if scene.audio_path and Path(scene.audio_path).exists():
                    audio_clip = AudioFileClip(scene.audio_path)

                    # Đồng bộ thời gian Hình và Tiếng
                    if audio_clip.duration > video_clip.duration:
                        video_clip = video_clip.fx(vfx.loop, duration=audio_clip.duration)
                    
                    video_clip = video_clip.set_audio(audio_clip)

                clips_to_concat.append(video_clip)

            if not clips_to_concat:
                raise ValueError("Toàn bộ các cảnh đều bị lỗi Video. Không thể render.")

            logger.info(f"Đang tiến hành nối {len(clips_to_concat)} phân cảnh. Xin chờ...")

            final_video = concatenate_videoclips(clips_to_concat, method="compose")

            final_video.write_videofile(
                output_path,
                fps=24,
                codec="libx264",
                audio_codec="aac",
                preset="ultrafast",
                threads=4,
                logger=None
            )

            for clip in clips_to_concat:
                clip.close()
            final_video.close()

            logger.info(f"Render HOÀN TẤT! Video tại: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Lỗi nghiêm trọng khi Render Video: {e}")
            raise RuntimeError(f"Hậu kỳ thất bại: {e}")