import {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
  useRef,
  use,
} from "react";
import { useNavigate } from "react-router-dom";
import PageHero from "../../components/PageHero.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import { PROPERTIES } from "../../data/db.js";

const MONTH_KEYS = {
  May: "monthMay",
  Jun: "monthJun",
  Jul: "monthJul",
  Aug: "monthAug",
  Sep: "monthSep",
};

/* ------------------------------------------------------------------ */
/* Simulated backend call. Wrapped in a module-level cached promise so */
/* the `use` hook has something to suspend on and resolve just once.   */
/* ------------------------------------------------------------------ */
let cachedPromise = null;
function fetchDashboardData() {
  if (!cachedPromise) {
    cachedPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          properties: 16,
          activeLeases: 13,
          monthlyRent: 432500,
          pending: 71000,
          payments: [
            { id: "INV001", tenant: "Divya Priya", property: "Sai Kala #302", amount: 22000, status: "Pending", month: "Sep" },
            { id: "INV004", tenant: "Arjun Kumar", property: "Vaigai Enclave #104", amount: 26000, status: "Pending", month: "Sep" },
            { id: "INV013", tenant: "Meena Suresh", property: "Meenakshi Heights #201", amount: 16500, status: "Paid", month: "Sep" },
            { id: "INV015", tenant: "Anitha S.", property: "Cauvery Towers #505", amount: 18000, status: "Paid", month: "Sep" },
            { id: "INV016", tenant: "Pradeep Raj", property: "Kovai Residency #12", amount: 35000, status: "Paid", month: "Sep" },
            { id: "INV017", tenant: "Koushik Raghavan", property: "Sri Ganesh #101", amount: 28000, status: "Pending", month: "Sep" },
            { id: "INV019", tenant: "Vigneshwaran K.", property: "Hiranandani #1204", amount: 32000, status: "Paid", month: "Sep" },
            { id: "INV022", tenant: "Sneha Sundar", property: "Prestige Bella #406", amount: 34000, status: "Paid", month: "Sep" },
            { id: "INV002", tenant: "Divya Priya", property: "Sai Kala #302", amount: 22000, status: "Paid", month: "Aug" },
            { id: "INV003", tenant: "Arjun Kumar", property: "Vaigai Enclave #104", amount: 26000, status: "Paid", month: "Aug" },
            { id: "INV005", tenant: "Meena Suresh", property: "Meenakshi Heights #201", amount: 16500, status: "Paid", month: "Aug" },
            { id: "INV007", tenant: "Anitha S.", property: "Cauvery Towers #505", amount: 18000, status: "Paid", month: "Aug" },
            { id: "INV008", tenant: "Pradeep Raj", property: "Kovai Residency #12", amount: 35000, status: "Paid", month: "Aug" },
            { id: "INV026", tenant: "Koushik Raghavan", property: "Sri Ganesh #101", amount: 28000, status: "Paid", month: "Aug" },
            { id: "INV031", tenant: "Sneha Sundar", property: "Prestige Bella #406", amount: 34000, status: "Paid", month: "Aug" },
            { id: "INV009", tenant: "Divya Priya", property: "Sai Kala #302", amount: 22000, status: "Paid", month: "Jul" },
            { id: "INV006", tenant: "Vignesh R.", property: "Pearl Beach Villa", amount: 48000, status: "Paid", month: "Jul" },
            { id: "INV034", tenant: "Arjun Kumar", property: "Vaigai Enclave #104", amount: 26000, status: "Paid", month: "Jul" },
            { id: "INV010", tenant: "Divya Priya", property: "Sai Kala #302", amount: 22000, status: "Paid", month: "Jun" },
            { id: "INV011", tenant: "Divya Priya", property: "Sai Kala #302", amount: 22000, status: "Paid", month: "May" },
          ],
        });
      }, 250);
    });
  }
  return cachedPromise;
}

const INITIAL_REQUESTS = [
  { id: "REQ001", name: "Priya Ramesh", property: "Sai Kala Apartments · Flat 401", location: "T. Nagar, Chennai", budget: "₹24,000/mo", status: "Pending" },
  { id: "REQ002", name: "Suresh Kumar", property: "Casagrand Lorenza · Flat 302", location: "Saravanampatti, Coimbatore", budget: "₹23,000/mo", status: "Pending" },
  { id: "REQ003", name: "Kavitha Sundaram", property: "Prestige Bella Vista · Flat 604", location: "Porur, Chennai", budget: "₹34,000/mo", status: "Pending" },
  { id: "REQ004", name: "Rajesh V.", property: "Hiranandani Parks · Flat 803", location: "Oragadam, Chennai", budget: "₹32,000/mo", status: "Pending" },
  { id: "REQ005", name: "Deepak Natarajan", property: "Olympia Opaline · Flat 501", location: "Navalur OMR, Chennai", budget: "₹29,000/mo", status: "Pending" },
  { id: "REQ006", name: "Bhuvaneshwari S.", property: "Cauvery Towers · Flat 302", location: "Thillai Nagar, Trichy", budget: "₹18,000/mo", status: "Pending" },
];

export default function LandlordOverview() {
  const { t } = useContext(SettingsContext);
  const navigate = useNavigate();

  // Suspense hook resolution
  const data = use(fetchDashboardData());

  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("Sep");
  const [requests, setRequests] = useState(INITIAL_REQUESTS);

  const searchInputRef = useRef(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const monthPayments = data.payments.filter((p) => p.month === month);

  const paymentStats = useMemo(() => {
    const total = monthPayments.length || 1;
    const count = (status) => monthPayments.filter((p) => p.status === status).length;
    return {
      paidPct: Math.round((count("Paid") / total) * 100),
      pendingPct: Math.round((count("Pending") / total) * 100),
      overduePct: Math.round((count("Overdue") / total) * 100),
      paidCount: count("Paid"),
      pendingCount: count("Pending"),
      overdueCount: count("Overdue"),
    };
  }, [monthPayments]);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
  }, []);

  const handleRequestAction = useCallback((id, status) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }, []);

  const filteredPayments = monthPayments.filter(
    (p) =>
      p.tenant.toLowerCase().includes(search.toLowerCase()) ||
      (p.property || "").toLowerCase().includes(search.toLowerCase())
  );

  // Featured units owned
  const myProperties = PROPERTIES.slice(0, 4);

  return (
    <div className="landlord-overview-page">
      <PageHero
        badge="Landlord Portfolio Hub"
        title="Residential Assets &amp; Rent Roll"
        subtitle="Manage your apartment complexes, verify rent receipts, track lease terms, and review tenant applications"
        actions={
          <button className="btn-primary" onClick={() => navigate("properties")}>
            {t("+ Register New Flat")}
          </button>
        }
      />

      {/* KPI Stat Metrics */}
      <div className="stat-row">
        <Stat
          label={t("properties")}
          value={data.properties}
          icon="🏢"
          trend={t("85% Occupied")}
          trendType="positive"
        />
        <Stat
          label={t("activeLeases")}
          value={data.activeLeases}
          icon="📜"
          trend={t("3 Expiring soon")}
          trendType="neutral"
        />
        <Stat
          label={t("monthlyRent")}
          value={`₹${data.monthlyRent.toLocaleString("en-IN")}`}
          icon="💰"
          trend={t("Projected Monthly")}
          trendType="positive"
        />
        <Stat
          label={t("pending")}
          value={`₹${data.pending.toLocaleString("en-IN")}`}
          icon="⏳"
          trend={t("Pending Collection")}
          trendType="negative"
        />
      </div>

      {/* Featured Properties Showcase */}
      <div className="card showcase-banner-card">
        <div className="row-between">
          <div>
            <h3 style={{ margin: 0 }}>{t("My Tamil Nadu Apartment Portfolio")}</h3>
            <p className="card-subtitle">{t("Direct oversight of owned residential units in Chennai, Coimbatore, and Trichy")}</p>
          </div>
          <button className="btn-outline" onClick={() => navigate("properties")}>
            {t("Manage All Properties →")}
          </button>
        </div>

        <div className="featured-prop-reel">
          {myProperties.map((p) => (
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
                  <span className="mini-bhk">{p.bedrooms ? `${p.bedrooms} BHK` : "Dedicated Unit"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card property-controls-card" style={{ padding: "16px 20px" }}>
        <div className="controls-row">
          <div className="search-wrap">
            <input
              ref={searchInputRef}
              className="search-input"
              value={search}
              onChange={handleSearchChange}
              placeholder={t("Search tenant name or apartment number…")}
            />
            {search && (
              <button className="clear-search-btn" onClick={() => setSearch("")}>
                ✕
              </button>
            )}
          </div>

          <div className="status-filter-group">
            <label htmlFor="month">{t("month")}:</label>
            <select id="month" value={month} onChange={(e) => setMonth(e.target.value)}>
              {["Sep", "Aug", "Jul", "Jun", "May"].map((m) => (
                <option key={m} value={m}>
                  {m} 2026 {m === "Sep" ? "(Current Billing)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Collection Health & Invoices */}
      <div className="dashboard-two-col">
        {/* Payment Collection Health Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3>{t("Collection Performance")} ({month} 2026)</h3>
              <p className="card-subtitle">{t("Breakdown of rent remittances for the billing cycle")}</p>
            </div>
            <span className="pill paid">{paymentStats.paidPct}% {t("Collected")}</span>
          </div>

          <div style={{ display: "flex", gap: "16px", margin: "16px 0", flexWrap: "wrap" }}>
            <div style={{ flex: 1, background: "var(--bg-subtle)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 600 }}>{t("paid")}</span>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--green)", marginTop: "2px" }}>
                {paymentStats.paidCount} Units ({paymentStats.paidPct}%)
              </div>
            </div>
            <div style={{ flex: 1, background: "var(--bg-subtle)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 600 }}>{t("pending")}</span>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--amber)", marginTop: "2px" }}>
                {paymentStats.pendingCount} Units ({paymentStats.pendingPct}%)
              </div>
            </div>
          </div>

          <div className="city-bar-track" style={{ height: "10px", borderRadius: "5px" }}>
            <div className="city-bar-fill" style={{ width: `${paymentStats.paidPct}%`, backgroundColor: "#16a34a" }} />
            <div className="city-bar-fill" style={{ width: `${paymentStats.pendingPct}%`, backgroundColor: "#d97706" }} />
          </div>
        </div>

        {/* Payments Table */}
        <div className="card">
          <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
            <div>
              <h3 style={{ margin: 0 }}>{t("Rent Collections")} ({month} 2026)</h3>
              <p className="card-subtitle">{filteredPayments.length} {t("invoices found")}</p>
            </div>
          </div>
          <div className="table-responsive" style={{ maxHeight: "280px", overflowY: "auto", marginTop: "12px" }}>
            <table>
              <thead>
                <tr>
                  <th>{t("invoice")}</th>
                  <th>{t("tenant")}</th>
                  <th>{t("property")}</th>
                  <th>{t("amount")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.id}</strong></td>
                    <td>{p.tenant}</td>
                    <td><small>{p.property}</small></td>
                    <td><strong>₹{p.amount.toLocaleString("en-IN")}</strong></td>
                    <td>
                      <span className={`pill ${p.status.toLowerCase()}`}>
                        {t(p.status.toLowerCase())}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty">
                      {search ? `${t("noMatch")} "${search}"` : `${t("noRecords")} ${month}`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Prospective Tenant Applications */}
      <div className="card">
        <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
          <div>
            <h3 style={{ margin: 0 }}>{t("Prospective Tenant Applications")}</h3>
            <p className="card-subtitle">{t("Rental inquiries awaiting landlord verification and KYC review")}</p>
          </div>
          <span className="badge-count">
            {requests.filter((r) => r.status === "Pending").length} Pending Review
          </span>
        </div>

        <div className="table-responsive" style={{ marginTop: "14px" }}>
          <table>
            <thead>
              <tr>
                <th>{t("Applicant")}</th>
                <th>{t("Target Apartment")}</th>
                <th>{t("Locality")}</th>
                <th>{t("Budget")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.property}</td>
                  <td><span className="city-tag">{r.location}</span></td>
                  <td><strong>{r.budget}</strong></td>
                  <td>
                    <span className={`pill ${r.status.toLowerCase()}`}>
                      {t(r.status.toLowerCase())}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {r.status === "Pending" ? (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn-primary"
                          style={{ padding: "4px 10px", fontSize: "11px" }}
                          onClick={() => handleRequestAction(r.id, "Approved")}
                        >
                          {t("approve")}
                        </button>
                        <button
                          className="btn-outline"
                          style={{ padding: "4px 10px", fontSize: "11px", color: "var(--red)" }}
                          onClick={() => handleRequestAction(r.id, "Rejected")}
                        >
                          {t("reject")}
                        </button>
                      </div>
                    ) : (
                      <span className="pill completed">✓ {t("Processed")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, trend, trendType }) {
  const { t } = useContext(SettingsContext);
  return (
    <div className="stat">
      <div className="stat-header">
        <span className="lbl">{t(label)}</span>
        {icon && <span className="stat-icon-wrap">{icon}</span>}
      </div>
      <div className="val">{value}</div>
      {trend && (
        <div className="stat-footer">
          <span className={`trend-badge ${trendType || "positive"}`}>{t(trend)}</span>
        </div>
      )}
    </div>
  );
}
