import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import DataTable from "../../components/DataTable.jsx";
import PageHero from "../../components/PageHero.jsx";
import { COMPLAINTS } from "../../data/db.js";
import { createComplaint } from "../../utils/apiClient.js";

export default function MyComplaintsPage() {
  const { user } = useContext(AuthContext);
  const { t } = useContext(SettingsContext);
  const entityId = user?.entityId || user?.entity_id || "TEN001";
  const [complaints, setComplaints] = useState(
    COMPLAINTS.filter((c) => c.tenantId === entityId)
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [subjectInput, setSubjectInput] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subjectInput.trim()) return;
    const nextId = `CMP${Math.floor(Math.random() * 900 + 100)}`;
    const newComplaint = {
      id: nextId,
      tenantName: user?.name || "Divya Priya",
      tenant_name: user?.name || "Divya Priya",
      propertyName: "Sai Kala Apartments #302",
      property: "Sai Kala Apartments #302",
      subject: subjectInput.trim(),
      issue: subjectInput.trim(),
      priority: "Medium",
      status: "Open",
    };

    setComplaints((prev) => [
      ...prev,
      { id: nextId, propertyName: "Sai Kala Apartments #302", subject: subjectInput.trim(), status: "Open" },
    ]);

    // Persist to SQL backend
    await createComplaint(newComplaint);

    setSubjectInput("");
    setModalOpen(false);
  };

  const columns = [
    { key: "id", label: t("complaintId") },
    { key: "propertyName", label: t("property"), render: (r) => r.propertyName || "Sai Kala Apartments #302" },
    { key: "subject", label: t("subject") },
    { key: "status", label: t("status"), render: (r) => (
        <span className={`pill ${r.status.toLowerCase().replace(" ", "-")}`}>
          {t(r.status === "In Progress" ? "inProgress" : r.status.toLowerCase())}
        </span>
      ) },
  ];

  return (
    <div>
      <PageHero title={t("myComplaints")} subtitle={t("tenantHeroSubtitle")} />
      <DataTable
        title={t("myComplaints")}
        columns={columns}
        rows={complaints}
        addLabel={t("newComplaint")}
        onAdd={() => setModalOpen(true)}
      />

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <div className="settings-header">
              <h3>{t("newComplaint")}</h3>
              <button type="button" className="icon-btn" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="field">
              <label>{t("subject")}</label>
              <input
                className="inp"
                autoFocus
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
              />
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
