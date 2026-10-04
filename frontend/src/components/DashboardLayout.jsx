import { useContext, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import Chatbot from "./Chatbot.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import { SettingsContext } from "../context/SettingsContext.jsx";

export default function DashboardLayout() {
  const { user } = useContext(AuthContext);
  const { t } = useContext(SettingsContext);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="layout">
      {mobileNavOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <Sidebar
        role={user.role}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <div className="layout-main">
        <Topbar
          roleLabel={t(user.role)}
          onToggleNav={() => setMobileNavOpen((prev) => !prev)}
        />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
      <Chatbot />
    </div>
  );
}
