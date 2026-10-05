import { useState, useEffect } from "react";
import PageHero from "../../components/PageHero.jsx";
import FixItDispatchModal from "../../components/fixit/FixItDispatchModal.jsx";
import LiveTrackingModal from "../../components/fixit/LiveTrackingModal.jsx";
import ServiceReviewModal from "../../components/fixit/ServiceReviewModal.jsx";
import { fetchFixItProviders, fetchFixItBookings } from "../../utils/apiClient.js";
import "../../components/fixit/FixItStyles.css";

export default function ServicesPage() {
  const [providers, setProviders] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [dispatchComplaint, setDispatchComplaint] = useState(null);
  const [trackingBooking, setTrackingBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [provList, bookList] = await Promise.all([
        fetchFixItProviders(selectedCategory),
        fetchFixItBookings(),
      ]);
      setProviders(provList || []);
      setActiveBookings(bookList || []);
    } catch (err) {
      console.error("Error loading services page data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const filteredProviders = providers.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.technicianName?.toLowerCase().includes(q) ||
      p.skills?.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#0f172a",
            color: "#ffffff",
            padding: "14px 22px",
            borderRadius: 12,
            zIndex: 10000,
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          {toast}
        </div>
      )}

      <PageHero
        title="FixIt Local — On-Demand Property Maintenance &amp; Repair Network"
        subtitle="A unified platform where tenants and landlords manage properties and directly connect with verified nearby service providers for maintenance and repair services."
      />

      {/* Active Service Dispatches Banner (if any) */}
      {activeBookings.length > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg, #0284c7 0%, #1e40af 100%)",
            color: "#ffffff",
            borderRadius: 16,
            padding: "20px 24px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            boxShadow: "0 10px 25px -5px rgba(2, 132, 199, 0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                fontSize: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "fixitPulse 2s infinite",
              }}
            >
              🚗
            </div>
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.85, fontWeight: 700 }}>
                Active Service Dispatch in Progress
              </div>
              <h3 style={{ margin: "2px 0 4px 0", fontSize: 18, fontWeight: 700 }}>
                {activeBookings[0].providerName} — {activeBookings[0].serviceTitle}
              </h3>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>
                Destination: <strong>{activeBookings[0].unit || "Flat B-204"}</strong> ({activeBookings[0].propertyName || "Sai Kala Apartments"}) • Status: <strong>{activeBookings[0].status}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setTrackingBooking(activeBookings[0])}
              style={{
                background: "#ffffff",
                color: "#0369a1",
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              }}
            >
              📍 Track Live GPS on Map
            </button>

            {activeBookings[0].status !== "Completed" && (
              <button
                type="button"
                onClick={() => setReviewBooking(activeBookings[0])}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.4)",
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Mark Complete &amp; Review
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <div className="card" style={{ padding: 24 }}>
        {/* Category Filter & Search Strip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["All", "AC Repair", "Plumbing", "Electrical", "Cleaning"].map((cat) => (
              <button
                type="button"
                key={cat}
                className={`history-filter-btn ${selectedCategory === cat ? "active" : ""}`}
                style={{
                  padding: "8px 18px",
                  border: "1px solid",
                  borderColor: selectedCategory === cat ? "#0284c7" : "#cbd5e1",
                  background: selectedCategory === cat ? "#f0f9ff" : "#ffffff",
                  color: selectedCategory === cat ? "#0284c7" : "#475569",
                  fontWeight: 700,
                  fontSize: 13,
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === "All" && "🌐 "}
                {cat === "AC Repair" && "❄️ "}
                {cat === "Plumbing" && "🚰 "}
                {cat === "Electrical" && "⚡ "}
                {cat === "Cleaning" && "✨ "}
                {cat}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="text"
              placeholder="Search technician, skill, area…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                minWidth: 260,
              }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setDispatchComplaint({
                  id: "CUSTOM_DISPATCH",
                  propertyId: "TN101",
                  propertyName: "Sai Kala Apartments - Flat 302",
                  unit: "Flat B-204",
                  issue: "AC cooling problem - inspection & jet clean",
                  tenantName: "Divya Priya",
                });
              }}
              style={{ padding: "8px 18px", fontSize: 13, fontWeight: 700 }}
            >
              + Dispatch Technician
            </button>
          </div>
        </div>

        {/* Providers Grid */}
        {loading ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: 40 }}>
            Loading verified FixIt Local service providers…
          </p>
        ) : (
          <div className="fixit-compare-grid">
            {filteredProviders.map((pro) => (
              <div
                key={pro.id}
                className="fixit-provider-card"
                onClick={() => {
                  setDispatchComplaint({
                    id: "DEMO_COMPLAINT",
                    propertyId: "TN101",
                    propertyName: "Sai Kala Apartments - Flat 302",
                    unit: "Flat B-204",
                    issue: `${pro.category} service inquiry`,
                    tenantName: "Divya Priya",
                  });
                }}
              >
                <div className="fixit-card-top">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ background: "#e0f2fe", color: "#0369a1", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>
                        {pro.badge || "FixIt Verified"}
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
                    <span className="fixit-metric-label">Availability</span>
                    <span className="fixit-metric-val avail">
                      {pro.availability || "Available Today"}
                    </span>
                  </div>
                </div>

                <p style={{ margin: "4px 0 10px 0", fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
                  {pro.description || `Specialized ${pro.category} maintenance engineer.`}
                </p>

                {pro.skills && pro.skills.length > 0 && (
                  <div className="fixit-skills-row">
                    {pro.skills.map((s) => (
                      <span key={s} className="fixit-skill-chip">{s}</span>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Vehicle: {pro.vehicle?.split("-")[0] || "Motorcycle"}</span>
                  <span style={{ color: "#0284c7", fontSize: 12.5, fontWeight: 700 }}>Book Service →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {dispatchComplaint && (
        <FixItDispatchModal
          complaint={dispatchComplaint}
          onClose={() => setDispatchComplaint(null)}
          onSuccess={(bookingResult) => {
            setDispatchComplaint(null);
            showToast(`🎉 Technician Dispatched! Kumar S. is navigating to ${bookingResult.unit || "Flat B-204"}.`);
            loadData();
            setTrackingBooking(bookingResult);
          }}
        />
      )}

      {trackingBooking && (
        <LiveTrackingModal
          booking={trackingBooking}
          onClose={() => setTrackingBooking(null)}
          onServiceCompleted={(completedBooking) => {
            setTrackingBooking(null);
            setReviewBooking(completedBooking);
          }}
        />
      )}

      {reviewBooking && (
        <ServiceReviewModal
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSubmitted={() => {
            setReviewBooking(null);
            showToast("⭐ Review saved and expense recorded in Property Maintenance History!");
            loadData();
          }}
        />
      )}
    </div>
  );
}
