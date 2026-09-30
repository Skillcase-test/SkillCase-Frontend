import { getB2TestOverview } from "../api/b2Api";

// Refresh/deep links lose router state; resolve the id from completed-test
// history instead of starting a submission just to view results.
export async function resolveB2SubmissionId(paperId, fromState) {
  if (fromState) return fromState;
  const res = await getB2TestOverview();
  const hit = (res.data?.history || []).find(
    (h) => String(h.paperId) === String(paperId),
  );
  return hit?.submissionId ?? null;
}
