import json
import os
import time
from pathlib import Path
from google import genai
from google.genai import types
import subprocess
from dotenv import load_dotenv

load_dotenv()
# Fallback key from .env if not provided
DEFAULT_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def compress_for_analysis(input_path):
    """Gemini ko bhejne ke liye video ko bohot chota aur halka banata hai"""
    output_path = "temp_low_res.mp4"
    print("Compressing video for AI analysis (to avoid 503 error)...")
    # Low resolution (480p) and low bitrate to reduce server load
    cmd = f'ffmpeg -y -i "{input_path}" -vf "scale=-2:480" -b:v 500k -an "{output_path}"'
    subprocess.run(cmd, shell=True, capture_output=True)
    return output_path

def fix_path(path):
    """Windows paths fix for FFmpeg filter_complex"""
    return str(Path(path).absolute()).replace(os.sep, '/')

def generate_smart_montage(original_video_path, audio_path, sfx_path, bgm_path, api_key=None):
    """
    Generate smart video montage using Gemini AI.
    
    Args:
        original_video_path: Path to the original video
        audio_path: Path to the audio file
        sfx_path: Path to sound effects
        bgm_path: Path to background music
        api_key: Gemini API key (if None, uses .env fallback)
    
    Returns:
        FFmpeg command string
    """
    print("--- 🎬 AI Director Mode: Optimized 2.0 Flash ---")
    
    # Use provided key or fallback to .env
    gemini_key = api_key or DEFAULT_GEMINI_API_KEY
    
    if not gemini_key:
        raise ValueError("Gemini API key not provided and not found in .env")
    
    # Create client with provided API key
    client = genai.Client(api_key=gemini_key)
    
    # STEP 1: Compress video before uploading to save Gemini's memory
    temp_video = compress_for_analysis(original_video_path)
    
    # STEP 2: Upload Compressed Video & Audio
    video_file = client.files.upload(file=temp_video)
    audio_file = client.files.upload(file=audio_path)
    
    while client.files.get(name=video_file.name).state.name != "ACTIVE":
        time.sleep(2)

    master_prompt = """
ROLE: Senior Film Editor + Assistant Director.

YOU MUST FOLLOW THIS PIPELINE STRICTLY:

STEP 1 — AUDIO SEGMENTATION (MANDATORY)
- First, transcribe the audio internally.
- Split the voiceover into SHORT semantic units:
  • Each unit = ONE clear idea or sentence.
  • Duration per unit should be 1–4 seconds.
- These audio units DEFINE the final timeline.
- The sum of all units MUST equal total audio duration.

STEP 2 — VISUAL MATCHING
For EACH audio unit:
- Search the video for visuals that BEST MATCH the spoken words.
- Prefer literal matches (object, action, scene).
- If no perfect match exists:
  • Use the closest contextual visual
  • NEVER reuse the same video moment twice

STEP 3 — VIDEO CUT RULES
- Each audio unit maps to EXACTLY ONE video segment.
- Video segment duration MUST MATCH its audio unit duration.
- Trim video precisely — no filler, no padding.

OUTPUT RULES (STRICT):
- Output ONLY a JSON array
- Each item represents ONE audio unit
- Format:
[
  {
    "start": <video_start_in_seconds>,
    "end": <video_end_in_seconds>
  }
]
- Number of segments MUST reflect spoken sentence count
- DO NOT explain anything
- DO NOT include text, transcription, or comments

    """

    # STEP 3: Retry Logic with 2.0 Flash
    max_retries = 3
    segments = None

    for attempt in range(max_retries):
        try:
            print(f"Requesting Gemini (Attempt {attempt + 1})...")
            response = client.models.generate_content(
                model="gemini-2.5-flash", 
                contents=[video_file, audio_file, master_prompt],
                config=types.GenerateContentConfig(
                    temperature=0.0, 
                    response_mime_type="application/json"
                )
            )
            segments = json.loads(response.text)
            break 
        except Exception as e:
            if "503" in str(e):
                print(f"⚠️ Server Busy. Waiting {10 * (attempt + 1)}s...")
                time.sleep(10 * (attempt + 1))
            else:
                print(f"❌ Error: {e}")
                break

    # Cleanup temp video
    if os.path.exists(temp_video):
        os.remove(temp_video)

    if segments:
        print(f"✅ Context Match Successful! {len(segments)} segments found.")
        # Command original video path par chalegi (Quality kharab nahi hogi)
        return build_hollywood_ffmpeg(original_video_path, audio_path, sfx_path, bgm_path, segments)
    else:
        return f'ffmpeg -y -i "{fix_path(original_video_path)}" -i "{fix_path(audio_path)}" -c:v libx264 -shortest final_output.mp4'

# build_hollywood_ffmpeg logic stays the same (Windows friendly)
def build_hollywood_ffmpeg(v_path, narration_path, sfx_path, bgm_path, segments):
    v_path, n_path, s_path, b_path = map(fix_path, [v_path, narration_path, sfx_path, bgm_path])

    v_filters = ""
    concat_nodes = ""
    for i, seg in enumerate(segments):
        start = seg['start']
        end = seg['end']
        # Seconds use karne se "Invalid Argument" error khatam ho jayega
        v_filters += f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{i}];"
        concat_nodes += f"[v{i}]"

    video_chain = f"{v_filters}{concat_nodes}concat=n={len(segments)}:v=1:a=0[outv];"
    
    audio_chain = (
        f"[1:a]volume=5.0[a_narr];" 
        f"[2:a]volume=1.0[a_sfx];" 
        f"[3:a]volume=0.1[a_bgm];" 
        f"[a_narr][a_sfx][a_bgm]amix=inputs=3:duration=first:dropout_transition=2[outa]"
    )

    full_filter = video_chain + audio_chain

    # Windows ke liye filter ko double quotes " " mein wrap karna zaroori hai
    cmd = (
        f'ffmpeg -y -i "{v_path}" -i "{n_path}" -i "{s_path}" -stream_loop -1 -i "{b_path}" '
        f'-filter_complex "{full_filter}" '
        f'-map "[outv]" -map "[outa]" '
        f'-c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 192k final_output.mp4'
    )
    return cmd

# --- Execute Testing ---
if __name__ == "__main__":
    # Ensure these paths are correct in your project
    v_test = "downloads/video.mp4"
    n_test = "downloads/voiceover.mp3"
    s_test = "assets/sfx.mp3"
    b_test = "assets/bgm.mp3"
    
    if os.path.exists(v_test) and os.path.exists(n_test):
        final_cmd = generate_smart_montage(v_test, n_test, s_test, b_test)
        print("\n🚀 FINAL FFmpeg COMMAND GENERATED:\n")
        print(final_cmd)
    else:
        print("Error: Required files not found for testing.")