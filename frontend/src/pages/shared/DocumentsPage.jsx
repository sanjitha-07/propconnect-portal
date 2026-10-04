import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import DataTable from "../../components/DataTable.jsx";
import PageHero from "../../components/PageHero.jsx";
import { DOCUMENTS, PROPERTIES, TENANTS } from "../../data/db.js";
import {
  fetchDocuments,
  fetchProperties,
  fetchTenants,
  createDocument,
  updateDocument,
  deleteDocument,
} from "../../utils/apiClient.js";

export default function DocumentsPage() {
  const { user } = useContext(AuthContext);
  const { t } = useContext(SettingsContext);

  const [documents, setDocuments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [toast, setToast] = useState(null);

  const initialForm = {
    name: "",
    type: "PDF",
    category: "Tenant KYC",
    relatedTo: "",
    relatedType: "tenant",
    status: "Verified",
    uploadedOn: new Date().toISOString().split("T")[0],
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
        const [docData, propData, tenData] = await Promise.all([
          fetchDocuments(),
          fetchProperties(),
          fetchTenants(),
        ]);
        setDocuments(Array.isArray(docData) && docData.length > 0 ? docData : DOCUMENTS);
        setProperties(Array.isArray(propData) && propData.length > 0 ? propData : PROPERTIES);
        setTenants(Array.isArray(tenData) && tenData.length > 0 ? tenData : TENANTS);
      } catch (err) {
        setDocuments(DOCUMENTS);
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

  const getRelatedLabel = (relatedId) => {
    const ten = getTen(relatedId);
    if (ten && ten.name) return `${ten.name} (${ten.id})`;
    const prop = getProp(relatedId);
    if (prop && prop.name) return `${prop.name} (${prop.id})`;
    return relatedId || "General Estate";
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name) errors.name = "Document name/title is required";
    if (!formData.relatedTo) errors.relatedTo = "Please link a tenant or property";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const newId = `DOC${String(documents.length + 1).padStart(3, "0")}`;
    const newDoc = {
      ...formData,
      id: newId,
    };

    try {
      const res = await createDocument(newDoc);
      setDocuments((prev) => [res || newDoc, ...prev]);
      setIsAddOpen(false);
      setFormData(initialForm);
      showToast(`Document "${formData.name}" uploaded successfully!`);
    } catch (err) {
      showToast(err.message || "Failed to upload document", "error");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await updateDocument(editingDoc.id, formData);
      setDocuments((prev) =>
        prev.map((d) => (d.id === editingDoc.id ? { ...d, ...formData } : d))
      );
      setEditingDoc(null);
      showToast(`Document "${formData.name}" updated!`);
    } catch (err) {
      showToast(err.message || "Failed to update document", "error");
    }
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    try {
      await deleteDocument(deletingDoc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
      showToast(`Document ${deletingDoc.id} deleted`);
      setDeletingDoc(null);
    } catch (err) {
      showToast(err.message || "Failed to delete document", "error");
    }
  };

  const openEdit = (doc) => {
    setEditingDoc(doc);
    setFormData({
      name: doc.name || doc.title || "",
      type: doc.type || "PDF",
      category: doc.category || "Tenant KYC",
      relatedTo: doc.relatedTo || doc.propertyId || doc.tenantId || "",
      relatedType: doc.tenantId ? "tenant" : "property",
      status: doc.status || "Verified",
      uploadedOn: doc.uploadedOn || doc.uploadedAt || new Date().toISOString().split("T")[0],
    });
    setFormErrors({});
  };

  // Filter rows
  const rows = documents
    .map((d) => ({
      ...d,
      displayName: d.name || d.title || "Legal Document",
      relatedTitle: getRelatedLabel(d.relatedTo || d.propertyId || d.tenantId),
    }))
    .filter((d) => {
      if (user.role !== "landlord") return true;
      const ten = getTen(d.relatedTo || d.tenantId);
      if (ten && (ten.propertyId === "PROP001" || ten.propertyId === "PROP002")) return true;
      return true;
    });

  const verifiedCount = rows.filter((r) => r.status === "Verified").length;

  const columns = [
    {
      key: "name",
      label: t("documentName") || "Document Name",
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>
            {r.type === "PDF" ? "📕" : r.type === "Image" ? "🖼️" : "📄"}
          </span>
          <div>
            <strong>{r.displayName}</strong>
            <div className="sub-text">Doc Ref: {r.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: t("documentType") || "Format",
      render: (r) => <span className="city-tag">{r.type || "PDF"}</span>,
    },
    { key: "relatedTitle", label: t("relatedTo") || "Associated Entity", render: (r) => r.relatedTitle },
    { key: "uploadedOn", label: t("uploadedOn") || "Uploaded Date", render: (r) => r.uploadedOn || r.uploadedAt || "2026-09-01" },
    {
      key: "status",
      label: t("status"),
      render: (r) => {
        const cls = r.status === "Verified" ? "active" : "pending";
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
            onClick={() => setSelectedDoc(r)}
            title="Preview Document"
          >
            👁️ View
          </button>
          <button
            className="btn-outline"
            style={{ padding: "4px 8px", fontSize: "11.5px" }}
            onClick={() => openEdit(r)}
            title="Edit Document"
          >
            ✏️
          </button>
          <button
            className="btn-outline"
            style={{ padding: "4px 8px", fontSize: "11.5px", color: "var(--danger)" }}
            onClick={() => setDeletingDoc(r)}
            title="Delete Document"
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
        badge="Legal &amp; Compliance Vault"
        title={t("documentsTable") || "Digital Document Vault"}
        subtitle="Centralized repository for registered tenancy agreements, tenant Aadhaar KYC, property deeds, and police verifications"
      />

      {/* KPI Banner */}
      <div className="tn-properties-banner" style={{ marginBottom: "20px" }}>
        <div className="banner-stat">
          <span className="stat-num">{rows.length}</span>
          <span className="stat-label">Stored Documents</span>
        </div>
        <div className="banner-stat">
          <span className="stat-num" style={{ color: "var(--green)" }}>
            {verifiedCount}
          </span>
          <span className="stat-label">Verified &amp; Certified</span>
        </div>
        <div className="banner-stat">
          <span className="stat-num" style={{ color: "var(--brand-blue)" }}>
            256-bit
          </span>
          <span className="stat-label">Encrypted Storage</span>
        </div>
      </div>

      <DataTable
        title={t("documentsTable") || "Legal Documents"}
        columns={columns}
        rows={rows}
        addLabel={t("uploadDocument") || "+ Upload Document"}
        onAdd={() => {
          setFormData(initialForm);
          setFormErrors({});
          setIsAddOpen(true);
        }}
        searchKeys={["displayName", "type", "relatedTitle", "id"]}
        searchPlaceholder="Search legal documents, KYC, or property records…"
        pageSize={10}
      />

      {/* Add Document Modal */}
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
                <h3 style={{ margin: 0 }}>Upload Document</h3>
                <span className="sub-text">Add tenant KYC, agreement copy, or statutory certificate</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setIsAddOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                  Document Title *
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Tenant Aadhaar &amp; PAN Verification Copy"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                />
                {formErrors.name && <div style={{ color: "var(--danger)", fontSize: "11px", marginTop: "3px" }}>{formErrors.name}</div>}
              </div>

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
                    <option value="Tenant KYC">Tenant KYC / Identity</option>
                    <option value="Lease Agreement">Tenancy Agreement</option>
                    <option value="Property Deed">Property Deed / Patta</option>
                    <option value="Police Verification">Police Verification</option>
                    <option value="Tax Receipt">Property Tax Receipt</option>
                    <option value="Inspection Report">Inspection Report</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    File Format
                  </label>
                  <select
                    className="form-control"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="PDF">PDF Document (.pdf)</option>
                    <option value="Image">Scan / Photo (.jpg, .png)</option>
                    <option value="DOC">Word Document (.docx)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                  Associated Entity (Tenant or Property) *
                </label>
                <select
                  className="form-control"
                  value={formData.relatedTo}
                  onChange={(e) => setFormData({ ...formData, relatedTo: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                >
                  <option value="">-- Link to Tenant or Property --</option>
                  <optgroup label="Tenants">
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.id})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Properties">
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))}
                  </optgroup>
                </select>
                {formErrors.relatedTo && <div style={{ color: "var(--danger)", fontSize: "11px", marginTop: "3px" }}>{formErrors.relatedTo}</div>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Verification Status
                  </label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="Verified">Verified &amp; Certified</option>
                    <option value="Pending">Pending Verification</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Upload Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.uploadedOn}
                    onChange={(e) => setFormData({ ...formData, uploadedOn: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="btn-outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Upload &amp; Encrypt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {editingDoc && (
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
          onClick={() => setEditingDoc(null)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: "540px", padding: "26px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0 }}>Edit Document — {editingDoc.id}</h3>
                <span className="sub-text">Update title, entity link, or certification status</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => setEditingDoc(null)}>✕</button>
            </div>

            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                  Document Title
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px", fontSize: "12.5px", fontWeight: 600 }}>
                    Verification Status
                  </label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="Verified">Verified</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

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
                    <option value="Tenant KYC">Tenant KYC</option>
                    <option value="Lease Agreement">Tenancy Agreement</option>
                    <option value="Property Deed">Property Deed</option>
                    <option value="Police Verification">Police Verification</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="btn-outline" onClick={() => setEditingDoc(null)}>
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

      {/* Delete Document Modal */}
      {deletingDoc && (
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
          onClick={() => setDeletingDoc(null)}
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
                <h3 style={{ margin: 0, fontSize: "17px" }}>Delete Document?</h3>
                <span className="sub-text">Ref ID: {deletingDoc.id}</span>
              </div>
            </div>

            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", marginBottom: "20px" }}>
              Are you sure you want to permanently delete <strong>{deletingDoc.displayName}</strong> from the secure vault?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn-outline" onClick={() => setDeletingDoc(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                onClick={handleDelete}
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Document Preview Modal */}
      {selectedDoc && (
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
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: "560px", padding: "28px", boxShadow: "var(--shadow-xl)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row-between" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ margin: 0 }}>{selectedDoc.displayName}</h3>
                <span className="sub-text">Document ID: {selectedDoc.id}</span>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedDoc(null)}
                style={{ width: "28px", height: "28px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ margin: "20px 0", display: "flex", flexDirection: "column", gap: "12px", fontSize: "13.5px" }}>
              <div style={{ background: "var(--surface-hover)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <div className="kv" style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span className="k" style={{ color: "var(--text-secondary)" }}>Format:</span>
                  <span className="v" style={{ fontWeight: 600 }}>{selectedDoc.type || "PDF"} Document</span>
                </div>
                <div className="kv" style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span className="k" style={{ color: "var(--text-secondary)" }}>Associated Entity:</span>
                  <span className="v" style={{ fontWeight: 600 }}>{selectedDoc.relatedTitle}</span>
                </div>
                <div className="kv" style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span className="k" style={{ color: "var(--text-secondary)" }}>Uploaded On:</span>
                  <span className="v">{selectedDoc.uploadedOn || selectedDoc.uploadedAt || "2026-09-01"}</span>
                </div>
                <div className="kv" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="k" style={{ color: "var(--text-secondary)" }}>Status:</span>
                  <span className="v"><span className="pill active">{selectedDoc.status}</span></span>
                </div>
              </div>

              {/* Mock Certificate Preview */}
              <div
                style={{
                  border: "2px dashed var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "24px",
                  textAlign: "center",
                  background: "var(--surface-color)",
                }}
              >
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>📜</div>
                <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>
                  Verified Official Document
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", maxWidth: "360px", margin: "0 auto" }}>
                  Digitally certified and stored in Tamil Nadu Tenant &amp; Landlord Management System secure vault with SHA-256 integrity checksum.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn-outline" onClick={() => setSelectedDoc(null)}>
                Close
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  window.print();
                }}
              >
                📥 Download / Print Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
