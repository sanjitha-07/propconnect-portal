import { useContext, useState } from "react";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import DataTable from "../../components/DataTable.jsx";
import PageHero from "../../components/PageHero.jsx";
import { LANDLORDS, PROPERTIES } from "../../data/db.js";

export default function LandlordsPage() {
  const { t } = useContext(SettingsContext);
  const [landlordsList, setLandlordsList] = useState(LANDLORDS);
  const [selectedLandlord, setSelectedLandlord] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newLandlord, setNewLandlord] = useState({
    name: "",
    email: "",
    phone: "",
    location: "Chennai, TN",
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newLandlord.name || !newLandlord.email) return;
    const created = {
      ...newLandlord,
      id: `LDL0${Math.floor(Math.random() * 80 + 20)}`,
      status: "Verified",
      propertiesCount: 1,
      totalUnits: 1,
    };
    setLandlordsList([created, ...landlordsList]);
    setShowAddModal(false);
    setNewLandlord({ name: "", email: "", phone: "", location: "Chennai, TN" });
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to remove this landlord?")) {
      setLandlordsList((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const rows = landlordsList.map((l) => {
    const ownedProps = PROPERTIES.filter((p) => p.landlordId === l.id);
    return {
      ...l,
      propertiesCount: ownedProps.length || l.propertiesCount || 1,
      ownedProperties: ownedProps,
    };
  });

  const columns = [
    {
      key: "name",
      label: "Landlord Name",
      render: (r) => (
        <div>
          <strong style={{ color: "var(--ink-primary)" }}>{r.name}</strong>
          <div className="sub-text">{r.email}</div>
        </div>
      ),
    },
    {
      key: "location",
      label: "Tamil Nadu Region",
      render: (r) => <span className="city-tag">{r.location}</span>,
    },
    { key: "phone", label: "Contact Phone" },
    {
      key: "propertiesCount",
      label: "Managed Units",
      render: (r) => (
        <span className="bhk-badge">
          🏢 {r.propertiesCount} {r.propertiesCount === 1 ? "Unit" : "Units"}
        </span>
      ),
    },
    {
      key: "status",
      label: t("status"),
      render: (r) => (
        <span className="pill verified">
          ✓ {r.status || "Verified"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className="btn-outline"
            style={{ padding: "4px 8px", fontSize: "11px" }}
            onClick={() => setSelectedLandlord(r)}
          >
            View
          </button>
          <button
            className="btn-outline"
            style={{ padding: "4px 8px", fontSize: "11px", color: "var(--red)" }}
            onClick={() => handleDelete(r.id)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHero
        badge="Asset Ownership Registry"
        title={t("landlordsTable")}
        subtitle="Verified property owners and residential apartment landlords across Tamil Nadu"
        actions={
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            + Register Landlord
          </button>
        }
      />

      <DataTable
        title="Verified Landlords Directory"
        columns={columns}
        rows={rows}
        searchKeys={["name", "email", "location", "phone"]}
        searchPlaceholder="Search landlords by name, city, email, or phone…"
        pageSize={10}
      />

      {/* Landlord Detail Modal */}
      {selectedLandlord && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setSelectedLandlord(null)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: "520px", padding: "28px", boxShadow: "var(--shadow-xl)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ margin: 0 }}>{selectedLandlord.name}</h3>
                <span className="pill verified" style={{ marginTop: "4px" }}>✓ KYC Verified Owner</span>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedLandlord(null)}
                style={{ width: "28px", height: "28px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ margin: "20px 0", display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div className="kv"><span className="k">Landlord ID:</span><span className="v">{selectedLandlord.id}</span></div>
              <div className="kv"><span className="k">Primary Email:</span><span className="v">{selectedLandlord.email}</span></div>
              <div className="kv"><span className="k">Contact Phone:</span><span className="v">{selectedLandlord.phone}</span></div>
              <div className="kv"><span className="k">Office Location:</span><span className="v">{selectedLandlord.location}</span></div>
              <div className="kv"><span className="k">Total Managed Properties:</span><span className="v">{selectedLandlord.propertiesCount} Units</span></div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-outline" onClick={() => setSelectedLandlord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Landlord Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: "480px", padding: "28px", boxShadow: "var(--shadow-xl)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0 }}>Register New Landlord</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowAddModal(false)}
                style={{ width: "28px", height: "28px" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdd} style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Full Name</label>
                <input
                  className="inp"
                  value={newLandlord.name}
                  onChange={(e) => setNewLandlord({ ...newLandlord, name: e.target.value })}
                  placeholder="e.g. S. Ramanathan"
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Email Address</label>
                <input
                  type="email"
                  className="inp"
                  value={newLandlord.email}
                  onChange={(e) => setNewLandlord({ ...newLandlord, email: e.target.value })}
                  placeholder="e.g. ramanathan.s@mail.com"
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Contact Phone</label>
                <input
                  className="inp"
                  value={newLandlord.phone}
                  onChange={(e) => setNewLandlord({ ...newLandlord, phone: e.target.value })}
                  placeholder="+91 98400 12345"
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>City &amp; Region</label>
                <input
                  className="inp"
                  value={newLandlord.location}
                  onChange={(e) => setNewLandlord({ ...newLandlord, location: e.target.value })}
                  placeholder="e.g. Anna Nagar, Chennai, TN"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" className="btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Verify &amp; Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
