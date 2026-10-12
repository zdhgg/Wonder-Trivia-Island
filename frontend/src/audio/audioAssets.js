import islandBgmLoopUrl from "../assets/audio/steps-on-sand-loop.mp3";
import islandGullCryUrl from "../assets/audio/island-gull-cry.wav";
import islandGullCry2Url from "../assets/audio/island-gull-cry-2.wav";
import islandGullCry3Url from "../assets/audio/island-gull-cry-3.wav";
import islandWavesLoopUrl from "../assets/audio/island-waves-loop.wav";
import sfxErrorUrl from "../assets/audio/sfx-error.wav";
import sfxFinishUrl from "../assets/audio/sfx-finish.wav";
import sfxSuccessUrl from "../assets/audio/sfx-success.wav";
import sfxToggleUrl from "../assets/audio/sfx-toggle.wav";

export const AUDIO_ASSETS = Object.freeze({
  music: Object.freeze({
    islandLoop: islandBgmLoopUrl
  }),
  // Environment sounds follow the existing SFX channel and island lifecycle.
  ambience: Object.freeze({
    islandWaves: islandWavesLoopUrl,
    islandGullCries: Object.freeze([islandGullCryUrl, islandGullCry2Url, islandGullCry3Url])
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
