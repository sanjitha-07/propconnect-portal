import { useState } from "react";
import { submitFixItReview } from "../../utils/apiClient.js";
import "./FixItStyles.css";

const QUICK_TAGS = [
  "⚡ Punctual Arrival",
  "❄️ AC Cooling Restored",
  "🧼 Clean & Tidy Work",
  "💰 Fair & Transparent Cost",
  "👨‍🔧 Expert Diagnostics",
  "⭐ High Recommendation",
];

export default function ServiceReviewModal({ booking, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState(["⚡ Punctual Arrival", "❄️ AC Cooling Restored"]);
  const [feedback, setFeedback] = useState("Technician arrived on time, jet pressure washed the indoor unit, and recharged gas. Master bedroom cooling is excellent now!");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fullReview = `${selectedTags.join(", ")}. ${feedback}`.trim();
      const res = await submitFixItReview(booking?.id || "BK_FIX_101", {
        rating,
        reviewText: fullReview,
      });

      setIsSubmitting(false);
      setIsSuccess(true);

      setTimeout(() => {
        if (onSubmitted) onSubmitted(res);
      }, 1500);
    } catch (err) {
      setIsSubmitting(false);
      alert("Failed to submit review: " + err.message);
    }
  };

  return (
    <div className="fixit-modal-overlay" onClick={onClose}>
      <div className="fixit-modal-card" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="fixit-header" style={{ background: "linear-gradient(135deg, #16a34a 0%, #059669 100%)" }}>
          <div className="fixit-header-title">
            <div className="fixit-header-icon" style={{ background: "rgba(255,255,255,0.25)" }}>
              ⭐
            </div>
            <div>
              <h2>Rate &amp; Close Maintenance Service</h2>
              <p>{booking?.unit || "Flat B-204"} • {booking?.providerName || "Kumar AC Services"}</p>
            </div>
          </div>
          <button type="button" className="fixit-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="fixit-body">
          {isSuccess ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 50, marginBottom: 12 }}>🎉</div>
              <h3 style={{ margin: "0 0 8px 0", color: "#166534", fontSize: 20 }}>
                Review Saved &amp; Maintenance Ledger Updated!
              </h3>
              <p style={{ margin: "0 0 16px 0", color: "#475569", fontSize: 13.5 }}>
                ₹{booking?.amount || 800} maintenance expense has been automatically logged into the permanent <strong>Property Maintenance History</strong> for {booking?.unit || "Flat B-204"}.
              </p>
              <div style={{ fontSize: 13, color: "#16a34a", fontWeight: 700 }}>
                ✓ Synced with Landlord &amp; Tenant Portals
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Cost Highlight */}
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 12,
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>Total Service Bill:</span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#15803d" }}>
                    ₹{booking?.amount || 800}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 12 }}>
                    ✓ Work Verified
                  </span>
                </div>
              </div>

              {/* Star Rating Picker */}
              <div style={{ textAlign: "center" }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                  How was technician {booking?.technicianName || "Kumar S."}&apos;s work?
                </label>
                <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: 34,
                        cursor: "pointer",
                        color: star <= rating ? "#f59e0b" : "#cbd5e1",
                        transform: star <= rating ? "scale(1.1)" : "scale(1)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#d97706", display: "block", marginTop: 4 }}>
                  {rating === 5 && "Outstanding 5.0 ★ — Highly Satisfied"}
                  {rating === 4 && "Great 4.0 ★ — Very Good"}
                  {rating === 3 && "Average 3.0 ★ — Met Requirements"}
                  {rating <= 2 && "Needs Improvement"}
                </span>
              </div>

              {/* Quick Tags */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                  Select Service Highlights:
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {QUICK_TAGS.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        background: selectedTags.includes(tag) ? "#0284c7" : "#f1f5f9",
                        color: selectedTags.includes(tag) ? "#ffffff" : "#475569",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Notes */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  Written Review &amp; Job Notes:
                </label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Notice */}
              <div style={{ fontSize: 11.5, color: "#64748b", background: "#f8fafc", padding: 10, borderRadius: 8 }}>
                ℹ️ <strong>Auto-Ledger Guarantee:</strong> Submitting this review will mark the ticket completed and immediately save the ₹{booking?.amount || 800} expense into {booking?.unit || "Flat B-204"}&apos;s 6-Month Property Maintenance History.
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button type="button" className="btn-outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                  style={{ background: "#16a34a", padding: "10px 22px", fontWeight: 700 }}
                >
                  {isSubmitting ? "Saving to History…" : "Submit Review & Save to Property History"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
