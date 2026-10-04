import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import PageHero from "../../components/PageHero.jsx";
import StatRow from "../../components/StatRow.jsx";
import { fetchTenantPreferences } from "../../utils/apiClient.js";
import { LEASES, PAYMENTS, MAINTENANCE_REQUESTS, propertyById, landlordById } from "../../data/db.js";

export default function TenantOverview() {
  const { user } = useContext(AuthContext);
  const { t } = useContext(SettingsContext);
  const navigate = useNavigate();

  const entityId = user?.entityId || user?.entity_id || "TEN001";
  const [savedPref, setSavedPref] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadPref() {
      try {
        const pref = await fetchTenantPreferences(entityId);
        if (isMounted && pref) setSavedPref(pref);
      } catch (err) {
        console.warn("Could not load preferences in overview:", err);
      }
    }
    loadPref();
    return () => {
      isMounted = false;
    };
  }, [entityId]);

  const lease =
    LEASES.find((l) => l.tenantId === entityId && l.status === "Active") ||
    LEASES.find((l) => l.tenantId === entityId);
  const property = lease ? propertyById(lease.propertyId) : (user?.isNewTenant ? null : propertyById("TN101"));
  const landlord = property ? landlordById(property.landlordId) : null;
  const myPayments = PAYMENTS.filter((p) => p.tenantId === entityId);
  const pendingPayments = myPayments.filter((p) => p.status !== "Paid");
  const myMaintenance = MAINTENANCE_REQUESTS.filter((m) => m.tenantId === entityId);
  const openMaintenance = myMaintenance.filter((m) => m.status !== "Completed");

  const stats = [
    {
      label: "Allotted Apartment",
      value: property?.id || "Discovery Mode",
      icon: "🏢",
      trend: property?.city || savedPref?.city || "Tamil Nadu",
      trendType: "neutral",
    },
    {
      label: "Agreed Rent",
      value: lease ? `₹${lease.rent.toLocaleString("en-IN")}/mo` : (savedPref?.budgetRange || "₹20,000–₹30,000"),
      icon: "💰",
      trend: lease ? "Due on 5th of month" : "Target Budget",
      trendType: "positive",
    },
    {
      label: "Pending Invoices",
      value: `${pendingPayments.length} Due`,
      icon: "💳",
      trend: pendingPayments.length > 0 ? "Action Required" : "All Settled",
      trendType: pendingPayments.length > 0 ? "negative" : "positive",
    },
    {
      label: "Service Requests",
      value: `${openMaintenance.length} Active`,
      icon: "⚙️",
      trend: `${myMaintenance.length} total tickets`,
      trendType: "neutral",
    },
  ];

  return (
    <div className="tenant-overview-page">
      <PageHero
        badge="Resident Living Portal"
        title="Tenant Residence & Billing Center"
        subtitle="Review your active tenancy lease, remit monthly rent online, inspect utility meters, and search verified properties"
        actions={
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => navigate("properties")}>
              🔍 {t("Find My Home")}
            </button>
            <button className="btn-outline" onClick={() => navigate("payments")}>
              {t("Pay Rent Online")}
            </button>
          </div>
        }
      />

      {/* Welcoming Property-Discovery Experience Card */}
      <div className="card new-tenant-welcome-banner animate-fade-in" style={{ marginBottom: "20px" }}>
        <div className="welcome-banner-content">
          <div className="welcome-banner-top-badge">✨ {t("Smart Property Discovery")}</div>
          <h2 className="welcome-banner-heading">
            {t("Welcome to PropConnect")}, {user?.name || t("Resident")}!
          </h2>
          <p className="welcome-banner-sub">
            {t("Let's find a home that fits your needs. Discover vetted residential apartments, independent villas, and gated communities across Chennai, Coimbatore, Madurai, Trichy, and Salem.")}
          </p>

          {savedPref && savedPref.city && (
            <div className="welcome-saved-pref-strip">
              <span className="pref-strip-label">{t("Your Saved Search:")}</span>
              <span className="pref-strip-tag">📍 {savedPref.city} {savedPref.locality ? `· ${savedPref.locality}` : ""}</span>
              <span className="pref-strip-tag">🛏️ {savedPref.bhk} BHK</span>
              <span className="pref-strip-tag">💰 {savedPref.budgetRange}</span>
              {savedPref.furnishing && savedPref.furnishing !== "No preference" && (
                <span className="pref-strip-tag">🛋️ {savedPref.furnishing}</span>
              )}
            </div>
          )}

          <div className="welcome-banner-actions">
            <button
              type="button"
              className="btn-primary welcome-btn"
              onClick={() => navigate("properties")}
            >
              🔍 {t("Find My Home")} →
            </button>
            <button
              type="button"
              className="btn-outline welcome-btn"
              onClick={() => navigate("properties?view=saved")}
            >
              ❤️ {t("My Saved Properties")}
            </button>
            <button
              type="button"
              className="btn-outline welcome-btn"
              onClick={() => navigate("properties")}
            >
              ⚙️ {t("View & Edit Preferences")}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <StatRow stats={stats} />

      {/* Leased Apartment Spotlight Card */}
      {property && (
        <div className="card my-apartment-spotlight">
          <div className="spotlight-badge-row">
            <span className="badge-city">{property.city}</span>
            <span className="pill active">{t("Active Lease Agreement")}</span>
            {lease && <span className="lease-reg-badge">{t("Govt Reg")}: {lease.regNumber || "TN-CH-REG-2026-8891"}</span>}
          </div>

          <div className="spotlight-content">
            <div className="spotlight-img-wrap" onClick={() => navigate(`properties/${property.id}`)}>
              <img src={property.image} alt={property.name} className="spotlight-img" loading="lazy" />
            </div>

            <div className="spotlight-details">
              <h3 className="spotlight-title" onClick={() => navigate(`properties/${property.id}`)}>
                {property.name}
              </h3>
              <p className="spotlight-loc">
                <span>📍</span> {property.location}
              </p>

              <div className="spotlight-specs">
                <span className="spec-pill">📐 {property.area} sqft</span>
                <span className="spec-pill">🛏 {property.bedrooms} BHK</span>
                <span className="spec-pill">🏢 {property.floor}</span>
                <span className="spec-pill">🧭 {property.facing}</span>
                <span className="spec-pill">⚡ EB: {property.ebConsumerNo}</span>
              </div>

              {landlord && (
                <div className="spotlight-landlord-hint">
                  <strong>{t("landlordDetails")}:</strong> {landlord.name} ({landlord.phone}) · {landlord.location}
                </div>
              )}

              <div className="spotlight-actions">
                <button className="btn-primary" onClick={() => navigate("payments")}>
                  {t("Pay Rent Online")}
                </button>
                <button className="btn-outline" onClick={() => navigate("maintenance")}>
                  {t("Raise Service Ticket")}
                </button>
                <button className="btn-outline" onClick={() => navigate(`properties/${property.id}`)}>
                  {t("View Unit Details →")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column: Recent Rent Invoices & Active Maintenance Requests */}
      <div className="dashboard-two-col">
        {/* Recent Rent Invoices */}
        <div className="card">
          <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
            <div>
              <h3 style={{ margin: 0 }}>{t("My Rent Invoices")}</h3>
              <p className="card-subtitle">{t("Recent payment history and upcoming rental charges")}</p>
            </div>
            <button className="btn-outline" onClick={() => navigate("payments")}>
              {t("All Invoices →")}
            </button>
          </div>

          <div className="table-responsive" style={{ marginTop: "12px" }}>
            <table>
              <thead>
                <tr>
                  <th>{t("invoice")}</th>
                  <th>{t("month")}</th>
                  <th>{t("amount")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {myPayments.slice(0, 4).map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.id}</strong></td>
                    <td>{p.month}</td>
                    <td><strong>₹{p.amount.toLocaleString("en-IN")}</strong></td>
                    <td>
                      <span className={`pill ${p.status.toLowerCase()}`}>
                        {t(p.status.toLowerCase()) || p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance Service Requests */}
        <div className="card">
          <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
            <div>
              <h3 style={{ margin: 0 }}>{t("My Service Requests")}</h3>
              <p className="card-subtitle">{t("Technician and plumbing dispatches for this flat")}</p>
            </div>
            <button className="btn-outline" onClick={() => navigate("maintenance")}>
              {t("View All →")}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
            {myMaintenance.slice(0, 4).map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: "var(--bg-subtle)",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "var(--ink-primary)" }}>
                    {m.issueText || m.issue || "Maintenance Ticket"}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--ink-muted)", marginTop: "2px" }}>
                    Logged on {m.date} · Vendor: {m.vendor || "Assigned"}
                  </div>
                </div>
                <span className={`pill ${m.status === "Completed" ? "paid" : "pending"}`}>
                  {t(m.status.toLowerCase()) || m.status}
                </span>
              </div>
            ))}
            {myMaintenance.length === 0 && (
              <div className="empty" style={{ textAlign: "center", padding: "20px", color: "var(--ink-muted)" }}>
                {t("No maintenance tickets logged. Everything is in working order!")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
