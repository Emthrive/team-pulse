"use client";
// ============================================================
//  KPI — grafice + carduri; KPI-urile „auto” se calculează
//  singure din taskuri (fără +/−), cele manuale rămân editabile.
// ============================================================
import { bump, setKpiVal } from "@/lib/actions";
import { useIsAdmin } from "@/lib/admin";
import { depName, deptKpi, kpiHas, kpiScore, kpiVal, memName, myDeptIds } from "@/lib/calc";
import { MONTH_NAMES } from "@/lib/constants";
import { editKpi, newKpi } from "@/lib/forms";
import { useStore } from "@/lib/store";
import { fmtNum, lastMonths } from "@/lib/utils";
import { DeptBars, Spark, TrendLine } from "../charts/KpiCharts";
import { Bar, MonthPicker } from "../ui/primitives";

const AUTO_LABEL: Record<string, string> = {
  tasks_done: "taskuri finalizate",
  on_time_rate: "% la termen",
  subtasks_done: "subtaskuri bifate",
  tasks_created: "taskuri create",
};

const monthLabel = (m: string) => MONTH_NAMES[+m.split("-")[1] - 1];

export function Kpi() {
  const S = useStore((s) => s.S)!;
  const me = useStore((s) => s.me);
  const authEmail = useStore((s) => s.authEmail);
  const kmonth = useStore((s) => s.kmonth);
  const setKMonth = useStore((s) => s.setKMonth);
  const admin = useIsAdmin();
  // Valorile manuale pot fi modificate doar de membrii departamentului (adminul peste tot).
  const myDepts = myDeptIds(S, me, authEmail);

  const byDept = S.departments.map((d) => ({ d, ks: S.kpis.filter((k) => k.dept === d.id) }));
  const months = lastMonths(kmonth, 6);

  // Realizare pe departamente (luna selectată).
  const deptData = S.departments
    .map((d) => ({ name: d.n.split(" ")[0], full: d.n, pct: deptKpi(S, d.id, kmonth) }))
    .filter((x): x is { name: string; full: string; pct: number } => x.pct !== null);

  // Trend: media realizării pe KPI-urile care au date în luna respectivă.
  const trendData = months.map((m) => {
    const withVal = S.kpis.filter((k) => Number(k.target) && kpiHas(S, k, m));
    const pct = withVal.length
      ? Math.round(withVal.reduce((a, k) => a + kpiScore(S, k, m), 0) / withVal.length)
      : null;
    return { m: monthLabel(m), pct };
  });

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="filters" style={{ flex: 1 }}>
          <MonthPicker value={kmonth} onChange={setKMonth} />
        </div>
        {admin && (
          <button className="btn sm" onClick={() => newKpi()}>
            + KPI
          </button>
        )}
      </div>
      <p className="mini" style={{ margin: "10px 0 0" }}>
        KPI-urile <b style={{ color: "var(--color-turq)" }}>auto</b> se calculează singure din
        taskuri (finalizări, termene, subtaskuri). Cele manuale se completează pe luna selectată.
      </p>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginTop: 14 }}>
        <div className="card">
          <div className="lbl" style={{ marginBottom: 4 }}>
            Realizare pe departamente · {monthLabel(kmonth)}
          </div>
          <DeptBars data={deptData} />
        </div>
        <div className="card">
          <div className="lbl" style={{ marginBottom: 4 }}>
            Trend realizare medie · ultimele 6 luni
          </div>
          <TrendLine data={trendData} />
        </div>
      </div>

      {byDept.map(({ d, ks }) => {
        const dk = deptKpi(S, d.id, kmonth);
        return (
          <div key={d.id}>
            <div className="sec">
              <h2>{d.n}</h2>
              <span className="rule" />
              <span
                className={`chip ${(dk || 0) >= 80 ? "green" : (dk || 0) >= 50 ? "turq" : "red"}`}
              >
                {dk === null ? "—" : dk + "%"}
              </span>
            </div>
            {ks.length ? (
              <div className="grid g3">
                {ks.map((k) => {
                  const v = kpiVal(S, k, kmonth);
                  const sc = kpiScore(S, k, kmonth);
                  const isAuto = !!k.auto;
                  const canVals = admin || myDepts.includes(k.dept);
                  const spark = months.map((m) => ({ m: monthLabel(m), v: kpiVal(S, k, m) }));
                  return (
                    <div className="kpi" key={k.id}>
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{k.n}</div>
                          <div className="mini">
                            {k.assignee ? memName(S, k.assignee) : "la nivel de departament"}
                            {k.dir === "down" ? " · ţintă maximă" : ""}
                            {isAuto && k.tag ? " · #" + k.tag : ""}
                          </div>
                        </div>
                        {admin && (
                          <button className="btn ghost sm" onClick={() => editKpi(k.id)}>
                            ⋯
                          </button>
                        )}
                      </div>
                      <div className="v">
                        <b
                          style={{
                            color:
                              sc >= 80
                                ? "var(--color-green)"
                                : sc >= 50
                                  ? "var(--color-turq)"
                                  : "var(--color-red)",
                          }}
                        >
                          {fmtNum(v)}
                        </b>
                        <span className="mini">
                          / {fmtNum(k.target)} {k.unit}
                        </span>
                      </div>
                      <Bar pct={sc} cls="gold" />
                      <Spark data={spark} />
                      {isAuto ? (
                        <div className="row" style={{ marginTop: 10 }}>
                          <span className="chip turq">auto · {AUTO_LABEL[k.auto!] || "din taskuri"}</span>
                          <span className="mini" style={{ marginLeft: "auto" }}>
                            realizare {sc}%
                          </span>
                        </div>
                      ) : !canVals ? (
                        <div className="row" style={{ marginTop: 10 }}>
                          <span className="chip">doar {depName(S, k.dept)}</span>
                          <span className="mini" style={{ marginLeft: "auto" }}>
                            realizare {sc}%
                          </span>
                        </div>
                      ) : (
                        <div className="row" style={{ marginTop: 10 }}>
                          <button className="step" onClick={() => bump(k.id, -1)}>
                            −
                          </button>
                          <input
                            className="kv"
                            defaultValue={v}
                            key={k.id + ":" + kmonth + ":" + v}
                            onBlur={(e) => setKpiVal(k.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                          />
                          <button className="step" onClick={() => bump(k.id, 1)}>
                            +
                          </button>
                          <span className="mini" style={{ marginLeft: "auto" }}>
                            realizare {sc}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty">Niciun KPI definit aici.</div>
            )}
          </div>
        );
      })}
    </>
  );
}
