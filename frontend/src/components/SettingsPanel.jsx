import { useContext } from "react";
import { SettingsContext } from "../context/SettingsContext.jsx";

export default function SettingsPanel({ open, onClose }) {
  const {
    theme,
    toggleTheme,
    primaryColor,
    setPrimaryColor,
    accent,
    setAccent,
    themePresets,
    fontFamily,
    setFontFamily,
    globalFonts,
    fontSize,
    setFontSize,
    language,
    setLanguage,
    t,
  } = useContext(SettingsContext);

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>{t("settings")}</h3>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Theme Mode */}
        <div className="settings-group">
          <label>{t("theme")}</label>
          <div className="toggle-row">
            <button
              className={`toggle-btn ${theme === "light" ? "active" : ""}`}
              onClick={() => theme !== "light" && toggleTheme()}
            >
              ☀️ {t("lightMode")}
            </button>
            <button
              className={`toggle-btn ${theme === "dark" ? "active" : ""}`}
              onClick={() => theme !== "dark" && toggleTheme()}
            >
              🌙 {t("darkMode")}
            </button>
          </div>
        </div>

        {/* Brand Theme Swatches */}
        <div className="settings-group">
          <label>Brand Theme Color</label>
          <div className="swatch-row" style={{ flexWrap: "wrap", gap: "8px" }}>
            {(themePresets || []).map((p) => {
              const isActive = primaryColor.toUpperCase() === p.hex.toUpperCase();
              return (
                <button
                  key={p.id}
                  className={`swatch ${isActive ? "active" : ""}`}
                  style={{
                    background: p.hex,
                    boxShadow: isActive ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${p.hex}` : "none",
                  }}
                  onClick={() => setAccent(p.id)}
                  title={`${p.name} (${p.hex})`}
                  aria-label={p.name}
                />
              );
            })}
          </div>
        </div>

        {/* Typography */}
        <div className="settings-group">
          <label>Typography Style</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {(globalFonts || []).map((f) => {
              const isActive = fontFamily.toLowerCase() === f.id.toLowerCase();
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`toggle-btn ${isActive ? "active" : ""}`}
                  style={{ fontSize: "11px", padding: "6px 8px", textAlign: "center" }}
                  onClick={() => setFontFamily(f.id)}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size */}
        <div className="settings-group">
          <label>{t("fontSize")}</label>
          <div className="toggle-row">
            {["small", "medium", "large"].map((size) => (
              <button
                key={size}
                className={`toggle-btn ${fontSize === size ? "active" : ""}`}
                onClick={() => setFontSize(size)}
              >
                {t(size)}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="settings-group">
          <label>{t("language")}</label>
          <div className="toggle-row">
            <button
              className={`toggle-btn ${language === "en" ? "active" : ""}`}
              onClick={() => setLanguage("en")}
            >
              English
            </button>
            <button
              className={`toggle-btn ${language === "ta" ? "active" : ""}`}
              onClick={() => setLanguage("ta")}
            >
              தமிழ்
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
