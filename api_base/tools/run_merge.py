import sys
import json
import asyncio
from pathlib import Path

# Ensure api_base is importable
HERE = Path(__file__).resolve()
API_BASE = HERE.parents[1]
if str(API_BASE) not in sys.path:
    sys.path.insert(0, str(API_BASE))

from app.services.merge_service import MergeService
from app.models.schemas import SceneData


def load_scenes(path: Path):
    raw = json.loads(path.read_text(encoding='utf-8'))
    scenes = []
    for d in raw:
        # Normalize backslashes to forward for cross-platform
        if 'audio_path' in d and d['audio_path']:
            d['audio_path'] = d['audio_path'].replace('\\', '/')
        if 'video_path' in d and d['video_path']:
            d['video_path'] = d['video_path'].replace('\\', '/')
        scenes.append(SceneData.parse_obj(d))
    return scenes


async def main():
    if len(sys.argv) < 3:
        print('Usage: run_merge.py <scenes_json> <tvc_title>')
        sys.exit(2)
    scenes_file = Path(sys.argv[1])
    tvc_title = sys.argv[2]

    if not scenes_file.exists():
        print('Scenes file not found:', scenes_file)
        sys.exit(1)

    scenes = load_scenes(scenes_file)
    print(f'Loaded {len(scenes)} scenes. Running merge...')

    merger = MergeService()
    safe_title = "direct_merge"
    out_name = f"TVC_Final_{safe_title}_{scenes[0].run_id or 'run'}"
    try:
        final = await merger.merge_tvc(scenes, output_filename=out_name, output_dir=None)
        print('Merge complete. Final video at:', final)
    except Exception as e:
        print('Merge failed:', e)
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
