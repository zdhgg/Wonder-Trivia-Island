import { computed, ref } from "vue";
import {
  createFootprint as createFootprintRequest,
  deleteFootprint as deleteFootprintRequest,
  deleteFootprintPhoto as deleteFootprintPhotoRequest,
  fetchFootprints,
  updateFootprint as updateFootprintRequest,
  uploadFootprintPhoto as uploadFootprintPhotoRequest
} from "../../services/growthFootprintsApi.js";
import {
  buildFootprintSummary,
  groupFootprintsByMonth,
  normalizeFootprints,
  sortFootprintsDesc,
  validateFootprintDraft
} from "../../utils/growthFootprints.js";

// 成长纪念册的页面状态（Phase 2D-A2）。
//
// 只有一件事需要记住：**服务端是唯一事实来源**。
// 增删改成功后一律用服务端返回的记录重算本地列表——绝不本地追加/本地改写，
// 请求失败时列表保持原样，只把错误提示出来。
//
// options.api 只为单测注入；生产调用不传，直接用 services/growthFootprintsApi。
export function useGrowthBook(options = {}) {
  const api = {
    fetchFootprints,
    createFootprint: createFootprintRequest,
    updateFootprint: updateFootprintRequest,
    deleteFootprint: deleteFootprintRequest,
    uploadFootprintPhoto: uploadFootprintPhotoRequest,
    deleteFootprintPhoto: deleteFootprintPhotoRequest,
    ...(options.api || {})
  };

  const footprints = ref([]);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const isDeleting = ref(false);
  const errorMessage = ref("");
  const hasLoaded = ref(false);
  const formErrorMessages = ref([]);

  const monthGroups = computed(() => groupFootprintsByMonth(footprints.value));
  const summary = computed(() => buildFootprintSummary(footprints.value));
  const isEmpty = computed(() => hasLoaded.value && !isLoading.value && monthGroups.value.length === 0);

  // 服务端已按 occurred_on DESC, id DESC 返回，这里再排一次只是为了本地合并后仍然稳定。
  function applyFootprints(list) {
    footprints.value = sortFootprintsDesc(normalizeFootprints(list));
  }

  function ensureFootprint(footprint) {
    if (!footprint || footprint.id <= 0) {
      throw new Error("成长纪念册格式不正确。");
    }

    return footprint;
  }

  async function load(signal) {
    isLoading.value = true;
    errorMessage.value = "";

    try {
      applyFootprints(await api.fetchFootprints(signal));
      return true;
    } catch (error) {
      if (error?.name === "AbortError") {
        return false;
      }

      errorMessage.value = error?.message || "加载成长纪念册失败。";
      return false;
    } finally {
      isLoading.value = false;
      hasLoaded.value = true;
    }
  }

  // 新增与编辑共用一套校验：都走 validateFootprintDraft，
  // 未来日期 / 缺标题 / 长度超限这些规则只在前端维护一份。
  function validateDraft(draft, referenceDate) {
    const result = validateFootprintDraft(draft, { referenceDate });

    formErrorMessages.value = result.isValid
      ? []
      : result.issues.map((issue) => issue.message);

    return result;
  }

  // 新增时可以同时带上刚选的照片（服务端在一个 savepoint 里写记录 + 照片）。
  // 校验只认文字字段，photos 不参与，所以这里直接透传。
  async function createFootprint(draft, { referenceDate } = {}) {
    const result = validateDraft(draft, referenceDate);

    if (!result.isValid) {
      return false;
    }

    isSaving.value = true;
    errorMessage.value = "";

    try {
      const createdFootprint = ensureFootprint(
        await api.createFootprint({
          ...result.value,
          ...(Array.isArray(draft?.photos) && draft.photos.length > 0 ? { photos: draft.photos } : {})
        })
      );
      const withoutCreated = footprints.value.filter((item) => item.id !== createdFootprint.id);

      applyFootprints([...withoutCreated, createdFootprint]);
      formErrorMessages.value = [];
      return true;
    } catch (error) {
      errorMessage.value = error?.message || "保存这条记录失败。";
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  // 给已有记录加 / 删一张照片：单独的小请求，不走整条记录的保存流程。
  async function uploadFootprintPhoto(footprintId, dataUrl) {
    return api.uploadFootprintPhoto(footprintId, dataUrl);
  }

  async function deleteFootprintPhoto(footprintId, photoId) {
    return api.deleteFootprintPhoto(footprintId, photoId);
  }

  async function updateFootprint(footprintId, draft, { referenceDate } = {}) {
    const result = validateDraft(draft, referenceDate);

    if (!result.isValid) {
      return false;
    }

    isSaving.value = true;
    errorMessage.value = "";

    try {
      const updatedFootprint = ensureFootprint(await api.updateFootprint(footprintId, result.value));
      const withoutUpdated = footprints.value.filter((item) => item.id !== updatedFootprint.id);

      applyFootprints([...withoutUpdated, updatedFootprint]);
      formErrorMessages.value = [];
      return true;
    } catch (error) {
      errorMessage.value = error?.message || "修改这条记录失败。";
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteFootprint(footprintId) {
    isDeleting.value = true;
    errorMessage.value = "";

    try {
      await api.deleteFootprint(footprintId);
      footprints.value = footprints.value.filter((item) => item.id !== footprintId);
      return true;
    } catch (error) {
      errorMessage.value = error?.message || "删除这条记录失败。";
      return false;
    } finally {
      isDeleting.value = false;
    }
  }

  function clearFormErrors() {
    formErrorMessages.value = [];
  }

  function clearErrorMessage() {
    errorMessage.value = "";
  }

  return {
    footprints,
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
    createFootprint,
    updateFootprint,
    deleteFootprint,
    uploadFootprintPhoto,
    deleteFootprintPhoto,
    validateDraft,
    clearFormErrors,
    clearErrorMessage
  };
}
