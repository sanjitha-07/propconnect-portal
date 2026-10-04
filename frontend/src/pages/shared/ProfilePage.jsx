import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import PageHero from "../../components/PageHero.jsx";
import { landlordById, tenantById } from "../../data/db.js";

export default function ProfilePage() {
  const { user } = useContext(AuthContext);
  const { t } = useContext(SettingsContext);

  const entityId = user?.entityId || user?.entity_id || (user.role === "tenant" ? "TEN001" : "LDL001");
  const entity =
    user.role === "landlord" ? landlordById(entityId)
    : user.role === "tenant" ? tenantById(entityId)
    : null;

  const [fullName, setFullName] = useState(entity?.name || user.name);
  const [email, setEmail] = useState(entity?.email || user.email);
  const [phone, setPhone] = useState(entity?.phone || "+91 98400 99887");
  const [address, setAddress] = useState("No. 12, Anna Nagar, Chennai - 600040, Tamil Nadu");
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = () => {
    setResetSent(true);
    setTimeout(() => setResetSent(false), 4000);
  };

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "TL";

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      <PageHero
        badge="Account &amp; Security"
        title={t("myProfile")}
        subtitle="Manage your profile credentials, registered phone, and Tamil Nadu regional billing address"
      />

      <form className="card" onSubmit={handleSave} style={{ padding: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "28px", paddingBottom: "20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div
            className="user-avatar-circle"
            style={{ width: "64px", height: "64px", fontSize: "22px", background: "var(--brand-blue-subtle)", color: "var(--brand-blue)" }}
          >
            {initials}
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{fullName}</h3>
            <span className="pill active" style={{ marginTop: "6px" }}>
              {t(user.role)} Account
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>{t("fullName")}</label>
            <input className="inp" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>{t("email")}</label>
            <input className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>{t("phone")}</label>
            <input className="inp" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>{t("address")}</label>
            <input className="inp" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>{t("role")}</label>
            <input className="inp" value={t(user.role)} disabled style={{ background: "var(--bg-subtle)" }} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)" }}>
          <div>
            <button type="button" className="btn-outline" onClick={handleResetPassword}>
              {t("changePassword")}
            </button>
            {resetSent && (
              <span className="pill active" style={{ marginLeft: "10px", fontSize: "11.5px" }}>
                ✓ Reset link sent to registered email
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {saved && <span className="pill paid">✓ Changes Saved Successfully</span>}
            <button type="submit" className="btn-primary">
              {t("saveChanges")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
