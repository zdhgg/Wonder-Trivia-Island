import { ref } from "vue";
import { fetchStudyRecordBook, saveStudyRecordBook } from "../../services/studyRecordBookApi";

export function createStudyRecordRuntime({
  STUDY_RECORD_BOOK_STORAGE_KEY,
  createStudyRecordBook,
  normalizeStudyRecordBook,
  mergeStudyRecordBooks,
  isStudyRecordBookEqual,
  recordStudyAttempt
}) {
  const studyRecordBook = ref(createStudyRecordBook());

  let studyRecordSyncController = null;

  function hydrateStudyRecordBook() {
    if (typeof window === "undefined") {
      studyRecordBook.value = createStudyRecordBook();
      return studyRecordBook.value;
    }

    try {
      const savedBook = window.localStorage.getItem(STUDY_RECORD_BOOK_STORAGE_KEY);
      studyRecordBook.value = savedBook ? normalizeStudyRecordBook(JSON.parse(savedBook)) : createStudyRecordBook();
    } catch {
      studyRecordBook.value = createStudyRecordBook();
    }

    return studyRecordBook.value;
  }

  function persistStudyRecordBook(book = studyRecordBook.value) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(STUDY_RECORD_BOOK_STORAGE_KEY, JSON.stringify(normalizeStudyRecordBook(book)));
    } catch {
      // Ignore storage write failures and keep runtime state usable.
    }
  }

  async function syncStudyRecordBookFromServer() {
    try {
      const payload = await fetchStudyRecordBook();
      const serverRecordBook = normalizeStudyRecordBook(payload.studyRecordBook ?? payload.recordBook ?? payload);
      const mergedRecordBook = mergeStudyRecordBooks(studyRecordBook.value, serverRecordBook);

      studyRecordBook.value = mergedRecordBook;
      persistStudyRecordBook(mergedRecordBook);

      if (!isStudyRecordBookEqual(serverRecordBook, mergedRecordBook)) {
        const savedPayload = await saveStudyRecordBook({
          studyRecordBook: mergedRecordBook
        });
        const syncedRecordBook = mergeStudyRecordBooks(
          mergedRecordBook,
          savedPayload.studyRecordBook ?? savedPayload.recordBook ?? savedPayload
        );

        studyRecordBook.value = syncedRecordBook;
        persistStudyRecordBook(syncedRecordBook);
      }
    } catch {
      // Keep local archive available when sync fails.
    }
  }

  async function persistStudyRecordBookToServer(recordBook = studyRecordBook.value) {
    studyRecordSyncController?.abort();
    const controller = new AbortController();
    studyRecordSyncController = controller;

    try {
      const normalizedRecordBook = normalizeStudyRecordBook(recordBook);
      const payload = await saveStudyRecordBook({
        studyRecordBook: normalizedRecordBook,
        signal: controller.signal
      });
      const mergedRecordBook = mergeStudyRecordBooks(
        normalizedRecordBook,
        payload.studyRecordBook ?? payload.recordBook ?? payload
      );

      studyRecordBook.value = mergedRecordBook;
      persistStudyRecordBook(mergedRecordBook);
      return mergedRecordBook;
    } catch (error) {
      if (error?.name === "AbortError") {
        return studyRecordBook.value;
      }

      return normalizeStudyRecordBook(recordBook);
    } finally {
      if (studyRecordSyncController === controller) {
        studyRecordSyncController = null;
      }
    }
  }

  async function restoreStudyRecordBook(nextRecordBook) {
    const normalizedRecordBook = normalizeStudyRecordBook(nextRecordBook);
    studyRecordBook.value = normalizedRecordBook;
    persistStudyRecordBook(normalizedRecordBook);
    return persistStudyRecordBookToServer(normalizedRecordBook);
  }

  function handleQuizQuestionResolved(resolution) {
    const nextRecordBook = recordStudyAttempt(studyRecordBook.value, {
      question: resolution?.question,
      selectedOption: resolution?.selectedOption,
      isCorrect: resolution?.isCorrect,
      isTimeout: resolution?.isTimeout,
      correctAnswer: resolution?.correctAnswer,
      explanation: resolution?.explanation,
      answeredAt: resolution?.answeredAt
    });

    studyRecordBook.value = nextRecordBook;
    persistStudyRecordBook(nextRecordBook);
    void persistStudyRecordBookToServer(nextRecordBook);
  }

  function disposeStudyRecordRuntime() {
    studyRecordSyncController?.abort();
    studyRecordSyncController = null;
  }

  return {
    studyRecordBook,
    hydrateStudyRecordBook,
    persistStudyRecordBook,
    syncStudyRecordBookFromServer,
    persistStudyRecordBookToServer,
    restoreStudyRecordBook,
    handleQuizQuestionResolved,
    disposeStudyRecordRuntime
  };
}
