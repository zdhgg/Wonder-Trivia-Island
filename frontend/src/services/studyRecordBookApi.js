function isStudyRecordBookShapeValid(recordBook) {
  return Boolean(recordBook) && typeof recordBook.questionRecords === "object";
}

function assertStudyRecordBookPayload(payload) {
  if (isStudyRecordBookShapeValid(payload?.studyRecordBook) || isStudyRecordBookShapeValid(payload?.recordBook)) {
    return;
  }

  throw new Error("学习档案格式不正确。");
}

export async function fetchStudyRecordBook(signal) {
  const response = await fetch("/api/study-record-book", {
    method: "GET",
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `加载学习档案失败：${response.status}`);
  }

  assertStudyRecordBookPayload(payload);
  return payload;
}

export async function saveStudyRecordBook({ studyRecordBook, recordBook, signal } = {}) {
  const payloadBody = studyRecordBook ?? recordBook;

  if (!payloadBody || typeof payloadBody !== "object") {
    throw new Error("学习档案不能为空。");
  }

  const response = await fetch("/api/study-record-book", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      studyRecordBook: studyRecordBook ?? undefined,
      recordBook: recordBook ?? undefined
    }),
    signal
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `保存学习档案失败：${response.status}`);
  }

  assertStudyRecordBookPayload(payload);
  return payload;
}
