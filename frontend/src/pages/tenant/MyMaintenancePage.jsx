import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import DataTable from "../../components/DataTable.jsx";
import PageHero from "../../components/PageHero.jsx";
import { MAINTENANCE_REQUESTS } from "../../data/db.js";
import { createMaintenanceRequest } from "../../utils/apiClient.js";

export default function MyMaintenancePage() {
  const { user } = useContext(AuthContext);
  const { t } = useContext(SettingsContext);

  const entityId = user?.entityId || user?.entity_id || "TEN001";

  const [requests, setRequests] = useState(
    MAINTENANCE_REQUESTS.filter((m) => m.tenantId === entityId)
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [issueInput, setIssueInput] = useState("");
  const [priorityInput, setPriorityInput] = useState("Medium");

  const issueLabel = (m) => (m.issueKey ? t(m.issueKey) : m.issueText);
  const statusKey = (s) => s.toLowerCase().replace(" ", "-");
  const tStatus = (s) => (s === "In Progress" ? "inProgress" : s.toLowerCase());

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!issueInput.trim()) return;
    const nextId = `MNT${Math.floor(Math.random() * 900 + 100)}`;
    const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const newTicket = {
      id: nextId,
      tenantId: entityId,
      issueText: issueInput.trim(),
      title: issueInput.trim(),
      priority: priorityInput,
      status: "Open",
      date: dateStr,
    };

    setRequests((prev) => [
      ...prev,
      { id: nextId, issueKey: null, issueText: issueInput.trim(), priority: priorityInput, status: "Open", date: dateStr },
    ]);

    // Persist to SQL backend
    await createMaintenanceRequest(newTicket);

    setIssueInput("");
    setPriorityInput("Medium");
    setModalOpen(false);
  };

  const columns = [
    { key: "id", label: "Ticket ID" },
    { key: "issue", label: t("issue"), render: issueLabel },
    { key: "priority", label: t("priority"), render: (r) => t(r.priority.toLowerCase()) },
    { key: "date", label: t("date") || "Date", render: (r) => r.date || "Recent" },
    { key: "status", label: t("status"), render: (r) => (
        <span className={`pill ${statusKey(r.status)}`}>{t(tStatus(r.status))}</span>
      ) },
  ];

  return (
    <div>
      <PageHero title={t("myMaintenance")} subtitle={t("tenantHeroSubtitle")} />
      <DataTable
        title={t("myMaintenance")}
        columns={columns}
        rows={requests}
        addLabel={t("raiseRequest")}
        onAdd={() => setModalOpen(true)}
      />

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmitRequest}>
            <div className="settings-header">
              <h3>{t("raiseRequestTitle")}</h3>
              <button type="button" className="icon-btn" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <div className="field">
              <label>{t("issueLabel")}</label>
              <input
                className="inp"
                autoFocus
                value={issueInput}
                onChange={(e) => setIssueInput(e.target.value)}
                placeholder={t("issuePlaceholder")}
              />
            </div>

            <div className="field">
              <label>{t("priorityLabel")}</label>
              <div className="toggle-row">
                {["High", "Medium", "Low"].map((p) => (
                  <button
                    type="button"
                    key={p}
                    className={`toggle-btn ${priorityInput === p ? "active" : ""}`}
                    onClick={() => setPriorityInput(p)}
                  >
                    {t(p.toLowerCase())}
                  </button>
                ))}
              </div>
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
