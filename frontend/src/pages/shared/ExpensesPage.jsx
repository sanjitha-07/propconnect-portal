import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import DataTable from "../../components/DataTable.jsx";
import PageHero from "../../components/PageHero.jsx";
import { EXPENSES, PROPERTIES } from "../../data/db.js";
import {
  fetchExpenses,
  fetchProperties,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../../utils/apiClient.js";

export default function ExpensesPage() {
  const { user } = useContext(AuthContext);
  const { t } = useContext(SettingsContext);

  const [expenses, setExpenses] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [toast, setToast] = useState(null);

  const initialForm = {
    propertyId: "",
    category: "Maintenance",
    paidTo: "",
    vendor: "",
    amount: 3500,
    date: new Date().toISOString().split("T")[0],
    description: "",
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
        const [expData, propData] = await Promise.all([
          fetchExpenses(),
          fetchProperties(),
        ]);
        setExpenses(Array.isArray(expData) && expData.length > 0 ? expData : EXPENSES);
        setProperties(Array.isArray(propData) && propData.length > 0 ? propData : PROPERTIES);
      } catch (err) {
        setExpenses(EXPENSES);
        setProperties(PROPERTIES);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getProp = (pId) => properties.find((p) => p.id === pId || p._id === pId) || {};

  const validateForm = () => {
    const errors = {};
    if (!formData.propertyId) errors.propertyId = "Please select a property";
    if (!formData.category) errors.category = "Category is required";
    if (!formData.paidTo && !formData.vendor) errors.paidTo = "Vendor / recipient name required";
    if (!formData.amount || formData.amount <= 0) errors.amount = "Enter a valid amount";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const newId = `EXP${String(expenses.length + 1).padStart(3, "0")}`;
    const vendorName = formData.paidTo || formData.vendor;
    const newExp = {
      ...formData,
      id: newId,
      paidTo: vendorName,
      vendor: vendorName,
      amount: Number(formData.amount),
    };

    try {
      const res = await createExpense(newExp);
      setExpenses((prev) => [res || newExp, ...prev]);
      setIsAddOpen(false);
      setFormData(initialForm);
      showToast(`Expense ${newId} recorded successfully!`);
    } catch (err) {
      showToast(err.message || "Failed to add expense", "error");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const vendorName = formData.paidTo || formData.vendor;
    const updated = {
      ...formData,
      paidTo: vendorName,
      vendor: vendorName,
      amount: Number(formData.amount),
    };

    try {
      await updateExpense(editingExpense.id, updated);
      setExpenses((prev) =>
        prev.map((e) => (e.id === editingExpense.id ? { ...e, ...updated } : e))
      );
      setEditingExpense(null);
      showToast(`Expense ${editingExpense.id} updated!`);
    } catch (err) {
      showToast(err.message || "Failed to update expense", "error");
    }
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;
    try {
      await deleteExpense(deletingExpense.id);
      setExpenses((prev) => prev.filter((e) => e.id !== deletingExpense.id));
      showToast(`Expense record ${deletingExpense.id} removed`);
      setDeletingExpense(null);
    } catch (err) {
      showToast(err.message || "Failed to delete expense", "error");
    }
  };

  const openEdit = (exp) => {
    setEditingExpense(exp);
    setFormData({
      propertyId: exp.propertyId || "",
      category: exp.category || "Maintenance",
      paidTo: exp.paidTo || exp.vendor || "",
      vendor: exp.vendor || exp.paidTo || "",
      amount: exp.amount || 0,
      date: exp.date || new Date().toISOString().split("T")[0],
      description: exp.description || "",
    });
    setFormErrors({});
  };

  const rows = expenses
    .map((e) => {
      const prop = getProp(e.propertyId);
      return {
        ...e,
        property: prop,
        propName: prop.name || e.propertyId || "General Estate",
        vendorName: e.paidTo || e.vendor || "Contractor",
      };
    })
    .filter(
      (e) =>
        user.role !== "landlord" ||
        e.property?.landlordId === user.entityId ||
        e.property?.landlordId === "LDL001" ||
        e.property?.landlordId === "LDL002"
    );

  const totalExpenseAmount = rows.reduce((sum, r) => sum + (r.amount || 0), 0);

  const columns = [
    {
      key: "id",
      label: t("expenseId") || "Expense ID",
      render: (r) => <span style={{ fontWeight: 700, color: "var(--brand-blue)" }}>{r.id}</span>,
    },
    {
      key: "property",
      label: t("property"),
      render: (r) => (
        <div>
          <strong>{r.propName}</strong>
          <div className="sub-text">{r.property?.city || "Tamil Nadu"}</div>
        </div>
      ),
    },
    {
      key: "category",
      label: t("category"),
      render: (r) => <span className="city-tag">{r.category}</span>,
    },
    {
      key: "vendor",
      label: t("vendor") || "Paid To",
      render: (r) => <span>{r.vendorName}</span>,
    },
    {
      key: "amount",
      label: t("amount"),
      render: (r) => <strong>₹{(r.amount || 0).toLocaleString("en-IN")}</strong>,
    },
    { key: "date", label: t("date") },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className="btn-outline"
            style={{ padding: "4px 8px", fontSize: "11.5px" }}
            onClick={() => openEdit(r)}
            title="Edit Expense"
          >
            ✏️
          </button>
          <button
            className="btn-outline"
            style={{ padding: "4px 8px", fontSize: "11.5px", color: "var(--danger)" }}
            onClick={() => setDeletingExpense(r)}
            title="Delete Expense"
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
        badge="Financial Outgoings &amp; OPEX"
        title={t("expensesTable") || "Property Operational Expenses"}
        subtitle="Manage maintenance outlays, contractor invoices, property repairs, and tax levies across Tamil Nadu assets"
      />

      {/* Summary KPI Banner */}
      <div className="tn-properties-banner" style={{ marginBottom: "20px" }}>
        <div className="banner-stat">
          <span className="stat-num">{rows.length}</span>
          <span className="stat-label">Expense Invoices</span>
        </div>
        <div className="banner-stat">
          <span className="stat-num" style={{ color: "var(--brand-blue)" }}>
            ₹{(totalExpenseAmount / 1000).toFixed(1)}k
          </span>
          <span className="stat-label">Total Outlay</span>
        </div>
        <div className="banner-stat">
          <span className="stat-num" style={{ color: "var(--green)" }}>
            {new Set(rows.map((r) => r.category)).size}
          </span>
          <span className="stat-label">Active Categories</span>
        </div>
      </div>

      <DataTable
        title={t("expensesTable") || "Operational Expenses"}
        columns={columns}
        rows={rows}
        addLabel={t("addExpense") || "+ Log Expense"}
        onAdd={() => {
          setFormData(initialForm);
          setFormErrors({});
          setIsAddOpen(true);
        }}
        searchKeys={["id", "category", "vendorName", "propName"]}
        searchPlaceholder="Search expenses by category, vendor, or property…"
        pageSize={10}
      />

      {/* Add Expense Modal */}
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
            style={{ width: "100%", maxWidth: "520px", padding: "26px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0 }}>Log New Expense</h3>
                <span className="sub-text">Record operational, maintenance, or vendor outlay</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setIsAddOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                  Property / Building *
                </label>
                <select
                  className="form-control"
                  value={formData.propertyId}
                  onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                >
                  <option value="">-- Select Property --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city || "Chennai"})
                    </option>
                  ))}
                </select>
                {formErrors.propertyId && <div style={{ color: "var(--danger)", fontSize: "11px", marginTop: "3px" }}>{formErrors.propertyId}</div>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Category *
                  </label>
                  <select
                    className="form-control"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="Maintenance">Maintenance &amp; Repairs</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Security">Security Services</option>
                    <option value="Cleaning">Cleaning &amp; Housekeeping</option>
                    <option value="Painting">Painting &amp; Renovation</option>
                    <option value="Taxes">Property Tax / Municipal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Vendor / Payee *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.paidTo}
                    onChange={(e) => setFormData({ ...formData, paidTo: e.target.value, vendor: e.target.value })}
                    placeholder="e.g. Chennai Plumbing Works"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  />
                  {formErrors.paidTo && <div style={{ color: "var(--danger)", fontSize: "11px", marginTop: "3px" }}>{formErrors.paidTo}</div>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="3500"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  />
                  {formErrors.amount && <div style={{ color: "var(--danger)", fontSize: "11px", marginTop: "3px" }}>{formErrors.amount}</div>}
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Expense Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                  Notes / Description
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Motor replacement for overhead tank"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="btn-outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
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
          onClick={() => setEditingExpense(null)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: "520px", padding: "26px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0 }}>Edit Expense — {editingExpense.id}</h3>
                <span className="sub-text">Modify category, vendor, or invoice amount</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setEditingExpense(null)}>✕</button>
            </div>

            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Category
                  </label>
                  <select
                    className="form-control"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="Maintenance">Maintenance &amp; Repairs</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Security">Security Services</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Painting">Painting</option>
                    <option value="Taxes">Taxes</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Vendor / Payee
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.paidTo}
                    onChange={(e) => setFormData({ ...formData, paidTo: e.target.value, vendor: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  />
                </div>
              </div>

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
                    Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="btn-outline" onClick={() => setEditingExpense(null)}>
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

      {/* Delete Expense Modal */}
      {deletingExpense && (
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
          onClick={() => setDeletingExpense(null)}
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
                <h3 style={{ margin: 0, fontSize: "17px" }}>Delete Expense Entry?</h3>
                <span className="sub-text">Invoice ID: {deletingExpense.id}</span>
              </div>
            </div>

            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", marginBottom: "20px" }}>
              Are you sure you want to delete the expense of ₹{(deletingExpense.amount || 0).toLocaleString("en-IN")} for{" "}
              <strong>{deletingExpense.vendorName}</strong>?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn-outline" onClick={() => setDeletingExpense(null)}>
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
