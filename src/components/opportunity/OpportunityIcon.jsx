import React from "react";
import { DynamicIcon } from "lucide-react/dynamic";
import { Sparkle } from "lucide-react";

// Renders an admin-picked lucide icon by name. DynamicIcon lazy-loads each
// icon chunk, so the bundle only ships icons actually used — the full ~1,500
// icon set is searchable in the admin editor without bloating the candidate
// bundle. Unknown/missing names fail safe to Sparkle.

// DynamicIcon expects kebab-case keys; normalize anything else defensible
// (PascalCase, snake_case, spaces) so a stored name can't silently blank out.
const toKebab = (v) =>
  String(v || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

const OpportunityIcon = ({ name, className = "w-4 h-4", fallback = null }) => {
  const kebab = toKebab(name);
  const safe = /^[a-z][a-z0-9-]*$/.test(kebab) ? kebab : null;
  const Fallback = fallback || Sparkle;
  if (!safe) return <Fallback className={className} aria-hidden="true" />;
  return (
    <DynamicIcon
      name={safe}
      className={className}
      aria-hidden="true"
      fallback={() => <Fallback className={className} aria-hidden="true" />}
    />
  );
};

export default OpportunityIcon;
