import { useNavigate } from "react-router-dom";
import { useUsageLimits } from "./useUsageLimits";
export default function useB2Access() {
  const navigate = useNavigate();
  const { getState } = useUsageLimits();
  return (module, path) => {
    const state = getState("B2", module);
    if (state?.locked) {
      window.dispatchEvent(
        new CustomEvent("skillcase:usage-limit", {
          detail: {
            ...state,
            locked: true,
            reason: "usage_limit",
            module_key: module,
            level: "B2",
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
