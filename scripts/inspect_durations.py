from moviepy.editor import VideoFileClip
import os
folder = r'd:\NghienCuuBaoCaoKhoaHoc\test1_totgan_img\Final_tes1_totgan'
files = sorted([f for f in os.listdir(folder) if f.lower().endswith('.mp4')])
for f in files:
    path = os.path.join(folder, f)
    try:
        clip = VideoFileClip(path)
        has_audio = clip.audio is not None
        audio_dur = clip.audio.duration if has_audio else None
        print(f, 'video_dur=', round(clip.duration,3), 'has_audio=', has_audio, 'audio_dur=', round(audio_dur,3) if audio_dur else None)
        clip.close()
    except Exception as e:
        print('ERR', f, e)
