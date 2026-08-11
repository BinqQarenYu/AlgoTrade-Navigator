import sys
from youtube_transcript_api import YouTubeTranscriptApi

try:
    transcript = YouTubeTranscriptApi.get_transcript('ISd5KpIn9s8')
    with open('transcript.txt', 'w', encoding='utf-8') as f:
        for entry in transcript:
            f.write(entry['text'] + '\n')
    print("Transcript saved.")
except Exception as e:
    print(f"Error: {e}")
