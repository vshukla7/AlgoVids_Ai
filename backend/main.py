from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from downloader import download_video
from tts_processor import generate_voiceover
from processor import generate_smart_montage
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load .env as fallback
load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production mein specific URL daalein
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create necessary directories
os.makedirs("downloads", exist_ok=True)
os.makedirs("Audio", exist_ok=True)
os.makedirs("assets", exist_ok=True) 

class VideoRequest(BaseModel):
    url: str

@app.get("/")
async def root():
    return {"message": "Algovids AI API is running", "version": "1.0"}

@app.post("/download")
async def handle_download(request: VideoRequest):
    if not request.url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    print(f"Downloading from: {request.url}")
    result = download_video(request.url)
    
    if result["status"] == "success":
        return {
            "message": "Download Complete",
            "path": result["file_path"],
            "title": result["title"]
        }
    else:
        raise HTTPException(status_code=500, detail=result["message"])

class TTSRequest(BaseModel):
    script: str

@app.post("/generate-tts")
async def handle_tts(request_data: TTSRequest, request: Request):
    if not request_data.script:
        raise HTTPException(status_code=400, detail="Script text is required")
    
    # Get API key from header or fallback to .env
    elevenlabs_key = request.headers.get('x-elevenlabs-key') or os.getenv('ELEVENLABS_API_KEY')
    
    if not elevenlabs_key:
        raise HTTPException(status_code=400, detail="ElevenLabs API key not provided")
    
    print(f"Generating voiceover for: {request_data.script[:30]}...")
    try:
        audio_path = generate_voiceover(request_data.script, elevenlabs_key)
        return {
            "message": "Audio Generated",
            "audio_path": audio_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download/{filename}")
async def download_file(filename: str):
    # Try multiple possible paths
    possible_paths = [
        os.path.join("downloads", filename),
        filename
    ]
    
    for file_path in possible_paths:
        if os.path.exists(file_path):
            return FileResponse(
                file_path, 
                media_type="video/mp4", 
                filename=os.path.basename(file_path)
            )
    
    raise HTTPException(status_code=404, detail=f"File not found: {filename}")

@app.get("/audio/{filename}")
async def download_audio(filename: str):
    # Try multiple possible paths
    possible_paths = [
        os.path.join("Audio", filename),
        filename
    ]
    
    for file_path in possible_paths:
        if os.path.exists(file_path):
            return FileResponse(
                file_path, 
                media_type="audio/wav", 
                filename=os.path.basename(file_path)
            )
    
    raise HTTPException(status_code=404, detail=f"Audio file not found: {filename}")

class GenerateVideoRequest(BaseModel):
    video_path: str
    audio_path: str
    bgm_path: str
    sfx_path: str

@app.post("/generate-video")
async def handle_generate_video(request_data: GenerateVideoRequest, request: Request):
    if not all([request_data.video_path, request_data.audio_path, request_data.bgm_path, request_data.sfx_path]):
        raise HTTPException(status_code=400, detail="All paths are required")
    
    # Get API key from header or fallback to .env
    gemini_key = request.headers.get('x-gemini-key') or os.getenv('GEMINI_API_KEY')
    
    if not gemini_key:
        raise HTTPException(status_code=400, detail="Gemini API key not provided")
    
    # Verify files exist
    for path in [request_data.video_path, request_data.audio_path, request_data.bgm_path, request_data.sfx_path]:
        if not os.path.exists(path):
            raise HTTPException(status_code=400, detail=f"File not found: {path}")
    
    print(f"Generating video with BGM and SFX...")
    try:
        # Generate the FFmpeg command
        ffmpeg_cmd = generate_smart_montage(
            request_data.video_path,
            request_data.audio_path,
            request_data.sfx_path,
            request_data.bgm_path,
            gemini_key
        )
        
        # Execute the FFmpeg command
        result = subprocess.run(ffmpeg_cmd, shell=True, capture_output=True, text=True, encoding='utf-8', errors='ignore')
        
        if result.returncode == 0:
            output_path = os.path.abspath("final_output.mp4")
            return {
                "message": "Video Generated Successfully",
                "video_path": output_path
            }
        else:
            raise HTTPException(status_code=500, detail=f"FFmpeg error: {result.stderr}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/video/{filename}")
async def get_generated_video(filename: str):
    # Try multiple possible paths
    possible_paths = [
        filename,  # Full path
        os.path.join(os.getcwd(), filename),  # Relative to current directory
        "final_output.mp4"  # Default output name
    ]
    
    for file_path in possible_paths:
        if os.path.exists(file_path):
            return FileResponse(
                file_path, 
                media_type="video/mp4", 
                filename=os.path.basename(file_path)
            )
    
    raise HTTPException(status_code=404, detail=f"Video not found: {filename}")

class TranslateRequest(BaseModel):
    text: str

@app.post('/translate-hindi')
async def translate_to_hindi(request_data: TranslateRequest, request: Request):
    if not request_data.text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    # Get API key from header or fallback to .env
    gemini_key = request.headers.get('x-gemini-key') or os.getenv('GEMINI_API_KEY')
    
    if not gemini_key:
        raise HTTPException(status_code=400, detail="Gemini API key not provided")
    
    try:
        # Create client like in processor.py
        client = genai.Client(api_key=gemini_key)
            
        # Create the prompt for translation
        prompt = f"Translate the following text to Hindi. Only return the translated text without any additional explanation or comments:\n\n{request_data.text}"
            
        # Generate the translation using client like in processor.py
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt],
            config=types.GenerateContentConfig(
                temperature=0.0,
                response_mime_type="text/plain"
            )
        )
            
        # Extract the translated text
        translated_text = response.text.strip()
            
        return {
            "original_text": request_data.text,
            "translated_text": translated_text,
            "language": "Hindi"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

class CleanupRequest(BaseModel):
    video_path: str = ""
    audio_path: str = ""

@app.post("/cleanup")
async def cleanup_files(request: CleanupRequest):
    deleted_files = []
    errors = []
    
    # Clean up video
    if request.video_path:
        try:
            if os.path.exists(request.video_path):
                os.remove(request.video_path)
                deleted_files.append(request.video_path)
            else:
                errors.append(f"Video file not found: {request.video_path}")
        except Exception as e:
            errors.append(f"Could not delete video: {str(e)}")
    
    # Clean up audio
    if request.audio_path:
        try:
            if os.path.exists(request.audio_path):
                os.remove(request.audio_path)
                deleted_files.append(request.audio_path)
            else:
                errors.append(f"Audio file not found: {request.audio_path}")
        except Exception as e:
            errors.append(f"Could not delete audio: {str(e)}")
    
    return {
        "message": "Cleanup completed",
        "deleted": deleted_files,
        "errors": errors,
        "success": len(errors) == 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)