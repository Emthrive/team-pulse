"use client";
// ============================================================
//  KPI (portat din viewKpi)
// ============================================================
import { bump, setKpiVal } from "@/lib/actions";
import { useIsAdmin } from "@/lib/admin";
import { deptKpi, kpiScore, kpiVal, memName } from "@/lib/calc";
import { editKpi, newKpi } from "@/lib/forms";
import { useStore } from "@/lib/store";
import { fmtNum } from "@/lib/utils";
import { Bar, MonthPicker } from "../ui/primitives";

export function Kpi() {
  const S = useStore((s) => s.S)!;
  const kmonth = useStore((s) => s.kmonth);
  const setKMonth = useStore((s) => s.setKMonth);
  const admin = useIsAdmin();

  const byDept = S.departments.map((d) => ({ d, ks: S.kpis.filter((k) => k.dept === d.id) }));

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
        Valorile se salvează pe luna selectată, deci ai istoric lună de lună.
      </p>

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
                  const v = kpiVal(k, kmonth);
                  const sc = kpiScore(k, kmonth);
                  return (
                    <div className="kpi" key={k.id}>
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{k.n}</div>
                          <div className="mini">
                            {k.assignee ? memName(S, k.assignee) : "la nivel de departament"}
                            {k.dir === "down" ? " · ţintă maximă" : ""}
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
