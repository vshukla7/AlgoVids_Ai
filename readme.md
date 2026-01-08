# 🎬 Algovids AI - AI-Powered Video Generator

Create professional videos with AI-generated voiceovers and smart video editing in 3 simple steps!

## 🚀 Features

- **Step 1: Download** - Download videos from YouTube or other sources
- **Step 2: Script** - Generate AI voiceover from your script using ElevenLabs TTS
- **Step 3: Generate** - Create final video with BGM, SFX, and synchronized audio/video using Gemini AI

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- FFmpeg installed on your system

## ⚙️ Setup

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install fastapi uvicorn yt-dlp python-dotenv google-genai requests
```

3. Make sure your `.env` file has the required API keys:
```
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

4. Start the backend server:
```bash
python main.py
```

The API will be running on `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Dependencies are already installed! Start the dev server:
```bash
npm run dev
```

The UI will be running on `http://localhost:3000`

## 🎯 How to Use

1. **Download Video**: Enter a YouTube URL and click "Download Video"
2. **Generate Voiceover**: Enter your script and click "Generate Voiceover"
3. **Generate Final Video**: 
   - Provide paths to your BGM file (e.g., `assets/bgm.mp3`)
   - Provide paths to your SFX file (e.g., `assets/sfx.mp3`)
   - Click "Generate Final Video"
   - Wait for the AI to create your video!

## 📁 Project Structure

```
Algovids_ai/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── downloader.py        # Video download logic
│   ├── tts_processor.py     # ElevenLabs TTS integration
│   ├── processor.py         # Gemini AI video processing
│   └── .env                 # API keys
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── App.css          # Styling
│   │   └── main.jsx         # Entry point
│   └── package.json
└── README.md
```

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **yt-dlp** - Video downloader
- **ElevenLabs** - Text-to-speech AI
- **Google Gemini AI** - Video analysis and smart editing
- **FFmpeg** - Video processing

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Axios** - HTTP client

## 📝 API Endpoints

- `GET /` - Health check
- `POST /download` - Download video from URL
- `POST /generate-tts` - Generate voiceover from script
- `POST /generate-video` - Generate final video with BGM/SFX
- `GET /download/{filename}` - Download video file
- `GET /audio/{filename}` - Download audio file
- `GET /video/{filename}` - Download generated video

## 🎨 Features

- Beautiful gradient UI design
- Step-by-step workflow
- Real-time progress indicators
- Error handling and user feedback
- Responsive design

## 📜 License

MIT License - Feel free to use this project!

---

Made with ❤️ using AI
