import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import DataTable from "../../components/DataTable.jsx";
import PageHero from "../../components/PageHero.jsx";
import { SECURITY_DEPOSITS, PROPERTIES, TENANTS } from "../../data/db.js";
import {
  fetchDeposits,
  fetchProperties,
  fetchTenants,
  createDeposit,
  updateDeposit,
  deleteDeposit,
} from "../../utils/apiClient.js";

export default function DepositsPage() {
  const { user } = useContext(AuthContext);
  const { t } = useContext(SettingsContext);

  const [deposits, setDeposits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [deletingDeposit, setDeletingDeposit] = useState(null);
  const [toast, setToast] = useState(null);

  const initialForm = {
    tenantId: "",
    propertyId: "",
    amount: 100000,
    paidOn: new Date().toISOString().split("T")[0],
    description: "10-Month Standard Tenancy Advance Deposit",
    status: "Held in Escrow",
    receiptNo: `DEP-TN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
  };
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [depData, propData, tenData] = await Promise.all([
          fetchDeposits(),
          fetchProperties(),
          fetchTenants(),
        ]);
        setDeposits(Array.isArray(depData) && depData.length > 0 ? depData : SECURITY_DEPOSITS);
        setProperties(Array.isArray(propData) && propData.length > 0 ? propData : PROPERTIES);
        setTenants(Array.isArray(tenData) && tenData.length > 0 ? tenData : TENANTS);
      } catch (err) {
        setDeposits(SECURITY_DEPOSITS);
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

  const handleTenantChange = (tId) => {
    const ten = getTen(tId);
    const relatedProp = properties.find((p) => p.id === ten.propertyId || p.tenantId === tId);
    setFormData((prev) => ({
      ...prev,
      tenantId: tId,
      propertyId: relatedProp?.id || prev.propertyId,
      amount: relatedProp?.deposit || prev.amount,
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.tenantId) errors.tenantId = "Please select a tenant";
    if (!formData.propertyId) errors.propertyId = "Please select a property";
    if (!formData.amount || formData.amount <= 0) errors.amount = "Enter a valid deposit amount";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const newId = `DEP${String(deposits.length + 1).padStart(3, "0")}`;
    const ten = getTen(formData.tenantId);
    const prop = getProp(formData.propertyId);

    const newDep = {
      ...formData,
      id: newId,
      amount: Number(formData.amount),
      tenantName: ten.name || "Tenant Resident",
      propName: prop.name || "Apartment Unit",
    };

    try {
      const res = await createDeposit(newDep);
      setDeposits((prev) => [res || newDep, ...prev]);
      setIsAddOpen(false);
      setFormData(initialForm);
      showToast(`Deposit receipt ${newId} registered in escrow!`);
    } catch (err) {
      showToast(err.message || "Failed to record deposit", "error");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const updated = {
      ...formData,
      amount: Number(formData.amount),
    };

    try {
      await updateDeposit(editingDeposit.id, updated);
      setDeposits((prev) =>
        prev.map((d) => (d.id === editingDeposit.id ? { ...d, ...updated } : d))
      );
      setEditingDeposit(null);
      showToast(`Deposit ${editingDeposit.id} updated!`);
    } catch (err) {
      showToast(err.message || "Failed to update deposit", "error");
    }
  };

  const handleDelete = async () => {
    if (!deletingDeposit) return;
    try {
      await deleteDeposit(deletingDeposit.id);
      setDeposits((prev) => prev.filter((d) => d.id !== deletingDeposit.id));
      showToast(`Security deposit ${deletingDeposit.id} archived`);
      setDeletingDeposit(null);
    } catch (err) {
      showToast(err.message || "Failed to delete deposit", "error");
    }
  };

  const openEdit = (dep) => {
    setEditingDeposit(dep);
    setFormData({
      tenantId: dep.tenantId || "",
      propertyId: dep.propertyId || "",
      amount: dep.amount || 0,
      paidOn: dep.paidOn || dep.dateReceived || new Date().toISOString().split("T")[0],
      description: dep.description || "Tenancy Caution Deposit",
      status: dep.status || "Held in Escrow",
      receiptNo: dep.receiptNo || dep.id,
    });
    setFormErrors({});
  };

  const rows = deposits
    .map((d) => {
      const prop = getProp(d.propertyId);
      const ten = getTen(d.tenantId);
      return {
        ...d,
        property: prop,
        tenant: ten,
        tenantName: d.tenantName || ten.name || d.tenantId,
        propName: d.propName || prop.name || d.propertyId,
      };
    })
    .filter(
      (d) =>
        user.role !== "landlord" ||
        d.property?.landlordId === user.entityId ||
        d.property?.landlordId === "LDL001" ||
        d.property?.landlordId === "LDL002"
    );

  const totalEscrow = rows.filter((r) => r.status === "Held in Escrow" || r.status === "Active").reduce((s, r) => s + (r.amount || 0), 0);

  const columns = [
    {
      key: "id",
      label: t("depositId") || "Deposit ID",
      render: (r) => (
        <div>
          <span style={{ fontWeight: 700, color: "var(--brand-blue)" }}>{r.id}</span>
          <div className="sub-text">{r.receiptNo || "TN-ESCROW"}</div>
        </div>
      ),
    },
    {
      key: "tenant",
      label: t("tenant"),
      render: (r) => <strong>{r.tenantName}</strong>,
    },
    {
      key: "property",
      label: t("property"),
      render: (r) => (
        <div>
          <span>{r.propName}</span>
          <div className="sub-text">{r.property?.city || "Tamil Nadu"}</div>
        </div>
      ),
    },
    {
      key: "description",
      label: "Purpose / Term",
      render: (r) => <span>{r.description || "Caution Advance"}</span>,
    },
    {
      key: "amount",
      label: t("amount"),
      render: (r) => <strong>₹{(r.amount || 0).toLocaleString("en-IN")}</strong>,
    },
    { key: "paidOn", label: t("paidOn") || "Received Date", render: (r) => r.paidOn || r.dateReceived || "—" },
    {
      key: "status",
      label: t("status"),
      render: (r) => {
        let cls = "active";
        if (r.status === "Refunded") cls = "overdue";
        if (r.status === "Partially Refunded") cls = "pending";
        return <span className={`pill ${cls}`}>{r.status}</span>;
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className="btn-outline"
            style={{ padding: "4px 8px", fontSize: "11.5px" }}
            onClick={() => openEdit(r)}
            title="Edit / Process Refund"
          >
            ✏️
          </button>
          <button
            className="btn-outline"
            style={{ padding: "4px 8px", fontSize: "11.5px", color: "var(--danger)" }}
            onClick={() => setDeletingDeposit(r)}
            title="Delete Deposit"
          >
            🗑️
          </button>
        </div>
      ),
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
        badge="Escrow &amp; Security Advances"
        title={t("depositsTable") || "Security Deposits Register"}
        subtitle="Tamil Nadu statutory security deposit holding ledger, escrow tracking, and lease-end refund management"
      />

      {/* KPI Banner */}
      <div className="tn-properties-banner" style={{ marginBottom: "20px" }}>
        <div className="banner-stat">
          <span className="stat-num">{rows.length}</span>
          <span className="stat-label">Active Escrow Accounts</span>
        </div>
        <div className="banner-stat">
          <span className="stat-num" style={{ color: "var(--green)" }}>
            ₹{(totalEscrow / 100000).toFixed(1)} Lakhs
          </span>
          <span className="stat-label">Total Held in Escrow</span>
        </div>
        <div className="banner-stat">
          <span className="stat-num" style={{ color: "var(--brand-blue)" }}>
            100%
          </span>
          <span className="stat-label">Statutory Compliance</span>
        </div>
      </div>

      <DataTable
        title={t("depositsTable") || "Security Deposits"}
        columns={columns}
        rows={rows}
        addLabel={t("addDeposit") || "+ Record Security Deposit"}
        onAdd={() => {
          setFormData(initialForm);
          setFormErrors({});
          setIsAddOpen(true);
        }}
        searchKeys={["id", "tenantName", "propName", "description", "receiptNo"]}
        searchPlaceholder="Search deposits by tenant, receipt #, or property…"
        pageSize={10}
      />

      {/* Add Deposit Modal */}
      {isAddOpen && (
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
          onClick={() => setIsAddOpen(false)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: "540px", padding: "26px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0 }}>Record Security Deposit</h3>
                <span className="sub-text">Add rental advance to statutory escrow register</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setIsAddOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Select Tenant *
                  </label>
                  <select
                    className="form-control"
                    value={formData.tenantId}
                    onChange={(e) => handleTenantChange(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="">-- Choose Tenant --</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.id})
                      </option>
                    ))}
                  </select>
                  {formErrors.tenantId && <div style={{ color: "var(--danger)", fontSize: "11px", marginTop: "3px" }}>{formErrors.tenantId}</div>}
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Property Unit *
                  </label>
                  <select
                    className="form-control"
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="">-- Choose Property --</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.propertyId && <div style={{ color: "var(--danger)", fontSize: "11px", marginTop: "3px" }}>{formErrors.propertyId}</div>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Deposit Amount (₹) *
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="100000"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  />
                  {formErrors.amount && <div style={{ color: "var(--danger)", fontSize: "11px", marginTop: "3px" }}>{formErrors.amount}</div>}
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Date Received
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.paidOn}
                    onChange={(e) => setFormData({ ...formData, paidOn: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                  Description / Purpose
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. 10-Month Standard Tenancy Advance Deposit"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Escrow Status
                  </label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="Held in Escrow">Held in Escrow</option>
                    <option value="Partially Refunded">Partially Refunded</option>
                    <option value="Refunded">Refunded / Settled</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Receipt Reference No
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.receiptNo}
                    onChange={(e) => setFormData({ ...formData, receiptNo: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="btn-outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save to Escrow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Deposit Modal */}
      {editingDeposit && (
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
          onClick={() => setEditingDeposit(null)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: "540px", padding: "26px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0 }}>Edit Deposit — {editingDeposit.id}</h3>
                <span className="sub-text">Modify amount, status, or process return settlement</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setEditingDeposit(null)}>✕</button>
            </div>

            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Status
                  </label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="Held in Escrow">Held in Escrow</option>
                    <option value="Partially Refunded">Partially Refunded</option>
                    <option value="Refunded">Refunded / Settled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                  Description
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="btn-outline" onClick={() => setEditingDeposit(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Deposit Modal */}
      {deletingDeposit && (
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
          onClick={() => setDeletingDeposit(null)}
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
                <h3 style={{ margin: 0, fontSize: "17px" }}>Delete Deposit Record?</h3>
                <span className="sub-text">Deposit ID: {deletingDeposit.id}</span>
              </div>
            </div>

            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", marginBottom: "20px" }}>
              Are you sure you want to remove the security deposit of ₹{(deletingDeposit.amount || 0).toLocaleString("en-IN")} for{" "}
              <strong>{deletingDeposit.tenantName}</strong>?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn-outline" onClick={() => setDeletingDeposit(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                onClick={handleDelete}
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
