// Client-side model + validation for the opportunity editor. Mirrors the
// backend sanitizeOpportunityPayload limits — backend stays authoritative;
// this exists to give admins immediate feedback instead of save-time errors.

export const OPPORTUNITY_LIMITS = {
  SHORT_DESC_MAX_WORDS: 10,
  POINTS_MAX: 3,
  POINT_MAX_WORDS: 4,
  STATS_ITEMS_MAX: 6,
  KV_ROWS_MAX: 10,
  TABLE_COLS_MIN: 1,
  TABLE_COLS_MAX: 4,
  TABLE_ROWS_MAX: 12,
  FLOW_ROWS_MAX: 8,
  FLOW_ITEMS_MAX: 4,
  PROCESS_ITEMS_MAX: 8,
  PROCESS_POINTS_MAX: 4,
  BLOCKS_MAX: 12,
  ACTIVE_MAX: 3,
};

export const BLOCK_CATALOG = [
  {
    type: "stats_grid",
    label: "Stats banner",
    hint: "Grid of icon + label + value cells (duration, fee…)",
    factory: () => ({
      type: "stats_grid",
      title: "",
      items: [{ icon: "clock", label: "", value: "" }],
    }),
  },
  {
    type: "kv_table",
    label: "Details rows",
    hint: "Two columns — icon + label on the left, value on the right",
    factory: () => ({
      type: "kv_table",
      title: "",
      rows: [{ label: "", value: "", icon: "" }],
    }),
  },
  {
    type: "table",
    label: "Table",
    hint: "Header row + body rows, 1–4 columns; first column can carry an icon",
    factory: () => ({
      type: "table",
      title: "",
      columns: ["", ""],
      rows: [{ icon: "", cells: ["", ""] }],
    }),
  },
  {
    type: "flow",
    label: "Flow diagram",
    hint: "Titles chained with arrows; row label on the right + optional note",
    factory: () => ({
      type: "flow",
      title: "",
      rows: [{ label: "", items: ["", ""] }],
      note: "",
    }),
  },
  {
    type: "process",
    label: "Process steps",
    hint: "Vertical numbered steps — title + up to 4 points each",
    factory: () => ({
      type: "process",
      title: "",
      items: [{ title: "", points: [""] }],
    }),
  },
];

export const blockMeta = (type) =>
  BLOCK_CATALOG.find((b) => b.type === type) || {
    type,
    label: type,
    hint: "",
  };

export const newOpportunityDraft = () => ({
  title: "",
  short_description: "",
  color: "#2563eb",
  points: [""],
  blocks: [],
  is_active: false,
  image_download_url: null,
});

const countWords = (s) =>
  String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(String(v || "").trim());

// Returns an array of human-readable problems; empty = saveable.
export const validateOpportunity = (form) => {
  const errors = [];
  if (!String(form.title || "").trim()) errors.push("Title is required");
  if (countWords(form.short_description) > OPPORTUNITY_LIMITS.SHORT_DESC_MAX_WORDS) {
    errors.push(
      `Short description is over ${OPPORTUNITY_LIMITS.SHORT_DESC_MAX_WORDS} words`,
    );
  }
  const points = (form.points || []).filter((p) => String(p).trim());
  if (points.length > OPPORTUNITY_LIMITS.POINTS_MAX) {
    errors.push(`At most ${OPPORTUNITY_LIMITS.POINTS_MAX} points are allowed`);
  }
  points.forEach((p, i) => {
    if (countWords(p) > OPPORTUNITY_LIMITS.POINT_MAX_WORDS) {
      errors.push(`Point ${i + 1} is over ${OPPORTUNITY_LIMITS.POINT_MAX_WORDS} words`);
    }
  });
  if (form.color && !isHex(form.color)) {
    errors.push("Color must be a hex value like #2563eb");
  }
  (form.blocks || []).forEach((block, bi) => {
    const meta = blockMeta(block.type);
    const where = `${meta.label} block #${bi + 1}`;
    if (block.type === "table") {
      const cols = (block.columns || []).filter((c) => String(c).trim());
      if (!cols.length) errors.push(`${where}: needs at least one column`);
      if (cols.length > OPPORTUNITY_LIMITS.TABLE_COLS_MAX) {
        errors.push(`${where}: max ${OPPORTUNITY_LIMITS.TABLE_COLS_MAX} columns`);
      }
    }
    if (block.type === "flow") {
      (block.rows || []).forEach((r, ri) => {
        if ((r.items || []).filter(Boolean).length > OPPORTUNITY_LIMITS.FLOW_ITEMS_MAX) {
          errors.push(`${where}: row ${ri + 1} has over ${OPPORTUNITY_LIMITS.FLOW_ITEMS_MAX} titles`);
        }
      });
    }
    if (block.type === "process") {
      (block.items || []).forEach((it, ii) => {
        if ((it.points || []).filter(Boolean).length > OPPORTUNITY_LIMITS.PROCESS_POINTS_MAX) {
          errors.push(`${where}: step ${ii + 1} has over ${OPPORTUNITY_LIMITS.PROCESS_POINTS_MAX} points`);
        }
      });
    }
  });
  return errors;
};
