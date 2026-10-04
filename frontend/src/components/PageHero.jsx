import { useContext } from "react";
import { SettingsContext } from "../context/SettingsContext.jsx";

export default function PageHero({ title, subtitle, badge, actions }) {
  const { t } = useContext(SettingsContext);

  const resolveText = (text) => {
    if (!text || typeof text !== "string") return text;
    return t(text);
  };

  return (
    <div className="page-hero">
      <div className="page-hero-left">
        {badge && (
          <span className="role-chip" style={{ marginBottom: "8px" }}>
            {resolveText(badge)}
          </span>
        )}
        <h1>{resolveText(title)}</h1>
        {subtitle && <p>{resolveText(subtitle)}</p>}
      </div>
      {actions && <div className="page-hero-actions">{actions}</div>}
    </div>
  );
}
