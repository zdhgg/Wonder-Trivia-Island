import islandBgmLoopUrl from "../assets/audio/island-bgm-loop.wav";
import sfxErrorUrl from "../assets/audio/sfx-error.wav";
import sfxFinishUrl from "../assets/audio/sfx-finish.wav";
import sfxSuccessUrl from "../assets/audio/sfx-success.wav";
import sfxToggleUrl from "../assets/audio/sfx-toggle.wav";

export const AUDIO_ASSETS = Object.freeze({
  music: Object.freeze({
    islandLoop: islandBgmLoopUrl
  }),
  cues: Object.freeze({
    error: sfxErrorUrl,
    finish: sfxFinishUrl,
    success: sfxSuccessUrl,
    toggle: sfxToggleUrl
  })
});

export const AUDIO_ASSET_VOLUME = Object.freeze({
  error: 0.92,
  finish: 0.98,
  success: 0.94,
  toggle: 0.78
});
