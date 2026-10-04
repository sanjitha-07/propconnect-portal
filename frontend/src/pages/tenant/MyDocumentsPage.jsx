import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import DataTable from "../../components/DataTable.jsx";
import PageHero from "../../components/PageHero.jsx";
import { DOCUMENTS } from "../../data/db.js";

export default function MyDocumentsPage() {
  const { user } = useContext(AuthContext);
  const { t } = useContext(SettingsContext);
  const [modalOpen, setModalOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("KYC");
  const [toast, setToast] = useState("");

  const entityId = user?.entityId || user?.entity_id || "TEN001";
  const [docList, setDocList] = useState(
    DOCUMENTS.filter((d) => d.relatedTo === entityId || d.relatedTo === "TN101")
  );

  const handleUpload = (e) => {
    e.preventDefault();
    if (!docName.trim()) return;
    const newDoc = {
      id: `DOC0${Math.floor(Math.random() * 90 + 10)}`,
      name: docName.trim(),
      type: docType,
      relatedTo: entityId,
      uploadedOn: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      status: "Verified",
    };
    setDocList((prev) => [newDoc, ...prev]);
    setDocName("");
    setModalOpen(false);
    setToast(`Document "${newDoc.name}" uploaded and verified successfully!`);
    setTimeout(() => setToast(""), 3000);
  };

  const handleDownload = (name) => {
    setToast(`Downloading ${name}…`);
    setTimeout(() => setToast(""), 3000);
  };

  const columns = [
    { key: "name", label: t("documentName") },
    { key: "type", label: t("documentType"), render: (r) => t(r.type.toLowerCase()) },
    { key: "uploadedOn", label: t("uploadedOn") },
    {
      key: "status",
      label: t("status"),
      render: (r) => (
        <span className={`pill ${r.status.toLowerCase()}`}>{t(r.status.toLowerCase())}</span>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (r) => (
        <button
          type="button"
          className="btn-outline"
          style={{ padding: "3px 8px", fontSize: "11px" }}
          onClick={() => handleDownload(r.name)}
        >
          📥 View / Download
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHero title={t("myDocuments")} subtitle={t("tenantHeroSubtitle")} />

      {toast && (
        <div style={{ background: "var(--accent-light, #e8f5e9)", color: "var(--green, #2e7d32)", padding: "10px 16px", borderRadius: "8px", marginBottom: "14px", fontWeight: "600" }}>
          ✓ {toast}
        </div>
      )}

      <DataTable
        title={t("myDocuments")}
        columns={columns}
        rows={docList}
        addLabel={t("uploadDocument")}
        onAdd={() => setModalOpen(true)}
      />

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleUpload}>
            <div className="settings-header">
              <h3>{t("uploadDocument")}</h3>
              <button type="button" className="icon-btn" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="field">
              <label>{t("documentName")}</label>
              <input
                className="inp"
                autoFocus
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Bank Statement, Voter ID"
              />
            </div>
            <div className="field">
              <label>{t("documentType")}</label>
              <select className="inp" value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="KYC">KYC</option>
                <option value="Agreement">Agreement</option>
                <option value="Inspection">Inspection</option>
                <option value="Utility">Utility</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>{t("cancel")}</button>
              <button type="submit" className="btn-primary">{t("submit")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
