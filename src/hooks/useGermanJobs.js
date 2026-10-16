import { useSelector } from "react-redux";
import { useFeatureFlags } from "./useFeatureFlags";

export const GERMAN_JOBS_FLAG = "german_jobs_others";

/** Signed up as "Other": German Jobs stays hidden unless an admin turns the flag on for them. */
export function useGermanJobsHidden() {
  const user = useSelector((state) => state.auth.user);
  const { isFeatureEnabled, loading } = useFeatureFlags();
  const restricted = Boolean(user?.german_jobs_restricted);
  return { hidden: restricted && !isFeatureEnabled(GERMAN_JOBS_FLAG), checking: restricted && loading };
}
