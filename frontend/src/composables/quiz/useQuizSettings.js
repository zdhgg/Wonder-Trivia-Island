import { computed, ref } from "vue";

export function createQuizSettings({
  SUBJECT_OPTIONS,
  GRADE_OPTIONS,
  SEMESTER_OPTIONS,
  QUESTION_COUNT_OPTIONS,
  DIFFICULTY_OPTIONS,
  TIME_LIMIT_OPTIONS,
  SCORE_OPTIONS,
  QUIZ_SETTINGS_STORAGE_KEY,
  DEFAULT_QUIZ_SETTINGS
}) {
  const SEMESTER_ENABLED_GRADES = Object.freeze(GRADE_OPTIONS.filter((grade) => grade !== "全部年级"));

  function normalizeSelectValue(rawValue, allowedValues, fallback) {
    const normalizedValue = String(rawValue ?? "").trim();
    return allowedValues.includes(normalizedValue) ? normalizedValue : fallback;
  }

  function supportsSemesterSelection(grade) {
    return SEMESTER_ENABLED_GRADES.includes(String(grade || "").trim());
  }

  function normalizeQuizSettings(savedSettings = {}) {
    const selectedSubject = normalizeSelectValue(
      savedSettings.selectedSubject,
      SUBJECT_OPTIONS,
      DEFAULT_QUIZ_SETTINGS.selectedSubject
    );
    const selectedGrade = normalizeSelectValue(
      savedSettings.selectedGrade,
      GRADE_OPTIONS,
      DEFAULT_QUIZ_SETTINGS.selectedGrade
    );
    const selectedSemester = supportsSemesterSelection(selectedGrade)
      ? normalizeSelectValue(savedSettings.selectedSemester, SEMESTER_OPTIONS, DEFAULT_QUIZ_SETTINGS.selectedSemester)
      : DEFAULT_QUIZ_SETTINGS.selectedSemester;

    return {
      selectedSubject,
      selectedGrade,
      selectedSemester,
      selectedQuestionCount: normalizeSelectValue(
        savedSettings.selectedQuestionCount,
        QUESTION_COUNT_OPTIONS.map((option) => option.value),
        DEFAULT_QUIZ_SETTINGS.selectedQuestionCount
      ),
      selectedDifficulty: normalizeSelectValue(
        savedSettings.selectedDifficulty,
        DIFFICULTY_OPTIONS.map((option) => option.value),
        DEFAULT_QUIZ_SETTINGS.selectedDifficulty
      ),
      selectedTimeLimitSeconds: normalizeSelectValue(
        savedSettings.selectedTimeLimitSeconds,
        TIME_LIMIT_OPTIONS.map((option) => option.value),
        DEFAULT_QUIZ_SETTINGS.selectedTimeLimitSeconds
      ),
      selectedPointsPerCorrect: normalizeSelectValue(
        savedSettings.selectedPointsPerCorrect,
        SCORE_OPTIONS.map((option) => option.value),
        DEFAULT_QUIZ_SETTINGS.selectedPointsPerCorrect
      )
    };
  }

  function getDifficultyLabel(value) {
    return DIFFICULTY_OPTIONS.find((option) => option.value === String(value ?? "").trim())?.label || "全部难度";
  }

  const selectedSubject = ref(DEFAULT_QUIZ_SETTINGS.selectedSubject);
  const selectedGrade = ref(DEFAULT_QUIZ_SETTINGS.selectedGrade);
  const selectedSemester = ref(DEFAULT_QUIZ_SETTINGS.selectedSemester);
  const selectedQuestionCount = ref(DEFAULT_QUIZ_SETTINGS.selectedQuestionCount);
  const selectedDifficulty = ref(DEFAULT_QUIZ_SETTINGS.selectedDifficulty);
  const selectedTimeLimitSeconds = ref(DEFAULT_QUIZ_SETTINGS.selectedTimeLimitSeconds);
  const selectedPointsPerCorrect = ref(DEFAULT_QUIZ_SETTINGS.selectedPointsPerCorrect);

  const draftSelectedSubject = ref(DEFAULT_QUIZ_SETTINGS.selectedSubject);
  const draftSelectedGrade = ref(DEFAULT_QUIZ_SETTINGS.selectedGrade);
  const draftSelectedSemester = ref(DEFAULT_QUIZ_SETTINGS.selectedSemester);
  const draftSelectedQuestionCount = ref(DEFAULT_QUIZ_SETTINGS.selectedQuestionCount);
  const draftSelectedDifficulty = ref(DEFAULT_QUIZ_SETTINGS.selectedDifficulty);
  const draftSelectedTimeLimitSeconds = ref(DEFAULT_QUIZ_SETTINGS.selectedTimeLimitSeconds);
  const draftSelectedPointsPerCorrect = ref(DEFAULT_QUIZ_SETTINGS.selectedPointsPerCorrect);

  const selectedSubjectValue = computed(() => (selectedSubject.value === "全部学科" ? "" : selectedSubject.value));
  const selectedGradeValue = computed(() => (selectedGrade.value === "全部年级" ? "" : selectedGrade.value));
  const shouldShowSemesterFilter = computed(() => supportsSemesterSelection(selectedGrade.value));
  const selectedQuestionCountValue = computed(() => Number.parseInt(selectedQuestionCount.value, 10) || 3);
  const selectedDifficultyValue = computed(() => String(selectedDifficulty.value || "").trim());
  const selectedDifficultyLabel = computed(() => getDifficultyLabel(selectedDifficulty.value));
  const selectedTimeLimitSecondsValue = computed(() => Number.parseInt(selectedTimeLimitSeconds.value, 10) || 0);
  const selectedPointsPerCorrectValue = computed(() => Number.parseInt(selectedPointsPerCorrect.value, 10) || 10);
  const draftShouldShowSemesterFilter = computed(() => supportsSemesterSelection(draftSelectedGrade.value));

  function applyQuizSettings(settings) {
    const normalizedSettings = normalizeQuizSettings(settings);

    selectedSubject.value = normalizedSettings.selectedSubject;
    selectedGrade.value = normalizedSettings.selectedGrade;
    selectedSemester.value = normalizedSettings.selectedSemester;
    selectedQuestionCount.value = normalizedSettings.selectedQuestionCount;
    selectedDifficulty.value = normalizedSettings.selectedDifficulty;
    selectedTimeLimitSeconds.value = normalizedSettings.selectedTimeLimitSeconds;
    selectedPointsPerCorrect.value = normalizedSettings.selectedPointsPerCorrect;
  }

  function syncDraftQuizSettings() {
    draftSelectedSubject.value = selectedSubject.value;
    draftSelectedGrade.value = selectedGrade.value;
    draftSelectedSemester.value = selectedSemester.value;
    draftSelectedQuestionCount.value = selectedQuestionCount.value;
    draftSelectedDifficulty.value = selectedDifficulty.value;
    draftSelectedTimeLimitSeconds.value = selectedTimeLimitSeconds.value;
    draftSelectedPointsPerCorrect.value = selectedPointsPerCorrect.value;
  }

  function hydrateQuizSettings() {
    if (typeof window === "undefined") {
      applyQuizSettings(DEFAULT_QUIZ_SETTINGS);
      syncDraftQuizSettings();
      return;
    }

    try {
      const savedSettings = window.localStorage.getItem(QUIZ_SETTINGS_STORAGE_KEY);

      if (!savedSettings) {
        applyQuizSettings(DEFAULT_QUIZ_SETTINGS);
        syncDraftQuizSettings();
        return;
      }

      applyQuizSettings(JSON.parse(savedSettings));
      syncDraftQuizSettings();
    } catch {
      applyQuizSettings(DEFAULT_QUIZ_SETTINGS);
      syncDraftQuizSettings();
    }
  }

  function persistQuizSettings() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        QUIZ_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          selectedSubject: selectedSubject.value,
          selectedGrade: selectedGrade.value,
          selectedSemester: selectedSemester.value,
          selectedQuestionCount: selectedQuestionCount.value,
          selectedDifficulty: selectedDifficulty.value,
          selectedTimeLimitSeconds: selectedTimeLimitSeconds.value,
          selectedPointsPerCorrect: selectedPointsPerCorrect.value
        })
      );
    } catch {
      // Ignore storage write failures and keep runtime state usable.
    }
  }

  function handleDraftGradeChange() {
    if (!draftShouldShowSemesterFilter.value) {
      draftSelectedSemester.value = DEFAULT_QUIZ_SETTINGS.selectedSemester;
    }
  }

  return {
    normalizeSelectValue,
    supportsSemesterSelection,
    normalizeQuizSettings,
    getDifficultyLabel,
    selectedSubject,
    selectedGrade,
    selectedSemester,
    selectedQuestionCount,
    selectedDifficulty,
    selectedTimeLimitSeconds,
    selectedPointsPerCorrect,
    draftSelectedSubject,
    draftSelectedGrade,
    draftSelectedSemester,
    draftSelectedQuestionCount,
    draftSelectedDifficulty,
    draftSelectedTimeLimitSeconds,
    draftSelectedPointsPerCorrect,
    selectedSubjectValue,
    selectedGradeValue,
    shouldShowSemesterFilter,
    selectedQuestionCountValue,
    selectedDifficultyValue,
    selectedDifficultyLabel,
    selectedTimeLimitSecondsValue,
    selectedPointsPerCorrectValue,
    draftShouldShowSemesterFilter,
    applyQuizSettings,
    syncDraftQuizSettings,
    hydrateQuizSettings,
    persistQuizSettings,
    handleDraftGradeChange
  };
}
