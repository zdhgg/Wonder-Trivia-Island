import islandBgmLoopUrl from "../assets/audio/island-bgm-loop.wav";
import islandGullCryUrl from "../assets/audio/island-gull-cry.wav";
import islandWavesLoopUrl from "../assets/audio/island-waves-loop.wav";
import sfxErrorUrl from "../assets/audio/sfx-error.wav";
import sfxFinishUrl from "../assets/audio/sfx-finish.wav";
import sfxSuccessUrl from "../assets/audio/sfx-success.wav";
import sfxToggleUrl from "../assets/audio/sfx-toggle.wav";

export const AUDIO_ASSETS = Object.freeze({
  music: Object.freeze({
    islandLoop: islandBgmLoopUrl
  }),
  // 知识岛页面的「专属环境声」：与 music 分开，因为它有自己独立的开关与生命周期，
  // 而且进入知识岛时会临时借用（暂停）系统背景音乐。
  ambience: Object.freeze({
    islandWaves: islandWavesLoopUrl,
    islandGullCry: islandGullCryUrl
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
