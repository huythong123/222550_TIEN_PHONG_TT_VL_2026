"""
Pipeline Service (Quản Đốc Điều Phối)

Kết nối toàn bộ hệ thống Auto-TVC thành một dây chuyền tự động:
Phase 1: Planning (Crawler -> Script -> Scene -> Prompt)
Phase 2: Production (Voice -> Video)
Phase 3: Post-Production (Merge -> Final MP4)
"""

import logging
import asyncio
from typing import Dict, Any

# Import các Service Giai đoạn 1
from app.ingestion.crawler_service import CrawlerService
from app.services.script_service import ScriptService
from app.services.scene_service import SceneService
from app.services.prompt_service import PromptService

# Import các Service Giai đoạn 2 & 3
from app.services.voice_service import VoiceSystem
from app.services.video_service import VideoSystem
from app.services.merge_service import MergeService

logger = logging.getLogger(__name__)

class PipelineService:
    def __init__(self):
        # Khởi tạo tất cả các "Phòng ban" trong nhà máy
        self.crawler = CrawlerService()
        self.script_gen = ScriptService()
        self.scene_gen = SceneService()
        self.prompt_gen = PromptService()
        self.voice_gen = VoiceSystem()
        self.video_gen = VideoSystem()
        self.merger = MergeService()

    async def run_full_production(self, url: str) -> Dict[str, Any]:
        """
        Hàm thực thi toàn bộ quy trình từ URL ra Video TVC cuối cùng.
        """
        logger.info(f"🚀 [START] BẮT ĐẦU DÂY CHUYỀN SẢN XUẤT CHO URL: {url}")

        try:
            # ==========================================
            # GIAI ĐOẠN 1: PLANNING (LÊN KẾ HOẠCH)
            # ==========================================
            logger.info("--- PHASE 1: PLANNING ---")
            
            clean_content = await self.crawler.fetch_and_clean(url)
            if not clean_content or not clean_content.main_text:
                raise ValueError("Không thể lấy nội dung từ URL.")

            master_script = await self.script_gen.generate_master_script(clean_content)
            scenes = await self.scene_gen.split_into_scenes(master_script)
            final_scenes = await self.prompt_gen.enhance_scenes(scenes)

            logger.info(f"Đã lên kế hoạch xong {len(final_scenes)} phân cảnh.")

            # ==========================================
            # GIAI ĐOẠN 2: PRODUCTION (SẢN XUẤT MEDIA)
            # ==========================================
            logger.info("--- PHASE 2: MEDIA PRODUCTION ---")
            
            # Tạo các Task để sinh Hình và Tiếng đồng loạt cho tất cả các cảnh
            media_tasks = [self._generate_media_for_scene(scene) for scene in final_scenes]
            
            # asyncio.gather sẽ kích hoạt toàn bộ các API Runway và OpenAI cùng lúc!
            completed_scenes = await asyncio.gather(*media_tasks)

            # ==========================================
            # GIAI ĐOẠN 3: POST-PRODUCTION (HẬU KỲ)
            # ==========================================
            logger.info("--- PHASE 3: POST-PRODUCTION (MERGE) ---")
            
            # Đặt tên file video cuối cùng dựa trên Tên TVC (đã làm sạch ký tự đặc biệt)
            safe_title = "".join([c if c.isalnum() else "_" for c in master_script.tvc_title]).strip("_")
            final_filename = f"TVC_Final_{safe_title}"

            final_video_path = await self.merger.merge_tvc(completed_scenes, final_filename)

            logger.info(f"✅ [SUCCESS] HOÀN TẤT DÂY CHUYỀN! TVC nằm tại: {final_video_path}")

            # Trả về kết quả cho Frontend/Người dùng
            return {
                "status": "success",
                "tvc_title": master_script.tvc_title,
                "target_audience": master_script.target_audience,
                "total_duration": master_script.duration_seconds,
                "video_url": final_video_path, # Đường dẫn file MP4 cuối cùng
                "scenes_data": [scene.model_dump() for scene in completed_scenes]
            }

        except Exception as e:
            logger.error(f"❌ [FAILED] DÂY CHUYỀN THẤT BẠI: {str(e)}")
            raise RuntimeError(f"Pipeline bị gián đoạn do lỗi: {str(e)}")


    # --- HELPER METHOD ---
    async def _generate_media_for_scene(self, scene) -> Any:
        """
        Hàm xử lý đồng thời Audio và Video cho 1 cảnh duy nhất.
        """
        audio_task = None
        video_task = None

        # 1. Chuẩn bị tác vụ tạo Audio
        if scene.voiceover and scene.voiceover.strip():
            audio_filename = f"scene_{scene.scene_number}_voice"
            # Hàm generate_voice trả về đường dẫn file
            audio_task = self.voice_gen.generate_voice(scene.voiceover, audio_filename)

        # 2. Chuẩn bị tác vụ tạo Video
        if scene.technical_prompt and scene.technical_prompt.strip():
            video_filename = f"scene_{scene.scene_number}_video"
            # Hàm generate_video trả về đường dẫn file
            video_task = self.video_gen.generate_video(scene.technical_prompt, video_filename)

        # 3. Chạy cả 2 tác vụ CÙNG MỘT LÚC (Tiết kiệm gấp đôi thời gian)
        # Nếu task nào None (vd cảnh câm), dùng asyncio.sleep(0) để bỏ qua
        results = await asyncio.gather(
            audio_task if audio_task else asyncio.sleep(0),
            video_task if video_task else asyncio.sleep(0),
            return_exceptions=True # Không để 1 cảnh lỗi làm sập toàn bộ các cảnh khác
        )

        # 4. Lưu lại đường dẫn vào Object Scene
        # Kết quả trả về theo thứ tự của gather: [audio_result, video_result]
        if audio_task and not isinstance(results[0], Exception):
            scene.audio_path = results[0]
        elif isinstance(results[0], Exception):
            logger.error(f"Lỗi tạo Audio cảnh {scene.scene_number}: {results[0]}")

        if video_task and not isinstance(results[1], Exception):
            scene.video_path = results[1]
        elif isinstance(results[1], Exception):
            logger.error(f"Lỗi tạo Video cảnh {scene.scene_number}: {results[1]}")

        return scene