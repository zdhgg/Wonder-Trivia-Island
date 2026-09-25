import { computed, ref } from "vue";
import {
  createMilestone as createMilestoneRequest,
  deleteMilestone as deleteMilestoneRequest,
  deleteMilestonePhoto as deleteMilestonePhotoRequest,
  fetchMilestones,
  updateMilestone as updateMilestoneRequest,
  uploadMilestonePhoto as uploadMilestonePhotoRequest
} from "../../services/growthMilestonesApi.js";
import {
  buildMilestoneSummary,
  groupMilestonesByMonth,
  normalizeMilestones,
  sortMilestonesDesc,
  validateMilestoneDraft
} from "../../utils/growthMilestones.js";

// 「她的成长」的页面状态（Phase 2D-D1）。
//
// 与 useGrowthBook 同一个规矩：服务端是唯一事实来源。
// 增删改成功后一律用服务端返回的记录重算列表，请求失败时列表保持原样。
export function useGrowthMilestones(options = {}) {
  const api = {
    fetchMilestones,
    createMilestone: createMilestoneRequest,
    updateMilestone: updateMilestoneRequest,
    deleteMilestone: deleteMilestoneRequest,
    uploadMilestonePhoto: uploadMilestonePhotoRequest,
    deleteMilestonePhoto: deleteMilestonePhotoRequest,
    ...(options.api || {})
  };

  const milestones = ref([]);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const isDeleting = ref(false);
  const errorMessage = ref("");
  const hasLoaded = ref(false);
  const formErrorMessages = ref([]);

  const monthGroups = computed(() => groupMilestonesByMonth(milestones.value));
  const summary = computed(() => buildMilestoneSummary(milestones.value));
  const isEmpty = computed(() => hasLoaded.value && !isLoading.value && monthGroups.value.length === 0);

  function applyMilestones(list) {
    milestones.value = sortMilestonesDesc(normalizeMilestones(list));
  }

  function ensureMilestone(milestone) {
    if (!milestone || milestone.id <= 0) {
      throw new Error("她的成长记录格式不正确。");
    }

    return milestone;
  }

  async function load(signal) {
    isLoading.value = true;
    errorMessage.value = "";

    try {
      applyMilestones(await api.fetchMilestones(signal));
      return true;
    } catch (error) {
      if (error?.name === "AbortError") {
        return false;
      }

      errorMessage.value = error?.message || "加载她的成长记录失败。";
      return false;
    } finally {
      isLoading.value = false;
      hasLoaded.value = true;
    }
  }

  // 新增与编辑共用同一套校验：都走 validateMilestoneDraft。
  function validateDraft(draft, referenceDate) {
    const result = validateMilestoneDraft(draft, { referenceDate });

    formErrorMessages.value = result.isValid ? [] : result.issues.map((issue) => issue.message);

    return result;
  }

  async function createMilestone(draft, { referenceDate } = {}) {
    const result = validateDraft(draft, referenceDate);

    if (!result.isValid) {
      return false;
    }

    isSaving.value = true;
    errorMessage.value = "";

    try {
      const created = ensureMilestone(
        await api.createMilestone({
          ...result.value,
          ...(Array.isArray(draft?.photos) && draft.photos.length > 0 ? { photos: draft.photos } : {})
        })
      );
      const withoutCreated = milestones.value.filter((item) => item.id !== created.id);

      applyMilestones([...withoutCreated, created]);
      formErrorMessages.value = [];
      return true;
    } catch (error) {
      errorMessage.value = error?.message || "保存这条成长记录失败。";
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateMilestone(milestoneId, draft, { referenceDate } = {}) {
    const result = validateDraft(draft, referenceDate);

    if (!result.isValid) {
      return false;
    }

    isSaving.value = true;
    errorMessage.value = "";

    try {
      const updated = ensureMilestone(await api.updateMilestone(milestoneId, result.value));
      const withoutUpdated = milestones.value.filter((item) => item.id !== updated.id);

      applyMilestones([...withoutUpdated, updated]);
      formErrorMessages.value = [];
      return true;
    } catch (error) {
      errorMessage.value = error?.message || "修改这条成长记录失败。";
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteMilestone(milestoneId) {
    isDeleting.value = true;
    errorMessage.value = "";

    try {
      await api.deleteMilestone(milestoneId);
      milestones.value = milestones.value.filter((item) => item.id !== milestoneId);
      return true;
    } catch (error) {
      errorMessage.value = error?.message || "删除这条成长记录失败。";
      return false;
    } finally {
      isDeleting.value = false;
    }
  }

  // 给已有记录加 / 删一张照片：单独的小请求，不走整条记录的保存流程。
  async function uploadMilestonePhoto(milestoneId, dataUrl) {
    return api.uploadMilestonePhoto(milestoneId, dataUrl);
  }

  async function deleteMilestonePhoto(milestoneId, photoId) {
    return api.deleteMilestonePhoto(milestoneId, photoId);
  }

  function clearFormErrors() {
    formErrorMessages.value = [];
  }

  function clearErrorMessage() {
    errorMessage.value = "";
  }

  return {
    milestones,
    monthGroups,
    summary,
    isEmpty,
    hasLoaded,
    isLoading,
    isSaving,
    isDeleting,
    errorMessage,
    formErrorMessages,
    load,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    uploadMilestonePhoto,
    deleteMilestonePhoto,
    validateDraft,
    clearFormErrors,
    clearErrorMessage
  };
}
