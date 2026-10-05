// Draft factory + validation mirroring the backend sanitizer.

export const newAdDraft = () => ({
  title: "",
  body: "",
  color: "#002856",
  template: "card",
  image_ratio: "16:9",
  position: "bottom_right",
  cta_label: "",
  cta_type: "none",
  cta_target: "",
  placements: [],
  levels: [],
  target_user_ids: [],
  exclude_user_ids: [],
  frequency: "daily",
  starts_at: "",
  ends_at: "",
  is_active: false,
});

// datetime-local ↔ ISO: the input gives "YYYY-MM-DDTHH:mm" local time.
export const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

export function validateAd(form) {
  const errors = [];
  const title = String(form.title || "").trim();
  if (!title) errors.push("Title is required");
  else if (title.length > 140) errors.push("Title is too long (140 max)");
  if (String(form.body || "").length > 300)
    errors.push("Body is too long (300 max)");
  if (!form.placements?.length) errors.push("Pick at least one screen");
  if (form.cta_type !== "none") {
    if (!form.cta_label?.trim()) errors.push("CTA needs a label");
    if (!form.cta_target?.trim()) {
      errors.push("CTA needs a target");
    } else {
      if (form.cta_type === "route" && !form.cta_target.startsWith("/"))
        errors.push("App screen CTA must be a path starting with /");
      if (form.cta_type === "url" && !/^https?:\/\//i.test(form.cta_target))
        errors.push("Link CTA must start with http(s)://");
      if (
        (form.cta_type === "whatsapp" || form.cta_type === "call") &&
        form.cta_target.replace(/[^\d]/g, "").length < 5
      )
        errors.push("CTA needs a valid phone number");
    }
  }
  if (form.starts_at && form.ends_at) {
    if (new Date(form.ends_at) <= new Date(form.starts_at))
      errors.push("End time must be after start time");
  }
  return errors;
}
