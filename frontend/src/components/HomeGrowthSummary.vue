<script setup>
import { computed } from "vue";
import IslandStageIllustration from "./island/IslandStageIllustration.vue";

const props = defineProps({
  growth: { type: Object, required: true },
  growthBookEntry: { type: Object, default: () => ({}) },
  growthPlansEntry: { type: Object, default: () => ({}) },
  milestoneEntry: { type: Object, default: () => ({}) }
});
const emit = defineEmits(["open-backpack", "open-entry", "open-island"]);

// Compact labels keep all three destinations visible; full descriptions stay on their own pages.
const growthEntries = computed(() => [
  { id: "growth-book", title: "成长纪念册", icon: props.growthBookEntry.icon || "📖", ariaLabel: props.growthBookEntry.ariaLabel || "打开我们的成长纪念册" },
  { id: "growth-plans", title: "一起做什么", icon: props.growthPlansEntry.icon || "☀️", ariaLabel: props.growthPlansEntry.ariaLabel || "打开下次我们一起做什么" },
  { id: "growth-milestones", title: "她的成长", icon: props.milestoneEntry.icon || "🌱", ariaLabel: props.milestoneEntry.ariaLabel || "打开她的成长" }
]);
</script>

<template>
  <section class="growth-summary" aria-label="我的成长">
    <header class="growth-summary__head">
      <h2 class="growth-summary__title">我的成长</h2>
      <button class="growth-summary__more" type="button"
        aria-label="打开我的探险收藏册，查看印章、航海收藏和成就" @click="emit('open-backpack')">
        收藏册 <span aria-hidden="true">↗</span>
      </button>
    </header>

    <button class="growth-summary__stamps" type="button"
      :aria-label="`打开我的知识岛（${growth.stampText}）`" @click="emit('open-island')">
      <span class="growth-summary__stamps-copy">
        <strong class="growth-summary__stamps-island">{{ growth.knowledgeIslandTitle }}</strong>
        <span class="growth-summary__stamps-text">{{ growth.knowledgeIslandText }}</span>
        <span class="growth-summary__stamps-next">{{ growth.knowledgeIsland.nextText }}</span>
      </span>
      <!-- This thumbnail follows the real unlocked stage, never the decorative hero illustration. -->
      <IslandStageIllustration class="growth-summary__island-art" :stage-id="growth.knowledgeIsland.currentStage.id" />
      <span class="growth-summary__stamps-more" aria-hidden="true">›</span>
    </button>

    <ul class="growth-summary__stats">
      <li class="growth-summary__stat">
        <strong class="growth-summary__stat-value"><span aria-hidden="true">⭐</span> {{ growth.starText }}</strong>
        <span class="growth-summary__stat-label">本章星星</span>
      </li>
      <li class="growth-summary__stat">
        <strong class="growth-summary__stat-value"><span aria-hidden="true">🎒</span> {{ growth.rewardText }}</strong>
        <span class="growth-summary__stat-label">航海收藏</span>
      </li>
      <li class="growth-summary__stat">
        <strong class="growth-summary__stat-value"><span aria-hidden="true">🏅</span> {{ growth.achievementText }}</strong>
        <span class="growth-summary__stat-label">成就</span>
      </li>
    </ul>

    <div class="growth-summary__entries">
      <button v-for="entry in growthEntries" :key="entry.id" class="growth-summary__entry"
        type="button" :aria-label="entry.ariaLabel" @click="emit('open-entry', entry.id)">
        <span aria-hidden="true">{{ entry.icon }}</span>
        <span>{{ entry.title }}</span>
        <span class="growth-summary__entry-arrow" aria-hidden="true">›</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.growth-summary {
  display: grid;
  gap: 12px;
  align-content: start;
  min-width: 0;
  padding: 20px;
  border: 1px solid #e0e9e5;
  border-radius: 22px;
  background: rgba(255,255,255,.9);
}

.growth-summary__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.growth-summary__title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", sans-serif;
  font-size: 1.15rem;
  line-height: 1.4;
  color: var(--color-ink);
}

.growth-summary button {
  font-family: inherit;
  cursor: pointer;
  transition: background 150ms ease;
}

.growth-summary button:focus-visible {
  outline: 3px solid #6aad9b;
  outline-offset: 3px;
}

.growth-summary__more {
  min-height: 32px;
  padding: 4px 2px 4px 10px;
  border: 0;
  border-radius: 6px;
  color: #59746b;
  background: transparent;
  font-size: .78rem;
  font-weight: 600;
}

.growth-summary__more:hover {
  color: #215647;
  background: #eff7f2;
}

.growth-summary__more > span {
  padding-left: 6px;
}

.growth-summary__stamps {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 96px;
  padding: 10px 14px;
  border: 0;
  border-radius: 15px;
  background: #edf6ef;
  text-align: left;
}

.growth-summary__stamps:hover {
  background: #e2f0e6;
}

.growth-summary__stamps-copy {
  display: grid;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.growth-summary__stamps-island {
  color: #31584b;
  font-size: 1rem;
  font-weight: 800;
}

.growth-summary__stamps-text {
  color: #60796f;
  font-size: .74rem;
  font-weight: 500;
  line-height: 1.5;
}

.growth-summary__stamps-next {
  color: #3a7b5c;
  font-size: .73rem;
  font-weight: 600;
  line-height: 1.5;
}

.growth-summary__island-art {
  width: 96px;
  flex: 0 0 96px;
}

.growth-summary__stamps-more {
  color: #698d78;
  font-size: 1.3rem;
}

.growth-summary__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

.growth-summary__stat {
  display: grid;
  gap: 1px;
  min-width: 0;
  text-align: center;
}

.growth-summary__stat + .growth-summary__stat {
  border-left: 1px solid #edf0ee;
}

.growth-summary__stat-value {
  color: #425b52;
  font-size: .95rem;
  font-weight: 700;
}

.growth-summary__stat-value > span {
  font-size: .85rem;
}

.growth-summary__stat-label {
  color: var(--color-ink-soft);
  font-size: .7rem;
  font-weight: 500;
}

.growth-summary__entries {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  border-top: 1px solid #edf0ee;
  padding-top: 8px;
}

.growth-summary__entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  min-height: 36px;
  padding: 4px 2px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #526c63;
  font-size: .76rem;
  font-weight: 600;
}

.growth-summary__entry:hover {
  color: #214f41;
  background: #eff7f2;
}

.growth-summary__entry-arrow {
  color: #8da297;
}

@media (max-width: 1100px) and (min-width: 921px), (max-width: 420px) {
  .growth-summary__island-art {
    width: 68px;
    flex-basis: 68px;
  }
  .growth-summary__entry {
    font-size: .72rem;
    gap: 4px;
  }
  .growth-summary__entry-arrow {
    display: none;
  }
}

@media (max-width: 600px) {
  .growth-summary {
    padding: 16px;
  }
}

@media (max-width: 360px) {
  .growth-summary__island-art {
    width: 50px;
    flex-basis: 50px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .growth-summary button {
    transition: none;
  }
}
</style>
