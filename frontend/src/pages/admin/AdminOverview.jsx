import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import PageHero from "../../components/PageHero.jsx";
import StatRow from "../../components/StatRow.jsx";
import {
  LANDLORDS,
  TENANTS,
  PROPERTIES,
  LEASES,
  PAYMENTS,
  MAINTENANCE_REQUESTS,
  COMPLAINTS,
} from "../../data/db.js";

export default function AdminOverview() {
  const { t } = useContext(SettingsContext);
  const navigate = useNavigate();

  // Real Database Metrics Computations
  const totalProperties = PROPERTIES.length;
  const occupiedProperties = PROPERTIES.filter((p) => p.status === "Occupied");
  const vacantProperties = PROPERTIES.filter((p) => p.status === "Available");
  const occupancyRate = Math.round((occupiedProperties.length / totalProperties) * 100);

  const activeTenants = TENANTS.filter((tn) => tn.status === "Active").length;
  const activeLeases = LEASES.filter((l) => l.status === "Active").length;

  const currentMonthPayments = PAYMENTS.filter((p) => p.month?.includes("Sep 2026") || p.month === "Sep");
  const paidPayments = currentMonthPayments.filter((p) => p.status === "Paid");
  const pendingPayments = currentMonthPayments.filter((p) => p.status === "Pending");
  const overduePayments = currentMonthPayments.filter((p) => p.status === "Overdue");

  const totalCollected = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalOverdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0);

  const openMaintenance = MAINTENANCE_REQUESTS.filter(
    (m) => m.status !== "Completed" && m.status !== "Resolved"
  );
  const openComplaints = COMPLAINTS.filter((c) => c.status !== "Resolved");

  // KPI Cards array (10 key SaaS metrics)
  const stats = [
    {
      label: "Total Properties",
      value: totalProperties,
      icon: "🏢",
      trend: `${PROPERTIES.length} TN listings`,
      trendType: "neutral",
    },
    {
      label: "Occupied Units",
      value: occupiedProperties.length,
      icon: "🔑",
      trend: `${occupancyRate}% Occupancy`,
      trendType: "positive",
    },
    {
      label: "Vacant & Ready",
      value: vacantProperties.length,
      icon: "🟢",
      trend: `${vacantProperties.length} available`,
      trendType: "positive",
    },
    {
      label: "Active Tenants",
      value: activeTenants,
      icon: "👥",
      trend: `${LANDLORDS.length} landlords`,
      trendType: "neutral",
    },
    {
      label: "Active Leases",
      value: activeLeases,
      icon: "📜",
      trend: `${LEASES.length} total leases`,
      trendType: "neutral",
    },
    {
      label: "September Rent Collected",
      value: `₹${totalCollected.toLocaleString("en-IN")}`,
      icon: "💰",
      trend: `${paidPayments.length} paid invoices`,
      trendType: "positive",
    },
    {
      label: "Pending Dues",
      value: `₹${totalPendingAmount.toLocaleString("en-IN")}`,
      icon: "⏳",
      trend: `${pendingPayments.length} pending`,
      trendType: "negative",
    },
    {
      label: "Overdue Payments",
      value: `₹${totalOverdueAmount.toLocaleString("en-IN")}`,
      icon: "⚠️",
      trend: `${overduePayments.length} overdue`,
      trendType: "negative",
    },
    {
      label: "Open Maintenance",
      value: openMaintenance.length,
      icon: "⚙️",
      trend: `${openMaintenance.filter((m) => m.priority === "High" || m.priority === "Urgent").length} high priority`,
      trendType: "negative",
    },
    {
      label: "Open Complaints",
      value: openComplaints.length,
      icon: "🔔",
      trend: `${COMPLAINTS.length} total filed`,
      trendType: "neutral",
    },
  ];

  // Monthly Rent Collection Chart data from REAL database records
  const monthlyTrends = useMemo(() => {
    const months = [
      { key: "May", label: "May" },
      { key: "Jun", label: "Jun" },
      { key: "Jul", label: "Jul" },
      { key: "Aug", label: "Aug" },
      { key: "Sep", label: "Sep" },
    ];
    return months.map((m) => {
      const monthRows = PAYMENTS.filter((p) => (p.month || "").includes(m.key));
      const collected = monthRows
        .filter((p) => p.status === "Paid")
        .reduce((sum, p) => sum + p.amount, 0);
      const pending = monthRows
        .filter((p) => p.status !== "Paid")
        .reduce((sum, p) => sum + p.amount, 0);
      return {
        month: m.label,
        collected,
        pending,
        total: collected + pending,
      };
    });
  }, []);

  const maxMonthValue = Math.max(...monthlyTrends.map((m) => m.collected + m.pending), 100000);

  // Tamil Nadu City distribution
  const cityData = [
    { name: "Chennai", count: PROPERTIES.filter((p) => p.city === "Chennai").length, color: "#2563eb" },
    { name: "Coimbatore", count: PROPERTIES.filter((p) => p.city === "Coimbatore").length, color: "#16a34a" },
    { name: "Madurai", count: PROPERTIES.filter((p) => p.city === "Madurai").length, color: "#d97706" },
    { name: "Trichy", count: PROPERTIES.filter((p) => p.city === "Trichy").length, color: "#7c3aed" },
    { name: "Salem", count: PROPERTIES.filter((p) => p.city === "Salem").length, color: "#0891b2" },
    {
      name: "Tiruppur & Others",
      count: PROPERTIES.filter((p) => !["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem"].includes(p.city)).length,
      color: "#64748b",
    },
  ];

  // Featured apartment buildings
  const featuredBuildings = PROPERTIES.slice(0, 4);

  return (
    <div className="admin-overview-page">
      <PageHero
        badge="Tamil Nadu State Central Hub"
        title="Property Management Operations Console"
        subtitle="Real-time portfolio visibility, tenant leases, automated rent billing, and municipal maintenance tracking"
        actions={
          <button className="btn-primary" onClick={() => navigate("properties")}>
            + Add Property
          </button>
        }
      />

      {/* 10 KPI Cards Row */}
      <StatRow stats={stats} />

      {/* Primary Analytics Section: Monthly Revenue Trend + Occupancy & Health */}
      <div className="dashboard-two-col" style={{ gridTemplateColumns: "1.6fr 1fr", marginBottom: "24px" }}>
        {/* Monthly Rental Income Chart (Real DB data) */}
        <div className="card">
          <div className="row-between">
            <div>
              <h3 style={{ margin: 0 }}>{t("Monthly Rental Income & Collection Trend")}</h3>
              <p className="card-subtitle">{t("Actual rent collected vs. pending receivables (May - Sep 2026)")}</p>
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "12px", alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#2563eb" }} /> {t("Collected")}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#cbd5e1" }} /> {t("Pending")}
              </span>
            </div>
          </div>

          {/* SVG Column Chart */}
          <div style={{ width: "100%", height: "240px", marginTop: "20px" }}>
            <svg viewBox="0 0 500 200" style={{ width: "100%", height: "100%", overflow: "visible" }}>
              {/* Grid Lines */}
              {[0, 50, 100, 150].map((y) => (
                <line
                  key={y}
                  x1="30"
                  y1={y}
                  x2="490"
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))}

              {monthlyTrends.map((m, idx) => {
                const barWidth = 46;
                const gap = 90;
                const x = 50 + idx * gap;
                const totalHeight = (m.total / maxMonthValue) * 140;
                const collectedHeight = (m.collected / maxMonthValue) * 140;
                const pendingHeight = totalHeight - collectedHeight;

                const yBase = 160;
                const yCollected = yBase - collectedHeight;
                const yPending = yCollected - pendingHeight;

                return (
                  <g key={m.month}>
                    {/* Pending Bar */}
                    {pendingHeight > 0 && (
                      <rect
                        x={x}
                        y={yPending}
                        width={barWidth}
                        height={pendingHeight}
                        fill="#cbd5e1"
                        rx="3"
                      />
                    )}
                    {/* Collected Bar */}
                    <rect
                      x={x}
                      y={yCollected}
                      width={barWidth}
                      height={collectedHeight}
                      fill="#2563eb"
                      rx="3"
                    />
                    {/* Value Label */}
                    <text
                      x={x + barWidth / 2}
                      y={yCollected - 6}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="10"
                      fontWeight="600"
                    >
                      ₹{(m.collected / 1000).toFixed(0)}k
                    </text>
                    {/* Month Label */}
                    <text
                      x={x + barWidth / 2}
                      y={180}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="12"
                      fontWeight="500"
                    >
                      {m.month}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Occupancy & Financial Health Card */}
        <div className="card ops-health-card">
          <div className="card-header">
            <div>
              <h3>{t("Occupancy & Rent Health")}</h3>
              <p className="card-subtitle">{t("Real-time status of Tamil Nadu units")}</p>
            </div>
            <span className="pill active">{occupancyRate}% {t("Leased")}</span>
          </div>

          <div className="metric-gauge-box">
            <div className="gauge-number" style={{ color: "var(--brand-blue)" }}>
              {occupancyRate}%
            </div>
            <div className="gauge-label">{t("Active Property Occupancy")}</div>
            <div className="gauge-sub">
              {occupiedProperties.length} {t("Occupied")} · {vacantProperties.length} {t("Ready to Move In")}
            </div>
          </div>

          <div className="ops-pills-row">
            <div className="ops-pill">
              <span className="ops-pill-num" style={{ color: "#16a34a" }}>
                ₹{(totalCollected / 1000).toFixed(0)}k
              </span>
              <span className="ops-pill-lbl">{t("Collected")}</span>
            </div>
            <div className="ops-pill">
              <span className="ops-pill-num" style={{ color: "#d97706" }}>
                ₹{(totalPendingAmount / 1000).toFixed(0)}k
              </span>
              <span className="ops-pill-lbl">{t("Pending")}</span>
            </div>
            <div className="ops-pill">
              <span className="ops-pill-num" style={{ color: "#dc2626" }}>
                ₹{(totalOverdueAmount / 1000).toFixed(0)}k
              </span>
              <span className="ops-pill-lbl">{t("Overdue")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Properties Showcase Reel */}
      <div className="card showcase-banner-card">
        <div className="row-between">
          <div>
            <h3 style={{ margin: 0 }}>{t("Featured Residential Complexes")}</h3>
            <p className="sub-text" style={{ margin: "4px 0 0 0" }}>
              {t("Verified apartment communities across Chennai, Coimbatore, Madurai, Trichy, and Salem")}
            </p>
          </div>
          <button className="btn-outline" onClick={() => navigate("properties")}>
            {t("View All Properties →")}
          </button>
        </div>

        <div className="featured-prop-reel">
          {featuredBuildings.map((p) => (
            <div
              key={p.id}
              className="featured-prop-mini-card"
              onClick={() => navigate(`properties/${p.id}`)}
            >
              <div className="mini-card-img-wrap">
                <img src={p.image} alt={p.name} className="mini-card-img" loading="lazy" />
                <span className="mini-city-badge">{p.city}</span>
                <span className={`pill ${p.status.toLowerCase()} mini-pill`}>{t(p.status.toLowerCase()) || p.status}</span>
              </div>
              <div className="mini-card-info">
                <h4 className="mini-card-title">{p.name}</h4>
                <div className="mini-card-row">
                  <span className="mini-rent">₹{p.rent.toLocaleString("en-IN")}/mo</span>
                  <span className="mini-bhk">{p.bedrooms ? `${p.bedrooms} BHK` : p.furnishing}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Grid: City Distribution & Urgent Maintenance Operations */}
      <div className="dashboard-two-col">
        {/* City Wise Breakdown */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3>{t("Tamil Nadu Regional Footprint")}</h3>
              <p className="card-subtitle">{t("Property units distributed across municipal zones")}</p>
            </div>
          </div>
          <div className="city-bars-list">
            {cityData.map((c) => {
              const pct = Math.round((c.count / PROPERTIES.length) * 100);
              return (
                <div key={c.name} className="city-bar-item">
                  <div className="city-bar-header">
                    <span className="city-name">{c.name}</span>
                    <span className="city-count">
                      {c.count} {t("properties")} ({pct}%)
                    </span>
                  </div>
                  <div className="city-bar-track">
                    <div
                      className="city-bar-fill"
                      style={{ width: `${pct}%`, backgroundColor: c.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Operational Work Orders */}
        <div className="card">
          <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
            <div>
              <h3 style={{ margin: 0 }}>{t("Active Operations & Work Orders")}</h3>
              <p className="card-subtitle">{t("Urgent service requests requiring municipal or technician dispatch")}</p>
            </div>
            <button className="btn-outline" onClick={() => navigate("maintenance")}>
              {t("All Tickets →")}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
            {MAINTENANCE_REQUESTS.slice(0, 5).map((m) => (
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
                  <div style={{ fontSize: "11.5px", color: "var(--ink-muted)", marginTop: "2px" }}>
                    {m.propertyName} · Tenant: {m.tenantName}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    className="pill"
                    style={{
                      background: m.priority === "High" ? "var(--red-bg)" : "var(--amber-bg)",
                      color: m.priority === "High" ? "var(--red)" : "var(--amber)",
                    }}
                  >
                    {m.priority}
                  </span>
                  <span className={`pill ${m.status === "Completed" ? "paid" : "pending"}`}>
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
