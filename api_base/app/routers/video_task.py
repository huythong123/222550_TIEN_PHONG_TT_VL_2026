from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
import math
from app.config import settings
import logging
import asyncio


from app.models.schemas import CleanedContent, MasterScript, SceneData

from app.ingestion.crawler_service import CrawlerService
from app.services.script_service import ScriptService
from app.services.scene_service import SceneService
from app.services.prompt_service import PromptService
from app.services.voice_service import VoiceSystem
from app.services.video_service import VideoSystem
from app.services.merge_service import MergeService
from app.services.kling_service import kling_service
from app.services.render_storage_service import append_run_log, create_or_get_run, ensure_step_dir
from app.services import render_storage_service
from pathlib import Path
from app.security.auth import get_current_user
from app.models.user_store import get_user_by_id
from app.models.user_store import adjust_user_credits


def require_non_admin_user(payload=Depends(get_current_user)):
    return payload


def require_user_with_credits(payload=Depends(get_current_user)):
    try:
        user_id = int(payload.get('sub'))
    except Exception:
        raise HTTPException(status_code=400, detail='Không lấy được thông tin user')

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail='Không tìm thấy người dùng')

    if int(user.get('credits', 0)) <= 0:
        raise HTTPException(status_code=403, detail='Tài khoản không có đủ credits, vui lòng nạp credits để sử dụng dịch vụ')

    return payload

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post('/credits/estimate', summary='Estimate credits for a step')
async def credits_estimate(payload: CreditsEstimateRequest, user=Depends(get_current_user)):
    try:
        scenes = payload.scenes or None
        scenes_count = payload.scenes_count
        est = estimate_cost_for(int(payload.step), scenes=scenes, scenes_count=scenes_count)
        return {'estimated': est}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


crawler = CrawlerService()
script_gen = ScriptService()
scene_gen = SceneService()
_prompt_gen: PromptService | None = None

def get_prompt_gen() -> PromptService:
    global _prompt_gen
    if _prompt_gen is None:
        _prompt_gen = PromptService()
    return _prompt_gen

# image_gen removed: we no longer create static image prompts or images
voice_gen = VoiceSystem()
video_gen = VideoSystem()
merger = MergeService()
kling = kling_service


class URLInput(BaseModel):
    url: str

class RenderRequest(BaseModel):
    tvc_title: str
    scenes: List[SceneData]
    run_id: Optional[str] = None


class CreditsEstimateRequest(BaseModel):
    step: int
    scenes_count: Optional[int] = None
    # allow passing scenes for convenience
    scenes: Optional[List[SceneData]] = None


# Define credit costs (tunable)
# - fixed costs per step, or per-scene multipliers
COSTS = {
    # Pricing (credits): simplified per user's request
    # step1: free
    # step2, step3, step4: 1 credit each (flat)
    # step5: free (unchanged)
    # step6: computed from scene durations (1 credit = 1 second)
    1: {'fixed': 1},
    2: {'fixed': 1},
    3: {'fixed': 1},
    4: {'fixed': 1},
    5: {'fixed': 0},
    6: {},
    7: {'fixed': 0},
}


def estimate_cost_for(step: int, scenes: Optional[List[SceneData]] = None, scenes_count: Optional[int] = None) -> int:
    if step not in COSTS:
        return 0
    cfg = COSTS[step]

    # Step5: compute from total voiceover characters (1 credit per CREDIT_UNIT_CHARS)
    if step == 5:
        # Use 2000 characters per credit for step 5 (bucketed tiers)
        per_chars = 2000
        total_chars = 0
        # Count only characters from the `voiceover` field (ignore other fields)
        if scenes is not None and len(scenes) > 0:
            for s in scenes:
                try:
                    vo = getattr(s, 'voiceover', None)
                    if not vo:
                        continue
                    vo_text = str(vo).strip()
                    if not vo_text:
                        continue
                    total_chars += len(vo_text)
                except Exception:
                    continue
        elif scenes_count:
            # fallback: assume default average chars per scene when only count is provided
            avg_chars = 100
            try:
                total_chars = int(scenes_count) * avg_chars
            except Exception:
                total_chars = 0

        if total_chars <= 0:
            return 0
        # Aggregate total characters across all voiceovers, then convert to credits
        return int(max(0, math.ceil(total_chars / per_chars)))

    # Step6: compute from durations (1 credit == 1 second assuming CREDIT_UNIT_SECONDS==1)
    if step == 6:
        per_unit = settings.CREDIT_UNIT_SECONDS or 1

        def credits_for_scene(scn: SceneData):
            dur = int(getattr(scn, 'duration', 0) or 0)
            if dur <= 0:
                return 1
            return math.ceil(dur / per_unit)

        cost = 0
        if scenes is not None and len(scenes) > 0:
            for s in scenes:
                if getattr(s, 'technical_prompt', None):
                    cost += credits_for_scene(s)
        elif scenes_count:
            # fallback: assume default duration 30s per scene
            default = math.ceil(30 / (settings.CREDIT_UNIT_SECONDS or 1))
            cost += default * int(scenes_count)
        return int(cost)

    # Other steps: include fixed + per_scene when provided
    count = 0
    if scenes is not None:
        count = len(scenes)
    elif scenes_count is not None:
        try:
            count = int(scenes_count)
        except Exception:
            count = 0

    cost = 0
    if 'fixed' in cfg:
        cost += int(cfg['fixed'])
    if 'per_scene' in cfg and count:
        cost += int(cfg['per_scene']) * int(count)

    # Ensure non-negative integer
    return int(max(0, cost))


@router.post("/step1-extract", response_model=CleanedContent, summary="1. Cào nội dung Web")
async def step1_extract(data: URLInput, user=Depends(require_user_with_credits)):
    """Nhận URL, trả về nội dung Text đã lọc rác."""
    try:
        if not data.url or not data.url.strip():
            raise HTTPException(status_code=400, detail='Yêu cầu nhập URL hợp lệ')

        user_id = user.get("sub")
        run_id, run_dir = create_or_get_run(user_id)
        content = await crawler.fetch_and_clean(data.url)
        content.run_id = run_id
        append_run_log(
            user_id,
            run_id,
            "step1-extract",
            {
                "url": data.url,
                "title": content.title,
                "run_dir": str(run_dir),
            },
        )
        # Deduct credits for this step
        try:
            cost = estimate_cost_for(1)
            if cost > 0:
                adjust_user_credits(int(user_id), -cost)
                append_run_log(user_id, run_id, 'credits', {'deducted': cost})
        except Exception:
            logger.exception('Failed to deduct credits for step1')
        return content
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/step2-script", response_model=MasterScript, summary="2. Viết Kịch bản Tổng thể")
async def step2_script(content: CleanedContent, target_duration: Optional[int] = None, request: Request = None, user=Depends(require_user_with_credits)):
    try:
        if not content.title or not content.main_text:
            raise HTTPException(status_code=400, detail='Nội dung nguồn (title/main_text) không được để trống')

        user_id = user.get("sub")
        run_id, _ = create_or_get_run(user_id, content.run_id)
        content.run_id = run_id
        # Coerce target_duration defensively
        td = None
        if target_duration is not None:
            try:
                td = int(target_duration)
            except Exception:
                td = None

        script = await script_gen.generate_master_script(content, target_duration=td)
        script.run_id = run_id
        append_run_log(
            user_id,
            run_id,
            "step2-script",
            {
                "title": content.title,
                "hook_preview": script.hook[:120],
                "requested_target_duration": target_duration,
            },
        )
        try:
            cost = estimate_cost_for(2)
            if cost > 0:
                adjust_user_credits(int(user_id), -cost)
                append_run_log(user_id, run_id, 'credits', {'deducted': cost})
        except Exception:
            logger.exception('Failed to deduct credits for step2')
        return script
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/step3-scene", response_model=List[SceneData], summary="3. Chia Phân Cảnh (Storyboard)")
async def step3_scene(script: MasterScript, target_duration: Optional[int] = None, request: Request = None, user=Depends(require_user_with_credits)):
    try:
        user_id = user.get("sub")
        run_id, _ = create_or_get_run(user_id, script.run_id)
        script.run_id = run_id
        logger.info("step3-scene requested target_duration=%s", target_duration)
        try:
            qp = dict(request.query_params) if request is not None else {}
        except Exception:
            qp = {}
        logger.info("step3-scene query_params=%s type(target_duration)=%s", qp, type(target_duration))

        # coerce to int defensively to ensure deterministic branch triggers
        td = None
        if target_duration is not None:
            try:
                td = int(target_duration)
            except Exception:
                td = None

        scenes = await scene_gen.split_into_scenes(script, target_duration=td)
        for scene in scenes:
            scene.run_id = run_id
        append_run_log(
            user_id,
            run_id,
            "step3-scene",
            {
                "scene_count": len(scenes),
                "requested_target_duration": target_duration,
            },
        )
        try:
            cost = estimate_cost_for(3, scenes=scenes)
            if cost > 0:
                adjust_user_credits(int(user_id), -cost)
                append_run_log(user_id, run_id, 'credits', {'deducted': cost})
        except Exception:
            logger.exception('Failed to deduct credits for step3')
        return scenes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



class KlingGenerateRequest(BaseModel):
    prompt: str
    model_name: Optional[str] = 'kling-v2-6'
    duration: Optional[str] = '5'
    mode: Optional[str] = 'std'
    sound: Optional[str] = 'off'
    aspect_ratio: Optional[str] = '9:16'


@router.post('/generate')
async def api_kling_generate(payload: KlingGenerateRequest, user=Depends(require_user_with_credits)):
    """Submit text2video job to Kling and return task_id"""
    try:
        # Determine credits required based on requested duration
        try:
            dur = int(payload.duration)
        except Exception:
            dur = 30
        per_unit = settings.CREDIT_UNIT_SECONDS or 15
        needed = max(1, math.ceil(dur / per_unit))

        # check and deduct upfront
        user_id = int(user.get('sub'))
        u = get_user_by_id(user_id)
        if int(u.get('credits', 0)) < needed:
            raise HTTPException(status_code=403, detail='Tài khoản không có đủ credits để tạo video với thời lượng yêu cầu')

        # deduct credits
        adjust_user_credits(user_id, -needed)
        # log deduction
        try:
            append_run_log(user_id, None, 'credits', {'deducted': needed, 'reason': 'kling_generate', 'duration': dur})
        except Exception:
            pass

        try:
            task_id = await kling.submit_text2video(
                prompt=payload.prompt,
                model_name=payload.model_name,
                duration=payload.duration,
                mode=payload.mode,
                sound=payload.sound,
                aspect_ratio=payload.aspect_ratio,
            )
            return {"task_id": task_id}
        except Exception as e:
            # refund credits if submission failed
            try:
                adjust_user_credits(user_id, needed)
                append_run_log(user_id, None, 'credits', {'refunded': needed, 'reason': 'kling_submit_failed'})
            except Exception:
                logger.exception('Failed to refund credits after kling submit failure')
            raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/status/{task_id}')
async def api_kling_status(task_id: str, user=Depends(require_user_with_credits)):
    """Check status of a Kling task. Returns status and video URL when succeed."""
    try:
        info = await kling.check_status(task_id)
        status = (info.get('status') or '').lower() if info.get('status') else None
        if status in ('succeed', 'succeeded', 'success'):
            return {"status": 'succeed', "url": info.get('url'), "raw": info.get('raw')}
        if status in ('submitted', 'submitted'):
            return {"status": 'submitted'}
        if status in ('processing', 'running'):
            return {"status": 'processing'}
        if status in ('failed', 'failed'):
            return {"status": 'failed', "raw": info.get('raw')}
        return {"status": status or 'unknown', "raw": info.get('raw')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/step4-prompt", response_model=List[SceneData], summary="4. Tạo Prompt Ảnh & Video (EN)")
async def step4_prompt(scenes: List[SceneData], user=Depends(require_user_with_credits)):
    """Tạo ra `technical_prompt` (chuyển động) cho mỗi phân cảnh. (Không sinh `image_prompt` mặc định)."""
    try:
        if not scenes or len(scenes) == 0:
            raise HTTPException(status_code=400, detail='Cần cung cấp danh sách phân cảnh (scenes) để tạo prompt')
        user_id = user.get("sub")
        run_id = scenes[0].run_id if scenes else None
        run_id, _ = create_or_get_run(user_id, run_id)
        enhanced = await get_prompt_gen().enhance_scenes(scenes)
        for scene in enhanced:
            scene.run_id = run_id
        append_run_log(
            user_id,
            run_id,
            "step4-prompt",
            {
                "scene_count": len(enhanced),
            },
        )
        try:
            cost = estimate_cost_for(4, scenes=enhanced)
            if cost > 0:
                adjust_user_credits(int(user_id), -cost)
                append_run_log(user_id, run_id, 'credits', {'deducted': cost})
        except Exception:
            logger.exception('Failed to deduct credits for step4')
        return enhanced
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Note: step5-image has been removed. We no longer generate static image prompts or images.
# Video generation in step7 will use `technical_prompt` produced by step4.


@router.post("/step5-voice", response_model=List[SceneData], summary="5. Thu âm Giọng Đọc (MP3)")
async def step5_voice(scenes: List[SceneData], user=Depends(require_user_with_credits)):
    try:
        if not scenes or len(scenes) == 0:
            raise HTTPException(status_code=400, detail='Cần cung cấp danh sách phân cảnh (scenes) để thu âm')

        if not any(s.voiceover and s.voiceover.strip() for s in scenes):
            raise HTTPException(status_code=400, detail='Không có voiceover nào được cung cấp')
        user_id = user.get("sub")
        run_id = scenes[0].run_id if scenes else None
        run_id, run_dir = create_or_get_run(user_id, run_id)
        voice_dir = ensure_step_dir(run_dir, "voice")

        async def process_voice(scene: SceneData):
            if scene.voiceover and scene.voiceover.strip():
                scene.run_id = run_id
                filename = f"{run_id}_scene_{scene.scene_number}_voice"
                audio_path = await voice_gen.generate_voice(
                    scene.voiceover,
                    filename,
                    output_dir=str(voice_dir),
                )
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
        # Optionally attach existing video files, but only if this run already contains
        # a recorded `step6-video` event. This prevents showing videos from unrelated
        # previous runs when the user starts a new chat/run.
        try:
            run_log = render_storage_service.get_user_run_log(user_id, run_id)
            has_step6 = False
            if run_log and isinstance(run_log.get('steps'), list):
                has_step6 = 'step6-video' in run_log.get('steps')

            if has_step6:
                video_step_dir = run_dir / "video"
                for s in scenes:
                    if getattr(s, 'video_path', None):
                        continue
                    expected_video = video_step_dir / f"{run_id}_scene_{s.scene_number}_video.mp4"
                    if expected_video.exists():
                        s.video_path = str(expected_video)
        except Exception:
            # non-fatal: continue without attaching videos
            pass
        append_run_log(
            user_id,
            run_id,
            "step5-voice",
            {
                "scene_count": len(scenes),
                "voice_dir": str(voice_dir),
            },
        )
        try:
            cost = estimate_cost_for(5, scenes=scenes)
            if cost > 0:
                adjust_user_credits(int(user_id), -cost)
                append_run_log(user_id, run_id, 'credits', {'deducted': cost})
        except Exception:
            logger.exception('Failed to deduct credits for step5')
                
        return scenes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/step6-video", response_model=List[SceneData], summary="6. Quay Video AI (MP4)")
async def step6_video(scenes: List[SceneData], user=Depends(require_user_with_credits)):
    try:
        if not scenes or len(scenes) == 0:
            raise HTTPException(status_code=400, detail='Cần cung cấp danh sách phân cảnh (scenes) để quay video')

        # require at least one scene that can produce a video (has technical_prompt)
        if not any(s.technical_prompt and s.technical_prompt.strip() for s in scenes):
            raise HTTPException(status_code=400, detail='Không có cảnh hợp lệ để render video (thiếu technical_prompt)')
        user_id = int(user.get("sub"))
        run_id = scenes[0].run_id if scenes else None
        run_id, run_dir = create_or_get_run(user_id, run_id)
        video_dir = ensure_step_dir(run_dir, "video")

        # Calculate total credits needed for all scenes and deduct upfront
        pre_deducted = False
        total_needed = 0
        try:
            total_needed = estimate_cost_for(6, scenes=scenes)
            u = get_user_by_id(user_id)
            if int(u.get('credits', 0)) < total_needed:
                raise HTTPException(status_code=403, detail='Tài khoản không có đủ credits để tạo các video cho những phân cảnh đã chọn')
            if total_needed > 0:
                adjust_user_credits(int(user_id), -total_needed)
                append_run_log(user_id, run_id, 'credits', {'deducted': total_needed, 'reason': 'step6-batch'})
                pre_deducted = True
        except HTTPException:
            raise
        except Exception:
            logger.exception('Failed to pre-deduct credits for step6; proceeding without deduction')

        async def process_video(scene: SceneData):
            # Use technical_prompt for video generation.
            # will be used as a seed if present; otherwise call text-to-video.
            if scene.technical_prompt and scene.technical_prompt.strip():
                scene.run_id = run_id
                filename = f"{run_id}_scene_{scene.scene_number}_video"
                video_path = await video_gen.generate_video(
                    prompt=scene.technical_prompt,
                    output_filename=filename,
                    output_dir=str(video_dir),
                )
                scene.video_path = video_path
            return scene
            
        logger.info(f"Đang Render Video cho {len(scenes)} phân cảnh (Có thể mất 3-7 phút)...")
        tasks = [process_video(scene) for scene in scenes]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, res in enumerate(results):
            if isinstance(res, Exception):
                logger.error(f"Lỗi render Video cảnh {scenes[i].scene_number}: {res}")
            else:
                scenes[i] = res
        # After rendering video(s), attach any existing audio files from step5 so frontend
        # can show audio players alongside the newly produced videos. Only attach if
        # this run contains a `step5-voice` event (to avoid cross-run leakage).
        try:
            run_log = render_storage_service.get_user_run_log(user_id, run_id)
            has_step5 = False
            if run_log and isinstance(run_log.get('steps'), list):
                has_step5 = 'step5-voice' in run_log.get('steps')

            if has_step5:
                voice_step_dir = run_dir / "voice"
                for s in scenes:
                    if getattr(s, 'audio_path', None):
                        continue
                    expected_audio = voice_step_dir / f"{run_id}_scene_{s.scene_number}_voice.mp3"
                    if expected_audio.exists():
                        s.audio_path = str(expected_audio)
        except Exception:
            # non-fatal
            pass
        # If any scene failed, treat as overall failure: refund full pre-deduction and return error
        failures = [i for i, r in enumerate(results) if isinstance(r, Exception)]
        if failures:
            try:
                if pre_deducted and total_needed > 0:
                    adjust_user_credits(int(user_id), int(total_needed))
                    append_run_log(user_id, run_id, 'credits', {'refunded': int(total_needed), 'reason': 'step6-failed-all'})
            except Exception:
                logger.exception('Failed to refund credits after step6 overall failure')
            # Do not append step6 run event; surface error to caller so frontend can show message
            raise HTTPException(status_code=500, detail=f"Rendering failed for {len(failures)} scene(s). See server logs for details")

        append_run_log(
            user_id,
            run_id,
            "step6-video",
            {
                "scene_count": len(scenes),
                "video_dir": str(video_dir),
            },
        )
        
                
        return scenes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/step7-merge", summary="7. Dựng Phim (Merge Audio & Video)")
async def step7_merge(request: RenderRequest, user=Depends(require_user_with_credits)):
    try:
        if not request.tvc_title or not request.tvc_title.strip():
            raise HTTPException(status_code=400, detail='Yêu cầu nhập tiêu đề TVC (tvc_title)')

        if not request.scenes or len(request.scenes) == 0:
            raise HTTPException(status_code=400, detail='Cần cung cấp danh sách phân cảnh (scenes) để dựng phim')
        user_id = user.get("sub")
        run_id = request.run_id or (request.scenes[0].run_id if request.scenes else None)
        run_id, run_dir = create_or_get_run(user_id, run_id)
        final_dir = ensure_step_dir(run_dir, "final")

        logger.info(f"Đang tiến hành dựng phim cho TVC: {request.tvc_title}")
        
        safe_title = "".join([c if c.isalnum() else "_" for c in request.tvc_title]).strip("_")
        final_filename = f"TVC_Final_{safe_title}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        final_video_path = await merger.merge_tvc(
            request.scenes,
            final_filename,
            output_dir=str(final_dir),
        )

        # Ensure the returned path actually exists. If not, attempt to find a matching
        # file in the final directory (handles cases where filenames/timestamps differ).
        final_path_obj = Path(final_video_path)
        if not final_path_obj.exists():
            try:
                final_dir_path = Path(final_dir)
            except Exception:
                final_dir_path = final_path_obj.parent

            candidates = sorted(
                [p for p in final_dir_path.glob(f"{final_filename}*.mp4")],
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            )
            if candidates:
                final_path_obj = candidates[0]
                final_video_path = str(final_path_obj)
                logger.warning(f"Expected final file not found; using fallback {final_video_path}")
            else:
                # Last resort: look for any mp4 in the folder and pick the newest
                any_candidates = sorted(
                    [p for p in final_dir_path.glob("*.mp4")],
                    key=lambda p: p.stat().st_mtime,
                    reverse=True,
                )
                if any_candidates:
                    final_path_obj = any_candidates[0]
                    final_video_path = str(final_path_obj)
                    logger.warning(f"No matching prefixed file found; using newest mp4 {final_video_path}")

        # Convert file system path to a web-accessible URL.
        # Try API's RENDER_ROOT first (/renders/*), then workspace-level storage (/storage/renders/*).
        final_path_resolved = Path(final_video_path).resolve()
        web_url = None
        try:
            api_root = Path(render_storage_service.RENDER_ROOT).resolve()
            rel = final_path_resolved.relative_to(api_root)
            web_url = f"/renders/{rel.as_posix()}"
        except Exception:
            try:
                # workspace-level storage/renders (one directory up from api_base)
                workspace_renders = Path.cwd().parent.resolve() / "storage" / "renders"
                rel2 = final_path_resolved.relative_to(workspace_renders.resolve())
                web_url = f"/storage/renders/{rel2.as_posix()}"
            except Exception:
                web_url = str(final_video_path).replace('\\', '/')

        append_run_log(
            user_id,
            run_id,
            "step7-merge",
            {
                "tvc_title": request.tvc_title,
                "final_video_path": final_video_path,
            },
        )
        try:
            cost = estimate_cost_for(7, scenes=request.scenes if request.scenes else None, scenes_count=len(request.scenes) if request.scenes else None)
            if cost > 0:
                adjust_user_credits(int(user_id), -cost)
                append_run_log(user_id, run_id, 'credits', {'deducted': cost})
        except Exception:
            logger.exception('Failed to deduct credits for step7')
        
        return {
            "status": "success",
            "message": "Render hoàn tất!",
            "video_url": web_url,
            "run_id": run_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))