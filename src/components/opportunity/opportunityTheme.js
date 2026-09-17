// Theme helpers for opportunity components — the opportunity color is a
// dynamic hex picked by the admin, so tints/shades are computed at runtime
// (Tailwind can't express runtime colors). Layout/styling stays in Tailwind;
// only color values go through these helpers.

const FALLBACK = "#2563eb";

export const normalizeHex = (hex) => {
  const v = String(hex || "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(v) ? v : FALLBACK;
};

const hexToRgb = (hex) => {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

// Color at a given alpha — borders, tinted surfaces, pill backgrounds.
export const oppAlpha = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Darkened variant — used for text/icons on tinted surfaces so contrast holds
// for light colors too (e.g. a pale yellow opportunity still reads dark).
export const oppShade = (hex, factor = 0.55) => {
  const { r, g, b } = hexToRgb(hex);
  const f = Math.min(1, Math.max(0, factor));
  return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`;
};

// Lightness check — dark colors get white text when used as a solid fill.
export const oppIsDark = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  // Relative luminance approximation
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
};

// Solid opaque tint blended over white (prevents transparent alpha stacking/darkening artifacts)
export const oppSolidTint = (hex, weight = 0.15) => {
  const { r, g, b } = hexToRgb(hex);
  const w = Math.min(1, Math.max(0, weight));
  const sr = Math.round(r * w + 255 * (1 - w));
  const sg = Math.round(g * w + 255 * (1 - w));
  const sb = Math.round(b * w + 255 * (1 - w));
  return `rgb(${sr}, ${sg}, ${sb})`;
};
