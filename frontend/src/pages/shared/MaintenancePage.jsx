import { useContext, useState, useEffect, useCallback } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import DataTable from "../../components/DataTable.jsx";
import PageHero from "../../components/PageHero.jsx";
import { MAINTENANCE_REQUESTS, PROPERTIES, TENANTS } from "../../data/db.js";
import {
  fetchMaintenance,
  fetchProperties,
  fetchTenants,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
} from "../../utils/apiClient.js";
import FixItDispatchModal from "../../components/fixit/FixItDispatchModal.jsx";
import LiveTrackingModal from "../../components/fixit/LiveTrackingModal.jsx";
import ServiceReviewModal from "../../components/fixit/ServiceReviewModal.jsx";

const STATUS_FLOW = ["Open", "Assigned", "In Progress", "Completed", "Closed"];

export default function MaintenancePage() {
  const { user } = useContext(AuthContext);
  const { t } = useContext(SettingsContext);

  const [requests, setRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [deletingTicket, setDeletingTicket] = useState(null);
  const [toast, setToast] = useState(null);

  // FixIt Local Modals
  const [dispatchTicket, setDispatchTicket] = useState(null);
  const [trackingBooking, setTrackingBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);

  const initialTicket = {
    issueText: "",
    category: "Plumbing",
    priority: "Medium",
    propertyId: "",
    tenantId: "",
    vendor: "Chennai Facility Engineers",
  };
  const [newTicket, setNewTicket] = useState(initialTicket);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [mReqs, props, tens] = await Promise.all([
          fetchMaintenance(),
          fetchProperties(),
          fetchTenants(),
        ]);
        setRequests(Array.isArray(mReqs) && mReqs.length > 0 ? mReqs : MAINTENANCE_REQUESTS);
        setProperties(Array.isArray(props) && props.length > 0 ? props : PROPERTIES);
        setTenants(Array.isArray(tens) && tens.length > 0 ? tens : TENANTS);
      } catch (err) {
        setRequests(MAINTENANCE_REQUESTS);
        setProperties(PROPERTIES);
        setTenants(TENANTS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getProp = (pId) => properties.find((p) => p.id === pId || p._id === pId) || {};
  const getTen = (tId) => tenants.find((t) => t.id === tId || t._id === tId) || {};

  const advanceStatus = useCallback(async (id) => {
    const current = requests.find((r) => r.id === id);
    if (!current) return;
    const idx = STATUS_FLOW.indexOf(current.status);
    const next = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];

    try {
      await updateMaintenance(id, { status: next });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: next } : r))
      );
      showToast(`Ticket ${id} status advanced to "${next}"!`);
    } catch (err) {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: next } : r))
      );
      showToast(`Ticket ${id} updated locally`);
    }
  }, [requests]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.issueText) return;

    const newId = `MNT${String(requests.length + 1).padStart(3, "0")}`;
    const selectedProp = getProp(newTicket.propertyId || properties[0]?.id);
    const selectedTen = getTen(newTicket.tenantId || tenants[0]?.id);

    const created = {
      id: newId,
      propertyId: selectedProp.id || "PROP001",
      propertyName: selectedProp.name || "Sai Kala Apartments #302",
      tenantId: selectedTen.id || user?.entityId || "TEN001",
      tenantName: selectedTen.name || user?.name || "Resident",
      issueText: newTicket.issueText,
      description: newTicket.issueText,
      category: newTicket.category,
      priority: newTicket.priority,
      status: "Open",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      vendor: newTicket.vendor,
    };

    try {
      const res = await createMaintenance(created);
      setRequests([res || created, ...requests]);
      setShowCreateModal(false);
      setNewTicket(initialTicket);
      showToast(`Maintenance ticket ${newId} logged successfully!`);
    } catch (err) {
      showToast(err.message || "Failed to log ticket", "error");
    }
  };

  const handleDeleteTicket = async () => {
    if (!deletingTicket) return;
    try {
      await deleteMaintenance(deletingTicket.id);
      setRequests((prev) => prev.filter((r) => r.id !== deletingTicket.id));
      showToast(`Ticket ${deletingTicket.id} removed`);
      setDeletingTicket(null);
    } catch (err) {
      showToast(err.message || "Failed to delete ticket", "error");
    }
  };

  const rows = requests
    .map((r) => {
      const prop = getProp(r.propertyId);
      const ten = getTen(r.tenantId);
      return {
        ...r,
        property: prop,
        tenant: ten,
        issueDisplay: r.issueKey ? t(r.issueKey) : (r.issueText || r.description || "General Maintenance"),
        categoryDisplay: r.category || "General Repairs",
        propDisplay: r.propertyName || prop.name || r.propertyId,
        tenantDisplay: r.tenantName || ten.name || "Resident Tenant",
      };
    })
    .filter(
      (r) =>
        user.role !== "landlord" ||
        r.property?.landlordId === user.entityId ||
        r.property?.landlordId === "LDL001" ||
        r.property?.landlordId === "LDL002"
    );

  const openCount = rows.filter((r) => r.status === "Open" || r.status === "Assigned").length;
  const inProgressCount = rows.filter((r) => r.status === "In Progress").length;
  const completedCount = rows.filter((r) => r.status === "Completed" || r.status === "Closed").length;

  const columns = [
    {
      key: "id",
      label: "Ticket ID",
      render: (r) => (
        <span style={{ fontWeight: 700, color: "var(--brand-blue)" }}>{r.id}</span>
      ),
    },
    {
      key: "tenant",
      label: t("tenant"),
      render: (r) => <strong>{r.tenantDisplay}</strong>,
    },
    {
      key: "property",
      label: "Property & Unit",
      render: (r) => (
        <div>
          <span>{r.propDisplay}</span>
          <div className="sub-text">{r.property?.city || "Chennai"}</div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (r) => <span className="city-tag">{r.categoryDisplay}</span>,
    },
    {
      key: "issue",
      label: "Description",
      render: (r) => (
        <div style={{ maxWidth: "260px" }}>
          <span>{r.issueDisplay}</span>
        </div>
      ),
    },
    {
      key: "priority",
      label: t("priority"),
      render: (r) => {
        let cls = "active";
        if (r.priority === "Urgent" || r.priority === "High") cls = "overdue";
        else if (r.priority === "Medium") cls = "pending";
        return <span className={`pill ${cls}`}>{r.priority}</span>;
      },
    },
    { key: "date", label: "Date Logged" },
    {
      key: "vendor",
      label: "Assigned Contractor",
      render: (r) => <span className="sub-text">{r.vendor || "Pending Dispatch"}</span>,
    },
    {
      key: "status",
      label: t("status"),
      render: (r) => {
        let cls = "in-progress";
        if (r.status === "Completed" || r.status === "Closed") cls = "active";
        else if (r.status === "Open") cls = "pending";
        return <span className={`pill ${cls}`}>{r.status}</span>;
      },
    },
    {
      key: "actions",
      label: "FixIt Dispatch & Actions",
      render: (r) => {
        const isOpen = r.status === "Open" || r.status === "Assigned";
        const isDispatched = r.status === "FixIt Dispatched" || r.status === "In Progress";
        const isResolved = r.status === "Completed" || r.status === "Closed";

        return (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            {isOpen && (
              <button
                className="btn-primary"
                style={{
                  padding: "4px 10px",
                  fontSize: "11px",
                  background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                  fontWeight: 700,
                  boxShadow: "0 2px 4px rgba(2, 132, 199, 0.3)",
                }}
                onClick={() =>
                  setDispatchTicket({
                    id: r.id,
                    propertyId: r.propertyId || "TN101",
                    propertyName: r.propName || "Sai Kala Apartments - Flat 302",
                    unit: r.unit || "Flat B-204",
                    issue: r.issueDisplay || r.issueText || "Maintenance Repair",
                    category: r.category || "AC Repair",
                    tenantName: r.tenantName || "Resident",
                  })
                }
              >
                ⚡ FixIt Dispatch
              </button>
            )}

            {isDispatched && (
              <button
                className="btn-primary"
                style={{
                  padding: "4px 10px",
                  fontSize: "11px",
                  background: "#0284c7",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onClick={() =>
                  setTrackingBooking({
                    id: r.bookingId || `BK_FIX_${r.id}`,
                    unit: r.unit || "Flat B-204",
                    propertyName: r.propName || "Sai Kala Apartments",
                    serviceTitle: r.issueDisplay || "AC Repair & Service",
                    providerName: "Kumar AC Services",
                    technicianName: "Kumar S.",
                    technicianPhone: "+91 98765 00001",
                    status: "On The Way",
                    amount: 800,
                  })
                }
              >
                📍 Track Live GPS
              </button>
            )}

            {!isResolved ? (
              <button
                className="btn-outline"
                style={{ padding: "4px 8px", fontSize: "11px" }}
                onClick={() => advanceStatus(r.id)}
              >
                Advance →
              </button>
            ) : (
              <span className="pill active" style={{ fontSize: "11px" }}>✓ Resolved</span>
            )}

            <button
              className="btn-outline"
              style={{ padding: "4px 8px", fontSize: "11px", color: "var(--danger)" }}
              onClick={() => setDeletingTicket(r)}
              title="Delete Ticket"
            >
              🗑️
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            background: toast.type === "error" ? "var(--danger)" : "var(--success)",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: 500,
          }}
        >
          <span>{toast.type === "error" ? "⚠️" : "✅"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <PageHero
        badge="Property Maintenance Operations"
        title="Maintenance Requests &amp; Work Orders"
        subtitle="Manage electrical, plumbing, and building upkeep tickets across all Tamil Nadu residential communities"
        actions={
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + Log Maintenance Ticket
          </button>
        }
      />

      {/* KPI Banner */}
      <div className="tn-properties-banner" style={{ marginBottom: "20px" }}>
        <div className="banner-stat">
          <span className="stat-num">{rows.length}</span>
          <span className="stat-label">Total Work Orders</span>
        </div>
        <div className="banner-stat">
          <span className="stat-num" style={{ color: "var(--amber)" }}>
            {openCount}
          </span>
          <span className="stat-label">Open / Dispatched</span>
        </div>
        <div className="banner-stat">
          <span className="stat-num" style={{ color: "var(--brand-blue)" }}>
            {inProgressCount}
          </span>
          <span className="stat-label">Work In Progress</span>
        </div>
        <div className="banner-stat">
          <span className="stat-num" style={{ color: "var(--green)" }}>
            {completedCount}
          </span>
          <span className="stat-label">Successfully Resolved</span>
        </div>
      </div>

      <DataTable
        title="All Service Requests"
        columns={columns}
        rows={rows}
        searchKeys={["id", "issueDisplay", "propDisplay", "tenantDisplay", "vendor"]}
        searchPlaceholder="Search tickets by ID, issue, apartment, tenant, or contractor…"
        pageSize={10}
      />

      {/* Create Ticket Modal */}
      {showCreateModal && (
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
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: "540px", padding: "26px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0 }}>Log Maintenance Work Order</h3>
                <span className="sub-text">Dispatch repair task to facility contractors</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Property Unit
                  </label>
                  <select
                    className="form-control"
                    value={newTicket.propertyId}
                    onChange={(e) => setNewTicket({ ...newTicket, propertyId: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="">-- Choose Unit --</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Resident Tenant
                  </label>
                  <select
                    className="form-control"
                    value={newTicket.tenantId}
                    onChange={(e) => setNewTicket({ ...newTicket, tenantId: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="">-- Select Resident --</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Category
                  </label>
                  <select
                    className="form-control"
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="Plumbing">Plumbing &amp; Water</option>
                    <option value="Electrical">Electrical &amp; Wiring</option>
                    <option value="Carpentry">Carpentry &amp; Doors</option>
                    <option value="Appliance">AC &amp; Home Appliances</option>
                    <option value="Painting">Painting &amp; Civil</option>
                    <option value="Pest Control">Pest Control</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Priority Level
                  </label>
                  <select
                    className="form-control"
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="Low">Low (General)</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent / Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                  Issue Description *
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={newTicket.issueText}
                  onChange={(e) => setNewTicket({ ...newTicket, issueText: e.target.value })}
                  placeholder="Describe the maintenance breakdown in detail…"
                  required
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                  Assigned Contractor / Vendor
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={newTicket.vendor}
                  onChange={(e) => setNewTicket({ ...newTicket, vendor: e.target.value })}
                  placeholder="e.g. Chennai Facility Engineers"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="btn-outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Dispatch Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Ticket Modal */}
      {deletingTicket && (
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
          onClick={() => setDeletingTicket(null)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: "460px", padding: "26px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "var(--danger)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                🗑️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px" }}>Delete Maintenance Ticket?</h3>
                <span className="sub-text">Ticket ID: {deletingTicket.id}</span>
              </div>
            </div>

            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", marginBottom: "20px" }}>
              Are you sure you want to remove the ticket: <strong>"{deletingTicket.issueDisplay}"</strong>?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn-outline" onClick={() => setDeletingTicket(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                onClick={handleDeleteTicket}
              >
                Delete Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FixIt Local Dispatch Modal */}
      {dispatchTicket && (
        <FixItDispatchModal
          complaint={dispatchTicket}
          onClose={() => setDispatchTicket(null)}
          onSuccess={(newBooking) => {
            setDispatchTicket(null);
            showToast(`⚡ Technician Dispatched! ${newBooking.technicianName || "Service Provider"} is on the way.`);
            setRequests((prev) =>
              prev.map((r) =>
                r.id === dispatchTicket.id
                  ? { ...r, status: "FixIt Dispatched", bookingId: newBooking.id, vendor: newBooking.providerName }
                  : r
              )
            );
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
            setRequests((prev) =>
              prev.map((r) =>
                r.bookingId === completedBooking.id || r.id === completedBooking.complaintId
                  ? { ...r, status: "Completed" }
                  : r
              )
            );
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
            showToast("⭐ Service review recorded into Property Maintenance History!");
          }}
        />
      )}
    </div>
  );
}
