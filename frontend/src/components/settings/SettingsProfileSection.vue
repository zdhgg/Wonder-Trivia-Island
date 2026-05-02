<script setup>
import { computed } from "vue";

const props = defineProps({
  profileDraft: {
    type: Object,
    required: true
  },
  profileDirty: {
    type: Boolean,
    default: false
  },
  profileUpdatedLabel: {
    type: String,
    default: ""
  },
  genderOptions: {
    type: Array,
    default: () => []
  },
  gradeOptions: {
    type: Array,
    default: () => []
  },
  semesterOptions: {
    type: Array,
    default: () => []
  },
  shouldApplyProfileDefaults: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(["update:should-apply-profile-defaults"]);

const applyToHome = computed({
  get: () => props.shouldApplyProfileDefaults,
  set: (value) => emit("update:should-apply-profile-defaults", value)
});
</script>

<template>
  <section id="settings-profile" class="settings-card settings-card--stage settings-section-anchor">
    <div class="settings-card__head">
      <div>
        <p class="settings-card__eyebrow">Profile</p>
        <h4 class="settings-card__title" tabindex="-1" data-settings-section-focus>账户管理</h4>
      </div>
      <div class="settings-card__meta-group">
        <span v-if="profileDirty" class="settings-card__badge">未保存</span>
        <span class="settings-card__meta">{{ profileUpdatedLabel }}</span>
      </div>
    </div>

    <p class="settings-card__note">当前设备只维护一个学习档案，适合孩子本人或一台设备一位学习者的场景。</p>

    <div class="settings-form">
      <label class="settings-field">
        <span class="settings-field__label">昵称</span>
        <input v-model.trim="profileDraft.displayName" class="settings-input" type="text" maxlength="20" />
      </label>

      <label class="settings-field">
        <span class="settings-field__label">性别</span>
        <select v-model="profileDraft.gender" class="quiz-toolbar__select">
          <option v-for="gender in genderOptions" :key="gender" :value="gender">
            {{ gender }}
          </option>
        </select>
      </label>

      <label class="settings-field">
        <span class="settings-field__label">年级</span>
        <select v-model="profileDraft.grade" class="quiz-toolbar__select">
          <option v-for="grade in gradeOptions" :key="grade" :value="grade">
            {{ grade }}
          </option>
        </select>
      </label>

      <label class="settings-field">
        <span class="settings-field__label">学期</span>
        <select v-model="profileDraft.semester" class="quiz-toolbar__select">
          <option v-for="semester in semesterOptions" :key="semester" :value="semester">
            {{ semester }}
          </option>
        </select>
      </label>
    </div>

    <label class="settings-checkbox">
      <input v-model="applyToHome" type="checkbox" />
      <span>保存后同步为首页默认年级与学期</span>
    </label>
  </section>
</template>
