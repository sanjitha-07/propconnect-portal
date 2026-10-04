import { createContext, useState, useEffect, useCallback, useMemo } from "react";
import { translate } from "../i18n/translations.js";
import {
  generateThemePalette,
  applyThemeTokensToDOM,
  normalizeHex,
  isValidHex,
  THEME_PRESETS,
} from "../utils/themeGenerator.js";
import {
  applyGlobalFontToDOM,
  ensureWebFontsLoaded,
  GLOBAL_FONTS,
} from "../utils/fontLoader.js";
import { fetchThemeSettings, saveThemeSettings } from "../utils/apiClient.js";

export const SettingsContext = createContext(null);

function readStored(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch {
    return fallback;
  }
}

function readStoredBool(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val === "true" : fallback;
  } catch {
    return fallback;
  }
}

// Map legacy font aliases to canonical GLOBAL_FONTS ids
function normalizeFontFamily(raw) {
  if (!raw) return "Inter";
  const lower = raw.toLowerCase();
  if (lower === "modern") return "Inter";
  if (lower === "serif") return "Times New Roman";
  if (lower === "system") return "Roboto";
  if (lower === "mono") return "Inter";
  const match = GLOBAL_FONTS.find((f) => f.id.toLowerCase() === lower);
  return match ? match.id : "Inter";
}

// Map legacy accent names or stored hex to canonical primary color
function getInitialPrimaryColor() {
  const storedHex = readStored("tlms-primaryColor", null);
  if (storedHex && isValidHex(storedHex)) {
    return normalizeHex(storedHex);
  }
  const storedAccent = readStored("tlms-accent", "blue");
  const foundPreset = THEME_PRESETS.find((p) => p.id === storedAccent);
  if (foundPreset) return foundPreset.hex;
  if (isValidHex(storedAccent)) return normalizeHex(storedAccent);
  return "#1976D2";
}

export function SettingsProvider({ children }) {
  const [theme, setTheme] = useState(() => readStored("tlms-theme", "light"));
  const [primaryColor, setPrimaryColor] = useState(getInitialPrimaryColor);
  const [accent, setAccentState] = useState(() => {
    const col = getInitialPrimaryColor();
    const match = THEME_PRESETS.find((p) => p.hex.toUpperCase() === col.toUpperCase());
    return match ? match.id : "custom";
  });
  const [fontFamily, setFontFamilyState] = useState(() =>
    normalizeFontFamily(readStored("tlms-fontFamily", "Inter"))
  );
  const [fontSize, setFontSize] = useState(() => readStored("tlms-fontSize", "medium"));
  const [language, setLanguage] = useState(() => readStored("tlms-language", "en"));
  const [currency, setCurrency] = useState(() => readStored("tlms-currency", "INR"));
  const [dateFormat, setDateFormat] = useState(() => readStored("tlms-dateFormat", "DD/MM/YYYY"));
  const [appName, setAppName] = useState(() =>
    readStored("tlms-appName", "PropConnect Management System")
  );

  // Notification toggles
  const [emailNotifications, setEmailNotifications] = useState(() =>
    readStoredBool("tlms-notif-email", true)
  );
  const [paymentReminders, setPaymentReminders] = useState(() =>
    readStoredBool("tlms-notif-payment", true)
  );
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(() =>
    readStoredBool("tlms-notif-maintenance", true)
  );
  const [leaseExpiryAlerts, setLeaseExpiryAlerts] = useState(() =>
    readStoredBool("tlms-notif-lease", true)
  );

  // Database synchronization state
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // Active theme palette computed from primaryColor
  const palette = useMemo(() => generateThemePalette(primaryColor), [primaryColor]);

  // Apply theme tokens to DOM whenever primaryColor changes
  useEffect(() => {
    applyThemeTokensToDOM(palette);
    localStorage.setItem("tlms-primaryColor", primaryColor);
    localStorage.setItem("tlms-accent", accent);
    localStorage.setItem("pc-accent", accent);
  }, [palette, primaryColor, accent]);

  // Apply font to DOM whenever fontFamily changes
  useEffect(() => {
    ensureWebFontsLoaded();
    applyGlobalFontToDOM(fontFamily);
    localStorage.setItem("tlms-fontFamily", fontFamily);
  }, [fontFamily]);

  // Sync basic appearance keys to localStorage
  useEffect(() => {
    localStorage.setItem("tlms-theme", theme);
    localStorage.setItem("pc-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("tlms-fontSize", fontSize);
    localStorage.setItem("pc-fontSize", fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem("tlms-language", language);
    localStorage.setItem("pc-language", language);
  }, [language]);

  useEffect(() => localStorage.setItem("tlms-currency", currency), [currency]);
  useEffect(() => localStorage.setItem("tlms-dateFormat", dateFormat), [dateFormat]);
  useEffect(() => localStorage.setItem("tlms-appName", appName), [appName]);
  useEffect(() => localStorage.setItem("tlms-notif-email", String(emailNotifications)), [emailNotifications]);
  useEffect(() => localStorage.setItem("tlms-notif-payment", String(paymentReminders)), [paymentReminders]);
  useEffect(() => localStorage.setItem("tlms-notif-maintenance", String(maintenanceAlerts)), [maintenanceAlerts]);
  useEffect(() => localStorage.setItem("tlms-notif-lease", String(leaseExpiryAlerts)), [leaseExpiryAlerts]);

  // Initial load: Fetch remote settings from MongoDB Compass if available
  useEffect(() => {
    let mounted = true;
    fetchThemeSettings()
      .then((remote) => {
        if (!mounted || !remote) return;
        if (remote.primaryColor && isValidHex(remote.primaryColor)) {
          const norm = normalizeHex(remote.primaryColor);
          setPrimaryColor(norm);
          const found = THEME_PRESETS.find((p) => p.hex.toUpperCase() === norm.toUpperCase());
          setAccentState(found ? found.id : "custom");
          applyThemeTokensToDOM(generateThemePalette(norm));
        }
        if (remote.fontFamily) {
          const normFont = normalizeFontFamily(remote.fontFamily);
          setFontFamilyState(normFont);
          applyGlobalFontToDOM(normFont);
        }
        if (remote.themeMode) setTheme(remote.themeMode);
        if (remote.language) setLanguage(remote.language);
        if (remote.fontSize) setFontSize(remote.fontSize);
        if (remote.appName) setAppName(remote.appName);
        if (remote.currency) setCurrency(remote.currency);
        if (remote.dateFormat) setDateFormat(remote.dateFormat);
        if (remote.updatedAt) setLastSyncedAt(new Date(remote.updatedAt));
      })
      .catch((err) => {
        console.warn("Could not sync initial theme from MongoDB:", err.message);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Update primary color (hex) directly
  const updatePrimaryColor = useCallback((hex) => {
    if (!isValidHex(hex)) return false;
    const norm = normalizeHex(hex);
    setPrimaryColor(norm);
    const foundPreset = THEME_PRESETS.find((p) => p.hex.toUpperCase() === norm.toUpperCase());
    setAccentState(foundPreset ? foundPreset.id : "custom");
    applyThemeTokensToDOM(generateThemePalette(norm));
    return true;
  }, []);

  // Update accent by preset ID or hex string
  const setAccent = useCallback(
    (presetIdOrHex) => {
      if (!presetIdOrHex) return;
      const found = THEME_PRESETS.find((p) => p.id === presetIdOrHex);
      if (found) {
        setAccentState(found.id);
        updatePrimaryColor(found.hex);
      } else if (isValidHex(presetIdOrHex)) {
        updatePrimaryColor(presetIdOrHex);
      }
    },
    [updatePrimaryColor]
  );

  // Update global font family
  const setFontFamily = useCallback((newFont) => {
    const norm = normalizeFontFamily(newFont);
    setFontFamilyState(norm);
    applyGlobalFontToDOM(norm);
  }, []);

  // Save current settings to MongoDB Compass
  const syncSettingsToDatabase = useCallback(
    async (overrides = {}) => {
      setIsSyncingDb(true);
      try {
        const payload = {
          primaryColor,
          fontFamily,
          language,
          fontSize,
          themeMode: theme,
          appName,
          currency,
          dateFormat,
          role: "admin",
          ...overrides,
        };
        const res = await saveThemeSettings(payload);
        if (res && res.success) {
          setLastSyncedAt(new Date());
          setIsSyncingDb(false);
          return { success: true, message: res.message || "Settings saved to database." };
        }
        setIsSyncingDb(false);
        return { success: false, message: res?.error || "Failed to persist to database" };
      } catch (err) {
        setIsSyncingDb(false);
        return { success: false, message: err.message };
      }
    },
    [primaryColor, fontFamily, language, fontSize, theme, appName, currency, dateFormat]
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const t = useCallback(
    (key, paramsOrFallback) => translate(language, key, paramsOrFallback),
    [language]
  );

  const formatCurrency = useCallback(
    (amount) => {
      const num = Number(amount || 0);
      if (currency === "USD") return `$${num.toLocaleString("en-US")}`;
      if (currency === "EUR") return `€${num.toLocaleString("de-DE")}`;
      return `₹${num.toLocaleString("en-IN")}`;
    },
    [currency]
  );

  const value = {
    theme,
    setTheme,
    toggleTheme,
    primaryColor,
    setPrimaryColor: updatePrimaryColor,
    palette,
    accent,
    setAccent,
    themePresets: THEME_PRESETS,
    fontFamily,
    setFontFamily,
    globalFonts: GLOBAL_FONTS,
    fontSize,
    setFontSize,
    language,
    setLanguage,
    lang: language,
    setLang: setLanguage,
    currency,
    setCurrency,
    dateFormat,
    setDateFormat,
    appName,
    setAppName,
    emailNotifications,
    setEmailNotifications,
    paymentReminders,
    setPaymentReminders,
    maintenanceAlerts,
    setMaintenanceAlerts,
    leaseExpiryAlerts,
    setLeaseExpiryAlerts,
    formatCurrency,
    t,
    isSyncingDb,
    lastSyncedAt,
    syncSettingsToDatabase,
  };

  const safeFontClass = fontFamily.replace(/\s+/g, "_");

  return (
    <SettingsContext.Provider value={value}>
      <div
        className={`app-shell theme-${theme} accent-${accent} font-family-${safeFontClass} font-${fontSize}`}
      >
        {children}
      </div>
    </SettingsContext.Provider>
  );
}
