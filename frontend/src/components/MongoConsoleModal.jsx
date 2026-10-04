import { useState, useEffect } from "react";
import { fetchDbStatus, executeMongoQuery } from "../utils/apiClient.js";

const PRESET_QUERIES = [
  {
    collection: "properties",
    label: "Properties in Chennai",
    filter: { city: "Chennai" },
    code: 'properties.find({ "city": "Chennai" })',
  },
  {
    collection: "payments",
    label: "Pending Rent Payments",
    filter: { status: "Pending" },
    code: 'payments.find({ "status": "Pending" })',
  },
  {
    collection: "maintenance_requests",
    label: "Active Maintenance Tickets",
    filter: { status: { $ne: "Resolved" } },
    code: 'maintenance_requests.find({ "status": { "$ne": "Resolved" } })',
  },
  {
    collection: "properties",
    label: "Available 2+ BHK Units",
    filter: { status: "Available", bedrooms: { $gte: 2 } },
    code: 'properties.find({ "status": "Available", "bedrooms": { "$gte": 2 } })',
  },
  {
    collection: "complaints",
    label: "Open Tenant Complaints",
    filter: { status: "Open" },
    code: 'complaints.find({ "status": "Open" })',
  },
];

const COLLECTIONS_LIST = [
  { key: "users", name: "Users", icon: "👤", desc: "User credentials & roles" },
  { key: "landlords", name: "Landlords", icon: "🏢", desc: "Verified property owners" },
  { key: "tenants", name: "Tenants", icon: "👥", desc: "Active & verified tenants" },
  { key: "properties", name: "Properties", icon: "🏠", desc: "Rental listings & units" },
  { key: "leases", name: "Leases", icon: "📜", desc: "Rental agreements & terms" },
  { key: "payments", name: "Payments", icon: "💳", desc: "Rent invoices & receipts" },
  { key: "maintenance_requests", name: "Maintenance", icon: "🔧", desc: "Service tickets & requests" },
  { key: "complaints", name: "Complaints", icon: "⚠️", desc: "Tenant grievance reports" },
  { key: "security_deposits", name: "Security Deposits", icon: "🛡️", desc: "Escrow funds & refunds" },
  { key: "utility_bills", name: "Utility Bills", icon: "💡", desc: "EB & water consumption" },
  { key: "expenses", name: "Expenses", icon: "📊", desc: "Building maintenance costs" },
  { key: "documents", name: "Documents", icon: "📁", desc: "PDFs & contracts" },
  { key: "notifications", name: "Notifications", icon: "🔔", desc: "System alerts & reminders" },
];

export default function MongoConsoleModal({ isOpen, onClose }) {
  const [dbStatus, setDbStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState("properties");
  const [queryFilterText, setQueryFilterText] = useState('{\n  "city": "Chennai"\n}');
  const [executing, setExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "console" | "compass"
  const [copied, setCopied] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    const data = await fetchDbStatus();
    setDbStatus(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      handleRunQuery("properties", { city: "Chennai" });
    }
  }, [isOpen]);

  const handleCopyCompassUri = () => {
    const uri = dbStatus?.compassUri || "mongodb://127.0.0.1:27017";
    navigator.clipboard.writeText(uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRunQuery = async (targetCol, customFilter) => {
    const col = targetCol || selectedCollection;
    let filterObj = {};
    if (customFilter) {
      filterObj = customFilter;
    } else {
      try {
        filterObj = JSON.parse(queryFilterText);
      } catch (err) {
        setQueryResult({ success: false, error: "Invalid JSON filter: " + err.message });
        return;
      }
    }

    setExecuting(true);
    const result = await executeMongoQuery({
      collection: col,
      filter: filterObj,
      limit: 20,
    });
    setQueryResult(result);
    setExecuting(false);
  };

  const handleSelectPreset = (preset) => {
    setSelectedCollection(preset.collection);
    setQueryFilterText(JSON.stringify(preset.filter, null, 2));
    handleRunQuery(preset.collection, preset.filter);
  };

  const handleCardClick = (colKey) => {
    setSelectedCollection(colKey);
    setQueryFilterText("{}");
    setActiveTab("console");
    handleRunQuery(colKey, {});
  };

  if (!isOpen) return null;

  const isConnected = dbStatus?.status === "connected";

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "920px",
          width: "94%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          background: "#0c151d",
          color: "#e2e8f0",
          border: "1px solid #1e3a5f",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8)",
          padding: "24px",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e3a5f", paddingBottom: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "28px" }}>🍃</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#f8fafc", fontWeight: 700 }}>
                  MongoDB Compass & Database Explorer
                </h2>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: isConnected ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: isConnected ? "#10b981" : "#ef4444",
                    border: `1px solid ${isConnected ? "#10b981" : "#ef4444"}`,
                  }}
                >
                  {isConnected ? "● Connected" : "○ Offline / Standby"}
                </span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
                Connected to database: <code style={{ color: "#38bdf8" }}>{dbStatus?.database || "propconnect_db"}</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            style={{ fontSize: "1.2rem", color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* MongoDB Compass Connection Quick-Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(56, 189, 248, 0.08) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#38bdf8", marginBottom: "4px" }}>
              🧭 MongoDB Compass Connection String
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "0.88rem", color: "#f8fafc", background: "rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: "6px", display: "inline-block" }}>
              {dbStatus?.compassUri || "mongodb://127.0.0.1:27017"}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleCopyCompassUri}
              className="btn-outline"
              style={{
                fontSize: "0.82rem",
                padding: "6px 12px",
                borderColor: "#10b981",
                color: "#10b981",
                cursor: "pointer",
                background: copied ? "rgba(16, 185, 129, 0.2)" : "transparent",
              }}
            >
              {copied ? "✓ Copied to Clipboard!" : "📋 Copy Compass URI"}
            </button>
            <button
              onClick={loadStatus}
              className="btn-outline"
              style={{ fontSize: "0.82rem", padding: "6px 12px", cursor: "pointer" }}
              title="Refresh connection status"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #1e3a5f", paddingBottom: "8px", marginBottom: "16px" }}>
          <button
            onClick={() => setActiveTab("overview")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.88rem",
              background: activeTab === "overview" ? "#1e3a5f" : "transparent",
              color: activeTab === "overview" ? "#38bdf8" : "#94a3b8",
            }}
          >
            🗂️ Compass Collections ({Object.keys(dbStatus?.collections || {}).length || 13})
          </button>
          <button
            onClick={() => setActiveTab("console")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.88rem",
              background: activeTab === "console" ? "#1e3a5f" : "transparent",
              color: activeTab === "console" ? "#38bdf8" : "#94a3b8",
            }}
          >
            💻 Live Mongo Query Runner
          </button>
          <button
            onClick={() => setActiveTab("compass")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.88rem",
              background: activeTab === "compass" ? "#1e3a5f" : "transparent",
              color: activeTab === "compass" ? "#38bdf8" : "#94a3b8",
            }}
          >
            📖 MongoDB Compass Guide
          </button>
        </div>

        {/* Tab 1: Collections Overview */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.88rem", color: "#94a3b8" }}>
                Click any collection card to inspect its documents in the live runner:
              </span>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                Total Collections: {COLLECTIONS_LIST.length}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              {COLLECTIONS_LIST.map((col) => {
                const count = dbStatus?.collections?.[col.key] ?? dbStatus?.tables?.[col.key] ?? 0;
                const isSelected = selectedCollection === col.key;
                return (
                  <div
                    key={col.key}
                    onClick={() => handleCardClick(col.key)}
                    style={{
                      background: isSelected ? "rgba(56, 189, 248, 0.12)" : "#132333",
                      border: `1px solid ${isSelected ? "#38bdf8" : "#1e3a5f"}`,
                      borderRadius: "10px",
                      padding: "12px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "1.4rem" }}>{col.icon}</span>
                      <span
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          background: count > 0 ? "rgba(16, 185, 129, 0.2)" : "rgba(100, 116, 139, 0.2)",
                          color: count > 0 ? "#10b981" : "#94a3b8",
                          padding: "2px 8px",
                          borderRadius: "10px",
                        }}
                      >
                        {count} docs
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#f8fafc", marginTop: "8px" }}>
                      {col.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                      {col.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Live Mongo Query Console */}
        {activeTab === "console" && (
          <div>
            {/* Presets */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: "6px" }}>
                ⚡ Quick Query Presets:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {PRESET_QUERIES.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      background: "#162738",
                      border: "1px solid #1e3a5f",
                      color: "#cbd5e1",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Query Controls */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
              <label style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                Collection:
                <select
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  style={{
                    marginLeft: "8px",
                    background: "#162738",
                    color: "#f8fafc",
                    border: "1px solid #1e3a5f",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "0.85rem",
                  }}
                >
                  {COLLECTIONS_LIST.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name} ({c.key})
                    </option>
                  ))}
                </select>
              </label>

              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Mongoose Query: <code>{selectedCollection}.find(filter).limit(20)</code>
              </span>
            </div>

            {/* JSON Filter Editor */}
            <div style={{ marginBottom: "12px" }}>
              <textarea
                value={queryFilterText}
                onChange={(e) => setQueryFilterText(e.target.value)}
                placeholder='Enter JSON filter, e.g. { "city": "Chennai" }'
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  fontFamily: "monospace",
                  background: "#080e14",
                  color: "#38bdf8",
                  border: "1px solid #1e3a5f",
                  borderRadius: "8px",
                  padding: "10px",
                  fontSize: "0.88rem",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <button
                type="button"
                onClick={() => handleRunQuery()}
                disabled={executing}
                className="btn-primary"
                style={{
                  padding: "8px 20px",
                  fontSize: "0.88rem",
                  cursor: executing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {executing ? "Running..." : "▶ Run Query in MongoDB"}
              </button>

              {queryResult && (
                <span style={{ fontSize: "0.82rem", color: queryResult.success ? "#10b981" : "#ef4444" }}>
                  {queryResult.success
                    ? `✓ Returned ${queryResult.rowCount} document(s) in ${queryResult.latencyMs}ms`
                    : `✗ Error: ${queryResult.error}`}
                </span>
              )}
            </div>

            {/* Results Viewer */}
            {queryResult?.rows && (
              <div
                style={{
                  background: "#080e14",
                  border: "1px solid #1e3a5f",
                  borderRadius: "8px",
                  padding: "12px",
                  maxHeight: "320px",
                  overflowY: "auto",
                  fontFamily: "monospace",
                  fontSize: "0.82rem",
                }}
              >
                <pre style={{ margin: 0, color: "#cbd5e1", whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(queryResult.rows, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: MongoDB Compass Guide */}
        {activeTab === "compass" && (
          <div style={{ lineHeight: 1.6, color: "#cbd5e1" }}>
            <h3 style={{ color: "#38bdf8", marginTop: 0 }}>How to view your data in MongoDB Compass:</h3>
            <ol style={{ paddingLeft: "20px" }}>
              <li style={{ marginBottom: "8px" }}>
                <strong>Open MongoDB Compass</strong> on your computer.
              </li>
              <li style={{ marginBottom: "8px" }}>
                In the <strong>"New Connection"</strong> screen, paste:
                <div style={{ margin: "6px 0", background: "#080e14", padding: "6px 12px", borderRadius: "6px", fontFamily: "monospace", color: "#10b981" }}>
                  mongodb://127.0.0.1:27017
                </div>
              </li>
              <li style={{ marginBottom: "8px" }}>
                Click <strong>"Connect"</strong>.
              </li>
              <li style={{ marginBottom: "8px" }}>
                In the left navigation sidebar, select database: <strong>propconnect_db</strong>.
              </li>
              <li style={{ marginBottom: "8px" }}>
                You will see all <strong>13 collections</strong>:
                <div style={{ margin: "6px 0", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {COLLECTIONS_LIST.map((c) => (
                    <span key={c.key} style={{ background: "#162738", padding: "2px 8px", borderRadius: "4px", fontSize: "0.78rem" }}>
                      {c.name}
                    </span>
                  ))}
                </div>
              </li>
              <li>
                You can browse documents, edit fields, add indexes, or run aggregations directly inside MongoDB Compass!
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
