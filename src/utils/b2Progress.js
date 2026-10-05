import { getB2Exercises, getB2Exams } from "../api/b2Api";

const toList = (value) => (Array.isArray(value) ? value : []);

const countCompleted = (items, predicate) => {
  const list = toList(items);
  return {
    total: list.length,
    completed: list.filter(predicate).length,
  };
};

const B2_MODULES = ["reading", "listening", "writing", "speaking"];
// tag="all" is the aggregate view — it returns every exercise in the module
// (all + telc + goethe), so one call per module covers the whole catalogue
// without double-counting across tags.
const B2_LIST_TAG = "all";

export async function getB2PracticeProgressRatio() {
  const exerciseRequests = B2_MODULES.map((module) =>
    getB2Exercises(module, B2_LIST_TAG),
  );

  const [examsRes, ...exerciseRes] = await Promise.all([
    getB2Exams(),
    ...exerciseRequests,
  ]);

  const buckets = [
    ...exerciseRes.map((res) =>
      countCompleted(res?.data, (item) => item.status === "completed"),
    ),
    countCompleted(
      examsRes?.data,
      (item) =>
        Number(item.completed_papers || 0) >= Number(item.total_papers || 0) &&
        Number(item.total_papers || 0) > 0,
    ),
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
