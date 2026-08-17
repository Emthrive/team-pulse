"use client";
// ============================================================
//  SHELL-UL APLICAȚIEI (portat din render + init)
// ============================================================
import { useEffect } from "react";
import { newTask } from "@/lib/forms";
import { useStore } from "@/lib/store";
import { Header } from "./Header";
import { Modal } from "./ui/Modal";
import { Dash } from "./views/Dash";
import { Kpi } from "./views/Kpi";
import { Settings } from "./views/Settings";
import { Tasks } from "./views/Tasks";
import { Team } from "./views/Team";

export function Crm() {
  const bootstrap = useStore((s) => s.bootstrap);
  const loaded = useStore((s) => s.loaded);
  const S = useStore((s) => s.S);
  const tab = useStore((s) => s.tab);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const showFab = tab === "tasks" || tab === "dash";

  return (
    <>
      <Header />
      <main className="app-main">
        {!loaded || !S ? (
          <div className="empty">Se încarcă…</div>
        ) : tab === "dash" ? (
          <Dash />
        ) : tab === "tasks" ? (
          <Tasks />
        ) : tab === "kpi" ? (
          <Kpi />
        ) : tab === "team" ? (
          <Team />
        ) : (
          <Settings />
        )}
      </main>
      {showFab && loaded && S && (
        <button className="fab" title="Adaugă" onClick={() => newTask()}>
          +
        </button>
      )}
      <Modal />
    </>
  );
}
