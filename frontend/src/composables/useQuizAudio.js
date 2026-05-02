import { playAudioCue, unlockAudioEngine } from "../audio/audioEngine";
import { useAudioStore } from "../stores/useAudioStore";

export function useQuizAudio() {
  const audioStore = useAudioStore();

  async function unlockAudio() {
    const isReady = await unlockAudioEngine();

    if (isReady) {
      audioStore.setAudioReady(true);
    }
  }

  function playSuccess() {
    playAudioCue("success");
  }

  function playError() {
    playAudioCue("error");
  }

  function playFinish() {
    playAudioCue("finish");
  }

  return {
    unlockAudio,
    playError,
    playFinish,
    playSuccess
  };
}
