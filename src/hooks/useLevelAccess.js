import { useNavigate } from "react-router-dom";
import { useUsageLimits } from "./useUsageLimits";
/** Opens the usage-limit modal (and returns false) when a module is locked at this level. */
export default function useLevelAccess(level) {
  const navigate = useNavigate();
  const { getState } = useUsageLimits();
  return (module, path) => {
    const state = getState(level, module);
    if (state?.locked) {
      window.dispatchEvent(
        new CustomEvent("skillcase:usage-limit", {
          detail: {
            ...state,
            locked: true,
            reason: "usage_limit",
            module_key: module,
            level,
            msg: state.hard_locked
              ? "This feature is currently locked."
              : "Your practice limit has been reached.",
          },
        }),
      );
      return false;
    }
    if (path) navigate(path);
    return true;
  };
}
