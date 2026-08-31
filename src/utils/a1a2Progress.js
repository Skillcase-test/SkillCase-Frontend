import {
  getFlashcardChapters as getA1FlashcardChapters,
  getGrammarTopics as getA1GrammarTopics,
  getReadingChapters as getA1ReadingChapters,
  getListeningChapters as getA1ListeningChapters,
  getSpeakingChapters as getA1SpeakingChapters,
  getTestTopics as getA1TestTopics,
} from "../api/a1Api";
import {
  getFlashcardChapters as getA2FlashcardChapters,
  getGrammarTopics as getA2GrammarTopics,
  getReadingChapters as getA2ReadingChapters,
  getListeningChapters as getA2ListeningChapters,
  getSpeakingChapters as getA2SpeakingChapters,
  getTestTopics as getA2TestTopics,
} from "../api/a2Api";
import { getVideoCourses } from "../api/videoCourseApi";
import { getProgress as getJobScreeningProgress } from "../api/jobScreeningApi";

const toList = (value) => (Array.isArray(value) ? value : []);

const countCompleted = (items, predicate) => {
  const list = toList(items);
  return {
    total: list.length,
    completed: list.filter(predicate).length,
  };
};

const countChapterItems = (items) => {
  const list = toList(items);
  return list.reduce(
    (acc, item) => ({
      total: acc.total + Number(item.content_count || 0),
      completed: acc.completed + Number(item.completed_count || 0),
    }),
    { total: 0, completed: 0 },
  );
};

/**
 * Aggregate "your A1/A2 progress" across every practice module — the same
 * bucket pattern the B1 progress ring uses (flashcards + grammar + reading +
 * listening + speaking + tests), so the ring reflects real completed content.
 */
async function getLevelPracticeRatio(fns) {
  // allSettled so one flaky module endpoint can't blank the whole ring —
  // the remaining modules still contribute their real progress.
  const settled = await Promise.allSettled([
    fns.getFlashcardChapters(),
    fns.getGrammarTopics(),
    fns.getReadingChapters(),
    fns.getListeningChapters(),
    fns.getSpeakingChapters(),
    fns.getTestTopics(),
  ]);
  const data = settled.map((result) =>
    result.status === "fulfilled" ? result.value?.data : null,
  );
  const [flashcards, grammar, reading, listening, speaking, tests] = data;

  const buckets = [
    countCompleted(
      flashcards,
      (item) => item.final_quiz_passed || item.is_completed,
    ),
    countCompleted(grammar, (item) => item.is_completed),
    countChapterItems(reading),
    countChapterItems(listening),
    countCompleted(speaking, (item) => item.is_completed),
    countCompleted(tests, (item) => item.is_fully_completed),
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

export function getA1PracticeProgressRatio() {
  return getLevelPracticeRatio({
    getFlashcardChapters: getA1FlashcardChapters,
    getGrammarTopics: getA1GrammarTopics,
    getReadingChapters: getA1ReadingChapters,
    getListeningChapters: getA1ListeningChapters,
    getSpeakingChapters: getA1SpeakingChapters,
    getTestTopics: getA1TestTopics,
  });
}

export function getA2PracticeProgressRatio() {
  return getLevelPracticeRatio({
    getFlashcardChapters: getA2FlashcardChapters,
    getGrammarTopics: getA2GrammarTopics,
    getReadingChapters: getA2ReadingChapters,
    getListeningChapters: getA2ListeningChapters,
    getSpeakingChapters: getA2SpeakingChapters,
    getTestTopics: getA2TestTopics,
  });
}

/**
 * Course status — videos completed / total videos across the course catalog
 * (matches what the /video-courses hub shows). Returns 0 when there is no
 * data or the request fails so the ring degrades gracefully.
 */
export async function getVideoCourseProgressRatio(level) {
  try {
    const res = await getVideoCourses(level);
    const courses = toList(res?.data?.data);
    const totals = courses.reduce(
      (acc, course) => ({
        completed: acc.completed + Number(course.completed_count || 0),
        total: acc.total + Number(course.video_count || 0),
      }),
      { completed: 0, total: 0 },
    );
    return totals.total > 0 ? Math.min(totals.completed / totals.total, 1) : 0;
  } catch {
    return 0;
  }
}

/**
 * Job-screening steps progress — completed steps / total steps, e.g. 2 of 10
 * steps done → 0.2 (20%). Degrades to 0 if the pipeline has no record yet.
 */
export async function getJobStepsProgressRatio() {
  try {
    const res = await getJobScreeningProgress();
    const steps = toList(res?.data?.data?.steps_config);
    if (steps.length === 0) return 0;
    const completed = steps.filter((s) => s?.status === "completed").length;
    return completed / steps.length;
  } catch {
    return 0;
  }
}
