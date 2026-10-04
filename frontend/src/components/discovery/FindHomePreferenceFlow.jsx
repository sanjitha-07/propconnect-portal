import { useState } from "react";

const TN_CITIES = [
  "Chennai",
  "Coimbatore",
  "Madurai",
  "Trichy",
  "Salem",
  "Other Tamil Nadu cities",
];

const LOCALITY_SUGGESTIONS = {
  Chennai: ["OMR", "Velachery", "Anna Nagar", "Adyar", "Tambaram", "Sholinganallur", "Porur", "T. Nagar", "Mylapore", "Medavakkam", "Pallikaranai", "Vadapalani", "ECR"],
  Coimbatore: ["Peelamedu", "RS Puram", "Saravanampatti", "Race Course", "Ramanathapuram", "Kalampalayam", "Vedapatti", "Gandhipuram", "Saibaba Colony"],
  Madurai: ["KK Nagar", "Andalpuram", "Ponmeni", "Chinna Chokkikulam", "Mattuthavani", "Anna Nagar", "Simmakkal"],
  Trichy: ["Thillai Nagar", "KK Nagar", "Cantonment", "Airport Road", "Srirangam", "Shastri Road"],
  Salem: ["Fairlands", "Alagapuram", "Hasthampatti", "Suramangalam", "Ammapet"],
  "Other Tamil Nadu cities": ["Vellore", "Tiruppur", "Tirunelveli", "Erode", "Dindigul", "Thanjavur"],
};

const PROPERTY_TYPES = [
  { id: "Apartment", label: "Apartment", icon: "🏢", desc: "Multi-storey residential units" },
  { id: "Flat", label: "Flat", icon: "🏬", desc: "Private society flats" },
  { id: "Villa", label: "Villa", icon: "🏡", desc: "Independent luxury villas" },
  { id: "Independent House", label: "Independent House", icon: "🏠", desc: "Individual standalone homes" },
  { id: "Gated Community", label: "Gated Community", icon: "🛡️", desc: "Secure compound with amenities" },
];

const BHK_OPTIONS = [
  { id: "1", label: "1 BHK", desc: "Ideal for singles / young couples" },
  { id: "2", label: "2 BHK", desc: "Most popular for small families" },
  { id: "3", label: "3 BHK", desc: "Comfortable for families with kids" },
  { id: "4+", label: "4+ BHK", desc: "Spacious luxury & joint families" },
];

const BUDGET_OPTIONS = [
  { id: "₹10,000–₹20,000", label: "₹10,000 – ₹20,000", min: 10000, max: 20000, desc: "Budget-friendly homes" },
  { id: "₹20,000–₹30,000", label: "₹20,000 – ₹30,000", min: 20000, max: 30000, desc: "Standard residential range" },
  { id: "₹30,000–₹50,000", label: "₹30,000 – ₹50,000", min: 30000, max: 50000, desc: "Premium apartments & villas" },
  { id: "₹50,000+", label: "₹50,000+", min: 50000, max: 200000, desc: "Luxury enclaves & gated estates" },
];

const FURNISHING_OPTIONS = [
  { id: "No preference", label: "No Preference", icon: "✨" },
  { id: "Semi-furnished", label: "Semi-furnished", icon: "🪑" },
  { id: "Fully furnished", label: "Fully furnished", icon: "🛋️" },
  { id: "Unfurnished", label: "Unfurnished", icon: "📦" },
];

const AMENITIES_LIST = [
  { id: "Parking", label: "Parking", icon: "🚗" },
  { id: "Lift", label: "Lift / Elevator", icon: "🛗" },
  { id: "Security", label: "24x7 Security", icon: "👮" },
  { id: "CCTV", label: "CCTV Surveillance", icon: "📹" },
  { id: "Power backup", label: "Power Backup", icon: "⚡" },
  { id: "Water supply", label: "24x7 Water Supply", icon: "💧" },
  { id: "Gym", label: "Fitness Gym", icon: "🏋️" },
  { id: "Swimming pool", label: "Swimming Pool", icon: "🏊" },
  { id: "Garden", label: "Garden / Lawn", icon: "🌳" },
  { id: "Children's play area", label: "Children's Play Area", icon: "🛝" },
  { id: "Clubhouse", label: "Clubhouse", icon: "🏛️" },
  { id: "Internet", label: "High Speed Internet", icon: "📶" },
  { id: "Pet friendly", label: "Pet Friendly", icon: "🐾" },
];

const NEARBY_LIST = [
  { id: "School", label: "School", icon: "🏫" },
  { id: "College", label: "College / University", icon: "🎓" },
  { id: "Hospital", label: "Hospital / Healthcare", icon: "🏥" },
  { id: "Bus stop", label: "Bus Stop", icon: "🚌" },
  { id: "Railway station", label: "Railway Station", icon: "🚆" },
  { id: "Metro", label: "Metro Station", icon: "🚇" },
  { id: "IT park", label: "IT Park / Tech Hub", icon: "💻" },
  { id: "Shopping", label: "Shopping Mall", icon: "🛍️" },
  { id: "Market", label: "Supermarket / Market", icon: "🛒" },
  { id: "Temple/church/mosque", label: "Temple / Church / Mosque", icon: "🛕" },
];

const DISTANCE_OPTIONS = [
  "< 2 km (Walking / Short ride)",
  "< 5 km (Within 10-15 mins)",
  "< 10 km (Reasonable commute)",
  "Any distance",
];

export default function FindHomePreferenceFlow({
  initialPreferences = null,
  onSubmit,
  onSkip,
  isModal = false,
  onClose,
}) {
  const [step, setStep] = useState(1);
  const [isFinding, setIsFinding] = useState(false);

  // Preference State
  const [city, setCity] = useState(initialPreferences?.city || "Chennai");
  const [locality, setLocality] = useState(initialPreferences?.locality || "OMR");
  const [customLocality, setCustomLocality] = useState("");
  const [propertyType, setPropertyType] = useState(initialPreferences?.propertyType || "Apartment");
  const [bhk, setBhk] = useState(initialPreferences?.bhk || "2");
  const [familyMembers, setFamilyMembers] = useState(initialPreferences?.familyMembers || 4);
  const [budgetRange, setBudgetRange] = useState(initialPreferences?.budgetRange || "₹20,000–₹30,000");
  const [furnishing, setFurnishing] = useState(initialPreferences?.furnishing || "Semi-furnished");
  const [amenities, setAmenities] = useState(
    initialPreferences?.amenities && initialPreferences.amenities.length > 0
      ? initialPreferences.amenities
      : ["Parking", "Security", "Lift"]
  );
  const [nearby, setNearby] = useState(
    initialPreferences?.nearby && initialPreferences.nearby.length > 0
      ? initialPreferences.nearby
      : ["School", "Hospital"]
  );
  const [maxDistance, setMaxDistance] = useState(initialPreferences?.maxDistance || "< 5 km (Within 10-15 mins)");
  const [additionalRequirements, setAdditionalRequirements] = useState(
    initialPreferences?.additionalRequirements || ""
  );

  const toggleAmenity = (id) => {
    setAmenities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleNearby = (id) => {
    setNearby((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step < 5) {
      setStep((s) => s + 1);
    } else {
      handleFinalSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  const handleFinalSubmit = () => {
    setIsFinding(true);

    const chosenLocality = customLocality.trim() || locality;
    const selectedBudget = BUDGET_OPTIONS.find((b) => b.id === budgetRange) || {
      min: 20000,
      max: 30000,
    };

    const finalPrefs = {
      city,
      locality: chosenLocality,
      propertyType,
      bhk,
      familyMembers: Number(familyMembers) || 2,
      budgetRange,
      budgetMin: selectedBudget.min,
      budgetMax: selectedBudget.max,
      furnishing,
      amenities,
      nearby,
      maxDistance,
      additionalRequirements,
    };

    // Smooth transition showing "Finding homes for you..."
    setTimeout(() => {
      setIsFinding(false);
      onSubmit(finalPrefs);
    }, 1100);
  };

  const localitiesForCity = LOCALITY_SUGGESTIONS[city] || LOCALITY_SUGGESTIONS["Chennai"];

  return (
    <div className={`preference-flow-wrapper ${isModal ? "modal-mode" : "page-mode"}`}>
      {/* Background decoration & container */}
      <div className="preference-card card">
        {/* Top Header */}
        <div className="pref-header">
          <div className="pref-header-left">
            <span className="pref-step-pill">Step {step} of 5</span>
            <h2 className="pref-title">
              {step === 1 && "Where are you looking for a home?"}
              {step === 2 && "What type of home do you need?"}
              {step === 3 && "What's your monthly rent budget?"}
              {step === 4 && "What facilities & nearby places matter to you?"}
              {step === 5 && "Any specific preferences or requirements?"}
            </h2>
            <p className="pref-subtitle">
              {step === 1 && "Choose your preferred city and neighborhood across Tamil Nadu."}
              {step === 2 && "Tell us about your space requirement and family size."}
              {step === 3 && "Select your comfortable rent range and desired furnishing."}
              {step === 4 && "Select essential amenities and institutions near your home."}
              {step === 5 && "Tell us in your own words what would make your home perfect."}
            </p>
          </div>
          {onClose && (
            <button className="pref-close-btn" onClick={onClose} title="Close">
              ✕
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="pref-progress-bar">
          <div className="pref-progress-fill" style={{ width: `${(step / 5) * 100}%` }} />
        </div>

        {/* Finding Animation Overlay */}
        {isFinding && (
          <div className="finding-overlay">
            <div className="finding-content">
              <div className="finding-spinner" />
              <h3>Finding homes for you…</h3>
              <p>Analyzing database properties in {city} against your preferences</p>
              <div className="finding-checklist">
                <span>✓ Checking {bhk} BHK availability</span>
                <span>✓ Filtering by {budgetRange} budget</span>
                <span>✓ Matching amenities &amp; neighborhood</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: City & Locality */}
        {step === 1 && (
          <div className="pref-step-body animate-fade-in">
            <div className="pref-section">
              <label className="pref-field-label">1. Preferred City in Tamil Nadu</label>
              <div className="chip-grid city-chips">
                {TN_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`pref-chip ${city === c ? "selected" : ""}`}
                    onClick={() => {
                      setCity(c);
                      const locs = LOCALITY_SUGGESTIONS[c] || [];
                      if (locs.length > 0) setLocality(locs[0]);
                    }}
                  >
                    <span className="chip-pin">📍</span> {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="pref-section" style={{ marginTop: "24px" }}>
              <label className="pref-field-label">
                2. Preferred Locality / Area in {city}
              </label>
              <div className="chip-grid locality-chips">
                {localitiesForCity.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    className={`pref-chip locality-chip ${locality === loc && !customLocality ? "selected" : ""}`}
                    onClick={() => {
                      setLocality(loc);
                      setCustomLocality("");
                    }}
                  >
                    {loc}
                  </button>
                ))}
              </div>

              <div className="custom-locality-input-wrap" style={{ marginTop: "14px" }}>
                <span className="sub-text" style={{ display: "block", marginBottom: "6px" }}>
                  Or type a specific area / landmark:
                </span>
                <input
                  type="text"
                  className="inp"
                  value={customLocality}
                  onChange={(e) => setCustomLocality(e.target.value)}
                  placeholder={`e.g. Near Sholinganallur Junction, ${city}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Property Type, BHK & Family Members */}
        {step === 2 && (
          <div className="pref-step-body animate-fade-in">
            <div className="pref-section">
              <label className="pref-field-label">3. Property Type</label>
              <div className="option-cards-grid">
                {PROPERTY_TYPES.map((type) => (
                  <div
                    key={type.id}
                    className={`option-card ${propertyType === type.id ? "selected" : ""}`}
                    onClick={() => setPropertyType(type.id)}
                  >
                    <div className="option-icon">{type.icon}</div>
                    <div className="option-title">{type.label}</div>
                    <div className="option-desc">{type.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pref-section" style={{ marginTop: "24px" }}>
              <label className="pref-field-label">4. BHK Requirement</label>
              <div className="bhk-cards-grid">
                {BHK_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    className={`bhk-card ${bhk === opt.id ? "selected" : ""}`}
                    onClick={() => setBhk(opt.id)}
                  >
                    <div className="bhk-title">{opt.label}</div>
                    <div className="bhk-desc">{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pref-section" style={{ marginTop: "24px" }}>
              <label className="pref-field-label">
                5. How many people will be living here?
              </label>
              <div className="family-members-selector">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`member-btn ${familyMembers === num ? "selected" : ""}`}
                    onClick={() => setFamilyMembers(num)}
                  >
                    <span className="member-num">{num === 6 ? "6+" : num}</span>
                    <span className="member-label">{num === 1 ? "Person" : "People"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Monthly Rent Budget & Furnishing */}
        {step === 3 && (
          <div className="pref-step-body animate-fade-in">
            <div className="pref-section">
              <label className="pref-field-label">6. Monthly Rent Budget</label>
              <div className="budget-cards-grid">
                {BUDGET_OPTIONS.map((b) => (
                  <div
                    key={b.id}
                    className={`budget-card ${budgetRange === b.id ? "selected" : ""}`}
                    onClick={() => setBudgetRange(b.id)}
                  >
                    <div className="budget-check">{budgetRange === b.id ? "●" : "○"}</div>
                    <div className="budget-title">{b.label}</div>
                    <div className="budget-desc">{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pref-section" style={{ marginTop: "26px" }}>
              <label className="pref-field-label">7. Preferred Furnishing</label>
              <div className="furnishing-chips-grid">
                {FURNISHING_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`pref-chip furnishing-chip ${furnishing === f.id ? "selected" : ""}`}
                    onClick={() => setFurnishing(f.id)}
                  >
                    <span>{f.icon}</span> {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Important Amenities & Nearby Places */}
        {step === 4 && (
          <div className="pref-step-body animate-fade-in">
            <div className="pref-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="pref-field-label">
                  8. Important Amenities / Facilities (Select all that apply)
                </label>
                <span className="sub-text" style={{ fontSize: "12px" }}>
                  {amenities.length} selected
                </span>
              </div>
              <div className="amenities-toggle-grid">
                {AMENITIES_LIST.map((a) => {
                  const active = amenities.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`amenity-toggle-card ${active ? "active" : ""}`}
                      onClick={() => toggleAmenity(a.id)}
                    >
                      <span className="amenity-icon">{a.icon}</span>
                      <span className="amenity-name">{a.label}</span>
                      <span className="amenity-checkbox">{active ? "✓" : "+"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pref-section" style={{ marginTop: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="pref-field-label">
                  9. Nearby Places that Matter to You
                </label>
                <span className="sub-text" style={{ fontSize: "12px" }}>
                  {nearby.length} selected
                </span>
              </div>
              <div className="amenities-toggle-grid nearby-grid">
                {NEARBY_LIST.map((n) => {
                  const active = nearby.includes(n.id);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={`amenity-toggle-card ${active ? "active" : ""}`}
                      onClick={() => toggleNearby(n.id)}
                    >
                      <span className="amenity-icon">{n.icon}</span>
                      <span className="amenity-name">{n.label}</span>
                      <span className="amenity-checkbox">{active ? "✓" : "+"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pref-section" style={{ marginTop: "24px" }}>
              <label className="pref-field-label">
                10. Maximum Preferred Distance from Important Places
              </label>
              <div className="chip-grid">
                {DISTANCE_OPTIONS.map((dist) => (
                  <button
                    key={dist}
                    type="button"
                    className={`pref-chip ${maxDistance === dist ? "selected" : ""}`}
                    onClick={() => setMaxDistance(dist)}
                  >
                    {dist}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Additional Requirements (Free Text) */}
        {step === 5 && (
          <div className="pref-step-body animate-fade-in">
            <div className="pref-section">
              <label className="pref-field-label">
                11. Tell us anything else you need…
              </label>
              <p className="sub-text" style={{ marginBottom: "12px" }}>
                Share specific needs like quiet surroundings, east-facing/vastu entrance, specific school proximity, or balcony views.
              </p>
              <textarea
                className="inp pref-textarea"
                rows={4}
                value={additionalRequirements}
                onChange={(e) => setAdditionalRequirements(e.target.value)}
                placeholder="Example: I have two children and would prefer a 2 BHK apartment near a good school with parking and security."
              />
            </div>

            {/* Live Summary Preview */}
            <div className="pref-summary-box">
              <h4 style={{ margin: "0 0 10px 0", color: "var(--brand-blue)" }}>
                📋 Your Discovery Summary:
              </h4>
              <div className="pref-summary-grid">
                <div>
                  <span className="k">Location:</span> <strong>{customLocality || locality}, {city}</strong>
                </div>
                <div>
                  <span className="k">Configuration:</span> <strong>{bhk} BHK ({propertyType})</strong>
                </div>
                <div>
                  <span className="k">Budget:</span> <strong>{budgetRange}</strong>
                </div>
                <div>
                  <span className="k">Furnishing:</span> <strong>{furnishing}</strong>
                </div>
                <div>
                  <span className="k">Occupants:</span> <strong>{familyMembers} People</strong>
                </div>
                <div>
                  <span className="k">Key Amenities:</span>{" "}
                  <strong>{amenities.slice(0, 3).join(", ") || "Standard"}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="pref-footer">
          <div className="pref-footer-left">
            {step > 1 ? (
              <button type="button" className="btn-outline" onClick={handleBack}>
                ← Back
              </button>
            ) : onSkip ? (
              <button type="button" className="btn-text" onClick={onSkip} style={{ color: "var(--ink-muted)" }}>
                Skip to all properties →
              </button>
            ) : null}
          </div>

          <div className="pref-footer-right">
            <button type="button" className="btn-primary pref-next-btn" onClick={handleNext}>
              {step === 5 ? "🔍 Find Matching Homes" : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
