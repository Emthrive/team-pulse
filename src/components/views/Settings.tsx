"use client";
// ============================================================
//  SETĂRI (portat din viewSet)
// ============================================================
import { exportCsv, exportJson, importJson, resetAll } from "@/lib/actions";
import { memName } from "@/lib/calc";
import { editDept, editWeights, joinTeam, newDept, whoAmI } from "@/lib/forms";
import { useStore } from "@/lib/store";

export function Settings() {
  const S = useStore((s) => s.S)!;
  const me = useStore((s) => s.me);
  const W = S.weights;
  const meMember = me ? S.members.find((m) => m.id === me) : undefined;

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
                {S.kpis.filter((k) => k.dept === d.id).length} KPI · coordonator:{" "}
                {d.leadId ? memName(S, d.leadId) : "nesetat"}
              </div>
            </div>
            <button className="btn ghost sm" onClick={() => editDept(d.id)}>
              ⋯
            </button>
          </div>
        ))}
      </div>

      <div className="sec">
        <h2>Identitatea mea</h2>
        <span className="rule" />
      </div>
      <div className="card">
        <div className="mini" style={{ marginBottom: 10 }}>
          {meMember
            ? "Pe acest dispozitiv eşti " + meMember.n + "."
            : "Nu ai spus încă cine eşti pe acest dispozitiv."}
        </div>
        <div className="row">
          <button className="btn ghost sm" onClick={() => whoAmI()}>
            Schimb persoana
          </button>
          <button className="btn ghost sm" onClick={() => joinTeam()}>
            Mă adaug în echipă
          </button>
        </div>
      </div>

      <div className="sec">
        <h2>Ponderi în scorul final</h2>
        <span className="rule" />
      </div>
      <div className="card">
        <div className="mini" style={{ marginBottom: 10 }}>
          Execuţie {W.exec}% · KPI {W.kpi}% · Evaluare {W.eval}%
        </div>
        <button className="btn ghost sm" onClick={() => editWeights()}>
          Modifică ponderile
        </button>
      </div>

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

      <div className="sec">
        <h2>Cum se calculează</h2>
        <span className="rule" />
      </div>
      <div className="card">
        <p className="mini" style={{ lineHeight: 1.6, margin: 0 }}>
          <b style={{ color: "var(--color-turq)" }}>Progres task:</b> media subtaskurilor bifate;
          dacă nu are subtaskuri, se ia progresul manual.
          <br />
          <b style={{ color: "var(--color-turq)" }}>Execuţie:</b> media dintre rata de finalizare la
          termen şi progresul mediu pe taskurile active, minus penalizare pentru întârzieri.
          <br />
          <b style={{ color: "var(--color-turq)" }}>KPI:</b> realizat / ţintă pe luna selectată
          (invers pentru indicatorii unde mai puţin e mai bine).
          <br />
          <b style={{ color: "var(--color-turq)" }}>Evaluare:</b> media celor 5 criterii, notate 1–5.
        </p>
      </div>
    </>
  );
}
