// frontend/src/utils/themeGenerator.js
// PropConnect Dynamic Theme Color & Token Generator

/**
 * Validates 3-digit or 6-digit hex color
 */
export function isValidHex(hex) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test((hex || "").trim());
}

/**
 * Normalizes hex to 6-digit uppercase format
 */
export function normalizeHex(hex) {
  if (!hex) return "#1976D2";
  let clean = hex.trim();
  if (!clean.startsWith("#")) clean = "#" + clean;
  if (clean.length === 4) {
    clean = "#" + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
  }
  return clean.toUpperCase();
}

/**
 * Convert Hex to RGB [r, g, b]
 */
export function hexToRgb(hex) {
  const norm = normalizeHex(hex);
  const r = parseInt(norm.slice(1, 3), 16) || 0;
  const g = parseInt(norm.slice(3, 5), 16) || 0;
  const b = parseInt(norm.slice(5, 7), 16) || 0;
  return [r, g, b];
}

/**
 * Convert RGB to Hex
 */
export function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Convert RGB to HSL [h (0-360), s (0-100), l (0-100)]
 */
export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Calculate WCAG Relative Luminance
 */
export function getRelativeLuminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Determine Accessible Contrast Color (#ffffff or #0f172a)
 */
export function getAccessibleContrastColor(hex) {
  const [r, g, b] = hexToRgb(hex);
  const lum = getRelativeLuminance(r, g, b);
  // Lum > 0.45 requires dark text for WCAG AA compliance (4.5:1 ratio)
  return lum > 0.42 ? "#0f172a" : "#ffffff";
}

/**
 * Automatically Generates Full Palette from a Single Primary Color
 * 
 * Generates:
 * - primary
 * - primary hover
 * - primary active
 * - primary light (subtle background)
 * - primary lighter
 * - primary dark
 * - primary contrast (accessible text)
 * - primary border
 * - focus ring
 * - link & link hover
 */
export function generateThemePalette(primaryHex) {
  const validHex = isValidHex(primaryHex) ? normalizeHex(primaryHex) : "#1976D2";
  const [r, g, b] = hexToRgb(validHex);
  const [h, s, l] = rgbToHsl(r, g, b);

  // Compute Hover (darken if light, lighten slightly if extremely dark)
  const hoverL = l > 20 ? Math.max(12, l - 8) : Math.min(35, l + 10);
  const [hr, hg, hb] = hslToRgb(h, s, hoverL);
  const hoverHex = rgbToHex(hr, hg, hb);

  // Compute Active
  const activeL = l > 25 ? Math.max(8, l - 15) : Math.min(45, l + 18);
  const [ar, ag, ab] = hslToRgb(h, s, activeL);
  const activeHex = rgbToHex(ar, ag, ab);

  // Compute Dark shade
  const darkL = Math.max(6, Math.min(22, l - 22));
  const [dr, dg, db] = hslToRgb(h, Math.min(s, 75), darkL);
  const darkHex = rgbToHex(dr, dg, db);

  // Compute Light tint for subtle badges, table highlight, active nav backgrounds
  const lightL = 96;
  const lightS = Math.min(s, 65);
  const [lr, lg, lb] = hslToRgb(h, lightS, lightL);
  const lightHex = rgbToHex(lr, lg, lb);

  // Compute Lighter tint (ultra-soft background)
  const lighterL = 98;
  const lighterS = Math.min(s, 50);
  const [llr, llg, llb] = hslToRgb(h, lighterS, lighterL);
  const lighterHex = rgbToHex(llr, llg, llb);

  // Compute Border (soft tone matching primary hue)
  const borderL = 84;
  const borderS = Math.min(s, 60);
  const [br, bg, bb] = hslToRgb(h, borderS, borderL);
  const borderHex = rgbToHex(br, bg, bb);

  // Accessible Text / Contrast
  const contrastHex = getAccessibleContrastColor(validHex);

  // Focus Ring
  const focusRing = `rgba(${r}, ${g}, ${b}, 0.35)`;
  const subtleGlow = `0 0 0 3px rgba(${r}, ${g}, ${b}, 0.25)`;

  return {
    primary: validHex,
    primaryRgb: `${r}, ${g}, ${b}`,
    primaryHover: hoverHex,
    primaryActive: activeHex,
    primaryDark: darkHex,
    primaryLight: lightHex,
    primaryLighter: lighterHex,
    primaryBorder: borderHex,
    primaryContrast: contrastHex,
    focusRing,
    subtleGlow,
    link: validHex,
    linkHover: hoverHex,
  };
}

/**
 * Apply Generated Theme Palette to the Document Root
 * Real-time dynamic CSS variable injection with ZERO hardcoded colors!
 */
export function applyThemeTokensToDOM(palette) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // 1. Centralized Core Design Tokens
  root.style.setProperty("--color-primary", palette.primary);
  root.style.setProperty("--color-primary-rgb", palette.primaryRgb);
  root.style.setProperty("--color-primary-hover", palette.primaryHover);
  root.style.setProperty("--color-primary-active", palette.primaryActive);
  root.style.setProperty("--color-primary-dark", palette.primaryDark);
  root.style.setProperty("--color-primary-light", palette.primaryLight);
  root.style.setProperty("--color-primary-lighter", palette.primaryLighter);
  root.style.setProperty("--color-primary-border", palette.primaryBorder);
  root.style.setProperty("--color-primary-contrast", palette.primaryContrast);
  root.style.setProperty("--color-border", palette.primaryBorder);
  root.style.setProperty("--color-focus", palette.focusRing);
  root.style.setProperty("--color-link", palette.link);
  root.style.setProperty("--color-link-hover", palette.linkHover);

  // 2. Compatibility Design Tokens (instantly updates every legacy component)
  root.style.setProperty("--accent-primary", palette.primary);
  root.style.setProperty("--accent-hover", palette.primaryHover);
  root.style.setProperty("--accent-active", palette.primaryActive);
  root.style.setProperty("--accent-subtle", palette.primaryLight);
  root.style.setProperty("--accent-border", palette.primaryBorder);
  root.style.setProperty("--accent-glow", palette.focusRing);
  root.style.setProperty("--accent-text", palette.primaryContrast);

  root.style.setProperty("--brand-blue", palette.primary);
  root.style.setProperty("--brand-blue-hover", palette.primaryHover);
  root.style.setProperty("--brand-blue-active", palette.primaryActive);
  root.style.setProperty("--brand-blue-subtle", palette.primaryLight);
  root.style.setProperty("--brand-blue-border", palette.primaryBorder);

  root.style.setProperty("--accent", palette.primary);
  root.style.setProperty("--accent-light", palette.primaryLight);
  root.style.setProperty("--accent-ink", palette.primaryContrast);
  root.style.setProperty("--border-focus", palette.primaryBorder);
}

// Preset color options as required by user specification
export const THEME_PRESETS = [
  { id: "teal", name: "Teal", hex: "#1D95AD" },
  { id: "blue", name: "Blue", hex: "#1976D2" },
  { id: "purple", name: "Purple", hex: "#7B1FA2" },
  { id: "pink", name: "Pink", hex: "#C2185B" },
  { id: "red", name: "Red", hex: "#D32F2F" },
  { id: "green", name: "Green", hex: "#388E3C" },
  { id: "orange", name: "Orange", hex: "#F57C00" },
];
