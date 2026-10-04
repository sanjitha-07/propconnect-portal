import { useContext, useState, useEffect, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import DataTable from "../../components/DataTable.jsx";
import PageHero from "../../components/PageHero.jsx";
import {
  fetchTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  fetchProperties,
  fetchLeases,
} from "../../utils/apiClient.js";
import { TENANTS as INITIAL_TENANTS, PROPERTIES as INITIAL_PROPERTIES, LEASES as INITIAL_LEASES } from "../../data/db.js";

export default function TenantsPage() {
  const { user } = useContext(AuthContext);
  const { t, formatCurrency } = useContext(SettingsContext);

  const [tenantsList, setTenantsList] = useState([]);
  const [propertiesList, setPropertiesList] = useState([]);
  const [leasesList, setLeasesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [deletingTenant, setDeletingTenant] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // New Tenant Form State
  const [newTenant, setNewTenant] = useState({
    name: "",
    email: "",
    phone: "",
    propertyId: "",
    company: "",
    location: "Chennai",
    status: "Active",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 3500);
  };

  // Load live data from MongoDB
  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedTenants, fetchedProps, fetchedLeases] = await Promise.all([
        fetchTenants(),
        fetchProperties(),
        fetchLeases(),
      ]);

      setTenantsList(fetchedTenants && fetchedTenants.length > 0 ? fetchedTenants : INITIAL_TENANTS);
      setPropertiesList(fetchedProps && fetchedProps.length > 0 ? fetchedProps : INITIAL_PROPERTIES);
      setLeasesList(fetchedLeases && fetchedLeases.length > 0 ? fetchedLeases : INITIAL_LEASES);
    } catch {
      setTenantsList(INITIAL_TENANTS);
      setPropertiesList(INITIAL_PROPERTIES);
      setLeasesList(INITIAL_LEASES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map tenants with property & lease information
  const rows = useMemo(() => {
    return tenantsList
      .map((tn) => {
        const prop = propertiesList.find((p) => p.id === (tn.propertyId || tn.property_id));
        const lease = leasesList.find(
          (l) => l.tenantId === tn.id || l.tenant_id === tn.id || l.id === (tn.leaseId || tn.lease_id)
        );
        return {
          ...tn,
          property: prop,
          lease,
          propName: prop?.name || tn.propertyId || tn.property_id || "Unassigned",
          rent: lease?.monthlyRent || lease?.rent || prop?.rent || 22000,
        };
      })
      .filter((tn) => {
        if (user?.role !== "landlord") return true;
        const landlordId = user.entityId || "LDL001";
        return (
          tn.property?.landlordId === landlordId ||
          tn.property?.landlord_id === landlordId ||
          tn.property?.landlordId === "LDL001" ||
          tn.property?.landlordId === "LDL002"
        );
      });
  }, [tenantsList, propertiesList, leasesList, user]);

  // Handle Register Tenant Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!newTenant.name || !newTenant.email) {
      showToast("Please enter tenant name and email address.", "error");
      return;
    }

    try {
      const created = await createTenant(newTenant);
      setTenantsList((prev) => [created, ...prev]);
      setShowRegisterModal(false);
      setNewTenant({
        name: "",
        email: "",
        phone: "",
        propertyId: "",
        company: "",
        location: "Chennai",
        status: "Active",
      });
      showToast(`Tenant ${created.name} registered successfully!`);
    } catch (err) {
      showToast(`Registration failed: ${err.message}`, "error");
    }
  };

  // Handle Edit Tenant Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTenant) return;

    try {
      const updated = await updateTenant(editingTenant.id, editingTenant);
      setTenantsList((prev) => prev.map((t) => (t.id === editingTenant.id ? updated : t)));
      setEditingTenant(null);
      showToast(`Tenant ${updated.name} updated successfully!`);
    } catch (err) {
      showToast(`Update failed: ${err.message}`, "error");
    }
  };

  // Handle Delete Tenant
  const handleDeleteConfirm = async () => {
    if (!deletingTenant) return;
    try {
      await deleteTenant(deletingTenant.id);
      setTenantsList((prev) => prev.filter((t) => t.id !== deletingTenant.id));
      showToast(`Tenant ${deletingTenant.name} removed successfully.`);
      setDeletingTenant(null);
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, "error");
    }
  };

  const columns = [
    {
      key: "name",
      label: "Tenant Name",
      render: (r) => (
        <div>
          <strong style={{ color: "var(--ink-primary)" }}>{r.name}</strong>
          <div className="sub-text">{r.email}</div>
        </div>
      ),
    },
    {
      key: "property",
      label: "Allotted Apartment",
      render: (r) => (
        <div>
          <span>{r.propName}</span>
          <div className="sub-text">{r.location || r.property?.city || "Tamil Nadu"}</div>
        </div>
      ),
    },
    {
      key: "company",
      label: "Employer / Org",
      render: (r) => <span className="city-tag">{r.company || "Self-Employed / Tech"}</span>,
    },
    { key: "phone", label: "Contact Phone" },
    {
      key: "rent",
      label: "Monthly Rent",
      render: (r) => <strong>{formatCurrency(r.rent)}</strong>,
    },
    {
      key: "status",
      label: t("status"),
      render: (r) => {
        let badgeClass = "active";
        if (r.status === "Pending") badgeClass = "pending";
        if (r.status === "Inactive" || r.status === "Expired") badgeClass = "overdue";
        return <span className={`pill ${badgeClass}`}>{r.status}</span>;
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className="btn-outline"
            style={{ padding: "4px 8px", fontSize: "11px" }}
            onClick={() => setSelectedTenant(r)}
            title="View Details"
          >
            Details
          </button>
          <button
            className="btn-outline"
            style={{ padding: "4px 8px", fontSize: "11px" }}
            onClick={() => setEditingTenant(r)}
            title="Edit Tenant"
          >
            ✏️
          </button>
          <button
            className="btn-outline"
            style={{ padding: "4px 8px", fontSize: "11px", color: "var(--red)" }}
            onClick={() => setDeletingTenant(r)}
            title="Delete Tenant"
          >
            🗑️
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHero
        badge="Resident Directory"
        title={t("tenantsTable")}
        subtitle="Manage resident tenants, apartment allotments, corporate tenancies, and KYC emergency contacts"
        actions={
          <button className="btn-primary" onClick={() => setShowRegisterModal(true)}>
            + Register Tenant
          </button>
        }
      />

      {toast.message && (
        <div className="app-toast-container">
          <div className={`app-toast ${toast.type}`}>
            <span>{toast.type === "success" ? "✓" : "⚠️"}</span> {toast.message}
          </div>
        </div>
      )}

      <DataTable
        title="Active Resident Tenants Directory"
        columns={columns}
        rows={rows}
        addLabel="+ Register Tenant"
        onAdd={() => setShowRegisterModal(true)}
        searchKeys={["name", "email", "phone", "location", "company", "propName"]}
        searchPlaceholder="Search tenants by name, email, company, apartment, or city…"
        pageSize={10}
      />

      {/* ---------------- REGISTER TENANT MODAL ---------------- */}
      {showRegisterModal && (
        <div className="modal-backdrop" onClick={() => setShowRegisterModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Register New Tenant</h3>
              <button className="modal-close-btn" onClick={() => setShowRegisterModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRegisterSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Full Name *</label>
                    <input
                      className="form-input"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={newTenant.name}
                      onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-input"
                      required
                      placeholder="tenant@example.com"
                      value={newTenant.email}
                      onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      className="form-input"
                      required
                      placeholder="+91 98765 43210"
                      value={newTenant.phone}
                      onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Allot Apartment / Property</label>
                    <select
                      className="form-select"
                      value={newTenant.propertyId}
                      onChange={(e) => setNewTenant({ ...newTenant, propertyId: e.target.value })}
                    >
                      <option value="">-- Select Property Unit --</option>
                      {propertiesList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.city}) — {formatCurrency(p.rent)}/mo
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Employer / Organization</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Zoho / Bosch / Freelance"
                      value={newTenant.company}
                      onChange={(e) => setNewTenant({ ...newTenant, company: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">City / Region</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Chennai, Coimbatore"
                      value={newTenant.location}
                      onChange={(e) => setNewTenant({ ...newTenant, location: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tenancy Status</label>
                    <select
                      className="form-select"
                      value={newTenant.status}
                      onChange={(e) => setNewTenant({ ...newTenant, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending KYC</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setShowRegisterModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save &amp; Register Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- EDIT TENANT MODAL ---------------- */}
      {editingTenant && (
        <div className="modal-backdrop" onClick={() => setEditingTenant(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Tenant: {editingTenant.name}</h3>
              <button className="modal-close-btn" onClick={() => setEditingTenant(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Full Name</label>
                    <input
                      className="form-input"
                      required
                      value={editingTenant.name}
                      onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      required
                      value={editingTenant.email}
                      onChange={(e) => setEditingTenant({ ...editingTenant, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      className="form-input"
                      required
                      value={editingTenant.phone}
                      onChange={(e) => setEditingTenant({ ...editingTenant, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Allotted Apartment</label>
                    <select
                      className="form-select"
                      value={editingTenant.propertyId || editingTenant.property_id || ""}
                      onChange={(e) =>
                        setEditingTenant({
                          ...editingTenant,
                          propertyId: e.target.value,
                          property_id: e.target.value,
                        })
                      }
                    >
                      <option value="">-- Select Property Unit --</option>
                      {propertiesList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Employer</label>
                    <input
                      className="form-input"
                      value={editingTenant.company || ""}
                      onChange={(e) => setEditingTenant({ ...editingTenant, company: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={editingTenant.status || "Active"}
                      onChange={(e) => setEditingTenant({ ...editingTenant, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending KYC</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Notice Period">Notice Period</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setEditingTenant(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- DELETE CONFIRMATION MODAL ---------------- */}
      {deletingTenant && (
        <div className="modal-backdrop" onClick={() => setDeletingTenant(null)}>
          <div className="modal-card" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Remove Tenant</h3>
              <button className="modal-close-btn" onClick={() => setDeletingTenant(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: "0 0 12px 0", fontSize: "14px" }}>
                Are you sure you want to deactivate and remove <strong>{deletingTenant.name}</strong> ({deletingTenant.id})?
              </p>
              <p style={{ margin: 0, fontSize: "12.5px", color: "var(--ink-muted)" }}>
                This will free up their allotted apartment and archive active lease associations.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setDeletingTenant(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ background: "var(--red)", borderColor: "var(--red)" }}
                onClick={handleDeleteConfirm}
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TENANT DETAIL MODAL ---------------- */}
      {selectedTenant && (
        <div className="modal-backdrop" onClick={() => setSelectedTenant(null)}>
          <div className="modal-card" style={{ maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedTenant.name}</h3>
                <span className="sub-text">Employer: {selectedTenant.company || "Not specified"}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedTenant(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                <div className="kv"><span className="k">Tenant ID:</span><span className="v">{selectedTenant.id}</span></div>
                <div className="kv"><span className="k">Email Address:</span><span className="v">{selectedTenant.email}</span></div>
                <div className="kv"><span className="k">Contact Phone:</span><span className="v">{selectedTenant.phone}</span></div>
                <div className="kv"><span className="k">Assigned Apartment:</span><span className="v">{selectedTenant.propName}</span></div>
                <div className="kv"><span className="k">Monthly Rent:</span><span className="v"><strong>{formatCurrency(selectedTenant.rent)}/mo</strong></span></div>
                <div className="kv"><span className="k">Tenancy Status:</span><span className="v"><span className="pill active">{selectedTenant.status}</span></span></div>
                <div className="kv"><span className="k">KYC Verification:</span><span className="v"><span className="pill verified">✓ Verified Aadhar &amp; Agreement</span></span></div>
                <div className="kv"><span className="k">Location:</span><span className="v">{selectedTenant.location || "Tamil Nadu, India"}</span></div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-outline"
                onClick={() => {
                  const current = selectedTenant;
                  setSelectedTenant(null);
                  setEditingTenant(current);
                }}
              >
                ✏️ Edit Profile
              </button>
              <button className="btn-primary" onClick={() => setSelectedTenant(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
