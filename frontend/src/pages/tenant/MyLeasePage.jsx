import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import PageHero from "../../components/PageHero.jsx";
import DataTable from "../../components/DataTable.jsx";
import { LEASES, propertyById, landlordById } from "../../data/db.js";

export default function MyLeasePage() {
  const { user } = useContext(AuthContext);
  const { t } = useContext(SettingsContext);
  const navigate = useNavigate();

  const entityId = user?.entityId || user?.entity_id || "TEN001";
  const myLeases = LEASES.filter((l) => l.tenantId === entityId);
  const primaryLease = myLeases.find((l) => l.id === "LSE001" || l.status === "Active") || myLeases[0];
  const property = primaryLease ? propertyById(primaryLease.propertyId) : null;
  const landlord = property ? landlordById(property.landlordId) : null;

  const columns = [
    { key: "id", label: t("leaseId") },
    {
      key: "propertyName",
      label: t("property"),
      render: (r) => (
        <span
          className="link-text"
          onClick={() => navigate(`../properties/${r.propertyId}`)}
        >
          {r.propertyName}
        </span>
      ),
    },
    {
      key: "period",
      label: `${t("startDate")} – ${t("endDate")}`,
      render: (r) => `${r.startDate} to ${r.endDate}`,
    },
    {
      key: "rent",
      label: t("rent"),
      render: (r) => `₹${r.rent.toLocaleString("en-IN")}/mo`,
    },
    {
      key: "deposit",
      label: t("deposit"),
      render: (r) => `₹${r.deposit.toLocaleString("en-IN")}`,
    },
    {
      key: "status",
      label: t("status"),
      render: (r) => (
        <span className={`pill ${r.status.toLowerCase()}`}>{t(r.status.toLowerCase())}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHero title={t("myLease")} subtitle={t("tenantHeroSubtitle")} />

      {primaryLease && property && (
        <div className="card" style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0 }}>{primaryLease.propertyName}</h3>
              <p style={{ color: "var(--muted)", margin: "4px 0 12px", fontSize: "13px" }}>
                📍 {property.location}
              </p>
            </div>
            <span className={`pill ${primaryLease.status.toLowerCase()}`}>
              {t(primaryLease.status.toLowerCase())}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "12px" }}>
            <div className="kv"><span className="k">{t("leaseId")}</span><span className="v">{primaryLease.id}</span></div>
            <div className="kv"><span className="k">{t("rent")}</span><span className="v">₹{primaryLease.rent.toLocaleString("en-IN")}/mo</span></div>
            <div className="kv"><span className="k">{t("deposit")}</span><span className="v">₹{property.deposit.toLocaleString("en-IN")}</span></div>
            <div className="kv"><span className="k">{t("startDate")}</span><span className="v">{primaryLease.startDate}</span></div>
            <div className="kv"><span className="k">{t("endDate")}</span><span className="v">{primaryLease.endDate}</span></div>
            {landlord && (
              <div className="kv"><span className="k">{t("landlord")}</span><span className="v">{landlord.name} ({landlord.phone})</span></div>
            )}
          </div>

          <div style={{ marginTop: "16px" }}>
            <h4 style={{ margin: "0 0 8px", fontSize: "12px", textTransform: "uppercase", color: "var(--muted)" }}>
              {t("amenitiesLabel")}
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {property.amenities.map((a) => (
                <span className="amenity-chip" key={a}>{a}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <DataTable
        title={t("leasesTable")}
        columns={columns}
        rows={myLeases}
        searchKeys={["id", "propertyName", "status"]}
        searchPlaceholder={t("search")}
      />
    </div>
  );
}
