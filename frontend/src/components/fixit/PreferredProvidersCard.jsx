import { useState, useEffect } from "react";
import {
  fetchPreferredProviders,
  fetchFixItProviders,
  savePreferredProviders,
  togglePreferredProviderBusy,
} from "../../utils/apiClient.js";
import "./FixItStyles.css";

const CATEGORIES = [
  { key: "Electrical", name: "Electrical Works", icon: "⚡", defaultPro: "Suresh Electrical Works" },
  { key: "Plumbing", name: "Plumbing & Sanitary", icon: "🚰", defaultPro: "Raj Plumbing & Sanitary" },
  { key: "AC", name: "AC Cooling & Service", icon: "❄️", defaultPro: "Kumar AC Services" },
  { key: "Cleaning", name: "Deep Cleaning & Maid", icon: "✨", defaultPro: "CleanPro Facility Management" },
];

export default function PreferredProvidersCard({ propertyId = "TN101", unit = "Flat B-204" }) {
  const [prefMap, setPrefMap] = useState({});
  const [allProviders, setAllProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCat, setEditingCat] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [mapping, providers] = await Promise.all([
        fetchPreferredProviders(propertyId),
        fetchFixItProviders("All"),
      ]);
      setPrefMap(mapping || {});
      setAllProviders(providers || []);
    } catch (err) {
      console.error("Failed to load preferred providers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [propertyId]);

  const handleToggleBusy = async (catKey) => {
    const current = prefMap[catKey];
    const nextBusy = !current?.isSimulatedBusy;

    await togglePreferredProviderBusy(propertyId, catKey, nextBusy);
    setPrefMap((prev) => ({
      ...prev,
      [catKey]: {
        ...(prev[catKey] || {}),
        isSimulatedBusy: nextBusy,
      },
    }));

    showToast(
      nextBusy
        ? `⚠️ ${current?.providerName || catKey} marked BUSY. FixIt Local will now automatically recommend nearby alternative providers!`
        : `✓ ${current?.providerName || catKey} is now AVAILABLE for direct dispatch.`
    );
  };

  const handleSelectProvider = async (catKey, newProviderId) => {
    const matched = allProviders.find((p) => p.id === newProviderId);
    if (!matched) return;

    await savePreferredProviders({
      propertyId,
      category: catKey,
      providerId: matched.id,
      providerName: matched.name,
      isSimulatedBusy: false,
    });

    setPrefMap((prev) => ({
      ...prev,
      [catKey]: {
        providerId: matched.id,
        providerName: matched.name,
        isSimulatedBusy: false,
      },
    }));

    setEditingCat(null);
    showToast(`✓ Assigned ${matched.name} as preferred provider for ${catKey}!`);
  };

  return (
    <div className="pref-providers-card">
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#0f172a",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: 10,
            zIndex: 10000,
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>⭐</span>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              Landlord Preferred Service Providers — {unit}
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            Assign your trusted go-to technicians for each service category. If unavailable, FixIt Local automatically routes jobs to verified nearby alternatives.
          </p>
        </div>

        <div style={{ background: "#f8fafc", padding: "6px 14px", borderRadius: 20, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600, color: "#475569" }}>
          🔄 Auto-Fallback Active
        </div>
      </div>

      {/* Tree Visualization */}
      <div className="pref-tree-container">
        {CATEGORIES.map((cat) => {
          const mapping = prefMap[cat.key];
          const isBusy = Boolean(mapping?.isSimulatedBusy);
          const currentName = mapping?.providerName || cat.defaultPro;
          const isEditing = editingCat === cat.key;

          // Filter candidate providers matching category
          const categoryPros = allProviders.filter((p) => {
            if (cat.key === "AC") return p.category.toLowerCase().includes("ac");
            return p.category.toLowerCase().includes(cat.key.toLowerCase());
          });

          return (
            <div key={cat.key} className="pref-branch-item" style={{ borderColor: isBusy ? "#fca5a5" : "#e2e8f0" }}>
              <div className="pref-branch-top">
                <span className="pref-branch-cat">
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </span>
                <span style={{ background: isBusy ? "#fee2e2" : "#fef3c7", color: isBusy ? "#dc2626" : "#b45309", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
                  {isBusy ? "BUSY" : "ACTIVE PREFERRED"}
                </span>
              </div>

              {isEditing ? (
                <div style={{ margin: "10px 0" }}>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                    Choose new preferred provider:
                  </label>
                  <select
                    style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #0284c7", fontSize: 13 }}
                    onChange={(e) => handleSelectProvider(cat.key, e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>Select from verified list…</option>
                    {categoryPros.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (★ {p.rating} • ₹{p.price})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setEditingCat(null)}
                    style={{ background: "none", border: "none", color: "#64748b", fontSize: 11.5, marginTop: 6, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="pref-branch-pro" style={{ color: isBusy ? "#dc2626" : "#0284c7" }}>
                    → {currentName}
                  </div>
                  <p className="pref-branch-desc">
                    {isBusy
                      ? "⚠️ Currently unavailable. FixIt Local will recommend top alternative providers."
                      : "Primary technician called for repairs and scheduled maintenance."}
                  </p>
                </>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  onClick={() => setEditingCat(isEditing ? null : cat.key)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0284c7",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  ✏️ Change Pro
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleBusy(cat.key)}
                  style={{
                    background: isBusy ? "#f0fdf4" : "#fff1f2",
                    border: "1px solid",
                    borderColor: isBusy ? "#86efac" : "#fecdd3",
                    color: isBusy ? "#166534" : "#be123c",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                  title="Toggle busy status to test automated alternative recommendations"
                >
                  {isBusy ? "Make Available" : "Simulate Busy"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
