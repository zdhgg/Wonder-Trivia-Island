import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { playAudioCue } from "../audio/audioEngine";
import { playIslandGullCryOnce } from "../audio/islandAmbience";

// Scene-local feedback only. All growth and daily reading state belongs to the page.
export function useIslandInteractions(props, { emit, sizeKey, prosperityKey }) {
  const figureRef = ref(null);
  const hotSpots = ref([]);
  const activeHotSpotId = ref("");
  const hoveredHotSpotId = ref("");
  const hintText = ref("");
  const ripples = ref([]);

  let syncFrame = 0;
  let resetTimer = 0;
  let hintTimer = 0;
  let rippleSeq = 0;
  let resizeObserver = null;
  let measureInterval = 0;
  const rippleTimers = new Set();

  const HOT_SPOT_DEFS = Object.freeze([
    { id: "shell", anchor: ".knowledge-island__shell--main", kind: "box" },
    { id: "rock", anchor: ".knowledge-island__rock--main", kind: "box" },
    { id: "gull", anchor: ".knowledge-island__gull--a", kind: "box" },
    { id: "sun", anchor: ".knowledge-island__sun", kind: "box" },
    { id: "cloud", anchor: ".knowledge-island__cloud--left", kind: "box" },
    { id: "bottle", anchor: ".knowledge-island__bottle", kind: "box" },
    { id: "next", anchor: '[data-role="knowledge-island-next-terrain"]', kind: "chip" },
    { id: "sea", anchor: null, kind: "band" }
  ]);

  const HOT_SPOT_LABELS = Object.freeze({
    shell: { label: "看看西岸的贝壳", hint: "发现了一枚贝壳" },
    rock: { label: "看看西岸的石头", hint: "石头被浪花拍了一下" },
    gull: { label: "看看天上飞过的海鸥", hint: "海鸥从岛上飞过" },
    sun: { label: "看看天上的太阳", hint: "太阳暖洋洋的，海面亮晶晶" },
    cloud: { label: "看看天上的云朵", hint: "云朵慢慢飘，像一团棉花糖" },
    bottle: { label: "看看海里漂来的瓶子", hint: "" },
    next: { label: "看看岛外面的虚线轮廓", hint: "" },
    sea: { label: "点一点海面", hint: "海面泛起一圈小涟漪" }
  });

  const HOT_SPOT_SOUNDS = Object.freeze({
    shell: "ding",
    rock: "thud",
    sea: "plop",
    sun: "chime",
    cloud: "puff"
  });

  function playHotSpotSound(id) {
    if (id === "gull") {
      playIslandGullCryOnce();
      return;
    }

    const cueName = HOT_SPOT_SOUNDS[id];

    if (cueName) {
      playAudioCue(cueName);
    }
  }

  const nextStageHintText = computed(() => {
    const nextStage = props.island?.nextStage;
    const remaining = Number(props.island?.remainingToNext) || 0;

    if (!nextStage?.name) {
      return "";
    }

    return `还差 ${remaining} 枚印章，将成长为「${nextStage.name}」`;
  });

  function hotSpotLabel(id) {
    if (id === "next") {
      return nextStageHintText.value || HOT_SPOT_LABELS.next.label;
    }

    return HOT_SPOT_LABELS[id]?.label || "";
  }

  function hotSpotHint(id) {
    if (id === "next") {
      return nextStageHintText.value;
    }

    if (id === "bottle") {
      return String(props.bottleLine || "").trim() || "瓶子里有一张写着加油的小字条";
    }

    return HOT_SPOT_LABELS[id]?.hint || "";
  }

  function syncHotSpots() {
    const figure = figureRef.value;

    if (!figure || !props.interactive) {
      hotSpots.value = [];
      return;
    }

    const frame = (figure.querySelector(".knowledge-island__hotspots") || figure).getBoundingClientRect();

    if (frame.width <= 0) {
      hotSpots.value = [];
      return;
    }

    const toPercentBox = (rect) => ({
      left: ((rect.left + rect.width / 2 - frame.left) / frame.width) * 100,
      top: ((rect.top + rect.height / 2 - frame.top) / frame.height) * 100,
      width: (rect.width / frame.width) * 100,
      height: (rect.height / frame.height) * 100
    });

    const measured = HOT_SPOT_DEFS.map((definition) => {
      if (definition.kind === "band") {
        return { id: definition.id, box: { left: 0, top: 74, width: 100, height: 26 } };
      }

      const target = figure.querySelector(definition.anchor);

      if (!target) {
        return null;
      }

      const rect = target.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }

      if (definition.kind === "chip") {
        return {
          id: definition.id,
          box: {
            // On small canvases a 44px label obscures the west shore. Put it in
            // open water while preserving the same preview action.
            left: frame.width < 520 ? 14 : Math.max(7, ((rect.left - frame.left) / frame.width) * 100),
            top: frame.width < 520 ? 82 : ((rect.top + rect.height * 0.52 - frame.top) / frame.height) * 100,
            width: null,
            height: null
          }
        };
      }

      return { id: definition.id, box: toPercentBox(rect) };
    }).filter(Boolean);

    hotSpots.value = measured;
  }

  function scheduleHotSpotSync() {
    if (typeof window === "undefined" || !window.requestAnimationFrame) {
      return;
    }

    if (syncFrame) {
      window.cancelAnimationFrame(syncFrame);
    }

    syncFrame = window.requestAnimationFrame(() => {
      syncFrame = 0;
      syncHotSpots();
    });
  }

  function clearTimers() {
    if (typeof window !== "undefined") {
      if (resetTimer) {
        window.clearTimeout(resetTimer);
        resetTimer = 0;
      }
      if (hintTimer) {
        window.clearTimeout(hintTimer);
        hintTimer = 0;
      }
      if (sunTapTimer) {
        window.clearTimeout(sunTapTimer);
        sunTapTimer = 0;
      }
      if (duskTimer) {
        window.clearTimeout(duskTimer);
        duskTimer = 0;
      }
    }

    sunTapCount = 0;
    duskActive.value = false;
    rippleTimers.forEach((timer) => window.clearTimeout(timer));
    rippleTimers.clear();
    ripples.value = [];
  }

  function showHint(text) {
    if (!text) {
      return;
    }

    hintText.value = text;

    if (typeof window === "undefined") {
      return;
    }

    if (hintTimer) {
      window.clearTimeout(hintTimer);
    }

    hintTimer = window.setTimeout(() => {
      hintText.value = "";
      hintTimer = 0;
    }, 4000);
  }

  function pushRipple(point) {
    rippleSeq += 1;
    const ripple = { key: rippleSeq, x: point.x, y: point.y };
    ripples.value = [...ripples.value, ripple];

    if (typeof window === "undefined") {
      return;
    }

    const timer = window.setTimeout(() => {
      rippleTimers.delete(timer);
      ripples.value = ripples.value.filter((item) => item.key !== ripple.key);
    }, 1200);

    rippleTimers.add(timer);
  }

  function ripplePointFromEvent(event) {
    const frame = figureRef.value;

    if (!frame) {
      return { x: 50, y: 88 };
    }

    const rect = frame.getBoundingClientRect();
    const clientX = event?.detail === 0 ? undefined : event?.clientX;
    const clientY = event?.detail === 0 ? undefined : event?.clientY;

    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return { x: 50, y: 88 };
    }

    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    };
  }

  function triggerHotSpot(id, event) {
    activeHotSpotId.value = id;
    emit("interaction", id);
    if (id !== "bottle") showHint(hotSpotHint(id));
    playHotSpotSound(id);

    if (id === "next") emit("preview-next");

    if (id === "sea") {
      pushRipple(ripplePointFromEvent(event));
    }

    if (id === "sun") {
      trackSunTap();
    }

    if (id === "bottle") {
      emit("bottle-open");
    }

    if (typeof window === "undefined") {
      return;
    }

    if (resetTimer) {
      window.clearTimeout(resetTimer);
    }

    resetTimer = window.setTimeout(() => {
      activeHotSpotId.value = "";
      resetTimer = 0;
    }, 1100);
  }

  const duskActive = ref(false);
  let sunTapCount = 0;
  let sunTapTimer = 0;
  let duskTimer = 0;

  function trackSunTap() {
    if (typeof window === "undefined") {
      return;
    }

    sunTapCount += 1;

    if (sunTapTimer) {
      window.clearTimeout(sunTapTimer);
    }

    sunTapTimer = window.setTimeout(() => {
      sunTapCount = 0;
      sunTapTimer = 0;
    }, 3000);

    if (sunTapCount < 5 || duskActive.value) {
      return;
    }

    sunTapCount = 0;
    duskActive.value = true;
    showHint("夕阳把海面染成了金色，真美呀～");

    duskTimer = window.setTimeout(() => {
      duskActive.value = false;
      duskTimer = 0;
    }, 10000);
  }

  const PARALLAX_RANGE_PX = 5;
  let parallaxFrame = 0;
  let parallaxEnabled = false;

  function applyParallax(clientX, clientY) {
    const figure = figureRef.value;

    if (!figure) {
      return;
    }

    const rect = figure.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const ratioX = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width) * 2 - 1));
    const ratioY = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height) * 2 - 1));

    figure.style.setProperty("--ki-px", `${(-ratioX * PARALLAX_RANGE_PX).toFixed(2)}px`);
    figure.style.setProperty("--ki-py", `${(-ratioY * PARALLAX_RANGE_PX * 0.6).toFixed(2)}px`);
  }

  function resetParallax() {
    const figure = figureRef.value;

    if (!figure) {
      return;
    }

    figure.style.setProperty("--ki-px", "0px");
    figure.style.setProperty("--ki-py", "0px");
  }

  function handleParallaxMove(event) {
    if (!parallaxEnabled || typeof window === "undefined" || !window.requestAnimationFrame) {
      return;
    }

    const { clientX, clientY } = event;

    if (parallaxFrame) {
      return;
    }

    parallaxFrame = window.requestAnimationFrame(() => {
      parallaxFrame = 0;
      applyParallax(clientX, clientY);
    });
  }

  function setupParallax() {
    if (typeof window === "undefined" || !figureRef.value) {
      return;
    }

    parallaxEnabled = !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (!parallaxEnabled) {
      return;
    }

    figureRef.value.addEventListener("mousemove", handleParallaxMove);
    figureRef.value.addEventListener("mouseleave", resetParallax);
  }

  function teardownParallax() {
    if (typeof window !== "undefined" && parallaxFrame) {
      window.cancelAnimationFrame(parallaxFrame);
      parallaxFrame = 0;
    }

    if (figureRef.value) {
      figureRef.value.removeEventListener("mousemove", handleParallaxMove);
      figureRef.value.removeEventListener("mouseleave", resetParallax);
    }
  }

  onMounted(() => {
    if (!props.interactive) return;
    scheduleHotSpotSync();
    nextTick(scheduleHotSpotSync);
    setupParallax();

    if (typeof window !== "undefined") {
      measureInterval = window.setInterval(scheduleHotSpotSync, 2500);
    }

    if (typeof ResizeObserver === "undefined" || !figureRef.value) {
      return;
    }

    resizeObserver = new ResizeObserver(scheduleHotSpotSync);
    resizeObserver.observe(figureRef.value);
  });

  onBeforeUnmount(() => {
    clearTimers();
    teardownParallax();

    if (typeof window !== "undefined") {
      if (syncFrame) {
        window.cancelAnimationFrame(syncFrame);
        syncFrame = 0;
      }

      if (measureInterval) {
        window.clearInterval(measureInterval);
        measureInterval = 0;
      }
    }

    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  });

  watch(
    () => [props.island?.currentStage?.id, prosperityKey(), sizeKey(), props.bottle],
    () => {
      clearTimers();
      activeHotSpotId.value = "";
      hintText.value = "";
      scheduleHotSpotSync();
      nextTick(scheduleHotSpotSync);
    }
  );
  return { figureRef, hotSpots, activeHotSpotId, hoveredHotSpotId, hintText, ripples, duskActive, triggerHotSpot, hotSpotLabel };
}
