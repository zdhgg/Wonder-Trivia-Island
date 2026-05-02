import { ref } from "vue";

export function createHomeSelections({
  GRADE_OPTIONS,
  DEFAULT_QUIZ_SETTINGS,
  selectedSubject,
  selectedGrade,
  selectedSemester,
  selectedChallengeChapterId,
  getChallengeChapter,
  supportsSemesterSelection,
  supportsChallengeSemester,
  homeSemesterOptions,
  defaultChallengeChapterId,
  getProfileSettings
}) {
  const homeGradePracticeGrade = ref("三年级");
  const homeGradePracticeSemester = ref("上册");
  const homeChallengeGrade = ref("三年级");
  const homeChallengeSemester = ref("上册");
  const homeSubjectPracticeSubject = ref("数学");
  const homeSubjectPracticeGrade = ref(DEFAULT_QUIZ_SETTINGS.selectedGrade);
  const homeSubjectPracticeSemester = ref("上册");

  function hydrateHomePracticeSelections() {
    const rememberedSemester =
      selectedSemester.value === "上册" || selectedSemester.value === "下册"
        ? selectedSemester.value
        : homeSemesterOptions.value[0];

    if (selectedGrade.value !== DEFAULT_QUIZ_SETTINGS.selectedGrade) {
      homeGradePracticeGrade.value = selectedGrade.value;
    }

    homeGradePracticeSemester.value = rememberedSemester;

    if (selectedSubject.value !== DEFAULT_QUIZ_SETTINGS.selectedSubject) {
      homeSubjectPracticeSubject.value = selectedSubject.value;
    }

    if (
      selectedGrade.value !== DEFAULT_QUIZ_SETTINGS.selectedGrade &&
      !(homeSubjectPracticeSubject.value === "英语" && selectedGrade.value === "一年级")
    ) {
      homeSubjectPracticeGrade.value = selectedGrade.value;
    }

    homeSubjectPracticeSemester.value = rememberedSemester;

    const rememberedChallengeChapter = getChallengeChapter(selectedChallengeChapterId.value);
    homeChallengeGrade.value = rememberedChallengeChapter.grade;
    homeChallengeSemester.value = rememberedChallengeChapter.semester || homeSemesterOptions.value[0];

    if (
      selectedGrade.value === DEFAULT_QUIZ_SETTINGS.selectedGrade &&
      selectedChallengeChapterId.value === defaultChallengeChapterId
    ) {
      applyProfileDefaultsToHome();
    }
  }

  function applyProfileDefaultsToHome(profileSettings = getProfileSettings()) {
    const nextGrade = String(profileSettings?.grade || "").trim();
    const nextSemester = String(profileSettings?.semester || "").trim() === "下册" ? "下册" : "上册";

    if (!GRADE_OPTIONS.includes(nextGrade) || nextGrade === DEFAULT_QUIZ_SETTINGS.selectedGrade) {
      return;
    }

    homeGradePracticeGrade.value = nextGrade;
    homeGradePracticeSemester.value = supportsSemesterSelection(nextGrade)
      ? nextSemester
      : homeSemesterOptions.value[0];

    if (!(homeSubjectPracticeSubject.value === "英语" && nextGrade === "一年级")) {
      homeSubjectPracticeGrade.value = nextGrade;
    }

    homeSubjectPracticeSemester.value = supportsSemesterSelection(homeSubjectPracticeGrade.value)
      ? nextSemester
      : homeSemesterOptions.value[0];

    homeChallengeGrade.value = nextGrade;
    homeChallengeSemester.value = supportsChallengeSemester(nextGrade)
      ? nextSemester
      : homeSemesterOptions.value[0];
  }

  return {
    homeGradePracticeGrade,
    homeGradePracticeSemester,
    homeChallengeGrade,
    homeChallengeSemester,
    homeSubjectPracticeSubject,
    homeSubjectPracticeGrade,
    homeSubjectPracticeSemester,
    hydrateHomePracticeSelections,
    applyProfileDefaultsToHome
  };
}
