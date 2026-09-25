import { computed, ref } from "vue";
import {
  completeGrowthPlan,
  createGrowthPlan,
  deleteGrowthPlan,
  fetchGrowthPlans
} from "../../services/growthPlansApi.js";
import { validateFootprintDraft } from "../../utils/growthFootprints.js";

// 「下次我们一起做什么」的页面状态（Phase 2D-B1）。
//
// 和 useGrowthBook 一样的规矩：服务端是唯一事实来源。
// 但这里多一条更重要的：**完成 = 服务端在事务里写足迹 + 删想做**，
// 所以本地只在请求成功后移除那一条，失败时清单保持原样（不会出现「本地没了、服务端还在」）。
export function useGrowthPlans(options = {}) {
  const api = {
    fetchGrowthPlans,
    createGrowthPlan,
    deleteGrowthPlan,
    completeGrowthPlan,
    ...(options.api || {})
  };

  const plans = ref([]);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const isCompleting = ref(false);
  const errorMessage = ref("");
  const hasLoaded = ref(false);
  const completionIssues = ref([]);

  const isEmpty = computed(() => hasLoaded.value && !isLoading.value && plans.value.length === 0);
  const planCount = computed(() => plans.value.length);
  const plannedSourceIds = computed(() =>
    plans.value.map((plan) => String(plan.sourceId ?? "").trim()).filter(Boolean)
  );

  async function load(signal) {
    isLoading.value = true;
    errorMessage.value = "";

    try {
      plans.value = await api.fetchGrowthPlans(signal);
      return true;
    } catch (error) {
      if (error?.name === "AbortError") {
        return false;
      }

      errorMessage.value = error?.message || "加载想一起做的清单失败。";
      return false;
    } finally {
      isLoading.value = false;
      hasLoaded.value = true;
    }
  }

  async function addPlan(draft = {}) {
    isSaving.value = true;
    errorMessage.value = "";

    try {
      const plan = await api.createGrowthPlan(draft);

      if (!plan || plan.id <= 0) {
        throw new Error("想一起做的清单格式不正确。");
      }

      // 服务端对同一条推荐是幂等的（重复加入返回已存在的那条），这里按 id 去重即可。
      const withoutDuplicated = plans.value.filter((item) => item.id !== plan.id);

      plans.value = [plan, ...withoutDuplicated];
      return true;
    } catch (error) {
      errorMessage.value = error?.message || "加入想一起做失败。";
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function removePlan(planId) {
    isSaving.value = true;
    errorMessage.value = "";

    try {
      await api.deleteGrowthPlan(planId);
      plans.value = plans.value.filter((plan) => plan.id !== planId);
      return true;
    } catch (error) {
      errorMessage.value = error?.message || "从想一起做里拿掉这件事失败。";
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  // 完成时补的日期 / 类别 / 标签 / 一句记录，用的仍是纪念册那一套校验纯函数，
  // 不在这里另写一份规则。
  function validateCompletionDraft(draft, referenceDate) {
    const result = validateFootprintDraft(draft, { referenceDate });

    completionIssues.value = result.isValid ? [] : result.issues.map((issue) => issue.message);
    return result;
  }

  async function completePlan(plan, draft = {}, { referenceDate } = {}) {
    if (!plan || !(plan.id > 0)) {
      return false;
    }

    const result = validateCompletionDraft(
      {
        occurredOn: draft.occurredOn,
        category: draft.category ?? plan.category,
        title: plan.title,
        note: draft.note ?? "",
        tags: draft.tags ?? []
      },
      referenceDate
    );

    if (!result.isValid) {
      return false;
    }

    isCompleting.value = true;
    errorMessage.value = "";

    try {
      // 照片随完成请求一起提交：服务端在同一个 savepoint 里写足迹 + 照片 + 删想做，
      // 所以不存在「记录进去了、照片没存上」的中间状态。
      const footprint = await api.completeGrowthPlan(plan.id, {
        occurredOn: result.value.occurredOn,
        category: result.value.category,
        tags: result.value.tags,
        note: result.value.note,
        photos: Array.isArray(draft.photos) ? draft.photos : []
      });

      plans.value = plans.value.filter((item) => item.id !== plan.id);
      completionIssues.value = [];
      return footprint;
    } catch (error) {
      errorMessage.value = error?.message || "把这件事收进纪念册失败。";
      return false;
    } finally {
      isCompleting.value = false;
    }
  }

  function clearCompletionIssues() {
    completionIssues.value = [];
  }

  function clearErrorMessage() {
    errorMessage.value = "";
  }

  return {
    plans,
    isEmpty,
    planCount,
    plannedSourceIds,
    hasLoaded,
    isLoading,
    isSaving,
    isCompleting,
    errorMessage,
    completionIssues,
    load,
    addPlan,
    removePlan,
    completePlan,
    validateCompletionDraft,
    clearCompletionIssues,
    clearErrorMessage
  };
}
