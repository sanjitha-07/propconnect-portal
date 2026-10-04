import { useState, useCallback, useMemo, useEffect, useContext } from "react";
import { SettingsContext } from "../context/SettingsContext.jsx";

/**
 * Enterprise SaaS DataTable with search, entry count, pagination, and clean UX
 */
export default function DataTable({
  title,
  columns,
  rows,
  searchKeys = [],
  searchPlaceholder = "Search records…",
  addLabel,
  onAdd,
  emptyText = "No records found.",
  pageSize = 10,
  extraHeaderActions = null,
}) {
  const { t } = useContext(SettingsContext);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  }, []);

  const filteredRows = useMemo(() => {
    if (!search.trim() || searchKeys.length === 0) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(q))
    );
  }, [rows, search, searchKeys]);

  useEffect(() => {
    const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [filteredRows.length, pageSize, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = useMemo(() => {
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, startIndex, pageSize]);

  return (
    <div className="card datatable-card">
      <div className="datatable-header">
        <div className="datatable-title-wrap">
          <h3 style={{ margin: 0 }}>{t(title)}</h3>
          <span className="badge-count">
            {t("{count} Total", { count: filteredRows.length })}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {extraHeaderActions}
          {addLabel && (
            <button className="btn-primary" onClick={onAdd}>
              {t(addLabel)}
            </button>
          )}
        </div>
      </div>

      {searchKeys.length > 0 && (
        <div className="datatable-search-bar">
          <span className="search-icon-inside">🔍</span>
          <input
            className="table-search"
            value={search}
            onChange={handleSearchChange}
            placeholder={t(searchPlaceholder)}
          />
          {search && (
            <button
              className="clear-search-btn"
              onClick={() => setSearch("")}
              title={t("Clear search")}
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{t(col.label)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, i) => (
              <tr key={row.id ?? startIndex + i}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="empty">
                  {t(emptyText)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredRows.length > pageSize && (
        <div className="pagination-bar">
          <div className="pagination-info">
            {t("Showing {start} to {end} of {total} records", {
              start: startIndex + 1,
              end: Math.min(startIndex + pageSize, filteredRows.length),
              total: filteredRows.length,
            })}
          </div>
          <div className="pagination-controls">
            <button
              className="btn-page"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              ← {t("Prev")}
            </button>
            <span className="page-indicator">
              {t("Page {current} of {total}", { current: currentPage, total: totalPages })}
            </span>
            <button
              className="btn-page"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              {t("Next")} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
