from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import logging
import asyncio


from app.models.schemas import CleanedContent, MasterScript, SceneData

from app.ingestion.crawler_service import CrawlerService
from app.services.script_service import ScriptService
from app.services.scene_service import SceneService
from app.services.prompt_service import PromptService
from app.services.image_service import ImageSystem
from app.services.voice_service import VoiceSystem
from app.services.video_service import VideoSystem
from app.services.merge_service import MergeService

logger = logging.getLogger(__name__)
router = APIRouter()


crawler = CrawlerService()
script_gen = ScriptService()
scene_gen = SceneService()
prompt_gen = PromptService()
image_gen = ImageSystem()
voice_gen = VoiceSystem()
video_gen = VideoSystem()
merger = MergeService()


class URLInput(BaseModel):
    url: str

class RenderRequest(BaseModel):
    tvc_title: str
    scenes: List[SceneData]



@router.post("/step1-extract", response_model=CleanedContent, summary="1. Cào nội dung Web")
async def step1_extract(data: URLInput):
    """Nhận URL, trả về nội dung Text đã lọc rác."""
    try:
        content = await crawler.fetch_and_clean(data.url)
        return content
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



@router.post("/step2-script", response_model=MasterScript, summary="2. Viết Kịch bản Tổng thể")
async def step2_script(content: CleanedContent):
    """Nhận nội dung Text, trả về Kịch bản (Hook, Body, Call to Action)."""
    try:
        return await script_gen.generate_master_script(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# BƯỚC 3: CHIA PHÂN CẢNH (SCENE)
# ==========================================
@router.post("/step3-scene", response_model=List[SceneData], summary="3. Chia Phân Cảnh (Storyboard)")
async def step3_scene(script: MasterScript):
    """Cắt kịch bản tổng thành các phân cảnh chi tiết (tiếng Việt)."""
    try:
        return await scene_gen.split_into_scenes(script)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# BƯỚC 4: DỊCH & NÂNG CẤP PROMPT (ẢNH + VIDEO)
# ==========================================
@router.post("/step4-prompt", response_model=List[SceneData], summary="4. Tạo Prompt Ảnh & Video (EN)")
async def step4_prompt(scenes: List[SceneData]):
    """Tạo ra 2 loại prompt: image_prompt (tĩnh) và technical_prompt (chuyển động)."""
    try:
        return await prompt_gen.enhance_scenes(scenes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# BƯỚC 5: TẠO ẢNH MỒI (IMAGE PROMPT)
# ==========================================
@router.post("/step5-image", response_model=List[SceneData], summary="5. Vẽ Ảnh mồi bằng AI (DALL-E)")
async def step5_image(scenes: List[SceneData]):
    """Sử dụng image_prompt để vẽ ảnh tĩnh, lưu lại vào image_path."""
    try:
        async def process_image(scene: SceneData):
            if scene.image_prompt and scene.image_prompt.strip():
                filename = f"scene_{scene.scene_number}_image"
                img_path = await image_gen.generate_image(scene.image_prompt, filename)
                scene.image_path = img_path
            return scene
            
        logger.info(f"Đang tiến hành vẽ ảnh tĩnh cho {len(scenes)} phân cảnh...")
        tasks = [process_image(scene) for scene in scenes]
        
        # return_exceptions=True để không làm sập cả mảng nếu 1 ảnh bị lỗi
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for i, res in enumerate(results):
            if isinstance(res, Exception):
                logger.error(f"Lỗi vẽ ảnh cảnh {scenes[i].scene_number}: {res}")
            else:
                scenes[i] = res
                
        return scenes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# BƯỚC 6: TẠO GIỌNG ĐỌC (VOICE)
# ==========================================
@router.post("/step6-voice", response_model=List[SceneData], summary="6. Thu âm Giọng Đọc (MP3)")
async def step6_voice(scenes: List[SceneData]):
    """Nhận voiceover, gọi AI thu âm và cập nhật trường audio_path."""
    try:
        async def process_voice(scene: SceneData):
            if scene.voiceover and scene.voiceover.strip():
                filename = f"scene_{scene.scene_number}_voice"
                audio_path = await voice_gen.generate_voice(scene.voiceover, filename)
                scene.audio_path = audio_path
            return scene
            
        logger.info(f"Đang thu âm cho {len(scenes)} phân cảnh...")
        tasks = [process_voice(scene) for scene in scenes]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, res in enumerate(results):
            if isinstance(res, Exception):
                logger.error(f"Lỗi thu âm cảnh {scenes[i].scene_number}: {res}")
            else:
                scenes[i] = res
                
        return scenes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# BƯỚC 7: TẠO VIDEO AI (TỪ ẢNH MỒI)
# ==========================================
@router.post("/step7-video", response_model=List[SceneData], summary="7. Quay Video AI (MP4)")
async def step7_video(scenes: List[SceneData]):
    """Sử dụng image_path VÀ technical_prompt để làm ảnh chuyển động thành Video."""
    try:
        async def process_video(scene: SceneData):
            # Yêu cầu phải có cả Prompt chuyển động VÀ Ảnh gốc mới làm Video được
            if scene.technical_prompt and scene.technical_prompt.strip() and scene.image_path:
                filename = f"scene_{scene.scene_number}_video"
                
                # Gọi Video Service, truyền cả ảnh mồi và prompt chuyển động vào
                video_path = await video_gen.generate_video(
                    prompt=scene.technical_prompt, 
                    output_filename=filename,
                    image_path=scene.image_path  # Truyền đường dẫn ảnh cho Runway
                )
                scene.video_path = video_path
            elif not scene.image_path:
                logger.warning(f"Cảnh {scene.scene_number}: Thiếu ảnh mồi (image_path), bỏ qua tạo video.")
            return scene
            
        logger.info(f"Đang Render Video cho {len(scenes)} phân cảnh (Có thể mất 3-7 phút)...")
        tasks = [process_video(scene) for scene in scenes]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, res in enumerate(results):
            if isinstance(res, Exception):
                logger.error(f"Lỗi render Video cảnh {scenes[i].scene_number}: {res}")
            else:
                scenes[i] = res
                
        return scenes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# BƯỚC 8: HẬU KỲ (MERGE)
# ==========================================
@router.post("/step8-merge", summary="8. Dựng Phim (Merge Audio & Video)")
async def step8_merge(request: RenderRequest):
    """Gộp các file MP3 và MP4 đã tải về thành 1 file TVC hoàn chỉnh."""
    try:
        logger.info(f"Đang tiến hành dựng phim cho TVC: {request.tvc_title}")
        
        safe_title = "".join([c if c.isalnum() else "_" for c in request.tvc_title]).strip("_")
        final_filename = f"TVC_Final_{safe_title}"
        
        final_video_path = await merger.merge_tvc(request.scenes, final_filename)
        
        return {
            "status": "success",
            "message": "Render hoàn tất!",
            "video_url": final_video_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))