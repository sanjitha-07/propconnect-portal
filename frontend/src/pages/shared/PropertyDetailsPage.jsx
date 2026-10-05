import { useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import PropertyChatModal from "../../components/chat/PropertyChatModal.jsx";
import ScheduleVisitModal from "../../components/chat/ScheduleVisitModal.jsx";
import { fetchPropertyById, fetchFavorites, toggleFavoriteApi } from "../../utils/apiClient.js";
import { generateGalleryForProperty } from "../../data/propertyGalleries.js";
import {
  propertyById,
  landlordById,
  TENANTS,
  LEASES,
  UTILITY_BILLS,
  MAINTENANCE_REQUESTS,
} from "../../data/db.js";
import PropertyMaintenanceHistoryCard from "../../components/fixit/PropertyMaintenanceHistoryCard.jsx";
import PreferredProvidersCard from "../../components/fixit/PreferredProvidersCard.jsx";
import FixItDispatchModal from "../../components/fixit/FixItDispatchModal.jsx";
import LiveTrackingModal from "../../components/fixit/LiveTrackingModal.jsx";
import ServiceReviewModal from "../../components/fixit/ServiceReviewModal.jsx";

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const { t, formatCurrency } = useContext(SettingsContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'utilities' | 'maintenance'
  const [property, setProperty] = useState(() => propertyById(id));
  const [loading, setLoading] = useState(!property);

  // Gallery & Lightbox states
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [galleryCategory, setGalleryCategory] = useState("all");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);

  // Favorites state (Database-backed)
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Modals
  const [showChatModal, setShowChatModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [dispatchTicket, setDispatchTicket] = useState(null);
  const [trackingBooking, setTrackingBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [toast, setToast] = useState(null);

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;
    async function loadProp() {
      try {
        const fetched = await fetchPropertyById(id);
        if (isMounted && fetched) {
          setProperty(fetched);
        } else if (isMounted && !property) {
          setProperty(propertyById(id));
        }
      } catch {
        if (isMounted && !property) {
          setProperty(propertyById(id));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadProp();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Load favorite status from backend database
  useEffect(() => {
    let isMounted = true;
    async function checkFavorite() {
      try {
        const userId = user?.id || user?.entityId || "TEN001";
        const favData = await fetchFavorites(userId);
        if (isMounted && favData && favData.propertyIds) {
          setIsFavorite(favData.propertyIds.includes(id));
        }
      } catch (err) {
        console.warn("Could not fetch favorites status:", err);
      }
    }
    checkFavorite();
    return () => {
      isMounted = false;
    };
  }, [id, user]);

  // Complete property gallery images
  const allGalleryImages = useMemo(() => {
    if (!property) return [];
    if (property.images && Array.isArray(property.images) && property.images.length > 0) {
      return property.images;
    }
    return generateGalleryForProperty(property);
  }, [property]);

  // Available categories for the active property
  const availableCategories = useMemo(() => {
    const cats = new Set(["all"]);
    allGalleryImages.forEach((img) => {
      if (img.category) cats.add(img.category);
    });
    return Array.from(cats);
  }, [allGalleryImages]);

  // Filtered gallery photos based on active category
  const filteredGalleryImages = useMemo(() => {
    if (galleryCategory === "all") return allGalleryImages;
    return allGalleryImages.filter(
      (img) => (img.category || "").toLowerCase() === galleryCategory.toLowerCase()
    );
  }, [allGalleryImages, galleryCategory]);

  // Reset selected image index if out of bounds on filter change
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [galleryCategory]);

  const activeImage = filteredGalleryImages[selectedImageIndex] || allGalleryImages[0];

  // Gallery Navigation Handlers
  const handlePrevImage = useCallback(() => {
    setSelectedImageIndex((prev) =>
      prev === 0 ? filteredGalleryImages.length - 1 : prev - 1
    );
  }, [filteredGalleryImages.length]);

  const handleNextImage = useCallback(() => {
    setSelectedImageIndex((prev) =>
      prev === filteredGalleryImages.length - 1 ? 0 : prev + 1
    );
  }, [filteredGalleryImages.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
      else if (e.key === "ArrowLeft") handlePrevImage();
      else if (e.key === "ArrowRight") handleNextImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, handlePrevImage, handleNextImage]);

  // Mobile touch swipe handlers
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 50) {
      // Swiped left -> next image
      handleNextImage();
    } else if (diff < -50) {
      // Swiped right -> prev image
      handlePrevImage();
    }
    setTouchStartX(null);
  };

  // Toggle favorite property (persists to MongoDB)
  const handleToggleFavorite = async () => {
    if (favLoading) return;
    setFavLoading(true);
    const userId = user?.id || user?.entityId || "TEN001";
    try {
      const res = await toggleFavoriteApi(userId, id);
      if (res && res.success) {
        setIsFavorite(res.isFavorite);
        showToastMsg(res.message || (res.isFavorite ? "Saved to favourites!" : "Removed from favourites."));
      } else {
        // Fallback toggle
        setIsFavorite((prev) => !prev);
      }
    } catch {
      setIsFavorite((prev) => !prev);
    } finally {
      setFavLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: "60px", textAlign: "center" }}>
        <p className="loading">Loading property specifications…</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="card not-found-card" style={{ textAlign: "center", padding: "60px 20px" }}>
        <h3>Property not found</h3>
        <p style={{ color: "var(--ink-muted)" }}>Could not locate property ID &quot;{id}&quot;.</p>
        <button className="btn-primary" onClick={() => navigate("../properties")}>
          {t("backToProperties") || "Back to Properties"}
        </button>
      </div>
    );
  }

  const landlord = property.landlord || landlordById(property.landlordId);
  const tenant = TENANTS.find((tn) => tn.propertyId === property.id);
  const lease = LEASES.find((l) => l.propertyId === property.id && l.status === "Active");
  const utilityBills = UTILITY_BILLS.filter((b) => b.propertyId === property.id);
  const maintenanceTickets = MAINTENANCE_REQUESTS.filter((m) => m.propertyId === property.id);

  const isAvailable = (property.status || "").toLowerCase() === "available";

  return (
    <div className="property-details-container animate-fade-in">
      {toast && (
        <div className="app-toast-container">
          <div className="app-toast success">
            <span>✓</span> {toast}
          </div>
        </div>
      )}

      {/* Top Navigation & Status Bar */}
      <div className="details-top-bar">
        <button className="btn-outline" onClick={() => navigate(-1)}>
          ← {t("backToProperties") || "Back to Properties"}
        </button>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span className="city-pill">📍 {property.city}</span>
          <span className={`pill ${isAvailable ? "active" : "paid"}`}>
            {isAvailable ? "Available for Rent" : "Occupied"}
          </span>
          {property.availableUnits > 0 && (
            <span className="available-units-badge">
              🔑 {property.availableUnits} Unit{property.availableUnits > 1 ? "s" : ""} Vacant
            </span>
          )}
          {/* Favorite Toggle Button in Top Bar */}
          <button
            type="button"
            className={`btn-fav-topbar ${isFavorite ? "favorited" : ""}`}
            onClick={handleToggleFavorite}
            disabled={favLoading}
            title={isFavorite ? "Remove from Saved Properties" : "Save this Property"}
          >
            {isFavorite ? "❤️ Saved" : "♡ Save Property"}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COMPLETE RICH PROPERTY PHOTO GALLERY UI                                   */}
      {/* ========================================================================= */}
      <div className="premium-property-gallery-card card">
        
        {/* Gallery Category Filter Chips */}
        <div className="gallery-category-chips">
          <div className="gallery-header-left">
            <span className="gallery-section-title">📸 Property Gallery</span>
            <span className="gallery-count-badge">
              {allGalleryImages.length} High-Res Photos
            </span>
          </div>

          <div className="category-filter-pills">
            {availableCategories.map((cat) => (
              <button
                type="button"
                key={cat}
                className={`cat-pill-btn ${galleryCategory === cat ? "active" : ""}`}
                onClick={() => setGalleryCategory(cat)}
              >
                {cat === "all" ? `All (${allGalleryImages.length})` : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Large Main Feature Image Box */}
        <div
          className="gallery-main-viewport"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Navigation Overlay Arrows */}
          {filteredGalleryImages.length > 1 && (
            <>
              <button
                type="button"
                className="gallery-nav-arrow prev"
                onClick={handlePrevImage}
                title="Previous Photo (← Arrow)"
              >
                ‹
              </button>
              <button
                type="button"
                className="gallery-nav-arrow next"
                onClick={handleNextImage}
                title="Next Photo (→ Arrow)"
              >
                ›
              </button>
            </>
          )}

          {/* Main Photo Click to View Lightbox */}
          <div
            className="gallery-img-container"
            onClick={() => setIsLightboxOpen(true)}
            title="Click to expand full-screen lightbox"
          >
            <img
              src={activeImage?.url || property.image}
              alt={activeImage?.caption || property.name}
              className="gallery-main-img"
              loading="eager"
            />
            <div className="gallery-gradient-overlay" />
          </div>

          {/* Top Overlays: Badges, Counter & Fullscreen trigger */}
          <div className="gallery-top-controls">
            <div className="gallery-category-tag">
              <span className="tag-icon">🏷️</span>
              <span>{activeImage?.category || "Exterior"}</span>
            </div>

            <div className="gallery-controls-right">
              <span className="gallery-counter-pill">
                📷 {selectedImageIndex + 1} / {filteredGalleryImages.length}
              </span>
              <button
                type="button"
                className="gallery-fullscreen-btn"
                onClick={() => setIsLightboxOpen(true)}
                title="Open Fullscreen Lightbox"
              >
                ⛶ Fullscreen
              </button>
            </div>
          </div>

          {/* Bottom Caption Overlay */}
          <div className="gallery-bottom-caption">
            <div className="caption-text-wrap">
              <h3 className="gallery-property-title">{property.name}</h3>
              <p className="gallery-photo-caption">
                {activeImage?.caption || `${activeImage?.category || "Photo"} view of ${property.name}, ${property.locality || property.city}`}
              </p>
            </div>

            <div className="caption-quick-details">
              <span className="caption-spec">🛏️ {property.bedrooms ? `${property.bedrooms} BHK` : "Special Unit"}</span>
              <span className="caption-spec">📐 {property.sqft || property.area || 800} sqft</span>
              <span className="caption-spec">💰 {formatCurrency(property.rent)}/mo</span>
            </div>
          </div>
        </div>

        {/* Thumbnail Strip Below Main Photo */}
        <div className="gallery-thumbnail-strip">
          {filteredGalleryImages.map((img, idx) => (
            <div
              key={img.id || idx}
              className={`gallery-thumb-item ${selectedImageIndex === idx ? "active" : ""}`}
              onClick={() => setSelectedImageIndex(idx)}
              title={`${img.category}: ${img.caption || ""}`}
            >
              <img src={img.url} alt={img.caption || `Thumbnail ${idx + 1}`} className="thumb-img" />
              <span className="thumb-category-label">{img.category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FULL-SCREEN / LIGHTBOX VIEW MODAL                                         */}
      {/* ========================================================================= */}
      {isLightboxOpen && (
        <div
          className="lightbox-overlay-backdrop animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="lightbox-modal-content"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Lightbox Header Bar */}
            <div className="lightbox-header">
              <div className="lightbox-title-info">
                <span className="lightbox-prop-name">{property.name}</span>
                <span className="lightbox-category-badge">🏷️ {activeImage?.category}</span>
                <span className="lightbox-counter">
                  {selectedImageIndex + 1} of {filteredGalleryImages.length} Photos
                </span>
              </div>

              <div className="lightbox-header-actions">
                <button
                  type="button"
                  className="lightbox-close-btn"
                  onClick={() => setIsLightboxOpen(false)}
                  title="Close Gallery (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Lightbox Center Image Stage */}
            <div className="lightbox-stage">
              {filteredGalleryImages.length > 1 && (
                <button
                  type="button"
                  className="lightbox-arrow prev"
                  onClick={handlePrevImage}
                  title="Previous Image (← Key)"
                >
                  ‹
                </button>
              )}

              <div className="lightbox-img-wrapper">
                <img
                  src={activeImage?.url}
                  alt={activeImage?.caption || property.name}
                  className="lightbox-large-img"
                />
              </div>

              {filteredGalleryImages.length > 1 && (
                <button
                  type="button"
                  className="lightbox-arrow next"
                  onClick={handleNextImage}
                  title="Next Image (→ Key)"
                >
                  ›
                </button>
              )}
            </div>

            {/* Lightbox Caption & Details Footer */}
            <div className="lightbox-footer">
              <div className="lightbox-caption-text">
                <strong>{activeImage?.category}:</strong> {activeImage?.caption || `High-resolution residential view of ${property.name}.`}
              </div>

              {/* Bottom Thumbnail Strip for Fast Switching inside Lightbox */}
              <div className="lightbox-thumbs-carousel">
                {filteredGalleryImages.map((img, idx) => (
                  <img
                    key={img.id || idx}
                    src={img.url}
                    alt=""
                    className={`lightbox-mini-thumb ${selectedImageIndex === idx ? "active" : ""}`}
                    onClick={() => setSelectedImageIndex(idx)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Action Buttons Bar */}
      <div className="card prop-primary-actions-card">
        <div className="actions-card-left">
          <div className="action-price-item">
            <span className="action-price-val">{formatCurrency(property.rent)}</span>
            <span className="action-price-sub">/ month rent</span>
          </div>
          <div className="action-deposit-item">
            <span className="action-deposit-val">{formatCurrency(property.deposit)}</span>
            <span className="action-deposit-sub">security deposit</span>
          </div>
        </div>

        <div className="actions-card-right">
          {/* Favorite Toggle Button */}
          <button
            type="button"
            className={`btn-outline prop-hero-btn ${isFavorite ? "fav-active" : ""}`}
            onClick={handleToggleFavorite}
            disabled={favLoading}
          >
            {isFavorite ? "❤️ Saved in My Favourites" : "♡ Save Property"}
          </button>

          <button
            type="button"
            className="btn-outline prop-hero-btn"
            onClick={() => setShowVisitModal(true)}
          >
            📅 Schedule a Visit
          </button>

          <button
            type="button"
            className="btn-primary prop-hero-btn chat-spotlight-btn"
            onClick={() => setShowChatModal(true)}
          >
            💬 Ask About This Property
          </button>
        </div>
      </div>

      {/* High-Impact Metrics Highlights */}
      <div className="prop-overview-row">
        <div className="overview-metric">
          <span className="metric-label">{t("rent")}</span>
          <span className="metric-val" style={{ color: "var(--brand-blue)" }}>
            {formatCurrency(property.rent)}
            <small style={{ fontSize: "12px", color: "var(--ink-muted)", fontWeight: 500 }}>/mo</small>
          </span>
        </div>
        <div className="overview-metric">
          <span className="metric-label">{t("deposit")}</span>
          <span className="metric-val">{formatCurrency(property.deposit)}</span>
        </div>
        <div className="overview-metric">
          <span className="metric-label">Super Built-up Area</span>
          <span className="metric-val">
            {property.sqft || property.area || 800}{" "}
            <small style={{ fontSize: "12px", color: "var(--ink-muted)" }}>sqft</small>
          </span>
        </div>
        <div className="overview-metric">
          <span className="metric-label">Configuration</span>
          <span className="metric-val">
            {property.bedrooms ? `${property.bedrooms} BHK` : "Dedicated Bay"}
          </span>
        </div>
      </div>

      {/* Description Box */}
      {property.description && (
        <div className="card prop-desc-card">
          <h3 style={{ margin: "0 0 10px 0" }}>About This Property</h3>
          <p style={{ margin: 0, lineHeight: "1.7", color: "var(--ink-secondary)", fontSize: "14px" }}>
            {property.description}
          </p>
        </div>
      )}

      {/* Section Tabs */}
      <div className="tabs" style={{ marginBottom: "16px" }}>
        <button
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Building Specifications &amp; Amenities
        </button>
        <button
          className={activeTab === "utilities" ? "active" : ""}
          onClick={() => setActiveTab("utilities")}
        >
          Utility Meters &amp; Bills ({utilityBills.length})
        </button>
        <button
          className={activeTab === "maintenance" ? "active" : ""}
          onClick={() => setActiveTab("maintenance")}
        >
          Service &amp; Maintenance ({maintenanceTickets.length})
        </button>
      </div>

      {activeTab === "overview" && (
        <>
          {/* Specifications Grid */}
          <div className="card specs-card">
            <h3>Building &amp; Unit Architectural Specifications</h3>
            <div className="specs-grid">
              <div className="spec-item">
                <span className="spec-icon">🏢</span>
                <div>
                  <span className="spec-name">Floor Level</span>
                  <span className="spec-data">{property.floor || "Residential Floor"}</span>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">🧭</span>
                <div>
                  <span className="spec-name">Orientation</span>
                  <span className="spec-data">{property.facing || "East (Vastu Compliant)"}</span>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">🚗</span>
                <div>
                  <span className="spec-name">Parking Bay</span>
                  <span className="spec-data">{property.parking || "1 Covered Stilt Slot"}</span>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">🛋️</span>
                <div>
                  <span className="spec-name">{t("furnishingLabel")}</span>
                  <span className="spec-data">{property.furnishing}</span>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">🚿</span>
                <div>
                  <span className="spec-name">Bathrooms</span>
                  <span className="spec-data">{property.bathrooms || 1} Attached / Common</span>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">🌅</span>
                <div>
                  <span className="spec-name">Balconies</span>
                  <span className="spec-data">{property.balconies || 1} Private Balcony</span>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">🐾</span>
                <div>
                  <span className="spec-name">Pet Policy</span>
                  <span className="spec-data">
                    {property.petFriendly ? "✓ Pet Friendly" : "Subject to Owner Approval"}
                  </span>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">⚡</span>
                <div>
                  <span className="spec-name">TNEB Consumer ID</span>
                  <span className="spec-data">{property.ebConsumerNo || "01-102-004-3291"}</span>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">💧</span>
                <div>
                  <span className="spec-name">Water Connection</span>
                  <span className="spec-data">{property.waterConnection || "Metro Water + Borewell"}</span>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">🏗️</span>
                <div>
                  <span className="spec-name">Builder / Promoters</span>
                  <span className="spec-data">{property.builder || "Signature Promoters TN"}</span>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">🗓️</span>
                <div>
                  <span className="spec-name">Year Built</span>
                  <span className="spec-data">{property.yearBuilt || 2023}</span>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">🔑</span>
                <div>
                  <span className="spec-name">Available Units</span>
                  <span className="spec-data">{property.availableUnits || (isAvailable ? 1 : 0)} Units</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amenities Section */}
          <div className="card amenities-section-card">
            <h3>Community Amenities &amp; Services</h3>
            <div className="amenities-chips-container">
              {(property.amenities || []).map((a) => (
                <div className="amenity-badge-card" key={a}>
                  <span className="amenity-check">✓</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Nearby Facilities Section */}
          {property.nearbyFacilities && property.nearbyFacilities.length > 0 && (
            <div className="card nearby-section-card">
              <h3>Nearby Facilities &amp; Neighborhood Connectivity</h3>
              <p className="sub-text" style={{ marginBottom: "14px" }}>
                Convenient proximity to essential services around {property.locality || property.city}:
              </p>
              <div className="amenities-chips-container">
                {property.nearbyFacilities.map((facility, fIdx) => (
                  <div className="amenity-badge-card nearby-badge" key={fIdx}>
                    <span className="nearby-pin">📍</span>
                    <span>{facility}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Landlord Profile & Occupant Information */}
          <div className="people-cards-row">
            {landlord && (
              <div className="card profile-box">
                <div className="box-header">
                  <span className="person-avatar">🏠</span>
                  <div>
                    <h4 style={{ margin: 0 }}>{t("landlordDetails")}</h4>
                    <span className="person-status verified">✓ Verified Owner</span>
                  </div>
                </div>
                <div className="kv-row">
                  <span className="k">{t("fullName")}:</span>
                  <span className="v">{landlord.name}</span>
                </div>
                <div className="kv-row">
                  <span className="k">{t("phone")}:</span>
                  <span className="v">{landlord.phone}</span>
                </div>
                <div className="kv-row">
                  <span className="k">{t("email")}:</span>
                  <span className="v">{landlord.email}</span>
                </div>
                <div className="kv-row">
                  <span className="k">Office Location:</span>
                  <span className="v">{landlord.location}</span>
                </div>
                <div style={{ marginTop: "14px" }}>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ width: "100%", padding: "8px" }}
                    onClick={() => setShowVisitModal(true)}
                  >
                    💬 Contact Landlord / Enquire
                  </button>
                </div>
              </div>
            )}

            {tenant ? (
              <div className="card profile-box">
                <div className="box-header">
                  <span className="person-avatar">👤</span>
                  <div>
                    <h4 style={{ margin: 0 }}>Current Occupant</h4>
                    <span className="person-status active">✓ Active Resident</span>
                  </div>
                </div>
                <div className="kv-row">
                  <span className="k">{t("fullName")}:</span>
                  <span className="v">{tenant.name}</span>
                </div>
                <div className="kv-row">
                  <span className="k">{t("phone")}:</span>
                  <span className="v">{tenant.phone}</span>
                </div>
                <div className="kv-row">
                  <span className="k">{t("email")}:</span>
                  <span className="v">{tenant.email}</span>
                </div>
                <div className="kv-row">
                  <span className="k">Organization:</span>
                  <span className="v">{tenant.company || "Corporate Tech"}</span>
                </div>
                {lease && (
                  <div className="kv-row">
                    <span className="k">Lease Term:</span>
                    <span className="v">{lease.startDate} – {lease.endDate}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="card profile-box vacant-box">
                <div className="box-header">
                  <span className="person-avatar">🔑</span>
                  <div>
                    <h4 style={{ margin: 0 }}>Unit is Vacant &amp; Move-in Ready</h4>
                    <span className="person-status available">Ready for Move In</span>
                  </div>
                </div>
                <p className="vacant-text">
                  This flat has completed society handover, security deposit verification, and electrical safety inspection.
                </p>
                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => setShowVisitModal(true)}
                  >
                    📅 Schedule Site Visit
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => setShowChatModal(true)}
                  >
                    💬 Ask Questions
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "utilities" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Utility Meters &amp; Recurring Bills</h3>
              <p className="card-subtitle">EB power and CMWSSB water connections for {property.name}</p>
            </div>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Bill ID</th>
                  <th>Service Type</th>
                  <th>Consumer No</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {utilityBills.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.id}</strong></td>
                    <td>{b.type}</td>
                    <td><small>{b.consumerNo}</small></td>
                    <td><strong>{formatCurrency(b.amount)}</strong></td>
                    <td>{b.dueDate}</td>
                    <td>
                      <span className={`pill ${b.status.toLowerCase()}`}>{b.status}</span>
                    </td>
                  </tr>
                ))}
                {utilityBills.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      No utility bills logged for this unit.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "maintenance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Landlord Preferred Service Providers Tree */}
          <PreferredProvidersCard
            propertyId={property.id}
            unit={property.unit || "Flat B-204"}
          />

          {/* Property Maintenance History & Cost Ledger Card */}
          <PropertyMaintenanceHistoryCard
            propertyId={property.id}
            propertyName={property.name}
            unit={property.unit || "Flat B-204"}
          />

          {/* Logged Maintenance Tickets */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3>Logged Maintenance Tickets</h3>
                <p className="card-subtitle">Active and past service requests for {property.name}</p>
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: "12px", padding: "7px 16px", background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)", fontWeight: 700 }}
                onClick={() =>
                  setDispatchTicket({
                    id: `MNT_${Date.now()}`,
                    propertyId: property.id,
                    propertyName: property.name,
                    unit: property.unit || "Flat B-204",
                    issue: "AC cooling problem - inspection & jet clean",
                    tenantName: tenant?.name || "Resident",
                  })
                }
              >
                ⚡ FixIt Dispatch (Book Pro)
              </button>
            </div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Logged Date</th>
                    <th>Status</th>
                    <th>FixIt Action</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceTickets.map((m) => (
                    <tr key={m.id}>
                      <td><strong>{m.id}</strong></td>
                      <td>{m.title || m.issue}</td>
                      <td>{m.category || "General"}</td>
                      <td>
                        <span className={`pill ${m.priority.toLowerCase()}`}>{m.priority}</span>
                      </td>
                      <td>{m.date}</td>
                      <td>
                        <span className={`pill ${m.status.toLowerCase()}`}>{m.status}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: "4px 8px", fontSize: "11px", color: "#0284c7", borderColor: "#bae6fd", fontWeight: 700 }}
                          onClick={() =>
                            setDispatchTicket({
                              id: m.id,
                              propertyId: property.id,
                              propertyName: property.name,
                              unit: property.unit || "Flat B-204",
                              issue: m.title || m.issue,
                              tenantName: tenant?.name || "Resident",
                            })
                          }
                        >
                          ⚡ Dispatch Pro
                        </button>
                      </td>
                    </tr>
                  ))}
                  {maintenanceTickets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty">
                        No active maintenance tickets pending for this unit.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Property-Aware Chat Modal */}
      {showChatModal && (
        <PropertyChatModal
          property={property}
          onClose={() => setShowChatModal(false)}
        />
      )}

      {/* Schedule Visit Modal */}
      {showVisitModal && (
        <ScheduleVisitModal
          property={property}
          onClose={() => setShowVisitModal(false)}
          onSuccess={() => {
            setToast(`Visit request for ${property.name} submitted successfully!`);
          }}
        />
      )}

      {/* FixIt Local Dispatch Modal */}
      {dispatchTicket && (
        <FixItDispatchModal
          complaint={dispatchTicket}
          onClose={() => setDispatchTicket(null)}
          onSuccess={(newBooking) => {
            setDispatchTicket(null);
            showToastMsg(`🎉 Technician Dispatched! ${newBooking.technicianName || "Kumar S."} is on the way.`);
            setTrackingBooking(newBooking);
          }}
        />
      )}

      {/* Live GPS Tracking Modal */}
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

      {/* Service Review Modal */}
      {reviewBooking && (
        <ServiceReviewModal
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSubmitted={() => {
            setReviewBooking(null);
            showToastMsg("⭐ Review saved! Recorded into Property Maintenance History Ledger.");
          }}
        />
      )}
    </div>
  );
}
