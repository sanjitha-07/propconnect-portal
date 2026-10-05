import { useState, useEffect, useMemo } from "react";
import {
  fetchFixItProviders,
  fetchPreferredProviders,
  togglePreferredProviderBusy,
  createFixItBooking,
} from "../../utils/apiClient.js";
import "./FixItStyles.css";

export default function FixItDispatchModal({ complaint, onClose, onSuccess }) {
  const propertyId = complaint?.propertyId || complaint?.property_id || "TN101";
  const propertyName = complaint?.propertyName || complaint?.property || "Sai Kala Apartments - Flat 302";
  const unit = complaint?.unit || "Flat B-204";
  const tenantName = complaint?.tenantName || complaint?.tenant_name || "Divya Priya";
  const issueText = complaint?.issue || complaint?.subject || complaint?.title || "AC not cooling properly in master bedroom";

  // Auto-detect category from issue text
  const initialCategory = useMemo(() => {
    const lower = issueText.toLowerCase();
    if (lower.includes("ac") || lower.includes("cool") || lower.includes("filter") || lower.includes("gas")) return "AC Repair";
    if (lower.includes("plumb") || lower.includes("pipe") || lower.includes("leak") || lower.includes("tap") || lower.includes("drain")) return "Plumbing";
    if (lower.includes("elect") || lower.includes("wire") || lower.includes("power") || lower.includes("switch") || lower.includes("mcb") || lower.includes("fan")) return "Electrical";
    if (lower.includes("clean") || lower.includes("dust") || lower.includes("wash") || lower.includes("maid")) return "Cleaning";
    return "AC Repair";
  }, [issueText]);

  const [category, setCategory] = useState(initialCategory);
  const [providers, setProviders] = useState([]);
  const [preferredMapping, setPreferredMapping] = useState({});
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [sortBy, setSortBy] = useState("recommended"); // 'recommended' | 'price' | 'rating' | 'distance'
  const [selectedSlot, setSelectedSlot] = useState("Today, 02:00 PM – 04:00 PM");
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [simulatedBusy, setSimulatedBusy] = useState(false);
  const [notes, setNotes] = useState(issueText);

  // Load preferred providers and all verified providers for category
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [provList, prefMap] = await Promise.all([
          fetchFixItProviders(category),
          fetchPreferredProviders(propertyId),
        ]);
        if (!isMounted) return;
        setProviders(provList || []);
        setPreferredMapping(prefMap || {});

        const catKey = category === "AC Repair" ? "AC" : category;
        const pref = prefMap?.[catKey];
        if (pref) {
          setSimulatedBusy(Boolean(pref.isSimulatedBusy));
          const match = provList.find((p) => p.id === pref.providerId);
          if (match && !pref.isSimulatedBusy) {
            setSelectedProvider(match);
          } else if (provList.length > 0) {
            // If preferred is busy, select top alternative
            const alt = provList.find((p) => p.id !== pref.providerId) || provList[0];
            setSelectedProvider(alt);
          }
        } else if (provList.length > 0) {
          setSelectedProvider(provList[0]);
        }
      } catch (err) {
        console.error("Error loading FixIt providers:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [category, propertyId]);

  // Handle toggling preferred provider busy state
  const handleToggleBusy = async () => {
    const nextState = !simulatedBusy;
    setSimulatedBusy(nextState);
    const catKey = category === "AC Repair" ? "AC" : category;
    await togglePreferredProviderBusy(propertyId, catKey, nextState);

    if (nextState) {
      // Pick next best alternative
      const prefId = preferredMapping?.[catKey]?.providerId;
      const alt = providers.find((p) => p.id !== prefId) || providers[0];
      setSelectedProvider(alt);
    } else {
      const prefId = preferredMapping?.[catKey]?.providerId;
      const original = providers.find((p) => p.id === prefId);
      if (original) setSelectedProvider(original);
    }
  };

  // Sort and filter providers
  const sortedProviders = useMemo(() => {
    let list = [...providers];
    if (sortBy === "price") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "distance") {
      list.sort((a, b) => (a.distanceKm || 99) - (b.distanceKm || 99));
    } else {
      // Recommended: Preferred first (if not busy), then highest rating & nearest
      const catKey = category === "AC Repair" ? "AC" : category;
      const prefId = preferredMapping?.[catKey]?.providerId;
      list.sort((a, b) => {
        if (!simulatedBusy) {
          if (a.id === prefId) return -1;
          if (b.id === prefId) return 1;
        }
        return b.rating - a.rating;
      });
    }
    return list;
  }, [providers, sortBy, preferredMapping, category, simulatedBusy]);

  const catKey = category === "AC Repair" ? "AC" : category;
  const currentPreferred = preferredMapping?.[catKey];

  // Confirm booking & dispatch
  const handleConfirmDispatch = async () => {
    if (!selectedProvider) return;
    setBookingLoading(true);

    try {
      const bookingPayload = {
        complaintId: complaint?.id || null,
        propertyId,
        propertyName,
        unit,
        tenantId: complaint?.tenantId || complaint?.tenant_id || "TEN001",
        tenantName,
        category,
        serviceTitle: `${category} Service & Repair`,
        issueDescription: notes || issueText,
        providerId: selectedProvider.id,
        providerName: selectedProvider.name,
        technicianName: selectedProvider.technicianName || "Kumar S.",
        technicianPhone: selectedProvider.phone || "+91 98765 00001",
        vehicle: selectedProvider.vehicle || "TVS Apache - TN 01 AB 4321",
        amount: selectedProvider.price || 800,
        scheduledSlot: selectedSlot,
        scheduledDate: new Date().toISOString().split("T")[0],
      };

      const result = await createFixItBooking(bookingPayload);
      setBookingLoading(false);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setBookingLoading(false);
      alert("Failed to create booking: " + err.message);
    }
  };

  return (
    <div className="fixit-modal-overlay" onClick={onClose}>
      <div className="fixit-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="fixit-header">
          <div className="fixit-header-title">
            <div className="fixit-header-icon">🔧</div>
            <div>
              <h2>FixIt Local — Service Dispatch &amp; Provider Match</h2>
              <p>Verified Nearby Technicians • Real-time GPS Tracking • Property Maintenance History</p>
            </div>
          </div>
          <button type="button" className="fixit-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="fixit-body">
          {/* Issue & Property Info */}
          <div className="fixit-problem-banner">
            <div className="fixit-problem-info">
              <h4>Reported Issue: {issueText}</h4>
              <p>
                Property: <strong>{propertyName}</strong> ({unit}) • Resident: <strong>{tenantName}</strong>
              </p>
            </div>
            <div className="fixit-flat-badge">
              <span>📍</span>
              <span>{unit}</span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["AC Repair", "Plumbing", "Electrical", "Cleaning"].map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={`history-filter-btn ${category === cat ? "active" : ""}`}
                  style={{
                    padding: "7px 16px",
                    border: "1px solid",
                    borderColor: category === cat ? "#0284c7" : "#cbd5e1",
                    background: category === cat ? "#f0f9ff" : "#ffffff",
                    color: category === cat ? "#0284c7" : "#475569",
                    fontWeight: 600,
                  }}
                  onClick={() => setCategory(cat)}
                >
                  {cat === "AC Repair" && "❄️ "}
                  {cat === "Plumbing" && "🚰 "}
                  {cat === "Electrical" && "⚡ "}
                  {cat === "Cleaning" && "✨ "}
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ color: "#64748b", fontWeight: 600 }}>Compare by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: "#ffffff",
                  color: "#1e293b",
                }}
              >
                <option value="recommended">⭐ Recommended (Preferred First)</option>
                <option value="price">💰 Lowest Price</option>
                <option value="rating">★ Highest Rating</option>
                <option value="distance">📍 Closest Distance</option>
              </select>
            </div>
          </div>

          {/* Landlord Preferred Provider Highlight Card */}
          {currentPreferred && (
            <div className={`fixit-preferred-box ${simulatedBusy ? "is-busy" : ""}`}>
              <div className="fixit-preferred-header">
                <span className="fixit-gold-badge">
                  ⭐ Landlord Preferred Provider
                </span>
                <button
                  type="button"
                  className="fixit-busy-toggle-btn"
                  onClick={handleToggleBusy}
                  title="Toggle busy state to test FixIt Local automated recommendation of alternatives"
                >
                  {simulatedBusy ? "🔄 Set Preferred as Available" : "⚡ Simulate Pro Busy / Unavailable"}
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                    {currentPreferred.providerName}
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                    Assigned priority provider for <strong>{category}</strong> on {unit} (Sai Kala Apartments)
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: simulatedBusy ? "#dc2626" : "#0284c7" }}>
                    {simulatedBusy ? "Status: Busy on Another Job" : "Status: Ready to Dispatch"}
                  </span>
                </div>
              </div>

              {simulatedBusy && (
                <div className="fixit-busy-alert">
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <div>
                    <strong>{currentPreferred.providerName} is currently unavailable.</strong>
                    <div style={{ fontSize: 12, marginTop: 2 }}>
                      FixIt Local intelligent routing automatically highlights nearby verified alternatives with immediate availability below!
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Side-by-Side Comparison Matrix */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                Nearby Verified {category} Providers ({sortedProviders.length} Found)
              </h4>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                Click a provider card to select &amp; view job details
              </span>
            </div>

            {loading ? (
              <p style={{ textAlign: "center", color: "#64748b", padding: "30px" }}>
                Searching FixIt Local verified nearby technicians…
              </p>
            ) : sortedProviders.length === 0 ? (
              <p style={{ textAlign: "center", color: "#64748b", padding: "30px" }}>
                No providers currently listed for this category.
              </p>
            ) : (
              <div className="fixit-compare-grid">
                {sortedProviders.map((pro) => {
                  const isPref = currentPreferred?.providerId === pro.id;
                  const isBusy = isPref && simulatedBusy;
                  const isSelected = selectedProvider?.id === pro.id;

                  return (
                    <div
                      key={pro.id}
                      className={`fixit-provider-card ${isSelected ? "selected" : ""} ${isBusy ? "busy-card" : ""}`}
                      onClick={() => !isBusy && setSelectedProvider(pro)}
                      style={{ opacity: isBusy ? 0.6 : 1 }}
                    >
                      <div className="fixit-card-top">
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                            {isPref && (
                              <span style={{ background: "#fef3c7", color: "#b45309", fontSize: 10.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
                                ⭐ PREFERRED
                              </span>
                            )}
                            <span style={{ background: "#e0f2fe", color: "#0369a1", fontSize: 10.5, fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}>
                              {pro.badge || "Verified Pro"}
                            </span>
                          </div>
                          <h4 className="fixit-card-name">{pro.name}</h4>
                          <p className="fixit-card-tech">👤 {pro.technicianName} ({pro.experienceYears || 5} yrs exp)</p>
                        </div>
                        <div className="fixit-price-tag">
                          ₹{pro.price}
                          <span className="fixit-price-unit">{pro.unit || "per service"}</span>
                        </div>
                      </div>

                      {/* 3-Cell Comparison Bar: Rating | Distance | Availability */}
                      <div className="fixit-metrics-row">
                        <div className="fixit-metric-cell">
                          <span className="fixit-metric-label">Rating</span>
                          <span className="fixit-metric-val rating">
                            ★ {pro.rating} <small style={{ fontWeight: 400, color: "#64748b" }}>({pro.reviewCount || 40})</small>
                          </span>
                        </div>
                        <div className="fixit-metric-cell">
                          <span className="fixit-metric-label">Distance</span>
                          <span className="fixit-metric-val distance">
                            📍 {pro.distanceKm || 1.5} km
                          </span>
                        </div>
                        <div className="fixit-metric-cell">
                          <span className="fixit-metric-label">Slots</span>
                          <span className="fixit-metric-val avail" style={{ color: isBusy ? "#dc2626" : "#16a34a" }}>
                            {isBusy ? "Unavailable" : (pro.availability || "Available Today")}
                          </span>
                        </div>
                      </div>

                      {/* Skills Chips */}
                      {pro.skills && pro.skills.length > 0 && (
                        <div className="fixit-skills-row">
                          {pro.skills.slice(0, 3).map((s) => (
                            <span key={s} className="fixit-skill-chip">{s}</span>
                          ))}
                        </div>
                      )}

                      {/* Selection Indicator */}
                      <div style={{ marginTop: 12, textAlign: "center" }}>
                        {isBusy ? (
                          <span style={{ color: "#dc2626", fontSize: 12, fontWeight: 700 }}>Currently Booked</span>
                        ) : isSelected ? (
                          <span style={{ color: "#2563eb", fontSize: 12.5, fontWeight: 700 }}>✓ Selected for Booking</span>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: 12 }}>Click to Select</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Booking Slots & Final Review */}
          {selectedProvider && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18 }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                Confirm Service Details for {selectedProvider.name}
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
                    Select Service Slot:
                  </label>
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                    }}
                  >
                    <option value="Today, 02:00 PM – 04:00 PM">Today, 02:00 PM – 04:00 PM (Immediate)</option>
                    <option value="Today, 04:00 PM – 06:00 PM">Today, 04:00 PM – 06:00 PM</option>
                    <option value="Tomorrow, 10:00 AM – 12:00 PM">Tomorrow, 10:00 AM – 12:00 PM</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
                    Technician / Vehicle:
                  </label>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", padding: "8px 0" }}>
                    🏍️ {selectedProvider.technicianName} ({selectedProvider.vehicle || "TVS Apache - TN 01 AB 4321"})
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
                    Estimated Service Cost:
                  </label>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0284c7" }}>
                    ₹{selectedProvider.price || 800} <small style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>(Inc. Tax &amp; Inspection)</small>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
                  Job Notes for Technician:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specific room or instructions..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
            <button
              type="button"
              className="btn-outline"
              onClick={onClose}
              disabled={bookingLoading}
              style={{ padding: "10px 20px" }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!selectedProvider || bookingLoading}
              onClick={handleConfirmDispatch}
              style={{
                padding: "10px 24px",
                background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                fontWeight: 700,
                fontSize: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {bookingLoading ? "Dispatching Pro…" : `Confirm Booking & Dispatch ${selectedProvider?.name || "Pro"} (₹${selectedProvider?.price || 800})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
