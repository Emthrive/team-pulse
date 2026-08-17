"use client";
// ============================================================
//  SHELL-UL APLICAȚIEI (portat din render + init)
// ============================================================
import { useEffect } from "react";
import { useIsAdmin } from "@/lib/admin";
import { newTask } from "@/lib/forms";
import { useStore } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { Modal } from "./ui/Modal";
import { Dash } from "./views/Dash";
import { Kpi } from "./views/Kpi";
import { Notifications } from "./views/Notifications";
import { Settings } from "./views/Settings";
import { Tasks } from "./views/Tasks";
import { Team } from "./views/Team";

export function Crm() {
  const bootstrap = useStore((s) => s.bootstrap);
  const loaded = useStore((s) => s.loaded);
  const S = useStore((s) => s.S);
  const tab = useStore((s) => s.tab);
  const collapsed = useStore((s) => s.collapsed);
  const admin = useIsAdmin();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Setări e doar pentru admin; dacă un user normal ajunge cumva pe „set”, cade pe Panou.
  const activeTab = tab === "set" && !admin ? "dash" : tab;
  // Oricine autentificat îşi poate crea taskuri.
  const showFab = activeTab === "tasks" || activeTab === "dash";

  return (
    <div className="shell">
      <Sidebar />
      <div className={`content ${collapsed ? "collapsed" : ""}`}>
        <main className="app-main">
          {!loaded || !S ? (
            <div className="empty">Se încarcă…</div>
          ) : activeTab === "dash" ? (
            <Dash />
          ) : activeTab === "tasks" ? (
            <Tasks />
          ) : activeTab === "kpi" ? (
            <Kpi />
          ) : activeTab === "team" ? (
            <Team />
          ) : activeTab === "notif" ? (
            <Notifications />
          ) : (
            <Settings />
          )}
        </main>
      </div>
      {showFab && loaded && S && (
        <button className="fab" title="Adaugă" onClick={() => newTask()}>
          +
        </button>
      )}
      <Modal />
    </div>
  );
}
