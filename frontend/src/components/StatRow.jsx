import { useContext } from "react";
import { SettingsContext } from "../context/SettingsContext.jsx";

export default function StatRow({ stats }) {
  const { t } = useContext(SettingsContext);

  return (
    <div className="stat-row">
      {stats.map((s, idx) => (
        <div className="stat" key={s.label || idx}>
          <div className="stat-header">
            <span className="lbl">{t(s.label)}</span>
            {s.icon && <span className="stat-icon-wrap">{s.icon}</span>}
          </div>
          <div className="val">{s.value}</div>
          {(s.trend || s.subtitle) && (
            <div className="stat-footer">
              {s.trend && (
                <span className={`trend-badge ${s.trendType || "positive"}`}>
                  {t(s.trend)}
                </span>
              )}
              {s.subtitle && <span>{t(s.subtitle)}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
