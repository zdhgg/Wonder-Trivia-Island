import { computed, ref } from "vue";
import {
  MAX_FOOTPRINT_PHOTOS,
  describePhotoFileIssue,
  preparePhotoForUpload
} from "../../utils/growthPhotoUpload.js";
import { normalizeFootprintPhotos } from "../../utils/growthFootprints.js";

// 「给一条纪念记录放几张照片」的共用逻辑（Phase 2D-C1）。
//
// 两个地方需要它，行为要完全一致：
//   1. 「完成啦」：照片先攒在本地，跟完成请求一起提交；
//   2. 编辑旧记录：足迹已经存在，照片加一张传一张、删一张立刻删。
//
// 所以这里只做「本地这一组照片」的管理：攒着、传出去、删掉、报错。
// 什么时候真正发给服务端由调用方决定（attach 是自己发的，其他是随请求走的）。
export function useFootprintPhotos({ maxPhotos = MAX_FOOTPRINT_PHOTOS } = {}) {
  const photos = ref([]);
  // 新选的、还没上传的照片：data URL 列表（随创建 / 完成请求一起提交）。
  const pendingDataUrls = ref([]);
  const photoError = ref("");
  const isPhotoBusy = ref(false);

  const canAddMore = computed(() => photos.value.length + pendingDataUrls.value.length < maxPhotos);
  const totalCount = computed(() => photos.value.length + pendingDataUrls.value.length);
  const hasPhotos = computed(() => totalCount.value > 0);

  function reset(initialPhotos = []) {
    photos.value = normalizeFootprintPhotos(initialPhotos);
    pendingDataUrls.value = [];
    photoError.value = "";
    isPhotoBusy.value = false;
  }

  function applyServerPhotos(nextPhotos) {
    photos.value = normalizeFootprintPhotos(nextPhotos);
  }

  function clearError() {
    photoError.value = "";
  }

  // 把用户选的几张文件压好放进「待提交」列表。
  // 任何一张不合格就整批不加入（并给出第一句原因），避免出现「一半进去了」的状态。
  async function addFiles(fileList) {
    const files = Array.from(fileList ?? []);

    if (files.length === 0) {
      return false;
    }

    photoError.value = "";

    const issue = describePhotoFileIssue(files[0], { currentCount: totalCount.value, maxCount: maxPhotos });

    if (issue) {
      photoError.value = issue;
      return false;
    }

    if (totalCount.value + files.length > maxPhotos) {
      photoError.value = `一条记录最多放 ${maxPhotos} 张照片。`;
      return false;
    }

    isPhotoBusy.value = true;

    try {
      const prepared = [];

      for (const file of files) {
        prepared.push(await preparePhotoForUpload(file));
      }

      pendingDataUrls.value = [...pendingDataUrls.value, ...prepared.map((photo) => photo.dataUrl)];
      return true;
    } catch (error) {
      photoError.value = error?.message || "这几张照片没能加上。";
      return false;
    } finally {
      isPhotoBusy.value = false;
    }
  }

  // 记录还没有 id（正在新增）时，照片只能先攒着。
  function detachPendingPhoto(index) {
    pendingDataUrls.value = pendingDataUrls.value.filter((_, itemIndex) => itemIndex !== index);
  }

  // 记录已经有 id（编辑旧记录）时，照片立刻上传。
  async function attachPhoto(dataUrl, uploadPhoto) {
    isPhotoBusy.value = true;
    photoError.value = "";

    try {
      const photo = await uploadPhoto(dataUrl);

      photos.value = [...photos.value, ...normalizeFootprintPhotos([photo])];
      return true;
    } catch (error) {
      photoError.value = error?.message || "这张照片没能加上。";
      return false;
    } finally {
      isPhotoBusy.value = false;
    }
  }

  async function removePhoto(photoId, deletePhoto) {
    isPhotoBusy.value = true;
    photoError.value = "";

    try {
      await deletePhoto(photoId);
      photos.value = photos.value.filter((photo) => photo.id !== photoId);
      return true;
    } catch (error) {
      photoError.value = error?.message || "这张照片没能删掉。";
      return false;
    } finally {
      isPhotoBusy.value = false;
    }
  }

  // 清掉本地新增的、还没上传的照片（保存成功后调用）。
  function clearPending() {
    pendingDataUrls.value = [];
  }

  return {
    photos,
    pendingDataUrls,
    photoError,
    isPhotoBusy,
    canAddMore,
    totalCount,
    hasPhotos,
    maxPhotos,
    reset,
    applyServerPhotos,
    clearError,
    addFiles,
    detachPendingPhoto,
    attachPhoto,
    removePhoto,
    clearPending
  };
}
