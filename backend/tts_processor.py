import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

# Fallback key from .env if not provided
DEFAULT_ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
# Voice ID
ELEVENLABS_VOICE_ID = "TX3LPaxmHKxFdv7VOQHJ"

def generate_voiceover(script: str, api_key: str = None) -> str:
    """
    Takes script text, calls ElevenLabs API, and returns the path to the saved audio.
    
    Args:
        script: The text to convert to speech
        api_key: ElevenLabs API key (if None, uses .env fallback)
    
    Returns:
        Path to the saved audio file
    """
    if not script.strip():
        raise ValueError("Script text is empty")
    
    # Use provided key or fallback to .env
    elevenlabs_key = api_key or DEFAULT_ELEVENLABS_API_KEY
    
    if not elevenlabs_key:
        raise ValueError("ElevenLabs API key not provided and not found in .env")

    # Folder create karein
    output_dir = "Audio"
    os.makedirs(output_dir, exist_ok=True)
    
    # Filename with timestamp
    wav_filename = f"tts_{int(time.time())}.wav"
    wav_path = os.path.join(output_dir, wav_filename)

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    
    headers = {
        "xi-api-key": elevenlabs_key,
        "Content-Type": "application/json",
        "Accept": "audio/wav", # Ya "audio/mpeg" agar .mp3 chahiye
    }

    # Aapka exact payload
    payload = {
        "text": script,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.92,
            "similarity_boost": 0.95,
            "speed": 1.2 , 
        }
    }

    print(f"Requesting ElevenLabs TTS for script: {script[:30]}...")
    
    response = requests.post(url, json=payload, headers=headers, stream=True)
    
    if response.status_code != 200:
        raise RuntimeError(f"TTS failed: {response.status_code} - {response.text}")

    # File saving logic
    with open(wav_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)

    print(f"Audio successfully saved at: {wav_path}")
    return wav_path

if __name__ == "__main__":
    # Quick Test
    try:
        path = generate_voiceover("Bhai, naya TTS code bilkul mast kaam kar raha hai!")
        print(f"Test Success: {path}")
    except Exception as e:
        print(f"Test Failed: {e}")