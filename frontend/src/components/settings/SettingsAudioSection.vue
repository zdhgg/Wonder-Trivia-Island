<script setup>
import AudioSettingsPanel from "../AudioSettingsPanel.vue";
</script>

<template>
  <section id="settings-audio" class="settings-card settings-card--stage settings-section-anchor">
    <div class="settings-card__head">
      <div>
        <p class="settings-card__eyebrow">Audio</p>
        <h4 class="settings-card__title" tabindex="-1" data-settings-section-focus>音量设置</h4>
      </div>
    </div>

    <p class="settings-card__note">声音设置会即时生效，背景音乐、答题音效和音量会自动记住，不需要额外保存。</p>

    <AudioSettingsPanel embedded />
  </section>
</template>
