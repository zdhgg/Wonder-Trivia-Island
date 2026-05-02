import { buildStudyLessonCards as buildStudyLessonCardsBase, buildStudyLessonPlayback as buildStudyLessonPlaybackBase } from "./studyLessonBlueprint";

export function buildStudyLessonCards(item) {
  return buildStudyLessonCardsBase(item);
}

export function buildStudyLessonPlayback(item) {
  return buildStudyLessonPlaybackBase(item);
}
