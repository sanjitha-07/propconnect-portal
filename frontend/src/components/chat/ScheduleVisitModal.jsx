import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";
import { createEnquiry } from "../../utils/apiClient.js";

export default function ScheduleVisitModal({ property, defaultType = "Schedule Visit", onClose, onSuccess }) {
  const { user } = useContext(AuthContext);

  const [type, setType] = useState(defaultType);
  const [preferredDate, setPreferredDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]
  );
  const [preferredTime, setPreferredTime] = useState("Evening (4 PM – 7 PM)");
  const [name, setName] = useState(user?.name || "Tenant Resident");
  const [phone, setPhone] = useState("+91 98700 11223");
  const [email, setEmail] = useState(user?.email || "divya.priya@mail.com");
  const [message, setMessage] = useState(
    `Hello, I am interested in ${property?.name || "this property"} and would like to schedule a visit.`
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        propertyId: property?.id || "TN101",
        propertyName: property?.name || "Residential Property",
        tenantId: user?.entityId || "TEN001",
        tenantName: name,
        tenantPhone: phone,
        tenantEmail: email,
        landlordId: property?.landlordId || "LDL001",
        type,
        preferredDate,
        preferredTime,
        message,
      };

      await createEnquiry(payload);
      setSubmitting(false);
      setSubmitted(true);
      if (onSuccess) onSuccess(payload);
      setTimeout(() => {
        if (onClose) onClose();
      }, 2200);
    } catch (err) {
      setSubmitting(false);
      alert(`Could not register enquiry: ${err.message}`);
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-card schedule-visit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, color: "var(--brand-navy)" }}>
              📅 Schedule a Visit / Contact Landlord
            </h3>
            <p className="sub-text" style={{ margin: "4px 0 0 0" }}>
              {property?.name} • ₹{Number(property?.rent || 0).toLocaleString("en-IN")}/mo
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {submitted ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
            <h3 style={{ color: "var(--green)", marginBottom: "8px" }}>Visit Request Sent!</h3>
            <p style={{ color: "var(--ink-secondary)", fontSize: "14px", lineHeight: "1.6" }}>
              Your visit request for <strong>{property?.name}</strong> has been logged. The property manager has been notified and will contact you at <strong>{phone}</strong> to confirm your slot.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label className="pref-field-label">Purpose / Inquiry Type</label>
              <select className="inp" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Schedule Visit">In-Person Site Visit</option>
                <option value="Request Video Tour">Live Video Tour / Walkthrough</option>
                <option value="Rent Negotiation">Rent &amp; Deposit Inquiry</option>
                <option value="Availability Inquiry">Move-in Date / Availability</option>
                <option value="General Question">General Tenancy Question</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
              <div className="form-group">
                <label className="pref-field-label">Preferred Date</label>
                <input
                  type="date"
                  className="inp"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
              <div className="form-group">
                <label className="pref-field-label">Preferred Time Slot</label>
                <select className="inp" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
                  <option value="Morning (9 AM – 12 PM)">Morning (9 AM – 12 PM)</option>
                  <option value="Afternoon (12 PM – 4 PM)">Afternoon (12 PM – 4 PM)</option>
                  <option value="Evening (4 PM – 7 PM)">Evening (4 PM – 7 PM)</option>
                  <option value="Weekend Special">Weekend Slot</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
              <div className="form-group">
                <label className="pref-field-label">Your Name</label>
                <input
                  type="text"
                  className="inp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="pref-field-label">Phone Number</label>
                <input
                  type="tel"
                  className="inp"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="pref-field-label">Message / Specific Questions</label>
              <textarea
                className="inp"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask anything specific about parking, move-in dates, or family rules..."
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Sending Request..." : "Confirm & Send Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
