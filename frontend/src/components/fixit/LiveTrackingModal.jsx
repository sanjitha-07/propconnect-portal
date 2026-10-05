import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { updateFixItBookingStatus } from "../../utils/apiClient.js";
import "./FixItStyles.css";

// Waypoints along Chennai route for smooth realistic GPS simulation
const ROUTE_WAYPOINTS = [
  { lat: 13.0620, lng: 80.2520, eta: 8, dist: 1.8, status: "On The Way", note: "Technician picked up service tools and is on the way" },
  { lat: 13.0560, lng: 80.2470, eta: 6, dist: 1.4, status: "On The Way", note: "Crossing Anna Salai / Gemini Flyover junction" },
  { lat: 13.0490, lng: 80.2410, eta: 4, dist: 0.9, status: "On The Way", note: "Entering Panagal Park T. Nagar commercial zone" },
  { lat: 13.0445, lng: 80.2365, eta: 2, dist: 0.4, status: "On The Way", note: "Turned into Usman Road towards Sai Kala Apartments" },
  { lat: 13.0418, lng: 80.2341, eta: 0, dist: 0.0, status: "Arrived", note: "Technician arrived at Sai Kala Apartments gate" },
];

export default function LiveTrackingModal({ booking, onClose, onServiceCompleted }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const providerMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(() => {
    const s = booking?.status || "On The Way";
    if (s === "Confirmed") return 1;
    if (s === "On The Way") return 2;
    if (s === "Arrived") return 3;
    if (s === "In Progress") return 4;
    if (s === "Completed") return 5;
    return 2;
  });

  const [waypointIndex, setWaypointIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [eta, setEta] = useState(ROUTE_WAYPOINTS[0].eta);
  const [distance, setDistance] = useState(ROUTE_WAYPOINTS[0].dist);
  const [statusMessage, setStatusMessage] = useState("Technician Kumar S. is navigating towards Flat B-204");
  const [timeline, setTimeline] = useState(booking?.timeline || [
    { status: "Confirmed", time: "10:00 AM", note: "Booking confirmed & technician assigned" },
    { status: "On The Way", time: "10:05 AM", note: "Technician Kumar S. is on the way" },
  ]);

  const destCoords = booking?.destinationLocation || {
    lat: 13.0418,
    lng: 80.2341,
    address: "Sai Kala Apartments, Flat B-204, T. Nagar, Chennai",
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const initialProviderPos = ROUTE_WAYPOINTS[waypointIndex];
    const map = L.map(mapContainerRef.current, {
      center: [(initialProviderPos.lat + destCoords.lat) / 2, (initialProviderPos.lng + destCoords.lng) / 2],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Standard OpenStreetMap Tile Layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Custom Icon for Property Destination (Flat B-204)
    const propertyIcon = L.divIcon({
      className: "custom-property-pin",
      html: `
        <div style="background: #ef4444; color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(239,68,68,0.5); font-size: 18px; border: 2px solid #fff;">
          🏢
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    L.marker([destCoords.lat, destCoords.lng], { icon: propertyIcon })
      .addTo(map)
      .bindPopup(`<strong>${booking?.propertyName || "Sai Kala Apartments"}</strong><br/>${booking?.unit || "Flat B-204"}`)
      .openPopup();

    // Custom Icon for Technician on Vehicle
    const technicianIcon = L.divIcon({
      className: "custom-tech-pin",
      html: `
        <div style="background: #0284c7; color: #fff; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(2,132,199,0.6); font-size: 20px; border: 3px solid #fff; animation: fixitPulse 2s infinite;">
          🏍️
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });

    const provMarker = L.marker([initialProviderPos.lat, initialProviderPos.lng], {
      icon: technicianIcon,
    }).addTo(map);
    providerMarkerRef.current = provMarker;

    // Route Polyline
    const lineCoords = ROUTE_WAYPOINTS.map((w) => [w.lat, w.lng]);
    const routeLine = L.polyline(lineCoords, {
      color: "#0284c7",
      weight: 5,
      dashArray: "8, 8",
      opacity: 0.85,
    }).addTo(map);
    routeLineRef.current = routeLine;

    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Technician Marker position when waypoint changes
  const advanceToWaypoint = useCallback(
    async (idx) => {
      if (idx >= ROUTE_WAYPOINTS.length) return;
      setWaypointIndex(idx);
      const wp = ROUTE_WAYPOINTS[idx];

      setEta(wp.eta);
      setDistance(wp.dist);
      setStatusMessage(wp.note);

      if (providerMarkerRef.current && mapInstanceRef.current) {
        providerMarkerRef.current.setLatLng([wp.lat, wp.lng]);
        mapInstanceRef.current.panTo([wp.lat, wp.lng], { animate: true });
      }

      let stepNum = 2;
      let nextStatus = "On The Way";

      if (wp.status === "Arrived") {
        stepNum = 3;
        nextStatus = "Arrived";
      }

      setCurrentStep(stepNum);

      // Add to timeline
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setTimeline((prev) => [
        ...prev,
        { status: nextStatus, time: timeStr, note: wp.note },
      ]);

      if (booking?.id) {
        await updateFixItBookingStatus(booking.id, {
          status: nextStatus,
          lat: wp.lat,
          lng: wp.lng,
          note: wp.note,
        });
      }
    },
    [booking]
  );

  // Auto-play simulation interval
  useEffect(() => {
    let timer = null;
    if (isAutoPlaying) {
      timer = setInterval(() => {
        setWaypointIndex((current) => {
          if (current < ROUTE_WAYPOINTS.length - 1) {
            const next = current + 1;
            advanceToWaypoint(next);
            return next;
          } else {
            setIsAutoPlaying(false);
            return current;
          }
        });
      }, 3000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAutoPlaying, advanceToWaypoint]);

  // Advance lifecycle to In Progress or Completed manually
  const handleSetStatus = async (statusName, stepNum) => {
    setCurrentStep(stepNum);
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const note =
      statusName === "In Progress"
        ? "Technician commenced AC diagnostics, coil pressure cleaning & filter inspection"
        : "AC repair & maintenance successfully completed! Gas pressure checked at 45 PSI.";

    setStatusMessage(note);
    setTimeline((prev) => [...prev, { status: statusName, time: timeStr, note }]);

    if (booking?.id) {
      await updateFixItBookingStatus(booking.id, {
        status: statusName,
        note,
      });
    }

    if (statusName === "Completed" && onServiceCompleted) {
      setTimeout(() => {
        onServiceCompleted({
          ...booking,
          status: "Completed",
          amount: booking?.amount || 800,
        });
      }, 800);
    }
  };

  return (
    <div className="fixit-modal-overlay" onClick={onClose}>
      <div className="fixit-modal-card" style={{ maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="fixit-header">
          <div className="fixit-header-title">
            <div className="fixit-header-icon">📍</div>
            <div>
              <h2>Live Technician GPS Tracking — FixIt Local</h2>
              <p>
                Booking #{booking?.id || "BK_FIX_101"} • {booking?.serviceTitle || "AC Repair & Service"}
              </p>
            </div>
          </div>
          <button type="button" className="fixit-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="fixit-body">
          {/* Stepper */}
          <div className="fixit-stepper">
            <div className={`fixit-step-item ${currentStep >= 1 ? "done" : ""}`}>
              <div className="fixit-step-circle">✓</div>
              <span className="fixit-step-title">Confirmed</span>
            </div>
            <div className={`fixit-step-item ${currentStep === 2 ? "active" : currentStep > 2 ? "done" : ""}`}>
              <div className="fixit-step-circle">{currentStep > 2 ? "✓" : "🚗"}</div>
              <span className="fixit-step-title">On The Way</span>
            </div>
            <div className={`fixit-step-item ${currentStep === 3 ? "active" : currentStep > 3 ? "done" : ""}`}>
              <div className="fixit-step-circle">{currentStep > 3 ? "✓" : "📍"}</div>
              <span className="fixit-step-title">Arrived</span>
            </div>
            <div className={`fixit-step-item ${currentStep === 4 ? "active" : currentStep > 4 ? "done" : ""}`}>
              <div className="fixit-step-circle">{currentStep > 4 ? "✓" : "🔧"}</div>
              <span className="fixit-step-title">In Progress</span>
            </div>
            <div className={`fixit-step-item ${currentStep >= 5 ? "active done" : ""}`}>
              <div className="fixit-step-circle">{currentStep >= 5 ? "✨" : "5"}</div>
              <span className="fixit-step-title">Completed</span>
            </div>
          </div>

          {/* Interactive Leaflet Map */}
          <div className="fixit-map-wrapper">
            <div ref={mapContainerRef} className="fixit-map-canvas" />

            {/* ETA Glass Badge */}
            <div className="fixit-eta-overlay">
              <div className="fixit-eta-digit">{eta > 0 ? `${eta}m` : "0m"}</div>
              <div className="fixit-eta-details">
                <strong>{eta > 0 ? `Arriving in ~${eta} mins` : "Arrived at Doorstep!"}</strong>
                <span>
                  Distance: {distance > 0 ? `${distance} km away` : "At Flat B-204"} • Live GPS Streamed
                </span>
              </div>
            </div>
          </div>

          {/* Status Message Strip */}
          <div
            style={{
              background: currentStep >= 5 ? "#dcfce7" : "#f0f9ff",
              border: "1px solid",
              borderColor: currentStep >= 5 ? "#86efac" : "#bae6fd",
              color: currentStep >= 5 ? "#166534" : "#0369a1",
              borderRadius: 12,
              padding: "12px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>
              {currentStep === 2 && "🚗"}
              {currentStep === 3 && "📍"}
              {currentStep === 4 && "🔧"}
              {currentStep >= 5 && "🎉"}
            </span>
            <span>{statusMessage}</span>
          </div>

          {/* Simulation Controls for Viva & Testing */}
          <div className="fixit-sim-toolbar">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>GPS Simulation Controls:</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>(Interactive Demo Tool)</span>
            </div>

            <div className="fixit-sim-btn-group">
              <button
                type="button"
                className={`fixit-sim-btn ${isAutoPlaying ? "auto-play" : ""}`}
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              >
                {isAutoPlaying ? "⏸ Pause Live Simulation" : "▶ Auto-Play GPS Movement"}
              </button>

              <button
                type="button"
                className="fixit-sim-btn"
                disabled={waypointIndex >= ROUTE_WAYPOINTS.length - 1}
                onClick={() => advanceToWaypoint(Math.min(waypointIndex + 1, ROUTE_WAYPOINTS.length - 1))}
              >
                ⏩ Next Waypoint ({waypointIndex + 1}/{ROUTE_WAYPOINTS.length})
              </button>

              <button
                type="button"
                className="fixit-sim-btn"
                onClick={() => handleSetStatus("In Progress", 4)}
              >
                🔧 Start Service
              </button>

              <button
                type="button"
                className="fixit-sim-btn"
                style={{ background: "#16a34a", borderColor: "#22c55e" }}
                onClick={() => handleSetStatus("Completed", 5)}
              >
                ✅ Complete Service
              </button>
            </div>
          </div>

          {/* Technician Profile & Direct Call Strip */}
          <div className="fixit-tech-strip">
            <div className="fixit-tech-meta">
              <div className="fixit-tech-avatar">🏍️</div>
              <div className="fixit-tech-text">
                <h4>{booking?.technicianName || "Kumar S."} — {booking?.providerName || "Kumar AC Services"}</h4>
                <p>
                  Vehicle: <strong>{booking?.vehicle || "TVS Apache - TN 01 AB 4321"}</strong> • 68 Reviews (4.9 ★) • FixIt Verified
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <a
                href={`tel:${booking?.technicianPhone || "+919876500001"}`}
                className="fixit-call-btn"
                onClick={(e) => {
                  e.preventDefault();
                  alert(`Calling Technician ${booking?.technicianName || "Kumar S."} at ${booking?.technicianPhone || "+91 98765 00001"}...`);
                }}
              >
                📞 Call Technician
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
