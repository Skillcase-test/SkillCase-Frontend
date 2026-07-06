import {
  getB1DescribeSpeakChapters,
  getB1Exams,
  getB1FlashcardChapters,
  getB1ReadingChapters,
  getB1Videos,
} from "../api/b1Api";

const toList = (value) => (Array.isArray(value) ? value : []);

const countCompleted = (items, predicate) => {
  const list = toList(items);
  return {
    total: list.length,
    completed: list.filter(predicate).length,
  };
};

export function isB1PracticeLevel(level) {
  const normalized = String(level || "").toLowerCase();
  return normalized === "b1" || normalized === "b2";
}

export function getPracticeHomeForLevel(level) {
  const normalized = String(level || "A1").toLowerCase();
  if (normalized === "a2") return "/a2";
  if (isB1PracticeLevel(normalized)) return "/b1";
  return "/a1";
}

export async function getB1PracticeProgressRatio() {
  const [
    flashcardRes,
    newsRes,
    articleRes,
    describeSpeakRes,
    examsRes,
    videosRes,
  ] = await Promise.all([
    getB1FlashcardChapters(),
    getB1ReadingChapters("news"),
    getB1ReadingChapters("article"),
    getB1DescribeSpeakChapters(),
    getB1Exams(),
    getB1Videos("B1"),
  ]);

  const buckets = [
    countCompleted(
      flashcardRes?.data,
      (item) => item.is_completed || item.final_quiz_passed,
    ),
    countCompleted(newsRes?.data, (item) => item.is_completed),
    countCompleted(articleRes?.data, (item) => item.is_completed),
    countCompleted(describeSpeakRes?.data, (item) => item.is_completed),
    countCompleted(
      examsRes?.data,
      (item) => Number(item.completed_papers || 0) >= Number(item.total_papers || 0) &&
        Number(item.total_papers || 0) > 0,
    ),
    countCompleted(videosRes?.data, (item) => item.completed || item.is_quiz_completed),
  ];

  const totals = buckets.reduce(
    (acc, bucket) => ({
      completed: acc.completed + bucket.completed,
      total: acc.total + bucket.total,
    }),
    { completed: 0, total: 0 },
  );

  return totals.total > 0 ? totals.completed / totals.total : 0;
}
