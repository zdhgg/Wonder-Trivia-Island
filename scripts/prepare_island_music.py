"""Prepare the user-supplied Steps on Sand recording for a continuous island loop.

Requires ffmpeg on PATH (or the root project's ffmpeg-static package).
The original file is never modified. Run from any directory with Python 3.
"""

import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
END_SECONDS = 58.5  # Before the original fade-out and 2.35-second silent tail.
CROSSFADE_SECONDS = 1.5
TARGET_LUFS = -20


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path,
                        default=ROOT / "音频素材" / "Steps_on_Sand.mp3")
    args = parser.parse_args()
    source = args.source.resolve(strict=True)
    output = ROOT / "frontend/src/assets/audio/steps-on-sand-loop.mp3"
    if source == output.resolve():
        parser.error("The original source and output must be different files.")
    ffmpeg = shutil.which("ffmpeg") or str(ROOT / "node_modules/ffmpeg-static/ffmpeg.exe")
    middle_end = END_SECONDS - CROSSFADE_SECONDS
    # Play the middle, then blend the tail into the opening. The end of this
    # blend meets the middle's first sample when the decoded buffer repeats.
    graph = (
        "[0:a]asplit=3[head][middle][tail];"
        f"[head]atrim=0:{CROSSFADE_SECONDS},asetpts=PTS-STARTPTS[h];"
        f"[middle]atrim={CROSSFADE_SECONDS}:{middle_end},asetpts=PTS-STARTPTS[m];"
        f"[tail]atrim={middle_end}:{END_SECONDS},asetpts=PTS-STARTPTS[t];"
        f"[t][h]acrossfade=d={CROSSFADE_SECONDS}:c1=qsin:c2=qsin[seam];"
        "[m][seam]concat=n=2:v=0:a=1[loop]"
    )
    measured = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", str(source), "-filter_complex",
         graph + f";[loop]loudnorm=I={TARGET_LUFS}:TP=-2:LRA=7:print_format=json[out]",
         "-map", "[out]", "-f", "null", "-"],
        check=True, capture_output=True, text=True, encoding="utf-8", errors="replace"
    ).stderr
    stats = json.JSONDecoder().raw_decode(measured[measured.rfind("{"):])[0]
    # Fixed gain preserves the arrangement's dynamics and the circular seam.
    gain_db = min(TARGET_LUFS - float(stats["input_i"]), -2 - float(stats["input_tp"]))
    subprocess.run(
        [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
         "-filter_complex", graph + f";[loop]volume={gain_db:.3f}dB[out]",
         "-map", "[out]", "-ar", "44100", "-ac", "2", "-c:a", "libmp3lame",
         "-b:a", "192k", "-map_metadata", "-1", "-metadata",
         "title=Steps on Sand - Knowledge Island loop", str(output)], check=True
    )
    print(json.dumps({
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "output": str(output), "loop_seconds": middle_end,
        "crossfade_seconds": CROSSFADE_SECONDS, "gain_db": round(gain_db, 3),
        "target_lufs": TARGET_LUFS, "bytes": output.stat().st_size
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
