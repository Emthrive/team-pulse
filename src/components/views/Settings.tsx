"use client";
// ============================================================
//  SETĂRI (portat din viewSet)
// ============================================================
import { exportCsv, exportJson, importJson, resetAll } from "@/lib/actions";
import { useRole } from "@/lib/admin";
import { editDept, editProject, newDept, newProject } from "@/lib/forms";
import { projectsOf } from "@/lib/taskRules";
import { useStore } from "@/lib/store";
import { Pencil } from "lucide-react";

export function Settings() {
  const S = useStore((s) => s.S)!;
  const { admin, elevated } = useRole();

  return (
    <>
      <div className="sec">
        <h2>Departamente</h2>
        <span className="rule" />
        <button className="act" onClick={() => newDept()}>
          + adaugă
        </button>
      </div>
      <div className="card">
        {S.departments.map((d) => (
          <div className="lead" key={d.id}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{d.n}</div>
              <div className="mini">
                {S.tasks.filter((t) => t.dept === d.id).length} taskuri ·{" "}
                {S.kpis.filter((k) => k.dept === d.id).length} KPI
              </div>
            </div>
            <button
              className="btn ghost sm"
              style={{ display: "inline-flex", alignItems: "center" }}
              onClick={() => editDept(d.id)}
              title="Editează"
            >
              <Pencil size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Proiectele (etichete pe taskuri) — gestionate de admin/manager. */}
      <div className="sec">
        <h2>Proiecte</h2>
        <span className="rule" />
        {elevated && (
          <button className="act" onClick={() => newProject()}>
            + adaugă
          </button>
        )}
      </div>
      <div className="card">
        {projectsOf(S).map((p) => (
          <div className="lead" key={p}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p}</div>
              <div className="mini">
                {S.tasks.filter((t) => (t.tags || []).some((g) => g.trim().toLowerCase() === p.toLowerCase())).length}{" "}
                taskuri
              </div>
            </div>
            {elevated && (
              <button
                className="btn ghost sm"
                style={{ display: "inline-flex", alignItems: "center" }}
                onClick={() => editProject(p)}
                title="Editează"
              >
                <Pencil size={15} />
              </button>
            )}
          </div>
        ))}
      </div>


      {/* Zona de date (export/import/reset) — doar pentru admin. */}
      {admin && (
        <>
          <div className="sec">
            <h2>Date</h2>
            <span className="rule" />
          </div>
          <div className="card">
            <p className="mini" style={{ margin: "0 0 12px", lineHeight: 1.55 }}>
              Datele se salvează automat în Firebase şi sunt partajate: oricine deschide această
              aplicaţie vede şi editează aceleaşi taskuri şi KPI. Fă un export periodic ca back-up.
            </p>
            <div className="row">
              <button className="btn ghost sm" onClick={() => exportJson()}>
                Export back-up (JSON)
              </button>
              <button className="btn ghost sm" onClick={() => exportCsv()}>
                Export taskuri (CSV)
              </button>
              <button className="btn ghost sm" onClick={() => importJson()}>
                Import back-up
              </button>
              <button className="btn danger sm" onClick={() => resetAll()}>
                Resetează tot
              </button>
            </div>
          </div>
        </>
      )}

      <div className="sec">
        <h2>Cum se calculează</h2>
        <span className="rule" />
      </div>
      <div className="card">
        <p className="mini" style={{ lineHeight: 1.6, margin: 0 }}>
          <b style={{ color: "var(--color-turq)" }}>Progres task:</b> media taskurilor bifate din Epic;
          dacă nu are taskuri, se ia progresul manual.
          <br />
          <b style={{ color: "var(--color-turq)" }}>Execuţie:</b> media dintre rata de finalizare la
          termen şi progresul mediu pe taskurile active, minus penalizare pentru întârzieri.
          <br />
          <b style={{ color: "var(--color-turq)" }}>KPI:</b> realizat / ţintă pe luna selectată.
        </p>
      </div>
    </>
  );
}
