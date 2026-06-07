import logging
import asyncio
from pathlib import Path
from typing import List
from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_videoclips, concatenate_audioclips
import moviepy.video.fx.all as vfx
import moviepy.audio.fx.all as afx
from app.models.schemas import SceneData

logger = logging.getLogger(__name__)

EXPORT_DIR = Path("utils/download")
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

class MergeService:
    def __init__(self):
        pass

    async def merge_tvc(
        self,
        scenes: List[SceneData],
        output_filename: str = "final_tvc",
        output_dir: str | None = None,
    ) -> str:
        if not scenes:
            raise ValueError("Không có dữ liệu phân cảnh để merge.")

        target_dir = Path(output_dir) if output_dir else EXPORT_DIR
        target_dir.mkdir(parents=True, exist_ok=True)
        output_path = target_dir / f"{output_filename}.mp4"
        logger.info(f"Bắt đầu quá trình Hậu kỳ. File dự kiến: {output_path}")

        final_video_path = await asyncio.to_thread(self._sync_merge_logic, scenes, str(output_path))
        return final_video_path

    def _sync_merge_logic(self, scenes: List[SceneData], output_path: str) -> str:
        video_clips = []
        audio_clips = []

        try:
            for scene in scenes:
                if not scene.video_path or not Path(scene.video_path).exists():
                    logger.warning(f"[Cảnh {scene.scene_number}] Thiếu Video, bỏ qua cảnh này.")
                    continue

                video_clip = VideoFileClip(scene.video_path)

                # Prefer explicit audio_path if provided, otherwise use embedded audio from the video file
                if scene.audio_path and Path(scene.audio_path).exists():
                    audio_clip = AudioFileClip(scene.audio_path)
                    # Trim if longer than video; do not loop if shorter
                    if audio_clip.duration > video_clip.duration:
                        audio_clip = audio_clip.subclip(0, video_clip.duration)
                else:
                    audio_clip = video_clip.audio

                # detach audio from video for safe concatenation
                video_no_audio = video_clip.without_audio()
                video_clips.append(video_no_audio)

                if audio_clip is not None:
                    # ensure audio length <= video length (trim if necessary)
                    if audio_clip.duration > video_no_audio.duration:
                        audio_clip = audio_clip.subclip(0, video_no_audio.duration)
                    audio_clips.append(audio_clip)
                else:
                    # If no audio for this scene, create a silent audio clip of the same duration
                    # so audio timeline remains aligned. Using a silent AudioFileClip is heavier;
                    # we opt to append None and handle gaps later by padding when concatenating.
                    audio_clips.append(None)

            if not video_clips:
                raise ValueError("Toàn bộ các cảnh đều bị lỗi Video. Không thể render.")

            logger.info(f"Đang tiến hành nối {len(video_clips)} phân cảnh. Xin chờ...")

            # Concatenate videos (silent) then build a single audio timeline
            final_video = concatenate_videoclips(video_clips, method="compose")

            # Build audio timeline: ensure each audio clip matches its video duration,
            # has consistent sample rate and channel count. Replace missing audio with
            # silent segments of the exact corresponding duration.
            from moviepy.audio.AudioClip import AudioArrayClip
            import numpy as np

            sr = 44100
            target_channels = 1
            filled_audio_clips = []

            for idx, a in enumerate(audio_clips):
                dur = video_clips[idx].duration

                if a is None:
                    # create silent audio of same duration, matching channels and fps
                    arr = np.zeros((int(sr * dur), target_channels), dtype=np.float32)
                    silent = AudioArrayClip(arr, fps=sr)
                    filled_audio_clips.append(silent)
                    continue

                # Normalize audio clip fps and channels
                try:
                    a = a.set_fps(sr)
                except Exception:
                    pass
                try:
                    a = a.set_channels(target_channels)
                except Exception:
                    pass

                # Trim if longer than video segment
                if a.duration > dur:
                    try:
                        a = a.subclip(0, dur)
                    except Exception:
                        pass

                # Pad with silence if shorter than video segment
                if a.duration < dur:
                    pad_dur = dur - a.duration
                    pad_arr = np.zeros((int(sr * pad_dur), target_channels), dtype=np.float32)
                    pad_clip = AudioArrayClip(pad_arr, fps=sr)
                    try:
                        a = concatenate_audioclips([a, pad_clip])
                    except Exception:
                        a = a

                filled_audio_clips.append(a)

            final_audio = concatenate_audioclips(filled_audio_clips)

            # Ensure final_audio duration does not exceed final_video duration
            try:
                if final_audio.duration > final_video.duration:
                    final_audio = final_audio.subclip(0, final_video.duration)
            except Exception:
                pass

            final_video = final_video.set_audio(final_audio)

            final_video.write_videofile(
                output_path,
                fps=24,
                codec="libx264",
                audio_codec="aac",
                preset="ultrafast",
                threads=4,
                logger=None
            )

            # Close resources
            for clip in video_clips:
                clip.close()
            for a in filled_audio_clips:
                try:
                    a.close()
                except Exception:
                    pass
            final_video.close()

            logger.info(f"Render HOÀN TẤT! Video tại: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Lỗi nghiêm trọng khi Render Video: {e}")
            raise RuntimeError(f"Hậu kỳ thất bại: {e}")