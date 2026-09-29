import { defineStore } from "pinia";

export const SETTINGS_STORAGE_KEY = "wonder-trivia-island.settings.center";
export const SETTINGS_LOG_LIMIT = 60;

export const PROFILE_GENDER_OPTIONS = Object.freeze(["未设置", "女孩", "男孩"]);

export const AUTO_ADVANCE_DELAY_OPTIONS = Object.freeze([
  { label: "1.5 秒", value: 1500 },
  { label: "2.5 秒", value: 2500 },
  { label: "3.5 秒", value: 3500 }
]);

export const DEFAULT_PROFILE = Object.freeze({
  displayName: "小岛同学",
  gender: "未设置",
  grade: "三年级",
  semester: "上册",
  updatedAt: ""
});

const DEFAULT_COACHING_PREFERENCES = Object.freeze({
  autoAdvanceOnCorrect: false,
  autoAdvanceDelayMs: 1500,
  updatedAt: ""
});

function normalizeText(value, fallback = "", maxLength = 60) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, maxLength);
}

function normalizeProfile(savedProfile = {}) {
  const gender = PROFILE_GENDER_OPTIONS.includes(String(savedProfile.gender || "").trim())
    ? String(savedProfile.gender).trim()
    : DEFAULT_PROFILE.gender;
  const grade = normalizeText(savedProfile.grade, DEFAULT_PROFILE.grade, 20);
  const semester = ["上册", "下册"].includes(String(savedProfile.semester || "").trim())
    ? String(savedProfile.semester).trim()
    : DEFAULT_PROFILE.semester;

  return {
    displayName: normalizeText(savedProfile.displayName, DEFAULT_PROFILE.displayName, 20),
    gender,
    grade,
    semester,
    updatedAt: normalizeText(savedProfile.updatedAt, "", 40)
  };
}

function normalizeCoachingPreferences(savedPreferences = {}) {
  const autoAdvanceDelayMs = AUTO_ADVANCE_DELAY_OPTIONS.some(
    (option) => option.value === Number(savedPreferences.autoAdvanceDelayMs)
  )
    ? Number(savedPreferences.autoAdvanceDelayMs)
    : DEFAULT_COACHING_PREFERENCES.autoAdvanceDelayMs;

  return {
    autoAdvanceOnCorrect:
      typeof savedPreferences.autoAdvanceOnCorrect === "boolean"
        ? savedPreferences.autoAdvanceOnCorrect
        : DEFAULT_COACHING_PREFERENCES.autoAdvanceOnCorrect,
    autoAdvanceDelayMs,
    updatedAt: normalizeText(savedPreferences.updatedAt, "", 40)
  };
}

function normalizeLogEntry(entry = {}) {
  return {
    id: normalizeText(entry.id, `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, 40),
    scope: normalizeText(entry.scope, "system", 24),
    title: normalizeText(entry.title, "设置已更新", 60),
    detail: normalizeText(entry.detail, "", 120),
    createdAt: normalizeText(entry.createdAt, new Date().toISOString(), 40)
  };
}

function normalizeActivityLogs(entries = []) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => normalizeLogEntry(entry))
    .slice(0, SETTINGS_LOG_LIMIT);
}

function buildPersistedSnapshot(state) {
  return {
    profile: normalizeProfile(state.profile),
    coachingPreferences: normalizeCoachingPreferences(state.coachingPreferences),
    activityLogs: normalizeActivityLogs(state.activityLogs)
  };
}

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    profile: { ...DEFAULT_PROFILE },
    coachingPreferences: { ...DEFAULT_COACHING_PREFERENCES },
    activityLogs: [],
    hasHydrated: false
  }),

  getters: {
    persistedSnapshot(state) {
      return buildPersistedSnapshot(state);
    },

    backupSnapshot(state) {
      return buildPersistedSnapshot(state);
    }
  },

  actions: {
    hydrate() {
      if (this.hasHydrated) {
        return;
      }

      if (typeof window !== "undefined") {
        try {
          const savedSnapshot = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

          if (savedSnapshot) {
            const parsedSnapshot = JSON.parse(savedSnapshot);
            this.profile = normalizeProfile(parsedSnapshot.profile);
            this.coachingPreferences = normalizeCoachingPreferences(parsedSnapshot.coachingPreferences);
            this.activityLogs = normalizeActivityLogs(parsedSnapshot.activityLogs);
          }
        } catch {
          this.profile = { ...DEFAULT_PROFILE };
          this.coachingPreferences = { ...DEFAULT_COACHING_PREFERENCES };
          this.activityLogs = [];
        }
      }

      this.hasHydrated = true;
    },

    persist() {
      if (typeof window === "undefined") {
        return;
      }

      try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.persistedSnapshot));
      } catch {
        // Ignore storage write failures and keep runtime state usable.
      }
    },

    appendActivityLog(entry = {}) {
      this.activityLogs = [normalizeLogEntry(entry), ...normalizeActivityLogs(this.activityLogs)].slice(0, SETTINGS_LOG_LIMIT);
      this.persist();
    },

    clearActivityLogs() {
      this.activityLogs = [];
      this.persist();
    },

    saveProfile(nextProfile = {}) {
      this.profile = normalizeProfile({
        ...this.profile,
        ...nextProfile,
        updatedAt: new Date().toISOString()
      });
      this.persist();
      this.appendActivityLog({
        scope: "profile",
        title: "学习档案已保存",
        detail: `${this.profile.displayName} · ${this.profile.grade} · ${this.profile.semester}`
      });
      return this.profile;
    },

    saveCoachingPreferences(nextPreferences = {}) {
      this.coachingPreferences = normalizeCoachingPreferences({
        ...this.coachingPreferences,
        ...nextPreferences,
        updatedAt: new Date().toISOString()
      });
      this.persist();
      this.appendActivityLog({
        scope: "coach",
        title: "学习陪练偏好已更新",
        detail: [
          this.coachingPreferences.autoAdvanceOnCorrect ? "答对自动继续" : "答对停留看反馈",
          `${this.coachingPreferences.autoAdvanceDelayMs}ms`
        ].join(" · ")
      });
      return this.coachingPreferences;
    },

    importSnapshot(snapshot = {}) {
      this.profile = normalizeProfile(snapshot.profile);
      this.coachingPreferences = normalizeCoachingPreferences(snapshot.coachingPreferences);
      this.activityLogs = normalizeActivityLogs(snapshot.activityLogs);
      this.persist();
    }
  }
});
