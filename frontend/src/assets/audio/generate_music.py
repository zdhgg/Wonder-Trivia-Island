"""Compatibility entry point for the background audio generator.

The canonical generator lives in ``scripts/generate_audio_assets.py``. Keep
this forwarding script for older local workflows that still invoke the
historical path; it prevents the old mono, 140 BPM loop from being recreated
over the current stereo soundtrack.
"""

from pathlib import Path
import runpy


CANONICAL_GENERATOR = Path(__file__).resolve().parents[4] / "scripts" / "generate_audio_assets.py"


if __name__ == "__main__":
    runpy.run_path(str(CANONICAL_GENERATOR), run_name="__main__")
