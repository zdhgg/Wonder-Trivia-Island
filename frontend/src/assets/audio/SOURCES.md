# Island ambience sources

## Steps on Sand background music

- Original: user-supplied `音频素材/Steps_on_Sand.mp3`, provided for the Gemini music replacement on 2026-10-09. Original retained unchanged.
- Original SHA-256: `d8f09a656faf6bbcef9710773a93e1e6e48b71d9394ab708b2c484aba9da4a22`.
- Runtime asset: `steps-on-sand-loop.mp3`, 57 seconds, 44.1 kHz stereo, 192 kbps MP3 with gapless encoder metadata.
- Processing: retain the first 58.5 seconds before the ending fade/silence; circular 1.5-second equal-power crossfade; fixed -8.15 dB gain targeting -20 LUFS. No extra environmental sounds or pitch/tempo changes.
- Playback: decode once into an AudioBuffer for continuous looping, with the existing island entrance fade, global volume/mute and reading/reward ducking.
- Rebuild: `python scripts/prepare_island_music.py` (requires ffmpeg or root `ffmpeg-static`). This does not overwrite the original recording or change existing ambience assets.

## Real gull calls

- Files: `island-gull-cry.wav`, `island-gull-cry-2.wav`, `island-gull-cry-3.wav`.
- Recording: **European Herring Gull (Larus argentatus), XC707075**, flight call, Carolles, Normandy, France, 2021-08-05.
- Recordist: **Sonothèque ADVL**, Association de Défense de la Vallée du Lude.
- [Original recording](https://xeno-canto.org/707075).
- [Source and license record on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:XC707075_-_European_Herring_Gull_-_Larus_argentatus.mp3).
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). No attribution is required; credit is retained here for provenance.
- Downloaded 2026-10-01; source SHA-256: `ae6efd68b13693c81b875720af6783eea5281a6606d27c67673d420424d59fea`.
- Edits: excerpts at 4.50–5.28, 5.24–6.06, 6.06–6.99 seconds; mild noise reduction, high/low-pass filtering, softened 2.5 kHz region, short edge fades, subtle rightward stereo balance and matched RMS levels. No pitch shifting.

## Wave bed

`island-waves-loop.wav` is generated locally: a 48-second stereo loop with irregular swell timing, height and duration, and a two-second equal-power seam crossfade. No third-party wave recording is included.

Rebuild both with `python scripts/generate_island_ambience.py --gull-source PATH` (offline), or `--download` to fetch the checksum-verified gull source. Requires `ffmpeg-static` from the root package.
