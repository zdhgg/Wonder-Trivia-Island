<script setup>
import { computed } from "vue";

const props = defineProps({
  aiDraft: {
    type: Object,
    required: true
  },
  aiDirty: {
    type: Boolean,
    default: false
  },
  aiUpdatedLabel: {
    type: String,
    default: ""
  },
  aiModelMode: {
    type: Object,
    required: true
  },
  aiConnectionTestStatus: {
    type: String,
    default: "idle"
  },
  aiConnectionTestResult: {
    type: Object,
    default: null
  },
  aiConnectionTestErrorMessage: {
    type: String,
    default: ""
  },
  effectiveQuestionModelLabel: {
    type: String,
    default: ""
  },
  effectiveReviewModelLabel: {
    type: String,
    default: ""
  },
  effectiveTtsModelLabel: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["save", "test-connection", "open-model-manager"]);

const RUNTIME_STRATEGY_LABEL = "按绑定模型自动选择";

const SERVICE_CARD_META = Object.freeze([
  {
    key: "questionModel",
    eyebrow: "Question Generation",
    title: "出题服务",
    description: "题库单题草稿、导入页 AI 批量生成和定向出题都走这里。",
    type: "text"
  },
  {
    key: "reviewModel",
    eyebrow: "Review & Summary",
    title: "点评服务",
    description: "题后点评和本轮学习总结共用这条文本能力链路。",
    type: "text"
  },
  {
    key: "ttsModel",
    eyebrow: "Text to Speech",
    title: "语音服务",
    description: "把点评和总结播报成语音；音色和语速仍在学习陪练里控制。",
    type: "tts"
  }
]);

const modelLibrary = computed(() => (Array.isArray(props.aiDraft.customModelLibrary) ? props.aiDraft.customModelLibrary : []));
const connectionTestRows = computed(() => (Array.isArray(props.aiConnectionTestResult?.tests) ? props.aiConnectionTestResult.tests : []));
const connectionTestByKey = computed(() =>
  Object.fromEntries(connectionTestRows.value.map((item) => [item.key, item]))
);
const connectionTestCheckedAt = computed(() => {
  const rawValue = props.aiConnectionTestResult?.checkedAt;

  if (!rawValue) {
    return "";
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
});
const providerStatusTone = computed(() => {
  if (props.aiConnectionTestStatus === "error") {
    return "error";
  }

  if (props.aiConnectionTestStatus === "ready") {
    return props.aiConnectionTestResult?.allPassed ? "success" : "warning";
  }

  if (props.aiConnectionTestStatus === "loading") {
    return "info";
  }

  return "idle";
});
const providerStatusLabel = computed(() => {
  if (props.aiConnectionTestStatus === "loading") {
    return "正在测试";
  }

  if (props.aiConnectionTestStatus === "error") {
    return "测试失败";
  }

  if (props.aiConnectionTestStatus === "ready") {
    return props.aiConnectionTestResult?.allPassed ? "连接正常" : "部分异常";
  }

  return "尚未测试";
});
const providerStatusText = computed(() => {
  if (props.aiConnectionTestStatus === "loading") {
    return "系统正在依次验证出题、点评和语音三条链路。";
  }

  if (props.aiConnectionTestStatus === "error") {
    return props.aiConnectionTestErrorMessage || "这次测试没有成功完成。";
  }

  if (props.aiConnectionTestStatus === "ready") {
    if (props.aiConnectionTestResult?.allPassed) {
      return `最近测试通过${connectionTestCheckedAt.value ? ` · ${connectionTestCheckedAt.value}` : ""}`;
    }

    return `最近测试发现部分能力不可用${connectionTestCheckedAt.value ? ` · ${connectionTestCheckedAt.value}` : ""}`;
  }

  return "建议改动 Provider 或模型后手动测试一次。";
});
const providerLastCheckLabel = computed(() => {
  if (props.aiConnectionTestStatus === "loading") {
    return "测试中";
  }

  return connectionTestCheckedAt.value || "尚未测试";
});
const serviceCards = computed(() =>
  SERVICE_CARD_META.map((item) => {
    const selection = props.aiDraft[item.key] || {};
    const probe = connectionTestByKey.value[item.key] || null;

    return {
      ...item,
      selection,
      sourceLabel: resolveModelSourceLabel(selection, props.aiModelMode),
      modelLabel: resolveEffectiveModelLabel(item.key),
      runtimeLabel: resolveServiceRuntimeLabel(selection),
      probe
    };
  })
);

function resolveEffectiveModelLabel(serviceKey = "") {
  if (serviceKey === "questionModel") {
    return props.effectiveQuestionModelLabel;
  }

  if (serviceKey === "reviewModel") {
    return props.effectiveReviewModelLabel;
  }

  if (serviceKey === "ttsModel") {
    return props.effectiveTtsModelLabel;
  }

  return "跟随服务端默认";
}

function resolveModelSourceLabel(selection = {}, aiModelMode) {
  if (selection.mode === aiModelMode.CUSTOM) {
    return "绑定模型库";
  }

  return "跟随服务端默认";
}

function resolveCustomFieldLabel(type = "text") {
  return type === "tts" ? "选择语音模型" : "选择模型";
}

function resolveCustomModelPlaceholder(type = "text") {
  return type === "tts" ? "例如 gpt-4o-mini-tts" : "例如 gpt-5.4-mini";
}

function resolveModelLibraryItems(type = "text") {
  return modelLibrary.value.filter((item) => String(item?.type || "text") === String(type || "text"));
}

function buildModelLibraryKey(item = {}) {
  return String(item?.name || "");
}

function resolveServiceRuntimeLabel(selection = {}) {
  if (selection.mode !== props.aiModelMode.CUSTOM) {
    return "跟随服务端默认";
  }

  const customModelName = String(selection.customModel || "").trim();
  const matchedEntry = modelLibrary.value.find((item) => String(item?.name || "").trim() === customModelName);

  if (!matchedEntry) {
    return "未登记，走服务器默认";
  }

  const runtimeLabel = String(matchedEntry.providerLabel || "").trim() || String(matchedEntry.baseUrl || "").trim() || "模型自带 API Key";

  if (String(matchedEntry.type || "text") === "text") {
    const textApiMode = String(matchedEntry.textApiMode || "auto").trim();

    if (textApiMode === "chat-completions") {
      return `${runtimeLabel} · Chat Completions`;
    }

    if (textApiMode === "responses") {
      return `${runtimeLabel} · Responses`;
    }
  }

  return runtimeLabel;
}
</script>

<template>
  <section id="settings-ai" class="settings-card settings-card--stage settings-section-anchor settings-ai">
    <div class="settings-card__head">
      <div>
        <p class="settings-card__eyebrow">AI Setup</p>
        <h4 class="settings-card__title" tabindex="-1" data-settings-section-focus>AI 大模型配置</h4>
      </div>
      <div class="settings-card__meta-group">
        <span v-if="aiDirty" class="settings-card__badge">未保存</span>
        <span class="settings-card__meta">{{ aiUpdatedLabel }}</span>
      </div>
    </div>

    <p class="settings-card__note settings-ai__intro-note">
      这个页面只负责出题、点评、语音三条 AI 服务的模型分配；每条服务默认走服务器配置，只有绑定到带连接参数的模型资产时才会按该模型自带设置运行。
    </p>

    <div class="settings-ai__summary-grid">
      <article class="settings-ai__summary-card">
        <span class="settings-ai__summary-label">出题</span>
        <strong class="settings-ai__summary-value">{{ effectiveQuestionModelLabel }}</strong>
      </article>
      <article class="settings-ai__summary-card">
        <span class="settings-ai__summary-label">点评</span>
        <strong class="settings-ai__summary-value">{{ effectiveReviewModelLabel }}</strong>
      </article>
      <article class="settings-ai__summary-card">
        <span class="settings-ai__summary-label">语音</span>
        <strong class="settings-ai__summary-value">{{ effectiveTtsModelLabel }}</strong>
      </article>
    </div>

    <div class="settings-ai__action-row">
      <div class="settings-ai__action-buttons">
        <button class="btn-cartoon" type="button" @click="emit('open-model-manager')">进入模型管理</button>
        <button class="btn-cartoon btn-cartoon--mint" type="button" :disabled="aiConnectionTestStatus === 'loading'" @click="emit('test-connection')">
          {{ aiConnectionTestStatus === "loading" ? "测试中..." : "测试当前连接" }}
        </button>
      </div>
      <span class="settings-ai__action-hint">模型资产增删在独立页面处理；这里专注于三条服务各自使用哪个模型。</span>
    </div>

    <article :class="['settings-ai__provider-overview', `settings-ai__provider-overview--${providerStatusTone}`]">
      <div class="settings-ai__provider-overview-head">
        <div>
            <p class="settings-ai__model-eyebrow">Runtime Status</p>
          <h5 class="settings-ai__model-title">运行时状态</h5>
        </div>
        <span :class="['settings-ai__status-pill', `settings-ai__status-pill--${providerStatusTone}`]">{{ providerStatusLabel }}</span>
      </div>
      <p class="settings-ai__provider-overview-text">{{ providerStatusText }}</p>
      <div class="settings-ai__provider-overview-meta">
        <div class="settings-ai__provider-overview-item">
          <span class="settings-ai__provider-overview-label">最近测试</span>
          <strong class="settings-ai__provider-overview-value">{{ providerLastCheckLabel }}</strong>
        </div>
        <div class="settings-ai__provider-overview-item">
          <span class="settings-ai__provider-overview-label">默认行为</span>
          <strong class="settings-ai__provider-overview-value">{{ RUNTIME_STRATEGY_LABEL }}</strong>
        </div>
      </div>
    </article>

    <div class="settings-ai__service-grid">
      <article
        v-for="card in serviceCards"
        :key="card.key"
        :class="[
          'settings-ai__service-card',
          {
            'settings-ai__service-card--success': card.probe?.ok,
            'settings-ai__service-card--error': card.probe && !card.probe.ok
          }
        ]"
      >
        <div class="settings-ai__model-head">
          <div>
            <p class="settings-ai__model-eyebrow">{{ card.eyebrow }}</p>
            <h5 class="settings-ai__model-title">{{ card.title }}</h5>
          </div>
          <span class="settings-ai__model-effective">{{ card.modelLabel }}</span>
        </div>

        <p class="settings-ai__model-note">{{ card.description }}</p>

        <dl class="settings-ai__service-meta">
          <div class="settings-ai__service-meta-row">
            <dt>运行时来源</dt>
            <dd>{{ card.runtimeLabel }}</dd>
          </div>
          <div class="settings-ai__service-meta-row">
            <dt>模型来源</dt>
            <dd>{{ card.sourceLabel }}</dd>
          </div>
          <div class="settings-ai__service-meta-row">
            <dt>当前模型</dt>
            <dd>{{ card.modelLabel }}</dd>
          </div>
          <div class="settings-ai__service-meta-row">
            <dt>连接状态</dt>
            <dd>{{ card.probe ? (card.probe.ok ? "最近测试通过" : "最近测试失败") : "尚未测试" }}</dd>
          </div>
        </dl>

        <p v-if="card.probe" :class="['settings-ai__service-status', { 'settings-ai__service-status--error': !card.probe.ok }]">
          {{ card.probe.detail }}
        </p>

        <div class="settings-form settings-ai__service-form">
          <label class="settings-field">
            <span class="settings-field__label">模型来源</span>
            <select v-model="card.selection.mode" class="quiz-toolbar__select">
              <option :value="aiModelMode.SERVICE_DEFAULT">跟随服务端默认</option>
              <option :value="aiModelMode.CUSTOM">使用模型库中的自定义模型</option>
            </select>
          </label>

          <label v-if="card.selection.mode === aiModelMode.CUSTOM && resolveModelLibraryItems(card.type).length" class="settings-field settings-field--span">
            <span class="settings-field__label">{{ resolveCustomFieldLabel(card.type) }}</span>
            <select v-model="card.selection.customModel" class="quiz-toolbar__select">
              <option value="">请选择已录入模型</option>
              <option
                v-for="modelEntry in resolveModelLibraryItems(card.type)"
                :key="`${card.key}-select-${buildModelLibraryKey(modelEntry)}`"
                :value="modelEntry.name"
              >
                {{ modelEntry.name }}
              </option>
            </select>
          </label>

          <label v-else-if="card.selection.mode === aiModelMode.CUSTOM" class="settings-field settings-field--span">
            <span class="settings-field__label">{{ resolveCustomFieldLabel(card.type) }}</span>
            <input
              v-model.trim="card.selection.customModel"
              class="settings-input"
              type="text"
              maxlength="120"
              :placeholder="resolveCustomModelPlaceholder(card.type)"
            />
          </label>
        </div>

      </article>
    </div>

    <div v-if="aiConnectionTestStatus === 'error'" class="settings-ai__probe settings-ai__probe--error">
      <strong class="settings-ai__probe-title">连接测试失败</strong>
      <p class="settings-ai__probe-text">{{ aiConnectionTestErrorMessage }}</p>
    </div>

    <div v-else-if="aiConnectionTestStatus === 'ready' && aiConnectionTestResult" class="settings-ai__probe">
      <div class="settings-ai__probe-head">
        <div>
          <strong class="settings-ai__probe-title">
            {{ aiConnectionTestResult.allPassed ? "连接测试通过" : "连接测试完成，部分能力不可用" }}
          </strong>
          <p class="settings-ai__probe-text">
            每条服务都按当前绑定模型各自测试
            <span v-if="connectionTestCheckedAt"> · {{ connectionTestCheckedAt }}</span>
          </p>
        </div>
      </div>

      <div class="settings-ai__probe-grid">
        <article
          v-for="item in connectionTestRows"
          :key="item.key"
          :class="['settings-ai__probe-item', { 'settings-ai__probe-item--error': !item.ok }]"
        >
          <div class="settings-ai__probe-item-head">
            <span class="settings-ai__probe-item-label">{{ item.label }}</span>
            <span :class="['settings-ai__probe-item-badge', { 'settings-ai__probe-item-badge--error': !item.ok }]">
              {{ item.ok ? "通过" : "失败" }}
            </span>
          </div>
          <strong class="settings-ai__probe-item-model">{{ item.model }}</strong>
          <p class="settings-ai__probe-item-text">{{ item.detail }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style>
.settings-ai__summary-grid,
.settings-ai__service-grid {
  display: grid;
  gap: 14px;
}

.settings-ai {
  position: relative;
}

.settings-ai__intro-note {
  max-width: 78ch;
}

.settings-ai__summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.settings-ai__service-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
}

.settings-ai__summary-card,
.settings-ai__provider-overview,
.settings-ai__service-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(251, 254, 255, 0.94) 0%, rgba(247, 251, 254, 0.9) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.68),
    0 16px 26px -28px rgba(36, 50, 74, 0.32);
}

.settings-ai__summary-card {
  align-content: space-between;
  min-height: 92px;
  gap: 10px;
  background: linear-gradient(180deg, rgba(252, 254, 255, 0.96) 0%, rgba(244, 249, 255, 0.9) 100%);
}

.settings-ai__summary-label,
.settings-ai__model-eyebrow {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-ai__summary-value,
.settings-ai__model-effective {
  color: var(--color-ink, #24324a);
  font-weight: 800;
  line-height: 1.45;
  word-break: break-word;
}

.settings-ai__summary-value {
  font-size: 1rem;
}

.settings-ai__model-effective {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  max-width: min(100%, 320px);
  padding: 6px 12px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
  font-size: 0.88rem;
}

.settings-ai__action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(247, 251, 255, 0.86) 0%, rgba(255, 255, 255, 0.88) 100%);
}

.settings-ai__action-buttons {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 10px;
}

.settings-ai__action-hint,
.settings-ai__provider-overview-text,
.settings-ai__model-note,
.settings-ai__probe-text,
.settings-ai__probe-item-text,
.settings-ai__service-status {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  line-height: 1.6;
}

.settings-ai__action-hint {
  max-width: 42ch;
}

.settings-ai__provider-overview,
.settings-ai__service-card {
  align-content: start;
}

.settings-ai__provider-overview--success {
  border-color: rgba(124, 216, 184, 0.28);
  background: linear-gradient(180deg, rgba(243, 253, 248, 0.96) 0%, rgba(248, 251, 254, 0.92) 100%);
}

.settings-ai__provider-overview--warning {
  border-color: rgba(255, 186, 82, 0.22);
  background: linear-gradient(180deg, rgba(255, 250, 236, 0.96) 0%, rgba(248, 251, 254, 0.92) 100%);
}

.settings-ai__provider-overview--error {
  border-color: rgba(219, 94, 122, 0.2);
  background: linear-gradient(180deg, rgba(255, 244, 247, 0.96) 0%, rgba(248, 251, 254, 0.92) 100%);
}

.settings-ai__model-head,
.settings-ai__provider-overview-head,
.settings-ai__probe-head,
.settings-ai__probe-item-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.settings-ai__model-title {
  margin: 4px 0 0;
  color: var(--color-ink, #24324a);
  font-size: 1.04rem;
}

.settings-ai__provider-overview-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.settings-ai__provider-overview-item {
  display: grid;
  gap: 6px;
  min-height: 84px;
  padding: 12px 14px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}

.settings-ai__provider-overview-label {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.settings-ai__provider-overview-value {
  color: var(--color-ink, #24324a);
  font-size: 0.96rem;
  line-height: 1.5;
}

.settings-ai__status-pill,
.settings-ai__probe-item-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 8px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-ink, #24324a);
  font-size: 0.75rem;
  font-weight: 800;
}

.settings-ai__status-pill--success,
.settings-ai__probe-item-badge {
  border-color: rgba(124, 216, 184, 0.3);
  background: rgba(242, 253, 249, 0.94);
  color: #2c7a62;
}

.settings-ai__status-pill--warning {
  border-color: rgba(255, 186, 82, 0.22);
  background: rgba(255, 248, 230, 0.94);
  color: #8f6322;
}

.settings-ai__status-pill--error,
.settings-ai__probe-item-badge--error {
  border-color: rgba(219, 94, 122, 0.22);
  background: rgba(255, 241, 245, 0.94);
  color: #a14b61;
}

.settings-ai__service-meta {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-top: 4px;
  border-top: 1px solid rgba(36, 50, 74, 0.06);
}

.settings-ai__service-meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(36, 50, 74, 0.05);
}

.settings-ai__service-meta-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.settings-ai__service-meta-row dt,
.settings-ai__service-meta-row dd {
  margin: 0;
}

.settings-ai__service-meta-row dt {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.84rem;
  font-weight: 700;
}

.settings-ai__service-meta-row dd {
  color: var(--color-ink, #24324a);
  font-size: 0.9rem;
  font-weight: 800;
  text-align: right;
  max-width: 60%;
}

.settings-ai__service-status {
  padding: 10px 12px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 16px;
  background: rgba(247, 251, 255, 0.86);
}

.settings-ai__service-card--success {
  border-color: rgba(124, 216, 184, 0.18);
  background: linear-gradient(180deg, rgba(248, 254, 251, 0.96) 0%, rgba(248, 251, 254, 0.92) 100%);
}

.settings-ai__service-card--error {
  border-color: rgba(219, 94, 122, 0.16);
  background: linear-gradient(180deg, rgba(255, 248, 250, 0.96) 0%, rgba(248, 251, 254, 0.92) 100%);
}

.settings-ai__service-form {
  padding-top: 4px;
  border-top: 1px solid rgba(36, 50, 74, 0.06);
}

.settings-ai__service-status--error,
.settings-ai__probe--error {
  border-color: rgba(219, 94, 122, 0.2);
  background: rgba(255, 243, 246, 0.92);
}

.settings-ai__probe {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 18px;
  background: rgba(247, 251, 255, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.settings-ai__probe-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.settings-ai__probe-item {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.84);
}

.settings-ai__probe-item--error {
  border-color: rgba(219, 94, 122, 0.2);
  background: rgba(255, 247, 249, 0.96);
}

@media (max-width: 1120px) {
  .settings-ai__service-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .settings-ai__summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-ai__provider-overview-meta,
  .settings-ai__probe-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .settings-ai__summary-grid,
  .settings-ai__service-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .settings-ai__action-row,
  .settings-ai__service-meta-row {
    align-items: flex-start;
  }

  .settings-ai__action-hint,
  .settings-ai__service-meta-row dd {
    max-width: none;
  }

  .settings-ai__service-meta-row {
    display: grid;
    gap: 4px;
  }

  .settings-ai__service-meta-row dd {
    text-align: left;
  }
}
</style>
