#!/usr/bin/env python3
import os
import sys
import re
import json
import glob
import subprocess
import unicodedata
from typing import List, Tuple

def normalize_token(text: str) -> str:
    text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    text = text.lower()
    return re.sub(r'[^a-z0-9]', '', text)

def format_timestamp(seconds: float) -> str:
    m = int(seconds // 60)
    s = seconds % 60
    return f"[{m:02d}:{s:05.2f}]"

def is_direction_or_header(line: str) -> bool:
    line_s = line.strip()
    if not line_s:
        return True
    line_s = line_s.replace('\u200b', '')
    if re.match(r'^\[.*\]$', line_s):
        return True
    if re.match(r'^\(.*\)$', line_s):
        lower = line_s.lower()
        if any(w in lower for w in [
            'guitarra', 'ambiente', 'instrumental', 'beat', 'solo', 'fade',
            'heavy', 'strips', 'whisper', 'suspiro', 'drop', 'clean drum'
        ]):
            return True
    return False

def extract_mp3_metadata(filepath: str) -> Tuple[str, str, str]:
    res = subprocess.run(
        ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', filepath],
        capture_output=True, text=True
    )
    if res.returncode != 0 or not res.stdout:
        return os.path.splitext(os.path.basename(filepath))[0], "Rakun.io", ""
    
    data = json.loads(res.stdout)
    tags = data.get('format', {}).get('tags', {})
    
    title = tags.get('title', os.path.splitext(os.path.basename(filepath))[0])
    artist = tags.get('artist', 'Rakun.io')
    lyrics = tags.get('lyrics-eng', tags.get('lyrics', ''))
    return title, artist, lyrics

def clean_lyric_lines(raw_lyrics: str) -> List[str]:
    lines = []
    for line in raw_lyrics.split('\n'):
        line_clean = line.strip().replace('\u200b', '')
        if not is_direction_or_header(line_clean):
            lines.append(line_clean)
    return lines

def align_and_build_lrc(
    filepath: str,
    title: str,
    artist: str,
    raw_lyrics: str,
    model: any
) -> str:
    lines = clean_lyric_lines(raw_lyrics)
    if not lines:
        print(f"Warning: No valid lyric lines found for {filepath}")
        return ""

    prompt_context = " ".join(lines)[:400]
    
    segments, info = model.transcribe(
        filepath,
        word_timestamps=True,
        vad_filter=False,
        beam_size=5
    )
    
    words_db = []
    for seg in segments:
        for w in (seg.words or []):
            words_db.append({
                "word": w.word.strip(),
                "start": round(w.start, 2),
                "end": round(w.end, 2)
            })
            
    norm_w = [normalize_token(w['word']) for w in words_db]
    
    lang = "EN" if info.language == "en" else ("JA" if info.language == "ja" else "ES")
    
    output_lines = [
        f"[ti:{title}]",
        f"[au:{artist}]",
        f"[la:{lang}]",
        f"[re:Rakunio-LRC-Generator]",
        f"[ve:1.00]",
        ""
    ]
    
    last_idx = 0
    last_time = 0.0
    
    for line_text in lines:
        clean_tokens = [normalize_token(t) for t in line_text.split() if normalize_token(t)]
        if not clean_tokens:
            continue
            
        req_match = max(2, min(len(clean_tokens), 3))
        best_score = -1
        best_start_idx = None
        
        search_range = range(last_idx, min(len(words_db), last_idx + 45))
        for idx in search_range:
            candidate = norm_w[idx : idx + len(clean_tokens) + 4]
            score = 0
            c_i = 0
            first_match_idx = None
            for tok in clean_tokens:
                for k in range(c_i, min(len(candidate), c_i + 3)):
                    if (candidate[k] == tok or 
                        (len(tok) >= 4 and tok in candidate[k]) or 
                        (len(candidate[k]) >= 4 and candidate[k] in tok)):
                        score += 1
                        if first_match_idx is None:
                            first_match_idx = idx + k
                        c_i = k + 1
                        break
            if score >= req_match and score > best_score:
                best_score = score
                best_start_idx = first_match_idx
                if score >= len(clean_tokens) - 1:
                    break
                    
        if best_start_idx is not None:
            t = words_db[best_start_idx]['start']
            if t < last_time:
                t = last_time + 0.3
            last_time = t
            last_idx = best_start_idx + 1
        else:
            last_time += 2.0
            
        output_lines.append(f"{format_timestamp(last_time)}{line_text}")
        
    out_path = os.path.splitext(filepath)[0] + ".lrc"
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(output_lines) + "\n")
        
    return out_path

def main():
    target_files = []
    if len(sys.argv) > 1:
        target_files = sys.argv[1:]
    else:
        all_mp3s = sorted(glob.glob("public/music/rakunio/*.mp3"))
        for mp3 in all_mp3s:
            lrc_candidate = os.path.splitext(mp3)[0] + ".lrc"
            if not os.path.exists(lrc_candidate):
                target_files.append(mp3)

    if not target_files:
        print("All MP3 files in public/music/rakunio already have corresponding .lrc files.")
        return

    print(f"Found {len(target_files)} track(s) to process:")
    for f in target_files:
        print(f"  - {f}")

    from faster_whisper import WhisperModel
    print("\nLoading faster-whisper model (small / int8)...")
    model = WhisperModel("small", device="cpu", compute_type="int8")

    for filepath in target_files:
        print(f"\nProcessing: {filepath}")
        title, artist, lyrics = extract_mp3_metadata(filepath)
        if not lyrics:
            print(f"  Warning: No lyrics tag found in {filepath}. Skipping.")
            continue
            
        out_path = align_and_build_lrc(filepath, title, artist, lyrics, model)
        if out_path:
            print(f"  ✓ Successfully created: {out_path}")

if __name__ == "__main__":
    main()
