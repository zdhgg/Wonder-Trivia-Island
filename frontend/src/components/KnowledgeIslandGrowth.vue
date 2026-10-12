<script setup>
// Growth rules arrive through island; terrain owns the shape and coordinates.
// Buildings stay attached to their zones, and prosperity only enriches unlocked
// features. The interaction composable owns temporary feedback, never progress.
import { computed, ref, useId } from "vue";
import islandSceneBackground from "../assets/images/island-sea-sky.webp";
import islandPalmIllustration from "../assets/images/island-palm.webp";
import islandLighthouseIllustration from "../assets/images/island-lighthouse.webp";
import islandTentIllustration from "../assets/images/island-tent.webp";
import islandDockIllustration from "../assets/images/island-dock.webp";
import islandBoatIllustration from "../assets/images/island-boat.webp";
import islandObservatoryIllustration from "../assets/images/island-observatory.webp";
import islandRockIllustration from "../assets/images/island-rock.webp";
import islandShellIllustration from "../assets/images/island-shell.webp";
import islandDriftwoodIllustration from "../assets/images/island-driftwood.webp";
import islandSproutIllustration from "../assets/images/island-sprout.webp";
import islandGrassIllustration from "../assets/images/island-grass.webp";
import islandStarfishIllustration from "../assets/images/island-starfish.webp";
import { useIslandInteractions } from "../composables/useIslandInteractions";
import {
  KNOWLEDGE_ISLAND_ZONES,
  buildKnowledgeIslandNextTerrainPreview,
  buildTerrainClipPath,
  buildTerrainSmoothPath,
  buildTerrainFootprintStyle,
  buildZoneStyle,
  getKnowledgeIslandTerrain
} from "../utils/knowledgeIslandTerrain.js";

const props = defineProps({
  island: {
    type: Object,
    required: true
  },
  size: {
    type: String,
    default: "compact"
  },
  bottle: {
    type: Boolean,
    default: false
  },
  interactive: { type: Boolean, default: true },
  bottleLine: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["bottle-open", "interaction", "preview-next"]);

const ISLAND_SIZES = Object.freeze(["compact", "hero"]);
const backgroundLoaded = ref(false);
const palmLoaded = ref(false);
const lighthouseLoaded = ref(false);
// Keep each original shape visible until its shared sprite has loaded.
const objectArtLoaded = ref({});

function sizeKey() {
  const normalized = String(props.size || "").trim();

  return ISLAND_SIZES.includes(normalized) ? normalized : "compact";
}

function currentStageFeatures() {
  return props.island?.currentStage?.features || [];
}

function hasIslandFeature(feature) {
  return currentStageFeatures().includes(feature);
}

function prosperityLevel() {
  const level = Number.parseInt(String(props.island?.prosperityLevel ?? 0), 10);

  return Number.isFinite(level) && level > 0 ? level : 0;
}

function isProsperityAtLeast(level) {
  return prosperityLevel() >= level;
}

function prosperityKey() {
  const key = String(props.island?.prosperityKey ?? "").trim();

  return key || "basic";
}

const terrain = computed(() => getKnowledgeIslandTerrain(props.island?.currentStage?.id));
const footprintStyle = computed(() => buildTerrainFootprintStyle(terrain.value));
const groundPath = computed(() => buildTerrainSmoothPath(terrain.value.ground));
const sceneId = useId();
const grassClipPath = computed(() => buildTerrainClipPath(terrain.value.grass));
const reliefClipPath = computed(() => buildTerrainClipPath(terrain.value.relief));
const hasGrass = computed(() => Boolean(terrain.value.grass));
const hasRelief = computed(() => Boolean(terrain.value.relief));

function zoneStyle(zoneId) {
  return buildZoneStyle(KNOWLEDGE_ISLAND_ZONES[zoneId]);
}

const nextTerrainPreview = computed(() => buildKnowledgeIslandNextTerrainPreview(props.island));

const { figureRef, hotSpots, activeHotSpotId, hoveredHotSpotId, hintText, ripples, duskActive, triggerHotSpot, hotSpotLabel } =
  useIslandInteractions(props, { emit, sizeKey, prosperityKey });
</script>

<template>
  <div
    class="knowledge-island"
    :data-size="sizeKey()"
    :data-stage="island.currentStage.id"
    :data-prosperity="prosperityKey()"
    :class="[
      `knowledge-island--${island.currentStage.id}`,
      `knowledge-island--prosperity-${prosperityKey()}`,
      `knowledge-island--${sizeKey()}`,
      {
        [`knowledge-island--active-${activeHotSpotId}`]: Boolean(activeHotSpotId),
        'knowledge-island--dusk': duskActive,
        'knowledge-island--scene-background': sizeKey() === 'hero' && backgroundLoaded,
        [`knowledge-island--hover-${hoveredHotSpotId}`]: Boolean(hoveredHotSpotId)
      }
    ]"
  >
    <div
      ref="figureRef"
      class="knowledge-island__figure"
      data-role="knowledge-island-figure"
      :data-stage="island.currentStage.id"
      :data-prosperity="prosperityKey()"
    >
      <!-- One environment for all stages; the live island and its hotspots stay separate. -->
      <img
        v-if="sizeKey() === 'hero'"
        class="knowledge-island__scene-background"
        :src="islandSceneBackground"
        alt=""
        aria-hidden="true"
        width="1672"
        height="941"
        decoding="async"
        @load="backgroundLoaded = true"
        @error="backgroundLoaded = false"
      />

      <div
        class="knowledge-island__world"
        role="img"
        :aria-label="`知识岛现在的样子：${island.currentStage.name}，${island.prosperityLabel}。${island.currentStage.summary}`"
      >

        <span class="knowledge-island__sun" aria-hidden="true"></span>
        <span class="knowledge-island__cloud knowledge-island__cloud--left" aria-hidden="true"></span>
        <span class="knowledge-island__cloud knowledge-island__cloud--right" aria-hidden="true"></span>

        <span v-if="isProsperityAtLeast(2)" class="knowledge-island__cloud knowledge-island__cloud--flourishing" aria-hidden="true"></span>
        <span class="knowledge-island__sky-dot knowledge-island__sky-dot--a" aria-hidden="true"></span>
        <span class="knowledge-island__sky-dot knowledge-island__sky-dot--b" aria-hidden="true"></span>

        <span v-if="isProsperityAtLeast(1)" class="knowledge-island__gull knowledge-island__gull--a" aria-hidden="true"></span>
        <span v-if="isProsperityAtLeast(1)" class="knowledge-island__gull knowledge-island__gull--b" aria-hidden="true"></span>
        <span v-if="isProsperityAtLeast(2)" class="knowledge-island__gull knowledge-island__gull--c" aria-hidden="true"></span>

        <span
          v-if="isProsperityAtLeast(1)"
          class="knowledge-island__gull knowledge-island__gull--flyby"
          aria-hidden="true"
        ></span>

        <span class="knowledge-island__horizon-island" aria-hidden="true"></span>
        <span class="knowledge-island__horizon-sail" aria-hidden="true"></span>
        <svg class="knowledge-island__sea" viewBox="0 0 400 225" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient :id="`${sceneId}-sea`" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#9ed7e0" /><stop offset="1" stop-color="#4d9db6" /></linearGradient></defs>
          <path d="M0 12 Q45 5 90 12 T180 11 T270 12 T360 10 L400 11 V225 H0Z" :fill="`url(#${sceneId}-sea)`" />
          <g fill="none" stroke="#daf3f0" stroke-linecap="round" opacity=".36">
            <path d="M17 54q22-3 40 0m64-16q30-3 59 0m56 18q35-4 68 0m-207 69q20-3 44 0m90 44q29-3 58 0m-245-7q18-3 30 0" />
          </g>
        </svg>
        <span class="knowledge-island__sea-depth" aria-hidden="true"></span>

        <span class="knowledge-island__sun-glitter" aria-hidden="true"></span>

        <span class="knowledge-island__seagrass knowledge-island__seagrass--a" aria-hidden="true"></span>
        <span class="knowledge-island__seagrass knowledge-island__seagrass--b" aria-hidden="true"></span>
        <span class="knowledge-island__buoy" aria-hidden="true"></span>

        <span v-if="bottle" class="knowledge-island__bottle" aria-hidden="true"></span>
        <span class="knowledge-island__surf" aria-hidden="true">
          <span class="knowledge-island__surf-line knowledge-island__surf-line--a"></span>
          <span class="knowledge-island__surf-line knowledge-island__surf-line--b"></span>
          <span class="knowledge-island__surf-line knowledge-island__surf-line--c"></span>
          <span class="knowledge-island__surf-line knowledge-island__surf-line--d"></span>

          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__surf-line knowledge-island__surf-line--lush-a"></span>
          <span v-if="isProsperityAtLeast(1)" class="knowledge-island__surf-line knowledge-island__surf-line--lush-b"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__surf-line knowledge-island__surf-line--flourishing-a"></span>
          <span v-if="isProsperityAtLeast(2)" class="knowledge-island__surf-line knowledge-island__surf-line--flourishing-b"></span>
        </span>

        <svg
          v-if="nextTerrainPreview"
          class="knowledge-island__next-terrain"
          :class="{ 'knowledge-island__next-terrain--tapped': activeHotSpotId === 'next' }"
          data-role="knowledge-island-next-terrain"
          :style="nextTerrainPreview.footprintStyle"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path class="knowledge-island__next-fill" :d="nextTerrainPreview.path" />
          <path class="knowledge-island__next-outline" :d="nextTerrainPreview.path" />
        </svg>

        <div
          class="knowledge-island__terrain"
          data-role="knowledge-island-terrain"
          :data-terrain-stage="terrain.id"
          :style="footprintStyle"
        >
          <span class="knowledge-island__island-shadow" aria-hidden="true"></span>

          <svg class="knowledge-island__ground-art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient :id="`${sceneId}-sand`" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#ffebbf" /><stop offset="1" stop-color="#ebc480" /></linearGradient>
              <clipPath :id="`${sceneId}-shore`"><path :d="groundPath" /></clipPath>
            </defs>
            <path class="knowledge-island__shore-ring" :d="groundPath" fill="none" stroke="#e6f5e9" stroke-width="5" />
            <path class="knowledge-island__ground" :d="groundPath" :fill="`url(#${sceneId}-sand)`" />
            <g :clip-path="`url(#${sceneId}-shore)`">
              <path :d="groundPath" fill="none" stroke="#d6ac6e" stroke-width="3" opacity=".25" />
              <path d="M25 41l4-1m27 9h3m15 17h2M39 67h2M63 35l2 1" stroke="#c39b64" opacity=".4" stroke-linecap="round" />
            </g>
          </svg>
          <svg v-if="isProsperityAtLeast(1)" class="knowledge-island__tidepool" viewBox="0 0 80 40" aria-hidden="true">
            <path d="M6 20C8 6 25 9 38 6S72 10 74 22S58 35 40 33S4 34 6 20Z" fill="#d0b580" />
            <path d="M9 19C13 10 26 13 38 10S68 13 70 21S55 30 40 29S6 30 9 19Z" fill="#8fcac5" />
            <path d="M18 17Q28 12 37 15M50 24h10" fill="none" stroke="#e5f3db" stroke-width="2" stroke-linecap="round" />
            <g class="knowledge-island__pool-fish" fill="#5c9295"><path d="M34 22q6-7 12 0q-6 7-12 0l-5 4v-8Z" /></g>
            <g v-if="isProsperityAtLeast(2)" fill="#df9871"><path d="M54 17q4-5 9 0q-5 5-9 0l-4 3v-6Z" /></g>
          </svg>

          <span
            v-if="hasGrass"
            class="knowledge-island__grassland"
            :style="{ clipPath: grassClipPath }"
            aria-hidden="true"
          ></span>

          <span
            v-if="hasRelief"
            class="knowledge-island__highland"
            :style="{ clipPath: reliefClipPath }"
            aria-hidden="true"
          ></span>

          <div
            class="knowledge-island__zone knowledge-island__zone--west-shore"
            data-role="knowledge-island-zone-west-shore"
            :style="zoneStyle('west-shore')"
            aria-hidden="true"
          >
            <span class="knowledge-island__surf-ring knowledge-island__surf-ring--a"></span>
            <span v-if="isProsperityAtLeast(1)" class="knowledge-island__surf-ring knowledge-island__surf-ring--b"></span>
            <span v-if="isProsperityAtLeast(2)" class="knowledge-island__surf-ring knowledge-island__surf-ring--c"></span>
            <span class="knowledge-island__shell knowledge-island__shell--main" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.shell }">
              <img class="knowledge-island__sprite knowledge-island__shell-art"
                :src="islandShellIllustration" alt="" width="256" height="256" decoding="async"
                @load="objectArtLoaded.shell = true" @error="objectArtLoaded.shell = false" />
            </span>
            <span v-if="isProsperityAtLeast(1)" class="knowledge-island__shell knowledge-island__shell--lush-a" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.shell }">
              <img class="knowledge-island__sprite knowledge-island__shell-art"
                :src="islandShellIllustration" alt="" width="256" height="256" decoding="async"
                @load="objectArtLoaded.shell = true" @error="objectArtLoaded.shell = false" />
            </span>
            <span v-if="isProsperityAtLeast(1)" class="knowledge-island__shell knowledge-island__shell--lush-b" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.shell }">
              <img class="knowledge-island__sprite knowledge-island__shell-art"
                :src="islandShellIllustration" alt="" width="256" height="256" decoding="async"
                @load="objectArtLoaded.shell = true" @error="objectArtLoaded.shell = false" />
            </span>
            <span v-if="isProsperityAtLeast(2)" class="knowledge-island__shell knowledge-island__shell--flourishing" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.shell }">
              <img class="knowledge-island__sprite knowledge-island__shell-art"
                :src="islandShellIllustration" alt="" width="256" height="256" decoding="async"
                @load="objectArtLoaded.shell = true" @error="objectArtLoaded.shell = false" />
            </span>
            <span class="knowledge-island__rock knowledge-island__rock--main" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.rock }">
              <img class="knowledge-island__sprite knowledge-island__rock-art"
                :src="islandRockIllustration" alt="" width="256" height="192" decoding="async"
                @load="objectArtLoaded.rock = true" @error="objectArtLoaded.rock = false" />

              <span class="knowledge-island__rock-splash"></span>
            </span>
            <span v-if="isProsperityAtLeast(1)" class="knowledge-island__rock knowledge-island__rock--lush" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.rock }">
              <img class="knowledge-island__sprite knowledge-island__rock-art"
                :src="islandRockIllustration" alt="" width="256" height="192" decoding="async"
                @load="objectArtLoaded.rock = true" @error="objectArtLoaded.rock = false" />
            </span>
            <span v-if="isProsperityAtLeast(2)" class="knowledge-island__rock knowledge-island__rock--flourishing" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.rock }">
              <img class="knowledge-island__sprite knowledge-island__rock-art"
                :src="islandRockIllustration" alt="" width="256" height="192" decoding="async"
                @load="objectArtLoaded.rock = true" @error="objectArtLoaded.rock = false" />
            </span>

            <span v-if="hasIslandFeature('海星')" class="knowledge-island__starfish" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.starfish }">
              <img class="knowledge-island__sprite knowledge-island__starfish-art"
                :src="islandStarfishIllustration" alt="" width="256" height="256" decoding="async"
                @load="objectArtLoaded.starfish = true" @error="objectArtLoaded.starfish = false" />
            </span>
            <span v-if="hasIslandFeature('漂流木')" class="knowledge-island__driftwood" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.driftwood }">
              <img class="knowledge-island__sprite knowledge-island__driftwood-art"
                :src="islandDriftwoodIllustration" alt="" width="256" height="85" decoding="async"
                @load="objectArtLoaded.driftwood = true" @error="objectArtLoaded.driftwood = false" />
            </span>
          </div>

          <div
            v-if="hasIslandFeature('嫩芽') || hasIslandFeature('小草丛')"
            class="knowledge-island__zone knowledge-island__zone--green"
            data-role="knowledge-island-zone-green"
            :style="zoneStyle('green')"
            aria-hidden="true"
          >
            <span v-if="hasIslandFeature('嫩芽')" class="knowledge-island__sprout" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.sprout }">
              <img class="knowledge-island__sprite knowledge-island__sprout-art"
                :src="islandSproutIllustration" alt="" width="192" height="256" decoding="async"
                @load="objectArtLoaded.sprout = true" @error="objectArtLoaded.sprout = false" />
              <span class="knowledge-island__sprout-stem"></span>
              <span class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--left"></span>
              <span class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--right"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--lush-left"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--lush-right"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__sprout-leaf knowledge-island__sprout-leaf--flourishing"></span>
            </span>

            <span v-if="hasIslandFeature('小草丛')" class="knowledge-island__grass" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.grass }">
              <img class="knowledge-island__sprite knowledge-island__grass-art"
                :src="islandGrassIllustration" alt="" width="256" height="234" decoding="async"
                @load="objectArtLoaded.grass = true" @error="objectArtLoaded.grass = false" />
              <span class="knowledge-island__grass-blade knowledge-island__grass-blade--a"></span>
              <span class="knowledge-island__grass-blade knowledge-island__grass-blade--b"></span>
              <span class="knowledge-island__grass-blade knowledge-island__grass-blade--c"></span>

              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__grass-extra"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__flower knowledge-island__flower--a"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__flower knowledge-island__flower--b"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__flower knowledge-island__flower--c"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__flower knowledge-island__flower--d"></span>
            </span>
          </div>

          <div
            v-if="hasIslandFeature('椰子树') || hasIslandFeature('小帐篷')"
            class="knowledge-island__zone knowledge-island__zone--camp"
            data-role="knowledge-island-zone-camp"
            :style="zoneStyle('camp')"
            aria-hidden="true"
          >
            <span v-if="hasIslandFeature('椰子树')" class="knowledge-island__palm"
              :class="{ 'knowledge-island__palm--illustrated': palmLoaded }" aria-hidden="true">
              <img class="knowledge-island__sprite knowledge-island__palm-art"
                :src="islandPalmIllustration" alt="" width="512" height="768" decoding="async"
                @load="palmLoaded = true" @error="palmLoaded = false" />
              <span class="knowledge-island__palm-trunk"></span>
              <span class="knowledge-island__palm-crown">
                <span class="knowledge-island__palm-leaf knowledge-island__palm-leaf--a"></span>
                <span class="knowledge-island__palm-leaf knowledge-island__palm-leaf--b"></span>
                <span class="knowledge-island__palm-leaf knowledge-island__palm-leaf--c"></span>
                <span class="knowledge-island__palm-leaf knowledge-island__palm-leaf--d"></span>
                <span v-if="isProsperityAtLeast(1)" class="knowledge-island__palm-leaf knowledge-island__palm-leaf--e"></span>
                <span v-if="isProsperityAtLeast(2)" class="knowledge-island__palm-leaf knowledge-island__palm-leaf--f"></span>
              </span>
              <span class="knowledge-island__palm-fruit"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__palm-fruit knowledge-island__palm-fruit--lush"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__palm-fruit knowledge-island__palm-fruit--flourishing"></span>
            </span>

            <span v-if="hasIslandFeature('小帐篷')" class="knowledge-island__camp" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.tent }">
              <img class="knowledge-island__sprite knowledge-island__camp-art"
                :src="islandTentIllustration" alt="" width="512" height="384" decoding="async"
                @load="objectArtLoaded.tent = true" @error="objectArtLoaded.tent = false" />
              <span class="knowledge-island__camp-body"></span>
              <span class="knowledge-island__camp-door"></span>

              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__camp-flag"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__camp-crate"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__camp-crate knowledge-island__camp-crate--flourishing"></span>

              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__camp-campfire"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__camp-smoke"></span>
            </span>
          </div>

          <div
            v-if="hasIslandFeature('小码头') || hasIslandFeature('泊岸小船')"
            class="knowledge-island__zone knowledge-island__zone--harbor"
            data-role="knowledge-island-zone-harbor"
            :style="zoneStyle('harbor')"
            aria-hidden="true"
          >
            <span v-if="hasIslandFeature('小码头')" class="knowledge-island__dock" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.dock }">
              <img class="knowledge-island__sprite knowledge-island__dock-art"
                :src="islandDockIllustration" alt="" width="512" height="171" decoding="async"
                @load="objectArtLoaded.dock = true" @error="objectArtLoaded.dock = false" />
              <span class="knowledge-island__dock-plank knowledge-island__dock-plank--a"></span>
              <span class="knowledge-island__dock-plank knowledge-island__dock-plank--b"></span>
              <span class="knowledge-island__dock-post knowledge-island__dock-post--a"></span>
              <span class="knowledge-island__dock-post knowledge-island__dock-post--b"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__dock-plank knowledge-island__dock-plank--lush"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__dock-post knowledge-island__dock-post--lush"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__dock-bollard"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__dock-net"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__dock-lantern"></span>
            </span>

            <span v-if="hasIslandFeature('泊岸小船')" class="knowledge-island__boat" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.boat }">
              <img class="knowledge-island__sprite knowledge-island__boat-art"
                :src="islandBoatIllustration" alt="" width="512" height="512" decoding="async"
                @load="objectArtLoaded.boat = true" @error="objectArtLoaded.boat = false" />
              <span class="knowledge-island__boat-hull"></span>
              <span class="knowledge-island__boat-mast"></span>
              <span class="knowledge-island__boat-sail"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__boat-rigging"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__boat-flag"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__boat-anchor"></span>
            </span>
          </div>

          <div
            v-if="hasIslandFeature('观星台') || hasIslandFeature('灯塔')"
            class="knowledge-island__zone knowledge-island__zone--highland"
            data-role="knowledge-island-zone-highland"
            :style="zoneStyle('highland')"
            aria-hidden="true"
          >

            <span v-if="hasIslandFeature('观星台')" class="knowledge-island__observatory" aria-hidden="true"
              :class="{ 'knowledge-island__object--illustrated': objectArtLoaded.observatory }">
              <img class="knowledge-island__sprite knowledge-island__observatory-art"
                :src="islandObservatoryIllustration" alt="" width="512" height="512" decoding="async"
                @load="objectArtLoaded.observatory = true" @error="objectArtLoaded.observatory = false" />
              <span class="knowledge-island__observatory-deck"></span>
              <span class="knowledge-island__observatory-tripod knowledge-island__observatory-tripod--a"></span>
              <span class="knowledge-island__observatory-tripod knowledge-island__observatory-tripod--b"></span>
              <span class="knowledge-island__observatory-tripod knowledge-island__observatory-tripod--c"></span>
              <span class="knowledge-island__observatory-tube"></span>
            </span>
            <span v-if="hasIslandFeature('灯塔')" class="knowledge-island__lighthouse"
              :class="{ 'knowledge-island__lighthouse--illustrated': lighthouseLoaded }" aria-hidden="true">
              <img class="knowledge-island__sprite knowledge-island__lighthouse-art"
                :src="islandLighthouseIllustration" alt="" width="256" height="512" decoding="async"
                @load="lighthouseLoaded = true" @error="lighthouseLoaded = false" />
              <span class="knowledge-island__lighthouse-roof"></span>
              <span class="knowledge-island__lighthouse-tower"></span>
              <span class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--a"></span>
              <span class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--b"></span>
              <span class="knowledge-island__lighthouse-light"></span>

              <span class="knowledge-island__beam" :class="`knowledge-island__beam--${prosperityKey()}`"></span>
              <span v-if="isProsperityAtLeast(1)" class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--lush"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__lighthouse-window knowledge-island__lighthouse-window--flourishing"></span>
              <span v-if="isProsperityAtLeast(2)" class="knowledge-island__lighthouse-base"></span>
            </span>
          </div>
        </div>
      </div>

      <span v-if="duskActive" class="knowledge-island__dusk-veil" aria-hidden="true"></span>

      <div
        v-if="interactive"
        class="knowledge-island__hotspots"
        data-role="knowledge-island-hotspots"
        :class="{ 'knowledge-island__hotspots--active': Boolean(activeHotSpotId) }"
      >
        <span
          v-for="ripple in ripples"
          :key="ripple.key"
          class="knowledge-island__ripple"
          :style="{ left: `${ripple.x}%`, top: `${ripple.y}%` }"
          aria-hidden="true"
        ></span>

        <button
          v-for="hotSpot in hotSpots"
          :key="hotSpot.id"
          type="button"
          :class="[
            'knowledge-island__hotspot',
            `knowledge-island__hotspot--${hotSpot.id}`,
            { 'knowledge-island__hotspot--on': activeHotSpotId === hotSpot.id }
          ]"
          :style="{
            left: `${hotSpot.box.left}%`,
            top: `${hotSpot.box.top}%`,
            width: hotSpot.box.width === null ? undefined : `${hotSpot.box.width}%`,
            height: hotSpot.box.height === null ? undefined : `${hotSpot.box.height}%`
          }"
          :data-role="`knowledge-island-hotspot-${hotSpot.id}`"
          :aria-label="hotSpotLabel(hotSpot.id)"
          @click="triggerHotSpot(hotSpot.id, $event)"
          @pointerenter="hoveredHotSpotId = hotSpot.id"
          @pointerleave="hoveredHotSpotId = ''"
          @focus="hoveredHotSpotId = hotSpot.id"
          @blur="hoveredHotSpotId = ''"
        >

          <template v-if="hotSpot.id === 'next'">
            <span class="knowledge-island__hotspot-chip">还差 {{ island.remainingToNext }} 枚</span>
          </template>
        </button>
      </div>

      <p
        v-if="hintText"
        class="knowledge-island__hint"
        data-role="knowledge-island-hint"
        role="status"
        aria-live="polite"
      >
        {{ hintText }}
      </p>
    </div>

    <div class="knowledge-island__info">
      <p class="knowledge-island__stage">
        <span class="knowledge-island__stage-glyph" aria-hidden="true">{{ island.currentStage.glyph }}</span>
        <span class="knowledge-island__stage-name">当前：{{ island.currentStage.name }}</span>
      </p>
      <p class="knowledge-island__stamps">{{ island.stampText }}</p>

      <p class="knowledge-island__prosperity" :data-prosperity="prosperityKey()">
        <span class="knowledge-island__prosperity-label">{{ island.prosperityLabel }}</span>
        <span class="knowledge-island__prosperity-text">{{ island.prosperity.prosperityText }}</span>
      </p>

      <div v-if="!island.isMaxStage" class="knowledge-island__progress">
        <div
          class="knowledge-island__track"
          role="progressbar"
          :aria-valuenow="island.progressValue"
          :aria-valuemin="0"
          :aria-valuemax="island.progressTarget"
          :aria-valuetext="`${island.currentStage.name} 进度 ${island.progressText}`"
        >
          <span class="knowledge-island__fill" :style="{ width: `${island.progressPercent}%` }"></span>
        </div>
        <span class="knowledge-island__progress-text">{{ island.progressText }}</span>
      </div>

      <p class="knowledge-island__next" :class="{ 'knowledge-island__next--max': island.isMaxStage }">{{ island.nextText }}</p>
    </div>

    <slot></slot>
  </div>
</template>

<style scoped>
.knowledge-island {

  --ki-ambient-wave: 17s;
  --ki-ambient-swell: 21s;
  --ki-ambient-cloud: 96s;
  --ki-ambient-flyby: 78s;
  --ki-ambient-sun: 13s;

  --ki-ambient-sway: 9.5s;
  --ki-ambient-bob: 6.4s;
  --ki-ambient-beam: 17s;
  --ki-ambient-frond: 10s;

  --ki-ambient-amp: 1;

  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border: 1.5px solid rgba(83, 177, 173, 0.42);
  border-radius: 22px;
  background:
    linear-gradient(170deg, rgba(238, 252, 249, 0.98) 0%, rgba(255, 252, 243, 0.94) 100%);
  box-sizing: border-box;
  min-width: 0;
}

.knowledge-island--prosperity-lush {
  --ki-ambient-wave: 15s;
  --ki-ambient-swell: 19s;
  --ki-ambient-cloud: 86s;
  --ki-ambient-flyby: 68s;
  --ki-ambient-sun: 12.5s;
  --ki-ambient-sway: 8.4s;
  --ki-ambient-bob: 5.7s;
  --ki-ambient-beam: 15s;
  --ki-ambient-frond: 9s;
  --ki-ambient-amp: 1.35;
}

.knowledge-island--prosperity-flourishing {
  --ki-ambient-wave: 13s;
  --ki-ambient-swell: 17s;
  --ki-ambient-cloud: 76s;
  --ki-ambient-flyby: 58s;
  --ki-ambient-sun: 12s;
  --ki-ambient-sway: 7.4s;
  --ki-ambient-bob: 5.1s;
  --ki-ambient-beam: 13s;
  --ki-ambient-frond: 8.2s;
  --ki-ambient-amp: 1.7;
}

.knowledge-island__figure {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  container-type: inline-size;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1px solid rgba(50, 143, 174, 0.22);
  border-radius: 18px;
  background:
    radial-gradient(circle at 82% 12%, rgba(255, 255, 255, 0.5) 0 5%, transparent 5.5%),
    linear-gradient(180deg, #ccecf8 0%, #e8f8fb 57%, #dff3f3 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 10px 18px -18px rgba(37, 106, 126, 0.55);
}

.knowledge-island__world {
  --ki-u: calc(100cqw / 400);
  position: absolute;
  inset: 0;
}

.knowledge-island__sun {
  position: absolute;
  top: calc(var(--ki-u) * 14);
  right: calc(var(--ki-u) * 24);
  width: calc(var(--ki-u) * 22);
  height: calc(var(--ki-u) * 22);
  border: calc(var(--ki-u) * 2) solid rgba(255, 250, 211, 0.9);
  border-radius: 50%;
  background: #ffd979;
  box-shadow: 0 0 0 calc(var(--ki-u) * 4) rgba(255, 232, 155, 0.22), 0 calc(var(--ki-u) * 8) calc(var(--ki-u) * 15) calc(var(--ki-u) * -10) rgba(214, 142, 37, 0.6);
  z-index: 1;
}

.knowledge-island__sun::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 280%;
  height: 280%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 233, 158, 0.5) 0%, rgba(255, 226, 132, 0) 68%);
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: knowledge-island-sun-breathe var(--ki-ambient-sun) ease-in-out infinite;
}

@keyframes knowledge-island-sun-breathe {
  0%,
  100% {
    opacity: 0.34;
    transform: translate(-50%, -50%) scale(0.96);
  }

  50% {
    opacity: 0.62;
    transform: translate(-50%, -50%) scale(1.04);
  }
}

.knowledge-island__cloud {
  --ki-cloud-scale: 1;
  --ki-cloud-direction: 1;
  position: absolute;
  width: calc(var(--ki-u) * 62);
  height: calc(var(--ki-u) * 18);
  border-radius: calc(var(--ki-u) * 999);
  background: rgba(255, 255, 255, 0.72);
  opacity: 0.86;
  z-index: 1;

  transform: translateX(0) scale(var(--ki-cloud-scale));
  animation: knowledge-island-cloud-drift var(--ki-ambient-cloud) ease-in-out infinite alternate;
}

.knowledge-island__cloud::before,
.knowledge-island__cloud::after {
  content: "";
  position: absolute;
  bottom: 15%;
  border-radius: 50%;
  background: inherit;
}

.knowledge-island__cloud::before {
  left: 16%;
  width: 42%;
  aspect-ratio: 1;
}

.knowledge-island__cloud::after {
  right: 14%;
  width: 30%;
  aspect-ratio: 1;
}

.knowledge-island__cloud--left {
  top: calc(var(--ki-u) * 26);
  left: calc(var(--ki-u) * 34);
  --ki-cloud-scale: 0.78;
  --ki-cloud-direction: 1;
  animation-delay: -21s;
}

.knowledge-island__cloud--right {
  top: calc(var(--ki-u) * 46);
  left: calc(var(--ki-u) * 248);
  --ki-cloud-scale: 0.58;
  --ki-cloud-direction: -1;
  opacity: 0.56;

  animation-duration: calc(var(--ki-ambient-cloud) * 1.45);
  animation-delay: -63s;
}

.knowledge-island__cloud--flourishing {
  top: calc(var(--ki-u) * 16);
  left: calc(var(--ki-u) * 150);
  --ki-cloud-scale: 0.5;
  --ki-cloud-direction: 1;
  opacity: 0.66;
  animation-duration: calc(var(--ki-ambient-cloud) * 0.82);
  animation-delay: -37s;
}

@keyframes knowledge-island-cloud-drift {
  from {
    transform: translateX(calc(var(--ki-u) * -18 * var(--ki-ambient-amp) * var(--ki-cloud-direction)))
      scale(var(--ki-cloud-scale));
  }

  to {
    transform: translateX(calc(var(--ki-u) * 18 * var(--ki-ambient-amp) * var(--ki-cloud-direction)))
      scale(var(--ki-cloud-scale));
  }
}

.knowledge-island__sky-dot {
  position: absolute;
  width: calc(var(--ki-u) * 5);
  height: calc(var(--ki-u) * 5);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  z-index: 1;
}

.knowledge-island__sky-dot--a {
  top: calc(var(--ki-u) * 24);
  left: calc(var(--ki-u) * 124);
}

.knowledge-island__sky-dot--b {
  top: calc(var(--ki-u) * 52);
  left: calc(var(--ki-u) * 172);
  width: calc(var(--ki-u) * 4);
  height: calc(var(--ki-u) * 4);
  opacity: 0.72;
}

.knowledge-island__gull {
  position: absolute;
  width: calc(var(--ki-u) * 14);
  height: calc(var(--ki-u) * 7);

  background: radial-gradient(
    ellipse calc(var(--ki-u) * 3.6) calc(var(--ki-u) * 2.2) at 50% 70%,
    rgba(52, 104, 138, 0.88) 0%,
    rgba(52, 104, 138, 0) 74%
  );
  z-index: 1;
}

.knowledge-island__gull::before,
.knowledge-island__gull::after {
  content: "";
  position: absolute;
  bottom: 22%;
  width: 56%;
  height: 74%;
  border-top: calc(var(--ki-u) * 1.7) solid rgba(52, 104, 138, 0.82);
}

.knowledge-island__gull::before {
  left: 0;
  border-top-right-radius: 100% 100%;
  transform: rotate(-4deg);
}

.knowledge-island__gull::after {
  right: 0;
  border-top-left-radius: 100% 100%;
  transform: rotate(4deg);
}

.knowledge-island__gull--a {
  top: calc(var(--ki-u) * 40);
  left: calc(var(--ki-u) * 250);
}

.knowledge-island__gull--b {
  top: calc(var(--ki-u) * 57);
  left: calc(var(--ki-u) * 282);
  transform: scale(0.72);
  opacity: 0.8;
}

.knowledge-island__gull--c {
  top: calc(var(--ki-u) * 30);
  left: calc(var(--ki-u) * 206);
  transform: scale(0.62);
  opacity: 0.68;
}

.knowledge-island__gull--flyby {
  top: calc(var(--ki-u) * 34);
  left: 0;
  transform: scale(0.8);
  opacity: 0;
  animation: knowledge-island-gull-flyby var(--ki-ambient-flyby) linear infinite;
}

@keyframes knowledge-island-gull-flyby {
  0% {
    transform: translateX(calc(var(--ki-u) * -30)) translateY(calc(var(--ki-u) * 7)) scale(0.8);
    opacity: 0;
  }

  5% {
    opacity: 0.66;
  }

  26% {
    transform: translateX(calc(var(--ki-u) * 430)) translateY(calc(var(--ki-u) * -5)) scale(0.8);
    opacity: 0.6;
  }

  34% {
    transform: translateX(calc(var(--ki-u) * 430)) translateY(calc(var(--ki-u) * -5)) scale(0.8);
    opacity: 0;
  }

  100% {
    transform: translateX(calc(var(--ki-u) * 430)) translateY(calc(var(--ki-u) * -5)) scale(0.8);
    opacity: 0;
  }
}

.knowledge-island__sea {
  position: absolute; left: -2%; bottom: -2%; width: 104%; height: 62%; z-index: 2;
}

.knowledge-island__sea::before,

.knowledge-island__sea::before {
  top: 20%;
}

.knowledge-island__sea::after {
  top: 53%;
  transform: translateX(calc(var(--ki-u) * -18));
  opacity: 0.46;
}

.knowledge-island__sea-depth {
  position: absolute;
  inset: auto -4% 0;
  height: 35%;
  background: linear-gradient(180deg, rgba(42, 135, 183, 0.22), rgba(38, 115, 167, 0.48));
  clip-path: polygon(0 20%, 20% 10%, 41% 24%, 62% 12%, 82% 21%, 100% 12%, 100% 100%, 0 100%);
  z-index: 3;
}

.knowledge-island__surf {
  position: absolute;
  inset: auto -2% 26%;
  height: 14%;
  opacity: 0.76;
  z-index: 4;

  animation: knowledge-island-sea-swell var(--ki-ambient-swell) ease-in-out infinite alternate;
}

@keyframes knowledge-island-sea-swell {
  from {
    transform: translateY(calc(var(--ki-u) * -2.3 * var(--ki-ambient-amp)));
  }

  to {
    transform: translateY(calc(var(--ki-u) * 2.3 * var(--ki-ambient-amp)));
  }
}

.knowledge-island__surf-line {
  --wave-angle: 0deg;
  --wave-shift: calc(var(--ki-u) * 11);
  position: absolute;
  display: block;
  height: calc(var(--ki-u) * 11);
  border-top: calc(var(--ki-u) * 3) solid rgba(255, 255, 255, 0.78);
  border-radius: 50%;
  transform: translateX(0) rotate(var(--wave-angle));
  transform-origin: left center;

  animation: knowledge-island-wave-drift var(--ki-ambient-wave) ease-in-out infinite alternate;
}

.knowledge-island__surf-line::after {
  content: "";
  position: absolute;
  right: 7%;
  top: calc(var(--ki-u) * -5);
  width: calc(var(--ki-u) * 8);
  height: calc(var(--ki-u) * 5);
  border-top: calc(var(--ki-u) * 2) solid rgba(255, 255, 255, 0.68);
  border-radius: 50%;
  transform: rotate(-16deg);
}

.knowledge-island__surf-line--a {
  top: 40%;
  left: 4%;
  width: 17%;
  --wave-angle: -4deg;
  --wave-shift: calc(var(--ki-u) * 15);
}

.knowledge-island__surf-line--b {
  top: 24%;
  left: 25%;
  width: 24%;
  border-top-width: calc(var(--ki-u) * 2);
  --wave-angle: 3deg;
  --wave-shift: calc(var(--ki-u) * 9);
  animation-delay: -1.8s;
}

.knowledge-island__surf-line--c {
  top: 53%;
  left: 54%;
  width: 19%;
  --wave-angle: -2deg;
  --wave-shift: calc(var(--ki-u) * 12);
  animation-delay: -3.4s;
}

.knowledge-island__surf-line--d {
  top: 18%;
  left: 79%;
  width: 13%;
  border-top-width: calc(var(--ki-u) * 2);
  --wave-angle: 5deg;
  --wave-shift: calc(var(--ki-u) * 15);
  animation-delay: -5.2s;
}

.knowledge-island__surf-line--lush-a {
  top: 62%;
  left: 12%;
  width: 15%;
  border-top-width: calc(var(--ki-u) * 2);
  --wave-angle: 2deg;
  --wave-shift: calc(var(--ki-u) * 12);
  animation-delay: -2.6s;
}

.knowledge-island__surf-line--lush-b {
  top: 33%;
  left: 56%;
  width: 20%;
  --wave-angle: -3deg;
  --wave-shift: calc(var(--ki-u) * 9);
  animation-delay: -4.4s;
}

.knowledge-island__surf-line--flourishing-a {
  top: 70%;
  left: 38%;
  width: 14%;
  border-top-width: calc(var(--ki-u) * 2);
  --wave-angle: 4deg;
  --wave-shift: calc(var(--ki-u) * 12);
  animation-delay: -6.1s;
}

.knowledge-island__surf-line--flourishing-b {
  top: 14%;
  left: 66%;
  width: 17%;
  border-top-width: calc(var(--ki-u) * 2);
  --wave-angle: -5deg;
  --wave-shift: calc(var(--ki-u) * 15);
  animation-delay: -0.9s;
}

.knowledge-island__world,
.knowledge-island__hotspots {
  transform: translate(var(--ki-px, 0px), var(--ki-py, 0px));
  transition: transform 220ms ease-out;
}

.knowledge-island__sea {
  transform: translate(calc(var(--ki-px, 0px) * -0.35), calc(var(--ki-py, 0px) * -0.35));
}

.knowledge-island__sea-depth {
  transform: translate(calc(var(--ki-px, 0px) * -0.25), calc(var(--ki-py, 0px) * -0.25));
}

.knowledge-island__horizon-island {
  position: absolute;
  left: 8%;
  bottom: 57.5%;
  width: 24%;
  height: 7%;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  background: linear-gradient(180deg, rgba(122, 178, 186, 0.55) 0%, rgba(96, 158, 172, 0.38) 100%);
  z-index: 1;
  transform: translate(calc(var(--ki-px, 0px) * -0.5), calc(var(--ki-py, 0px) * -0.5));
}

.knowledge-island__horizon-sail {
  position: absolute;
  left: 58%;
  bottom: 55%;
  width: calc(var(--ki-u) * 16);
  height: calc(var(--ki-u) * 12);
  z-index: 1;
  opacity: 0.66;
  animation: knowledge-island-horizon-sail-drift 88s ease-in-out infinite alternate;
}

.knowledge-island__horizon-sail::before {
  content: "";
  position: absolute;
  left: 15%;
  bottom: 0;
  width: 70%;
  height: 18%;
  border-radius: 0 0 calc(var(--ki-u) * 6) calc(var(--ki-u) * 6);
  background: rgba(84, 124, 148, 0.8);
}

.knowledge-island__horizon-sail::after {
  content: "";
  position: absolute;
  left: 30%;
  bottom: 16%;
  width: 46%;
  height: 80%;
  background: rgba(255, 252, 240, 0.88);
  clip-path: polygon(0 0, 100% 78%, 0 100%);
}

@keyframes knowledge-island-horizon-sail-drift {
  from {
    transform: translateX(calc(var(--ki-u) * -14));
  }

  to {
    transform: translateX(calc(var(--ki-u) * 14));
  }
}

.knowledge-island__sun-glitter {
  position: absolute;
  left: 87%;
  top: 42%;
  width: 8%;
  height: 46%;
  z-index: 3;
  background: repeating-linear-gradient(
    180deg,
    rgba(255, 241, 176, 0.6) 0 calc(var(--ki-u) * 2.5),
    transparent calc(var(--ki-u) * 2.5) calc(var(--ki-u) * 10)
  );
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, black 32%, black 68%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0%, black 32%, black 68%, transparent 100%);
  opacity: 0.34;
  animation: knowledge-island-glitter-shimmer 4.8s ease-in-out infinite alternate;
  transform: translate(calc(var(--ki-px, 0px) * -0.4), calc(var(--ki-py, 0px) * -0.4));
}

@keyframes knowledge-island-glitter-shimmer {
  from {
    opacity: 0.2;
  }

  to {
    opacity: 0.44;
  }
}

.knowledge-island__seagrass {
  position: absolute;
  bottom: -2%;
  width: calc(var(--ki-u) * 6);
  height: calc(var(--ki-u) * 20);
  border-radius: 100% 0 100% 0;
  background: linear-gradient(180deg, rgba(96, 176, 148, 0.72) 0%, rgba(52, 132, 118, 0.66) 100%);
  opacity: 0.55;
  z-index: 5;
  transform-origin: bottom center;
  animation: knowledge-island-seagrass-sway 7.5s ease-in-out infinite alternate;
}

.knowledge-island__seagrass::before,
.knowledge-island__seagrass::after {
  content: "";
  position: absolute;
  bottom: 0;
  width: 100%;
  border-radius: inherit;
  background: inherit;
  transform-origin: bottom center;
}

.knowledge-island__seagrass::before {
  left: -70%;
  height: 78%;
  transform: rotate(-16deg);
}

.knowledge-island__seagrass::after {
  left: 70%;
  height: 64%;
  transform: rotate(14deg);
}

.knowledge-island__seagrass--a {
  left: 9%;
}

.knowledge-island__seagrass--b {
  left: 15.5%;
  height: calc(var(--ki-u) * 14);
  opacity: 0.42;
  animation-delay: -3.2s;
  animation-direction: alternate-reverse;
}

@keyframes knowledge-island-seagrass-sway {
  from {
    transform: rotate(calc(-4deg * var(--ki-ambient-amp)));
  }

  to {
    transform: rotate(calc(4deg * var(--ki-ambient-amp)));
  }
}

.knowledge-island__buoy {
  position: absolute;
  right: 20%;
  bottom: 7%;
  width: calc(var(--ki-u) * 11);
  height: calc(var(--ki-u) * 15);
  z-index: 5;
  transform-origin: 50% 92%;
  animation: knowledge-island-buoy-bob 5.6s ease-in-out infinite alternate;
}

.knowledge-island__buoy::before {
  content: "";
  position: absolute;
  left: 12%;
  bottom: 0;
  width: 76%;
  height: 76%;
  border-radius: 46% 46% 40% 40% / 58% 58% 30% 30%;
  background: repeating-linear-gradient(180deg, #ef6e65 0 34%, #fff4e0 34% 62%);
  box-shadow: inset calc(var(--ki-u) * -1.5) calc(var(--ki-u) * -1) 0 rgba(150, 70, 60, 0.35);
}

.knowledge-island__buoy::after {
  content: "";
  position: absolute;
  left: 44%;
  top: 0;
  width: 12%;
  height: 28%;
  border-radius: calc(var(--ki-u) * 999);
  background: #8a5a40;
}

@keyframes knowledge-island-buoy-bob {
  from {
    transform: translateY(calc(var(--ki-u) * 1.4)) rotate(calc(-3.4deg * var(--ki-ambient-amp)));
  }

  to {
    transform: translateY(calc(var(--ki-u) * -1.4)) rotate(calc(3.4deg * var(--ki-ambient-amp)));
  }
}

.knowledge-island__bottle {
  position: absolute;
  left: 30%;
  bottom: 12%;
  width: calc(var(--ki-u) * 22);
  height: calc(var(--ki-u) * 7.5);
  border-radius: 46% 54% 50% 50% / 58% 60% 40% 42%;
  background: linear-gradient(160deg, rgba(168, 226, 214, 0.92) 0%, rgba(96, 178, 168, 0.88) 100%);
  box-shadow:
    inset 0 calc(var(--ki-u) * 1.2) 0 rgba(255, 255, 255, 0.65),
    0 0 calc(var(--ki-u) * 6) rgba(255, 240, 170, 0.55);
  z-index: 5;
  transform: rotate(16deg);
  transform-origin: center;
  animation:
    knowledge-island-bottle-drift 6.8s ease-in-out infinite alternate,
    knowledge-island-bottle-glow 2.6s ease-in-out infinite alternate;
}

.knowledge-island__bottle::before {
  content: "";
  position: absolute;
  left: 28%;
  top: 22%;
  width: 30%;
  height: 50%;
  border-radius: calc(var(--ki-u) * 1.5);
  background: rgba(255, 252, 240, 0.92);
  transform: rotate(-6deg);
}

.knowledge-island__bottle::after {
  content: "";
  position: absolute;
  right: -9%;
  top: 24%;
  width: 15%;
  height: 46%;
  border-radius: 30%;
  background: linear-gradient(180deg, #c9a06a 0%, #8a6138 100%);
}

@keyframes knowledge-island-bottle-drift {
  from {
    transform: rotate(13deg) translateY(calc(var(--ki-u) * 1.6));
  }

  to {
    transform: rotate(19deg) translateY(calc(var(--ki-u) * -1.6));
  }
}

@keyframes knowledge-island-bottle-glow {
  from {
    box-shadow:
      inset 0 calc(var(--ki-u) * 1.2) 0 rgba(255, 255, 255, 0.65),
      0 0 calc(var(--ki-u) * 3) rgba(255, 240, 170, 0.35);
  }

  to {
    box-shadow:
      inset 0 calc(var(--ki-u) * 1.2) 0 rgba(255, 255, 255, 0.65),
      0 0 calc(var(--ki-u) * 9) rgba(255, 240, 170, 0.85);
  }
}

.knowledge-island__next-terrain {
  position: absolute;
  overflow: visible;
  pointer-events: none;
  z-index: 5;
  animation: knowledge-island-next-breathe 5.2s ease-in-out infinite;
}

.knowledge-island__next-fill {
  fill: rgba(255, 255, 255, 0.17);
}

.knowledge-island__next-outline {
  fill: none;
  stroke: rgba(255, 255, 255, 0.82);
  stroke-width: 1.4;

  stroke-dasharray: 5 4;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

@keyframes knowledge-island-next-breathe {
  0%,
  100% {
    opacity: 0.5;
  }

  50% {
    opacity: 0.92;
  }
}

.knowledge-island__terrain {
  position: absolute;
  z-index: 6;
}

.knowledge-island__island-shadow {
  position: absolute;
  left: 4%;
  right: 4%;
  bottom: -5%;
  height: 22%;
  border-radius: 50%;
  background: rgba(39, 91, 108, 0.24);
  filter: blur(calc(var(--ki-u) * 3));
  z-index: 0;
}

.knowledge-island__ground-art { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; z-index: 2; }
.knowledge-island__tidepool { position: absolute; left: 56%; bottom: 25%; width: 23%; height: 25%; z-index: 5; }
.knowledge-island__pool-fish { animation: island-pool-swim 8s ease-in-out infinite alternate; transform-origin: center; }
@keyframes island-pool-swim { to { transform: translate(7px, -1px); } }

.knowledge-island__grassland::after {
  content: "";
  position: absolute;
  left: 18%;
  top: 24%;
  width: 30%;
  height: 22%;
  border-radius: 50%;
  background: rgba(112, 190, 122, 0.5);
  transform: rotate(-8deg);
}

.knowledge-island__grassland {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, #a5d98d 0%, #79c57d 100%);
  opacity: 0.95;
  z-index: 3;
}

.knowledge-island__highland {
  position: absolute;
  inset: 0;
  background: linear-gradient(168deg, #bfe6a4 0%, #8dcd8b 100%);
  box-shadow: inset 0 calc(var(--ki-u) * 2) 0 rgba(255, 255, 255, 0.5);
  z-index: 4;
}

.knowledge-island__zone {
  position: absolute;
  z-index: 6;
}

.knowledge-island__zone--west-shore {
  z-index: 7;
}

.knowledge-island__zone > * {
  position: absolute;
}

.knowledge-island__surf-ring {
  border: calc(var(--ki-u) * 2) solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  transform: translate(-50%, 50%);
}

.knowledge-island__surf-ring--a {
  left: 28%;
  bottom: 4%;
  width: 22%;
  height: 22%;
}

.knowledge-island__surf-ring--b {
  left: 66%;
  bottom: 0;
  width: 18%;
  height: 20%;
  border-width: calc(var(--ki-u) * 1.5);
  opacity: 0.86;
}

.knowledge-island__surf-ring--c {
  left: 46%;
  bottom: 16%;
  width: 26%;
  height: 18%;
  border-width: calc(var(--ki-u) * 1.5);
  opacity: 0.8;
}

.knowledge-island__shell {
  left: 96%;
  bottom: 6%;
  width: calc(var(--ki-u) * 15 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 13 * var(--ki-unit, 1));
  margin-left: calc(calc(var(--ki-u) * -7.5) * var(--ki-unit, 1));
  border: calc(var(--ki-u) * 1.1) solid rgba(201, 118, 74, 0.85);
  border-radius: 50% 50% 26% 26% / 88% 88% 30% 30%;
  background: linear-gradient(180deg, #fff3e0 0%, #fbcf9f 58%, #f0a878 100%);
  box-shadow:
    inset 0 calc(var(--ki-u) * -1.2) 0 rgba(214, 122, 76, 0.45),
    0 calc(var(--ki-u) * 1.5) calc(var(--ki-u) * 3) calc(var(--ki-u) * -1.6) rgba(150, 86, 52, 0.45);
  transform: rotate(-16deg);
}

.knowledge-island__shell::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: repeating-conic-gradient(
    from 118deg at 50% 100%,
    rgba(201, 118, 74, 0.38) 0deg 3.6deg,
    rgba(255, 255, 255, 0) 3.6deg 13deg
  );
}

.knowledge-island__shell::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: calc(var(--ki-u) * -0.6);
  width: calc(var(--ki-u) * 4.2);
  height: calc(var(--ki-u) * 3);
  margin-left: calc(var(--ki-u) * -2.1);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  background: linear-gradient(180deg, #e39a68 0%, #c9713f 100%);
}

.knowledge-island__shell--lush-a {
  left: 30%;
  bottom: 48%;
  opacity: 0.92;
  transform: rotate(14deg) scale(0.86);
}

.knowledge-island__shell--lush-b {
  left: 62%;
  bottom: 30%;
  opacity: 0.84;
  transform: rotate(-30deg) scale(0.76);
}

.knowledge-island__shell--flourishing {
  left: 46%;
  bottom: 80%;
  opacity: 0.9;
  transform: rotate(24deg) scale(0.8);
}

.knowledge-island__rock--main {
  left: 4%;
  bottom: 8%;
  width: calc(var(--ki-u) * 21 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 15 * var(--ki-unit, 1));
  margin-left: calc(calc(var(--ki-u) * -10.5) * var(--ki-unit, 1));
  border-radius: 52% 48% 44% 56% / 64% 62% 38% 36%;
  background: linear-gradient(148deg, #9db0b1 0%, #71868a 50%, #4c6369 100%);
  box-shadow:
    inset calc(var(--ki-u) * 2.6) calc(var(--ki-u) * 2.4) 0 rgba(255, 255, 255, 0.62),
    inset calc(var(--ki-u) * -2.2) calc(var(--ki-u) * -1.8) 0 rgba(44, 70, 78, 0.5),
    0 calc(var(--ki-u) * 4) calc(var(--ki-u) * 7) calc(var(--ki-u) * -6) rgba(38, 76, 86, 0.75);
  transform: rotate(-9deg);
}

.knowledge-island__rock--main::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: calc(var(--ki-u) * -2.4);
  width: 118%;
  height: 42%;
  margin-left: -59%;
  border-radius: 50%;
  background: rgba(214, 178, 118, 0.75);
}

.knowledge-island__rock--lush {
  left: 34%;
  bottom: 46%;
  width: calc(var(--ki-u) * 19 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 20 * var(--ki-unit, 1));
  margin-left: calc(calc(var(--ki-u) * -9.5) * var(--ki-unit, 1));
  clip-path: polygon(4% 100%, 0% 44%, 20% 10%, 50% 0%, 78% 16%, 100% 50%, 96% 100%);

  background: linear-gradient(168deg, #d3dcdd 0%, #a3b2b6 30%, #6f868d 68%, #4a646e 100%);
  filter: drop-shadow(0 calc(var(--ki-u) * 2) calc(var(--ki-u) * 3) calc(var(--ki-u) * -2) rgba(38, 76, 86, 0.7));
}

.knowledge-island__rock--lush::after {
  content: "";
  position: absolute;
  left: 32%;
  top: calc(var(--ki-u) * -1.8);
  width: 36%;
  height: 32%;
  border-radius: 60% 20% 60% 20%;
  background: linear-gradient(180deg, #7cc86e 0%, #3d8a4a 100%);
  transform: rotate(-16deg);
}

.knowledge-island__rock--flourishing {
  left: 72%;
  bottom: 58%;
  width: calc(var(--ki-u) * 12 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 9 * var(--ki-unit, 1));
  margin-left: calc(calc(var(--ki-u) * -6) * var(--ki-unit, 1));

  clip-path: polygon(10% 100%, 4% 40%, 30% 4%, 62% 10%, 96% 44%, 88% 100%);
  background: linear-gradient(150deg, #cdd7d9 0%, #9babb0 34%, #657d86 72%, #465f69 100%);
  filter: drop-shadow(0 calc(var(--ki-u) * 2) calc(var(--ki-u) * 3) calc(var(--ki-u) * -2) rgba(38, 76, 86, 0.65));
  transform: rotate(-14deg);
  opacity: 0.95;
}

.knowledge-island__starfish {
  left: 44%;
  bottom: 8%;
  width: calc(var(--ki-u) * 11 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 11 * var(--ki-unit, 1));
  margin-left: calc(calc(var(--ki-u) * -5.5) * var(--ki-unit, 1));
  background: linear-gradient(160deg, #f7b267 0%, #ef8354 100%);
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  transform: rotate(18deg);
  filter: drop-shadow(0 calc(var(--ki-u) * 1) calc(var(--ki-u) * 1.5) rgba(150, 86, 52, 0.42));
}

.knowledge-island__starfish::after {
  content: "";
  position: absolute;
  inset: 22%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 226, 178, 0.85) 0 18%, transparent 22%);
  background-size: calc(var(--ki-u) * 3.4) calc(var(--ki-u) * 3.4);
}

.knowledge-island__driftwood {
  left: 62%;
  bottom: 42%;
  width: calc(var(--ki-u) * 18 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 5 * var(--ki-unit, 1));
  border: calc(var(--ki-u) * 0.7) solid rgba(122, 84, 48, 0.42);
  border-radius: calc(var(--ki-u) * 999);
  background: repeating-linear-gradient(90deg, #b3855a 0 calc(var(--ki-u) * 4), #a1734b calc(var(--ki-u) * 4) calc(var(--ki-u) * 5.4));
  box-shadow: 0 calc(var(--ki-u) * 1.5) calc(var(--ki-u) * 3) calc(var(--ki-u) * -2) rgba(120, 80, 50, 0.5);
  transform: rotate(-22deg);
}

.knowledge-island__driftwood::after {
  content: "";
  position: absolute;
  left: 22%;
  top: calc(var(--ki-u) * -2.6);
  width: calc(var(--ki-u) * 4);
  height: calc(var(--ki-u) * 3.4);
  border-radius: 40% 60% 0 0;
  background: #a1734b;
  transform: rotate(-14deg);
}

.knowledge-island__sprout {
  left: 26%;
  bottom: 6%;
  width: calc(var(--ki-u) * 24 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 31 * var(--ki-unit, 1));
  transform-origin: bottom center;
  animation: knowledge-island-sway var(--ki-ambient-sway) ease-in-out infinite alternate;
}

@keyframes knowledge-island-sway {
  from {
    transform: rotate(calc(-3.2deg * var(--ki-ambient-amp)));
  }

  to {
    transform: rotate(calc(3.2deg * var(--ki-ambient-amp)));
  }
}

.knowledge-island__sprout-stem {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: calc(var(--ki-u) * 3);
  height: calc(var(--ki-u) * 20);
  transform: translateX(-50%) rotate(4deg);
  border-radius: calc(var(--ki-u) * 999);
  background: #4c9d5d;
}

.knowledge-island__sprout-leaf {
  position: absolute;
  bottom: calc(var(--ki-u) * 14);
  width: calc(var(--ki-u) * 14);
  height: calc(var(--ki-u) * 8);
  border-radius: 100% 0 100% 0;
  background: #4dba72;
}

.knowledge-island__sprout-leaf--left {
  left: calc(var(--ki-u) * 1);
  transform: rotate(-28deg);
}

.knowledge-island__sprout-leaf--right {
  right: calc(var(--ki-u) * 1);
  transform: scaleX(-1) rotate(-28deg);
}

.knowledge-island__sprout-leaf--lush-left {
  bottom: calc(var(--ki-u) * 20);
  left: calc(var(--ki-u) * 2);
  width: calc(var(--ki-u) * 11);
  height: calc(var(--ki-u) * 6);
  transform: rotate(-52deg);
  background: #3fa860;
}

.knowledge-island__sprout-leaf--lush-right {
  bottom: calc(var(--ki-u) * 20);
  right: calc(var(--ki-u) * 2);
  width: calc(var(--ki-u) * 11);
  height: calc(var(--ki-u) * 6);
  transform: scaleX(-1) rotate(-52deg);
  background: #3fa860;
}

.knowledge-island__sprout-leaf--flourishing {
  bottom: calc(var(--ki-u) * 7);
  left: calc(var(--ki-u) * 5);
  width: calc(var(--ki-u) * 9);
  height: calc(var(--ki-u) * 5);
  transform: rotate(-10deg);
  background: #6bc97e;
}

.knowledge-island__grass {
  left: 58%;
  bottom: 4%;
  width: calc(var(--ki-u) * 22 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 19 * var(--ki-unit, 1));
  transform-origin: bottom center;

  animation: knowledge-island-sway calc(var(--ki-ambient-sway) * 1.24) ease-in-out infinite alternate-reverse;
}

.knowledge-island__grass-blade {
  position: absolute;
  bottom: 0;
  width: calc(var(--ki-u) * 5);
  height: calc(var(--ki-u) * 17);
  border-radius: 100% 0 100% 0;
  background: #4b9f60;
  transform-origin: bottom center;
}

.knowledge-island__grass-blade--a {
  left: calc(var(--ki-u) * 2);
  transform: rotate(-25deg);
  animation: knowledge-island-blade-a calc(var(--ki-ambient-sway) * 0.86) ease-in-out infinite alternate;
}

@keyframes knowledge-island-blade-a {
  from {
    transform: rotate(-25deg);
  }

  to {
    transform: rotate(calc(-25deg + 2.4deg * var(--ki-ambient-amp)));
  }
}

.knowledge-island__grass-blade--b {
  left: calc(var(--ki-u) * 9);
  height: calc(var(--ki-u) * 19);
  transform: rotate(2deg);
  animation: knowledge-island-blade-b calc(var(--ki-ambient-sway) * 0.71) ease-in-out infinite alternate-reverse;
}

@keyframes knowledge-island-blade-b {
  from {
    transform: rotate(2deg);
  }

  to {
    transform: rotate(calc(2deg - 2.9deg * var(--ki-ambient-amp)));
  }
}

.knowledge-island__grass-blade--c {
  right: calc(var(--ki-u) * 1);
  transform: rotate(29deg);
  animation: knowledge-island-blade-c calc(var(--ki-ambient-sway) * 0.94) ease-in-out infinite alternate;
}

@keyframes knowledge-island-blade-c {
  from {
    transform: rotate(29deg);
  }

  to {
    transform: rotate(calc(29deg - 2.1deg * var(--ki-ambient-amp)));
  }
}

.knowledge-island__grass-extra {
  position: absolute;
  left: 12%;
  bottom: 2%;
  width: calc(var(--ki-u) * 17 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 14 * var(--ki-unit, 1));
  border-radius: 100% 0 100% 0;
  background: linear-gradient(180deg, #57a96a 0%, #4b9f60 100%);
  transform: rotate(-14deg);
  transform-origin: bottom center;
  opacity: 0.92;
}

.knowledge-island__flower {
  position: absolute;
  width: calc(var(--ki-u) * 6);
  height: calc(var(--ki-u) * 6);
  border-radius: 50%;
  background: #ef8fb0;
  box-shadow: 0 0 0 calc(var(--ki-u) * 1.5) rgba(255, 255, 255, 0.72);
}

.knowledge-island__flower::after {
  content: "";
  position: absolute;
  left: calc(var(--ki-u) * 2);
  top: calc(var(--ki-u) * 6);
  width: calc(var(--ki-u) * 2);
  height: calc(var(--ki-u) * 5);
  background: #4b9f60;
}

.knowledge-island__flower--a {
  left: calc(var(--ki-u) * 3);
  bottom: calc(var(--ki-u) * 20);
  background: #f2a0bd;
}

.knowledge-island__flower--b {
  right: calc(var(--ki-u) * 5);
  bottom: calc(var(--ki-u) * 18);
  background: #f7c078;
}

.knowledge-island__flower--c {
  left: calc(var(--ki-u) * 12);
  bottom: calc(var(--ki-u) * 8);
  width: calc(var(--ki-u) * 5);
  height: calc(var(--ki-u) * 5);
  background: #ef8fb0;
}

.knowledge-island__flower--d {
  right: calc(var(--ki-u) * 14);
  bottom: calc(var(--ki-u) * 6);
  width: calc(var(--ki-u) * 5);
  height: calc(var(--ki-u) * 5);
  background: #c9a2ee;
}

.knowledge-island__palm {
  left: 6%;
  bottom: 2%;
  width: calc(var(--ki-u) * 34 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 52 * var(--ki-unit, 1));
}

.knowledge-island__palm-trunk {
  position: absolute;
  left: calc(var(--ki-u) * 13);
  bottom: 0;
  width: calc(var(--ki-u) * 8);
  height: calc(var(--ki-u) * 36);
  border-radius: 60% 44% 18% 18%;
  background: repeating-linear-gradient(168deg, #b97842 0 calc(var(--ki-u) * 6), #d19452 calc(var(--ki-u) * 6) calc(var(--ki-u) * 9));
  transform: rotate(7deg);
  transform-origin: bottom center;
}

.knowledge-island__palm-crown {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(var(--ki-u) * 32);
  height: calc(var(--ki-u) * 26);
  transform-origin: 50% 92%;
  animation: knowledge-island-frond-sway var(--ki-ambient-frond) ease-in-out infinite alternate;
}

@keyframes knowledge-island-frond-sway {
  from {
    transform: rotate(calc(-2deg * var(--ki-ambient-amp)));
  }

  to {
    transform: rotate(calc(2deg * var(--ki-ambient-amp)));
  }
}

.knowledge-island__palm-leaf {
  position: absolute;
  left: calc(var(--ki-u) * 14);
  top: calc(var(--ki-u) * 11);
  width: calc(var(--ki-u) * 22);
  height: calc(var(--ki-u) * 7);
  border-radius: 100% 0 100% 0;
  background: #3d9d62;
  transform-origin: 0 50%;
}

.knowledge-island__palm-leaf--a {
  transform: rotate(-20deg);
}

.knowledge-island__palm-leaf--b {
  transform: rotate(25deg) scale(0.94);
}

.knowledge-island__palm-leaf--c {
  transform: rotate(158deg) scale(0.82);
}

.knowledge-island__palm-leaf--d {
  transform: rotate(202deg) scale(0.72);
}

.knowledge-island__palm-leaf--e {
  transform: rotate(-58deg) scale(0.68);
}

.knowledge-island__palm-leaf--f {
  transform: rotate(292deg) scale(0.58);
}

.knowledge-island__palm-fruit {
  position: absolute;
  left: calc(var(--ki-u) * 14);
  top: calc(var(--ki-u) * 15);
  width: calc(var(--ki-u) * 5);
  height: calc(var(--ki-u) * 5);
  border-radius: 50%;
  background: #8f683a;
  box-shadow: calc(var(--ki-u) * 4) calc(var(--ki-u) * 2) 0 #8f683a;
}

.knowledge-island__palm-fruit--lush {
  left: calc(var(--ki-u) * 15);
  top: calc(var(--ki-u) * 17);
  box-shadow: calc(var(--ki-u) * 4) calc(var(--ki-u) * 2) 0 #8f683a;
}

.knowledge-island__palm-fruit--flourishing {
  left: calc(var(--ki-u) * 11);
  top: calc(var(--ki-u) * 18);
  box-shadow: calc(var(--ki-u) * 4) calc(var(--ki-u) * 2) 0 #8f683a, calc(var(--ki-u) * 7) calc(var(--ki-u) * 4) 0 #8f683a;
}

.knowledge-island__camp {
  left: 58%;
  bottom: 2%;
  width: calc(var(--ki-u) * 34 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 26 * var(--ki-unit, 1));
}

.knowledge-island__camp-body {
  position: absolute;
  left: calc(var(--ki-u) * 2);
  bottom: 0;
  width: calc(var(--ki-u) * 30);
  height: calc(var(--ki-u) * 22);
  background: #f2a65b;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  filter: drop-shadow(0 calc(var(--ki-u) * 2) 0 rgba(173, 102, 58, 0.22));
}

.knowledge-island__camp-door {
  position: absolute;
  left: calc(var(--ki-u) * 13);
  bottom: 0;
  width: calc(var(--ki-u) * 8);
  height: calc(var(--ki-u) * 12);
  border-radius: calc(var(--ki-u) * 7) calc(var(--ki-u) * 7) 0 0;
  background: #7b6756;
}

.knowledge-island__camp-flag {
  position: absolute;
  top: calc(var(--ki-u) * -3);
  left: calc(var(--ki-u) * 18);
  width: calc(var(--ki-u) * 1.5);
  height: calc(var(--ki-u) * 9);
  background: #80512f;
}

.knowledge-island__camp-flag::after {
  content: "";
  position: absolute;
  top: 0;
  left: calc(var(--ki-u) * 1.5);
  width: calc(var(--ki-u) * 8);
  height: calc(var(--ki-u) * 5.5);
  background: #ef6e65;
  clip-path: polygon(0 0, 100% 28%, 0 100%);
}

.knowledge-island__camp-crate {
  position: absolute;
  left: calc(var(--ki-u) * -4);
  bottom: calc(var(--ki-u) * 1);
  width: calc(var(--ki-u) * 7);
  height: calc(var(--ki-u) * 6);
  border: calc(var(--ki-u) * 0.75) solid rgba(122, 78, 40, 0.4);
  border-radius: calc(var(--ki-u) * 1.5);
  background: #d59a5c;
}

.knowledge-island__camp-crate--flourishing {
  left: calc(var(--ki-u) * -9.5);
  width: calc(var(--ki-u) * 5.5);
  height: calc(var(--ki-u) * 5);
  background: #c68b50;
}

.knowledge-island__camp-campfire {
  position: absolute;
  right: calc(var(--ki-u) * -6);
  bottom: calc(var(--ki-u) * 1);
  width: calc(var(--ki-u) * 6.5);
  height: calc(var(--ki-u) * 8);
  border-radius: 50% 50% 40% 40%;
  background: radial-gradient(circle at 50% 70%, #fff0b0 0 34%, #f2a33c 62%, rgba(242, 163, 60, 0) 100%);
  box-shadow: 0 0 calc(var(--ki-u) * 5) rgba(255, 214, 128, 0.66);
}

.knowledge-island__camp-smoke {
  position: absolute;
  right: calc(var(--ki-u) * -3);
  bottom: calc(var(--ki-u) * 10);
  width: calc(var(--ki-u) * 4);
  height: calc(var(--ki-u) * 11);
  border-radius: calc(var(--ki-u) * 999);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.75) 100%);
  transform: skewX(-9deg);
  animation: knowledge-island-smoke-rise 3.6s ease-in-out infinite;
}

@keyframes knowledge-island-smoke-rise {
  0%,
  100% {
    opacity: 0.32;
    transform: skewX(-9deg) translateY(calc(var(--ki-u) * 2));
  }

  50% {
    opacity: 0.72;
    transform: skewX(-9deg) translateY(calc(var(--ki-u) * -2));
  }
}

.knowledge-island__dock {
  left: calc(var(--ki-u) * 4);
  bottom: calc(var(--ki-u) * 2);
  width: calc(var(--ki-u) * 60 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 22 * var(--ki-unit, 1));
  transform: rotate(-6deg);
  transform-origin: left bottom;
}

.knowledge-island__dock-plank {
  position: absolute;
  left: 0;
  width: 100%;
  height: calc(var(--ki-u) * 5);
  border: calc(var(--ki-u) * 0.6) solid rgba(130, 74, 38, 0.35);
  border-radius: calc(var(--ki-u) * 2.5);
  background: linear-gradient(180deg, #e6b36d 0%, #b77a42 100%);
  box-shadow: inset 0 calc(var(--ki-u) * 0.6) 0 rgba(255, 245, 204, 0.58);
}

.knowledge-island__dock-plank--a {
  top: calc(var(--ki-u) * 3);
}

.knowledge-island__dock-plank--b {
  top: calc(var(--ki-u) * 9);
}

.knowledge-island__dock-plank--lush {
  top: calc(var(--ki-u) * 15);
}

.knowledge-island__dock-post {
  position: absolute;
  top: calc(var(--ki-u) * 3);
  width: calc(var(--ki-u) * 3.5);
  height: calc(var(--ki-u) * 16);
  border-radius: calc(var(--ki-u) * 2);
  background: #8f5a32;
}

.knowledge-island__dock-post--a {
  left: calc(var(--ki-u) * 3);
}

.knowledge-island__dock-post--b {
  right: calc(var(--ki-u) * 3);
}

.knowledge-island__dock-post--lush {
  left: 50%;
  top: calc(var(--ki-u) * 3);
  transform: translateX(-50%);
}

.knowledge-island__dock-bollard {
  position: absolute;
  left: 62%;
  top: 0;
  width: calc(var(--ki-u) * 3);
  height: calc(var(--ki-u) * 5);
  border-radius: calc(var(--ki-u) * 1.5);
  background: #6f4a2a;
}

.knowledge-island__dock-bollard::after {
  content: "";
  position: absolute;
  left: calc(var(--ki-u) * -3);
  top: calc(var(--ki-u) * 0.75);
  width: calc(var(--ki-u) * 9);
  height: calc(var(--ki-u) * 1);
  border-radius: calc(var(--ki-u) * 999);
  background: rgba(111, 74, 42, 0.72);
}

.knowledge-island__dock-net {
  position: absolute;
  right: calc(var(--ki-u) * -7);
  top: calc(var(--ki-u) * 6);
  width: calc(var(--ki-u) * 8);
  height: calc(var(--ki-u) * 9);
  border: calc(var(--ki-u) * 0.6) solid rgba(122, 84, 48, 0.4);
  border-radius: calc(var(--ki-u) * 1.5);
  background:
    repeating-linear-gradient(45deg, rgba(122, 84, 48, 0.28) 0 calc(var(--ki-u) * 0.6), transparent calc(var(--ki-u) * 0.6) calc(var(--ki-u) * 3)),
    repeating-linear-gradient(-45deg, rgba(122, 84, 48, 0.28) 0 calc(var(--ki-u) * 0.6), transparent calc(var(--ki-u) * 0.6) calc(var(--ki-u) * 3));
  transform: rotate(8deg);
}

.knowledge-island__dock-lantern {
  position: absolute;
  left: 20%;
  top: calc(var(--ki-u) * -6);
  width: calc(var(--ki-u) * 4.5);
  height: calc(var(--ki-u) * 6);
  border-radius: calc(var(--ki-u) * 1.5) calc(var(--ki-u) * 1.5) calc(var(--ki-u) * 2) calc(var(--ki-u) * 2);
  background: #ffe08a;
  box-shadow: 0 0 calc(var(--ki-u) * 5) rgba(255, 214, 128, 0.85);
}

.knowledge-island__dock-lantern::before {
  content: "";
  position: absolute;
  left: calc(var(--ki-u) * 1.5);
  top: calc(var(--ki-u) * -3);
  width: calc(var(--ki-u) * 1);
  height: calc(var(--ki-u) * 3);
  background: #6f4a2a;
}

.knowledge-island__boat {
  left: 84%;
  bottom: -18%;
  width: calc(var(--ki-u) * 26 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 29 * var(--ki-unit, 1));

  transform-origin: 50% 88%;
  animation: knowledge-island-boat-bob var(--ki-ambient-bob) ease-in-out infinite alternate;
}

@keyframes knowledge-island-boat-bob {
  from {
    transform: translateY(calc(var(--ki-u) * 1.7 * var(--ki-ambient-amp)))
      rotate(calc(-2.4deg * var(--ki-ambient-amp)));
  }

  to {
    transform: translateY(calc(var(--ki-u) * -1.7 * var(--ki-ambient-amp)))
      rotate(calc(2.4deg * var(--ki-ambient-amp)));
  }
}

.knowledge-island__boat-hull {
  position: absolute;
  left: calc(var(--ki-u) * 2);
  bottom: calc(var(--ki-u) * 2);
  width: calc(var(--ki-u) * 22);
  height: calc(var(--ki-u) * 8.5);
  border-radius: 0 0 calc(var(--ki-u) * 15) calc(var(--ki-u) * 15);
  background: #f08d55;
  border: calc(var(--ki-u) * 0.8) solid rgba(131, 74, 54, 0.35);
}

.knowledge-island__boat-mast {
  position: absolute;
  left: calc(var(--ki-u) * 12);
  bottom: calc(var(--ki-u) * 9);
  width: calc(var(--ki-u) * 1.6);
  height: calc(var(--ki-u) * 19);
  background: #765a48;
}

.knowledge-island__boat-sail {
  position: absolute;
  left: calc(var(--ki-u) * 14);
  top: calc(var(--ki-u) * 1);
  width: calc(var(--ki-u) * 13);
  height: calc(var(--ki-u) * 15);
  background: #fff4d0;
  clip-path: polygon(0 0, 100% 80%, 0 100%);
  border: calc(var(--ki-u) * 0.8) solid rgba(185, 135, 77, 0.3);
}

.knowledge-island__boat-rigging {
  position: absolute;
  left: calc(var(--ki-u) * 3);
  top: calc(var(--ki-u) * 4);
  width: calc(var(--ki-u) * 20);
  height: calc(var(--ki-u) * 1.2);
  background: rgba(118, 90, 72, 0.72);
  transform: rotate(6deg);
}

.knowledge-island__boat-flag {
  position: absolute;
  left: calc(var(--ki-u) * 13.5);
  top: calc(var(--ki-u) * -0.5);
  width: calc(var(--ki-u) * 7);
  height: calc(var(--ki-u) * 4);
  background: #7fc9e0;
  clip-path: polygon(0 0, 100% 26%, 0 100%);
}

.knowledge-island__boat-anchor {
  position: absolute;
  left: calc(var(--ki-u) * 0.5);
  bottom: 0;
  width: calc(var(--ki-u) * 5);
  height: calc(var(--ki-u) * 5);
  border: calc(var(--ki-u) * 1.2) solid #6f5a4c;
  border-top: 0;
  border-radius: 0 0 calc(var(--ki-u) * 5) calc(var(--ki-u) * 5);
}

.knowledge-island__boat-anchor::before {
  content: "";
  position: absolute;
  left: calc(var(--ki-u) * 1.6);
  top: calc(var(--ki-u) * -3.4);
  width: calc(var(--ki-u) * 1.2);
  height: calc(var(--ki-u) * 3.4);
  background: #6f5a4c;
}

.knowledge-island__observatory {
  left: -6%;
  bottom: 0;
  width: calc(var(--ki-u) * 20 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 18 * var(--ki-unit, 1));

  z-index: 8;
}

.knowledge-island__observatory-deck {
  position: absolute;
  left: 8%;
  bottom: 0;
  width: 84%;
  height: 26%;
  border: calc(var(--ki-u) * 0.7) solid rgba(122, 78, 40, 0.4);
  border-radius: 50%;
  background: linear-gradient(180deg, #e0b273 0%, #b9814c 100%);
  box-shadow: inset 0 calc(var(--ki-u) * 1) 0 rgba(255, 240, 205, 0.55);
}

.knowledge-island__observatory-tripod {
  position: absolute;
  left: 46%;
  bottom: 18%;
  width: calc(var(--ki-u) * 1.6);
  height: 46%;
  border-radius: calc(var(--ki-u) * 999);
  background: #8f5a32;
  transform-origin: top center;
}

.knowledge-island__observatory-tripod--a {
  transform: rotate(-18deg);
}

.knowledge-island__observatory-tripod--b {
  transform: rotate(18deg);
}

.knowledge-island__observatory-tripod--c {
  height: 40%;
  transform: rotate(0deg);
}

.knowledge-island__observatory-tube {
  position: absolute;
  left: 22%;
  bottom: 52%;
  width: 62%;
  height: 22%;
  border-radius: calc(var(--ki-u) * 2);
  background: linear-gradient(180deg, #e8c06a 0%, #b98a3e 55%, #8a6128 100%);
  box-shadow: inset 0 calc(var(--ki-u) * 0.8) 0 rgba(255, 240, 200, 0.6);
  transform: rotate(-38deg);
  transform-origin: 82% 50%;
}

.knowledge-island__observatory-tube::before {
  content: "";
  position: absolute;
  left: -8%;
  top: -18%;
  width: 20%;
  height: 136%;
  border-radius: calc(var(--ki-u) * 2);
  background: linear-gradient(180deg, #f0cd7c 0%, #a1762f 100%);
}

.knowledge-island__observatory-tube::after {
  content: "";
  position: absolute;
  right: -7%;
  top: 18%;
  width: 12%;
  height: 64%;
  border-radius: calc(var(--ki-u) * 1.5);
  background: #6f4a2a;
}

.knowledge-island__lighthouse {
  left: 50%;
  bottom: 0;
  width: calc(var(--ki-u) * 22 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 46 * var(--ki-unit, 1));
  margin-left: calc(var(--ki-u) * -11 * var(--ki-unit, 1));
  z-index: 7;
}

.knowledge-island__lighthouse-roof {
  position: absolute;
  left: calc(var(--ki-u) * 2);
  top: 0;
  width: calc(var(--ki-u) * 18);
  height: calc(var(--ki-u) * 9);
  border-radius: 50% 50% 18% 18%;
  background: #e7665a;
  box-shadow: inset 0 var(--ki-u) 0 rgba(255, 245, 220, 0.42);
}

.knowledge-island__lighthouse-tower {
  position: absolute;
  left: calc(var(--ki-u) * 4);
  top: calc(var(--ki-u) * 8);
  width: calc(var(--ki-u) * 14);
  height: calc(var(--ki-u) * 37);
  clip-path: polygon(14% 0, 86% 0, 100% 100%, 0 100%);
  background: repeating-linear-gradient(180deg, #fff3cf 0 calc(var(--ki-u) * 9), #e47763 calc(var(--ki-u) * 9) calc(var(--ki-u) * 14));
  border-radius: var(--ki-u) var(--ki-u) 0 0;
}

.knowledge-island__lighthouse-window {
  position: absolute;
  left: calc(var(--ki-u) * 8);
  width: calc(var(--ki-u) * 6);
  height: calc(var(--ki-u) * 6);
  border-radius: var(--ki-u);
  background: #5c9eb4;
  box-shadow: inset var(--ki-u) var(--ki-u) 0 rgba(255, 255, 255, 0.7);
}

.knowledge-island__lighthouse-window--a {
  top: calc(var(--ki-u) * 16);
}

.knowledge-island__lighthouse-window--b {
  top: calc(var(--ki-u) * 28);
}

.knowledge-island__lighthouse-light {
  position: absolute;
  left: calc(var(--ki-u) * 7.5);
  top: calc(var(--ki-u) * 3.5);
  width: calc(var(--ki-u) * 7);
  height: calc(var(--ki-u) * 6);
  border-radius: 50%;
  background: #ffe58d;
  box-shadow: 0 0 0 var(--ki-u) rgba(255, 242, 164, 0.5);
}

.knowledge-island__beam {
  position: absolute;
  left: 100%;
  top: calc(var(--ki-u) * 1);
  width: calc(var(--ki-u) * 92 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 20 * var(--ki-unit, 1));
  background: linear-gradient(90deg, rgba(255, 226, 132, 0.95), rgba(255, 238, 160, 0.55) 40%, rgba(255, 238, 160, 0));
  clip-path: polygon(0 36%, 100% 0, 100% 100%, 0 64%);

  transform-origin: left center;
  animation:
    knowledge-island-beam var(--ki-ambient-beam) ease-in-out infinite,
    knowledge-island-beam-sweep calc(var(--ki-ambient-beam) * 1.15) ease-in-out infinite alternate;
  z-index: -1;
}

@keyframes knowledge-island-beam-sweep {
  from {
    transform: rotate(calc(-4.6deg * var(--ki-ambient-amp)));
  }

  to {
    transform: rotate(calc(4.6deg * var(--ki-ambient-amp)));
  }
}

.knowledge-island__beam--lush {
  width: calc(var(--ki-u) * 112 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 24 * var(--ki-unit, 1));
}

.knowledge-island__beam--flourishing {
  width: calc(var(--ki-u) * 132 * var(--ki-unit, 1));
  height: calc(var(--ki-u) * 28 * var(--ki-unit, 1));
}

.knowledge-island__lighthouse-window--lush {
  top: calc(var(--ki-u) * 22);
  background: #ffe9a8;
  box-shadow: 0 0 calc(var(--ki-u) * 4) rgba(255, 226, 140, 0.86);
}

.knowledge-island__lighthouse-window--flourishing {
  top: calc(var(--ki-u) * 34);
  background: #ffe9a8;
  box-shadow: 0 0 calc(var(--ki-u) * 5) rgba(255, 226, 140, 0.92);
}

.knowledge-island__lighthouse-base {
  position: absolute;
  left: 0;
  bottom: calc(var(--ki-u) * -2);
  width: calc(var(--ki-u) * 22);
  height: calc(var(--ki-u) * 5);
  border-radius: 0 0 var(--ki-u) var(--ki-u);
  background: linear-gradient(180deg, #e8dcc4 0%, #cbbb9c 100%);
}

@keyframes knowledge-island-beam {
  0%,
  100% {
    opacity: 0.42;
  }

  50% {
    opacity: 0.84;
  }
}

@keyframes knowledge-island-wave-drift {
  from {
    transform: translateX(calc(var(--wave-shift) * -1)) rotate(var(--wave-angle));
  }

  to {
    transform: translateX(var(--wave-shift)) rotate(var(--wave-angle));
  }
}

.knowledge-island__info {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.knowledge-island__stage {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  min-width: 0;
}

.knowledge-island__stage-glyph {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(72, 154, 148, 0.24);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.78);
  font-size: 1.15rem;
  line-height: 1;
}

.knowledge-island__stage-name {
  min-width: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1.3;
}

.knowledge-island__stamps {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.88rem;
  font-weight: 800;
}

.knowledge-island__prosperity {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  min-width: 0;
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  font-weight: 800;
}

.knowledge-island__prosperity-label {
  flex-shrink: 0;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid rgba(72, 154, 148, 0.28);
  background: rgba(255, 255, 255, 0.78);
  color: #2f7a6c;
  font-size: 0.76rem;
  font-weight: 900;
}

.knowledge-island__prosperity[data-prosperity="lush"] .knowledge-island__prosperity-label {
  border-color: rgba(52, 138, 92, 0.32);
  color: #2f7a4c;
  background: rgba(240, 252, 240, 0.86);
}

.knowledge-island__prosperity[data-prosperity="flourishing"] .knowledge-island__prosperity-label {
  border-color: rgba(198, 141, 26, 0.36);
  color: #8a5a00;
  background: rgba(255, 249, 226, 0.9);
}

.knowledge-island__prosperity-text {
  min-width: 0;
}

.knowledge-island__progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.knowledge-island__track {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  height: 10px;
  border: 1px solid rgba(62, 140, 148, 0.14);
  border-radius: 999px;
  background: rgba(41, 108, 123, 0.12);
  box-shadow: inset 0 1px 2px rgba(35, 89, 104, 0.1);
}

.knowledge-island__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #7bd29c 0%, #56b4d2 100%);
  transition: width 260ms ease;
}

.knowledge-island__progress-text {
  flex-shrink: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  font-weight: 900;
}

.knowledge-island__next {
  margin: 0;
  color: #1f6b51;
  font-size: 0.86rem;
  font-weight: 900;
}

.knowledge-island__next--max {
  color: #8a5a00;
}

.knowledge-island--hero {
  gap: 0;
  padding: 10px 12px 12px;
  border-radius: 26px;
  box-shadow:
    0 30px 52px -40px rgba(37, 106, 126, 0.62),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.knowledge-island--hero .knowledge-island__info {
  display: none;
}

.knowledge-island--hero .knowledge-island__figure {
  border-radius: 24px;
}

@media (max-width: 680px) {
  .knowledge-island--hero {
    padding: 12px 12px 14px;
    border-radius: 24px;
  }

  .knowledge-island--hero .knowledge-island__figure {
    border-radius: 18px;
  }
}

@media (max-width: 480px) {
  .knowledge-island {
    padding: 11px 12px;
  }
}

.knowledge-island__hotspots {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}

.knowledge-island__hotspot {
  position: absolute;
  display: block;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  pointer-events: auto;
  -webkit-appearance: none;
  appearance: none;
  transform: translate(-50%, -50%);
  transition:
    transform 180ms ease,
    filter 180ms ease;
}

.knowledge-island__hotspot:focus-visible {
  outline: 3px solid rgba(255, 141, 74, 0.95);
  outline-offset: 3px;
  border-radius: 14px;
}

.knowledge-island__hotspot--next:focus-visible {
  border-radius: 999px;
}

.knowledge-island__hotspot--sea {
  z-index: 1;
  transform: none;
}

.knowledge-island__hotspot--next {
  z-index: 4;
  width: max-content;
  min-height: 44px;
  height: auto;
  padding: 8px 12px;
  border: 1.5px solid rgba(150, 106, 24, 0.34);
  border-radius: 999px;

  background: rgba(255, 249, 228, 0.96);
  box-shadow: 0 8px 16px -12px rgba(10, 40, 60, 0.9);
  color: #8a5a00;
  white-space: nowrap;
}

.knowledge-island__hotspot--next:hover {
  background: #fff6da;
}

.knowledge-island__hotspot--next.knowledge-island__hotspot--on {
  border-color: rgba(150, 106, 24, 0.7);
  background: #fff2cc;
}

.knowledge-island__hotspot-chip {
  display: block;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1.3;
}

.knowledge-island__hotspot--shell,
.knowledge-island__hotspot--rock,
.knowledge-island__hotspot--gull,
.knowledge-island__hotspot--sun,
.knowledge-island__hotspot--cloud,
.knowledge-island__hotspot--bottle {
  z-index: 3;

  min-width: 44px;
  min-height: 44px;
}

.knowledge-island__hotspot--shell:hover,
.knowledge-island__hotspot--rock:hover,
.knowledge-island__hotspot--gull:hover,
.knowledge-island__hotspot--sun:hover,
.knowledge-island__hotspot--cloud:hover,
.knowledge-island__hotspot--bottle:hover {
  transform: translate(-50%, -50%) scale(1.06);
}

.knowledge-island__hotspot--shell:active,
.knowledge-island__hotspot--rock:active,
.knowledge-island__hotspot--gull:active,
.knowledge-island__hotspot--sun:active,
.knowledge-island__hotspot--cloud:active,
.knowledge-island__hotspot--bottle:active {
  transform: translate(-50%, -50%) scale(0.96);
}

.knowledge-island--active-shell .knowledge-island__shell--main {
  animation: knowledge-island-shell-bounce 720ms ease;
}

.knowledge-island--active-rock .knowledge-island__rock--main {
  animation: knowledge-island-rock-wobble 720ms ease;
}

.knowledge-island__rock-splash {
  position: absolute;
  left: 50%;
  bottom: 4%;
  width: calc(var(--ki-u) * 20);
  height: calc(var(--ki-u) * 7);
  margin-left: calc(var(--ki-u) * -10);
  border: calc(var(--ki-u) * 1.4) solid rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  z-index: 12;
}

.knowledge-island--active-rock .knowledge-island__rock-splash {
  animation: knowledge-island-rock-splash 720ms ease-out;
}

.knowledge-island--active-gull .knowledge-island__gull--a {
  animation: knowledge-island-gull-glide 900ms ease;
}

.knowledge-island__ripple {
  position: absolute;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  pointer-events: none;
  animation: knowledge-island-ripple 1100ms ease-out forwards;
}

.knowledge-island__next-terrain--tapped .knowledge-island__next-outline {
  stroke-width: 2.6;
  stroke: rgba(255, 255, 255, 0.98);
}

.knowledge-island__next-terrain--tapped .knowledge-island__next-fill {
  fill: rgba(255, 255, 255, 0.3);
}

.knowledge-island__dusk-veil {
  position: absolute;
  inset: 0;
  z-index: 15;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 158, 92, 0.34) 0%, rgba(238, 110, 110, 0.26) 45%, rgba(104, 74, 150, 0.3) 100%);
  pointer-events: none;
  animation: knowledge-island-dusk-fade 900ms ease;
}

@keyframes knowledge-island-dusk-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.knowledge-island--dusk .knowledge-island__sun {
  background: #ffab63;
  box-shadow:
    0 0 0 calc(var(--ki-u) * 5) rgba(255, 172, 110, 0.35),
    0 calc(var(--ki-u) * 8) calc(var(--ki-u) * 15) calc(var(--ki-u) * -8) rgba(214, 102, 37, 0.65);
}

.knowledge-island--dusk .knowledge-island__sky-dot {
  animation: knowledge-island-star-twinkle 1.8s ease-in-out infinite alternate;
}

@keyframes knowledge-island-star-twinkle {
  from {
    opacity: 0.4;
  }

  to {
    opacity: 1;
  }
}

.knowledge-island--dusk .knowledge-island__beam {
  opacity: 0.92;
}

.knowledge-island--dusk .knowledge-island__lighthouse-light {
  box-shadow: 0 0 calc(var(--ki-u) * 6) rgba(255, 226, 140, 0.95);
}

.knowledge-island__hint {
  position: absolute;
  left: 50%;
  bottom: calc(2.5% + 6px);
  z-index: 30;
  max-width: min(86%, 420px);
  margin: 0;
  padding: 9px 16px;
  border: 1.5px solid rgba(255, 255, 255, 0.86);
  border-radius: 999px;
  background: rgba(24, 62, 84, 0.86);
  box-shadow: 0 12px 24px -18px rgba(10, 40, 60, 0.9);
  color: #ffffff;
  font-size: 0.86rem;
  font-weight: 800;
  line-height: 1.4;
  text-align: center;
  transform: translateX(-50%);
  animation: knowledge-island-hint-in 220ms ease;
  pointer-events: none;
}

@keyframes knowledge-island-shell-bounce {
  0% {
    transform: rotate(0deg) translateY(0);
  }
  35% {
    transform: rotate(9deg) translateY(calc(var(--ki-u) * -3));
  }
  70% {
    transform: rotate(-5deg) translateY(0);
  }
  100% {
    transform: rotate(0deg) translateY(0);
  }
}

@keyframes knowledge-island-rock-wobble {
  0% {
    transform: rotate(0deg);
  }
  30% {
    transform: rotate(-7deg) translateX(calc(var(--ki-u) * -0.8));
  }
  65% {
    transform: rotate(5deg) translateX(calc(var(--ki-u) * 0.6));
  }
  100% {
    transform: rotate(0deg);
  }
}

@keyframes knowledge-island-rock-splash {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  30% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

@keyframes knowledge-island-gull-glide {
  0% {
    transform: translate(0, 0);
  }
  40% {
    transform: translate(calc(var(--ki-u) * -9), calc(var(--ki-u) * -4));
  }
  75% {
    transform: translate(calc(var(--ki-u) * 7), calc(var(--ki-u) * 2));
  }
  100% {
    transform: translate(0, 0);
  }
}

@keyframes knowledge-island-ripple {
  0% {
    opacity: 0.85;
    transform: scale(0.35);
  }
  100% {
    opacity: 0;
    transform: scale(7);
  }
}

@keyframes knowledge-island-hint-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.knowledge-island--prosperity-lush .knowledge-island__hotspot--shell.knowledge-island__hotspot--on,
.knowledge-island--prosperity-flourishing .knowledge-island__hotspot--shell.knowledge-island__hotspot--on {
  box-shadow: 0 0 0 6px rgba(255, 214, 140, 0.35);
}

.knowledge-island--prosperity-flourishing .knowledge-island__hotspot--gull.knowledge-island__hotspot--on {
  box-shadow: 0 0 0 6px rgba(198, 141, 26, 0.28);
}

@media (prefers-reduced-motion: reduce) {
  .knowledge-island__beam,
  .knowledge-island__surf-line,
  .knowledge-island__camp-smoke,
  .knowledge-island__next-terrain {
    animation: none;
  }

  .knowledge-island__surf,
  .knowledge-island__sun::after,
  .knowledge-island__cloud,
  .knowledge-island__gull--flyby,
  .knowledge-island__sprout,
  .knowledge-island__grass,
  .knowledge-island__grass-blade,
  .knowledge-island__palm-crown,
  .knowledge-island__boat,
  .knowledge-island__horizon-sail,
  .knowledge-island__sun-glitter,
  .knowledge-island__seagrass,
  .knowledge-island__buoy,
  .knowledge-island__bottle,
  .knowledge-island__dusk-veil,
  .knowledge-island--dusk .knowledge-island__sky-dot {
    animation: none;
  }

  .knowledge-island__world,
  .knowledge-island__hotspots {
    transform: none;
    transition: none;
  }

  .knowledge-island__sea,
  .knowledge-island__sea-depth,
  .knowledge-island__horizon-island,
  .knowledge-island__sun-glitter {
    transform: none;
  }

  .knowledge-island__sun-glitter {
    opacity: 0.42;
  }

  .knowledge-island__sun::after {
    opacity: 0.46;
  }

  .knowledge-island__beam {
    opacity: 0.6;
  }

  .knowledge-island__next-terrain {
    opacity: 0.78;
  }

  .knowledge-island__fill {
    transition: none;
  }

  .knowledge-island--active-shell .knowledge-island__shell--main,
  .knowledge-island--active-rock .knowledge-island__rock--main,
  .knowledge-island--active-rock .knowledge-island__rock-splash,
  .knowledge-island--active-gull .knowledge-island__gull--a,
  .knowledge-island__ripple,
  .knowledge-island__next-terrain,
  .knowledge-island__hint {
    animation: none;
  }

  .knowledge-island__hotspot {
    transition: none;
  }

  .knowledge-island__hotspot--shell:hover,
  .knowledge-island__hotspot--rock:hover,
  .knowledge-island__hotspot--gull:hover,
  .knowledge-island__hotspot--sun:hover,
  .knowledge-island__hotspot--cloud:hover,
  .knowledge-island__hotspot--bottle:hover,
  .knowledge-island__hotspot--shell:active,
  .knowledge-island__hotspot--rock:active,
  .knowledge-island__hotspot--gull:active,
  .knowledge-island__hotspot--sun:active,
  .knowledge-island__hotspot--cloud:active,
  .knowledge-island__hotspot--bottle:active {
    transform: translate(-50%, -50%);
  }

  .knowledge-island__hotspot--on {
    outline: 3px solid rgba(255, 141, 74, 0.95);
    outline-offset: 2px;
  }

  .knowledge-island--active-sea .knowledge-island__hotspot--sea {
    background: radial-gradient(circle, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0) 70%);
  }
}

/* Shared picture-book scene treatment, including compact previews. */
.knowledge-island { border: 1px solid #c8ddda; border-radius: 22px; padding: 7px; background: #f6fbf8; }
.knowledge-island--hero { padding: 6px; border-radius: 24px; box-shadow: 0 10px 30px -22px #31595755; }
.knowledge-island--hero .knowledge-island__figure { border-radius: 18px; }
.knowledge-island__figure { border: 0; background: linear-gradient(180deg, #d6eff2, #edf8f5); box-shadow: none; }
.knowledge-island__sprite {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
  opacity: 0;
  pointer-events: none;
  user-select: none;
}

.knowledge-island__palm--illustrated > .knowledge-island__palm-art,
.knowledge-island__lighthouse--illustrated > .knowledge-island__lighthouse-art {
  opacity: 1;
}

/* Original shapes remain a fallback; prosperity details still belong to live state. */
.knowledge-island__palm--illustrated > .knowledge-island__palm-trunk,
.knowledge-island__palm--illustrated > .knowledge-island__palm-crown,
.knowledge-island__palm--illustrated > .knowledge-island__palm-fruit:not(.knowledge-island__palm-fruit--lush):not(.knowledge-island__palm-fruit--flourishing),
.knowledge-island__lighthouse--illustrated > .knowledge-island__lighthouse-roof,
.knowledge-island__lighthouse--illustrated > .knowledge-island__lighthouse-tower,
.knowledge-island__lighthouse--illustrated > .knowledge-island__lighthouse-window--a,
.knowledge-island__lighthouse--illustrated > .knowledge-island__lighthouse-window--b {
  opacity: 0;
}

.knowledge-island__palm-art {
  transform-origin: 56% 98%;
  animation: knowledge-island-frond-sway var(--ki-ambient-frond) ease-in-out infinite alternate;
}

.knowledge-island__lighthouse-art {
  z-index: 1;
}

.knowledge-island__lighthouse--illustrated > .knowledge-island__lighthouse-light {
  left: 50%;
  top: 20%;
  width: 20%;
  height: 10%;
  transform: translate(-50%, -50%);
  background: radial-gradient(ellipse, #fff7bccc, #ffe58d33);
  z-index: 2;
}

.knowledge-island__lighthouse--illustrated > .knowledge-island__beam {
  left: 70%;
  top: 20%;
  margin-top: calc(var(--ki-u) * -10 * var(--ki-unit, 1));
}

.knowledge-island__lighthouse--illustrated > .knowledge-island__beam--lush {
  margin-top: calc(var(--ki-u) * -12 * var(--ki-unit, 1));
}

.knowledge-island__lighthouse--illustrated > .knowledge-island__beam--flourishing {
  margin-top: calc(var(--ki-u) * -14 * var(--ki-unit, 1));
}

.knowledge-island__lighthouse--illustrated > .knowledge-island__lighthouse-window--lush,
.knowledge-island__lighthouse--illustrated > .knowledge-island__lighthouse-window--flourishing {
  left: 60%;
  width: 13%;
  height: 6%;
  z-index: 2;
}

.knowledge-island__lighthouse--illustrated > .knowledge-island__lighthouse-window--lush {
  top: 43%;
}

.knowledge-island__lighthouse--illustrated > .knowledge-island__lighthouse-window--flourishing {
  top: 63%;
}

@media (prefers-reduced-motion: reduce) {
  .knowledge-island__palm-art {
    animation: none;
  }
}

.knowledge-island__scene-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0;
  pointer-events: none;
  user-select: none;
}

.knowledge-island--scene-background .knowledge-island__scene-background {
  opacity: .9;
}

/* Keep the original environment until the image loads, including on network errors. */
.knowledge-island--scene-background .knowledge-island__sea,
.knowledge-island--scene-background .knowledge-island__sea-depth,
.knowledge-island--scene-background .knowledge-island__horizon-island {
  opacity: 0;
}

.knowledge-island--scene-background .knowledge-island__cloud {
  opacity: .45;
}

.knowledge-island--scene-background .knowledge-island__surf {
  opacity: .45;
}
.knowledge-island__sea-depth { opacity: .12; clip-path: ellipse(80% 65% at 50% 100%); }
.knowledge-island__sun-glitter { opacity: .12; background: radial-gradient(ellipse, #fff6c944, transparent 65%); }
.knowledge-island__horizon-island { opacity: .6; }
.knowledge-island__sun::after { opacity: .15; }
.knowledge-island__island-shadow { bottom: 4%; height: 16%; background: #3b81952b; }
.knowledge-island__surf-line { opacity: .65; border-top-width: calc(var(--ki-u) * 1.2); }
.knowledge-island__rock--main { left: -5%; bottom: 20%; }
.knowledge-island__shell--main { left: 95%; bottom: 5%; }
.knowledge-island__shell--lush-a { left: 76%; bottom: 50%; }
.knowledge-island__shell--lush-b { left: 130%; bottom: 20%; }
.knowledge-island__rock--lush { left: 24%; bottom: 67%; }
.knowledge-island__driftwood { left: 150%; bottom: 70%; }
.knowledge-island__starfish { left: 55%; bottom: -3%; }
.knowledge-island__shell--main, .knowledge-island__rock--main, .knowledge-island__gull--a, .knowledge-island__sun, .knowledge-island__cloud--left, .knowledge-island__bottle { transition: filter 160ms ease; }
.knowledge-island--hover-shell .knowledge-island__shell--main,
.knowledge-island--hover-rock .knowledge-island__rock--main,
.knowledge-island--hover-gull .knowledge-island__gull--a,
.knowledge-island--hover-sun .knowledge-island__sun,
.knowledge-island--hover-cloud .knowledge-island__cloud--left,
.knowledge-island--hover-bottle .knowledge-island__bottle { filter: brightness(1.16) drop-shadow(0 0 3px #fff); }
.knowledge-island__hotspot--next { font-size: .72rem; background: #fffbef; border-color: #e0c691; box-shadow: 0 2px 5px #51797418; }
.knowledge-island__hint { font-weight: 500; border: 0; border-radius: 14px; max-width: min(90%, 420px); }
@media (prefers-reduced-motion: reduce) { .knowledge-island__pool-fish { animation: none; } }

/* Sprite overlays keep the zone geometry and live prosperity/interaction details. */
.knowledge-island__object--illustrated > .knowledge-island__sprite {
  opacity: 1;
}

.knowledge-island__shell.knowledge-island__object--illustrated,
.knowledge-island__rock.knowledge-island__object--illustrated,
.knowledge-island__starfish.knowledge-island__object--illustrated,
.knowledge-island__driftwood.knowledge-island__object--illustrated {
  background: none;
  border-color: transparent;
  border-radius: 0;
  box-shadow: none;
  clip-path: none;
}

.knowledge-island__shell.knowledge-island__object--illustrated::before,
.knowledge-island__shell.knowledge-island__object--illustrated::after,
.knowledge-island__rock--main.knowledge-island__object--illustrated::after,
.knowledge-island__starfish.knowledge-island__object--illustrated::after,
.knowledge-island__driftwood.knowledge-island__object--illustrated::after {
  opacity: 0;
}

.knowledge-island__object--illustrated > .knowledge-island__sprout-stem,
.knowledge-island__object--illustrated > .knowledge-island__sprout-leaf--left,
.knowledge-island__object--illustrated > .knowledge-island__sprout-leaf--right,
.knowledge-island__object--illustrated > .knowledge-island__grass-blade,
.knowledge-island__object--illustrated > .knowledge-island__camp-body,
.knowledge-island__object--illustrated > .knowledge-island__camp-door,
.knowledge-island__object--illustrated > .knowledge-island__dock-plank--a,
.knowledge-island__object--illustrated > .knowledge-island__dock-plank--b,
.knowledge-island__object--illustrated > .knowledge-island__dock-post--a,
.knowledge-island__object--illustrated > .knowledge-island__dock-post--b,
.knowledge-island__object--illustrated > .knowledge-island__boat-hull,
.knowledge-island__object--illustrated > .knowledge-island__boat-mast,
.knowledge-island__object--illustrated > .knowledge-island__boat-sail,
.knowledge-island__object--illustrated > .knowledge-island__observatory-deck,
.knowledge-island__object--illustrated > .knowledge-island__observatory-tripod,
.knowledge-island__object--illustrated > .knowledge-island__observatory-tube {
  opacity: 0;
}
</style>
