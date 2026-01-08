import yt_dlp
import os

def download_video(url: str, output_folder: str = "downloads"):
    # Folder create karein agar nahi hai toh
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # yt-dlp configuration
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': f'{output_folder}/%(title)s.%(ext)s',
        'noplaylist': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            return {
                "status": "success",
                "file_path": filename,
                "title": info.get('title', 'video')
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    test_url = "https://youtube.com/shorts/S7IinGaEMj0?si=ieRHfBSpk3qU3HvV"
    result = download_video(test_url)
    if result["status"] == "success":
        print(f"Downloaded: {result['file_path']}")
    else:
        print(f"Error: {result['message']}")