// Which Learn German experience a user sees.
//
// app_user.learn_german_variant records the onboarding roll (audit); the
// effective variant is the learn_german_v2 feature flag, because the flag is
// also the kill-switch and the QA/admin override channel. A stored 'v2' whose
// flag has been switched off must fall back to v1 — checking the column alone
// would strand users on a surface the flag just killed.
export const LG_VARIANT_V1 = "v1";
export const LG_VARIANT_V2 = "v2";

/**
 * @param {object|null} user  redux auth user (carries learn_german_variant)
 * @param {object} flags      resolved flags map from useFeatureFlags()
 * @returns {"v1"|"v2"}
 */
export function resolveLearnGermanVariant(user, flags) {
  if (flags && flags.learn_german_v2 === true) return LG_VARIANT_V2;
  return LG_VARIANT_V1;
}
