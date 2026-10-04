// frontend/src/utils/fontLoader.js
// PropConnect Global Typography & Web Font Manager

export const GLOBAL_FONTS = [
  {
    id: "Inter",
    name: "Inter",
    category: "Modern Sans-Serif",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    googleFont: "Inter:wght@300;400;500;600;700;800",
    previewText: "PropConnect Property Management — Find a home that fits your needs.",
    description: "Clean, geometric sans-serif designed for high-density SaaS interfaces and legibility.",
  },
  {
    id: "Poppins",
    name: "Poppins",
    category: "Geometric Sans-Serif",
    fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    googleFont: "Poppins:wght@300;400;500;600;700",
    previewText: "PropConnect Property Management — Find a home that fits your needs.",
    description: "Friendly, contemporary geometric typeface with rounded aesthetic and elegant weight balance.",
  },
  {
    id: "Roboto",
    name: "Roboto",
    category: "Neo-Grotesque Sans",
    fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
    googleFont: "Roboto:wght@300;400;500;700",
    previewText: "PropConnect Property Management — Find a home that fits your needs.",
    description: "Dual nature font featuring mechanical skeleton and friendly open curves for maximum clarity.",
  },
  {
    id: "Open Sans",
    name: "Open Sans",
    category: "Humanist Sans-Serif",
    fontFamily: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    googleFont: "Open+Sans:wght@300;400;500;600;700",
    previewText: "PropConnect Property Management — Find a home that fits your needs.",
    description: "Optimized for print, web, and mobile with warm upright stress and excellent open forms.",
  },
  {
    id: "Times New Roman",
    name: "Times New Roman",
    category: "Classical Serif",
    fontFamily: "'Times New Roman', Times, Baskerville, Georgia, serif",
    googleFont: null, // System standard font
    previewText: "PropConnect Property Management — Find a home that fits your needs.",
    description: "Timeless editorial serif offering traditional authority, balanced proportions, and formal grace.",
  },
];

const GOOGLE_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap";

/**
 * Ensures Google Fonts link tag is present in the document head
 */
export function ensureWebFontsLoaded() {
  if (typeof document === "undefined") return;

  const existingLink = document.getElementById("propconnect-google-fonts");
  if (!existingLink) {
    const link = document.createElement("link");
    link.id = "propconnect-google-fonts";
    link.rel = "stylesheet";
    link.href = GOOGLE_FONT_HREF;
    document.head.appendChild(link);
  }
}

/**
 * Apply the selected global font to the document root and typography tokens
 */
export function applyGlobalFontToDOM(fontId) {
  if (typeof document === "undefined") return;

  ensureWebFontsLoaded();

  const found = GLOBAL_FONTS.find((f) => f.id.toLowerCase() === (fontId || "").toLowerCase()) || GLOBAL_FONTS[0];
  const root = document.documentElement;

  // Set CSS variable on root
  root.style.setProperty("--font-family-base", found.fontFamily);
  root.style.setProperty("--font-current-name", found.name);

  // Directly set style on document body and html for total coverage
  document.body.style.fontFamily = found.fontFamily;
}
