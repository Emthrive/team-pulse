"use client";
// ============================================================
//  KPI — grafice + carduri; toate KPI-urile se calculează automat
//  din taskuri (fără introducere manuală).
//  Perioada e un interval de luni (implicit luna curentă).
// ============================================================
import { useRole } from "@/lib/admin";
import {
  depName,
  deptKpi,
  isLate,
  kpiHas,
  kpiScore,
  kpiScoreRange,
  kpiTargetRange,
  kpiVal,
  kpiValRange,
  memName,
  memberStats,
  monthsInRange,
} from "@/lib/calc";
import { MONTH_NAMES } from "@/lib/constants";
import { editKpi, newKpi } from "@/lib/forms";
import { useStore } from "@/lib/store";
import { daysLeft, fmtNum, lastMonths } from "@/lib/utils";
import { DeptBars, Spark, TrendLine } from "../charts/KpiCharts";
import { MonthRangePicker } from "../ui/MonthRangePicker";
import { Avatar, Bar } from "../ui/primitives";
import { Pencil } from "lucide-react";

const monthLabel = (m: string) => MONTH_NAMES[+m.split("-")[1] - 1];

export function Kpi() {
  const S = useStore((s) => s.S)!;
  const kstart = useStore((s) => s.kstart);
  const kend = useStore((s) => s.kend);
  const emonth = useStore((s) => s.emonth);
  const setKRange = useStore((s) => s.setKRange);
  const setTab = useStore((s) => s.setTab);
  const { elevated } = useRole();

  // Ordinea în departament: KPI-urile normale, apoi cele de sistem — „Epice finalizate" ultimul.
  const rank = (k: (typeof S.kpis)[number]) => (!k.system ? 0 : k.auto === "epics_done" ? 2 : 1);
  const byDept = S.departments.map((d) => ({
    d,
    ks: S.kpis.filter((k) => k.dept === d.id).sort((a, b) => rank(a) - rank(b)),
  }));
  const range = monthsInRange(kstart, kend);
  const singleMonth = range.length === 1;
  const rangeLabel = singleMonth
    ? monthLabel(kend)
    : monthLabel(range[0]) + " – " + monthLabel(range[range.length - 1]);
  const sparkMonths = lastMonths(kend, 6);

  // Realizare pe departamente (perioada selectată).
  const deptData = S.departments
    .map((d) => ({ name: d.n.split(" ")[0], full: d.n, pct: deptKpi(S, d.id, range) }))
    .filter((x): x is { name: string; full: string; pct: number } => x.pct !== null);

  // Trend: media realizării pe KPI-urile care au date în luna respectivă.
  const trendData = sparkMonths.map((m) => {
    const withVal = S.kpis.filter((k) => Number(k.target) && kpiHas(S, k, m));
    const pct = withVal.length
      ? Math.round(withVal.reduce((a, k) => a + kpiScore(S, k, m), 0) / withVal.length)
      : null;
    return { m: monthLabel(m), pct };
  });

  // Sumar taskuri + clasament (mutate de pe fostul Panou).
  const ts = S.tasks;
  const act = ts.filter((t) => t.status !== "gata");
  const late = act.filter(isLate);
  const soon = act.filter((t) => {
    const d = daysLeft(t.deadline);
    return d !== null && d >= 0 && d <= 7;
  });
  const gata = ts.filter((t) => t.status === "gata").length;
  const archived = ts.filter((t) => t.archived).length;
  const board = S.members
    .filter((m) => m.active)
    .map((m) => ({ m, s: memberStats(S, m.id, range, emonth) }))
    .sort((a, b) => b.s.doneMonth - a.s.doneMonth || a.m.n.localeCompare(b.m.n))
    .slice(0, 6);

  return (
    <>
      <div className="sec">
        <h2>Clasament echipă</h2>
        <span className="rule" />
        <button className="act" onClick={() => setTab("team")}>
          evaluări →
        </button>
      </div>

      <div className="grid g2" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="lbl">Taskuri finalizate</div>
          <div className="big" style={{ color: "var(--color-turq)" }}>
            {gata}
          </div>
          <div className="mini">{archived} arhivate</div>
        </div>
        <div className="card">
          <div className="lbl">Taskuri active</div>
          <div className="big">{act.length}</div>
          <div className="mini">din {ts.length} în total</div>
        </div>
        <div className="card">
          <div className="lbl">Întârziate</div>
          <div className="big" style={{ color: "var(--color-red)" }}>
            {late.length}
          </div>
          <div className="mini">necesită acţiune</div>
        </div>
        <div className="card">
          <div className="lbl">Scadente în 7 zile</div>
          <div className="big" style={{ color: "var(--color-gold)" }}>
            {soon.length}
          </div>
          <div className="mini">săptămâna asta</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        {board.length ? (
          board.map((x, i) => (
            <div className="lead" key={x.m.id}>
              <div className="rank">{i + 1}</div>
              <Avatar name={x.m.n} photo={x.m.photo} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{x.m.n}</div>
                <div className="mini">
                  {depName(S, x.m.dept)} · {x.s.active} active
                  {x.s.late ? " · " + x.s.late + " întârziate" : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 16,
                    color:
                      x.s.doneMonth === 0
                        ? "var(--color-muted)"
                        : i === 0
                          ? "var(--color-green)"
                          : "var(--color-turq)",
                  }}
                >
                  {x.s.doneMonth}
                </div>
                <div className="mini">luna asta</div>
              </div>
            </div>
          ))
        ) : (
          <div className="mini">Adaugă taskuri ca să pornească clasamentul.</div>
        )}
      </div>

      <div className="row" style={{ justifyContent: "space-between", marginTop: 20 }}>
        <div className="row" style={{ flex: 1 }}>
          <MonthRangePicker start={kstart} end={kend} onChange={setKRange} />
        </div>
        {elevated && (
          <button className="btn sm" onClick={() => newKpi()}>
            + KPI
          </button>
        )}
      </div>
      <p className="mini" style={{ margin: "10px 0 0" }}>
        Toate KPI-urile se calculează <b style={{ color: "var(--color-turq)" }}>automat</b> din
        taskuri. Pe o perioadă de mai multe luni valorile se însumează (ratele se ponderează).
      </p>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginTop: 14 }}>
        <div className="card">
          <div className="lbl" style={{ marginBottom: 4 }}>
            Realizare pe departamente · {rangeLabel}
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
        const dk = deptKpi(S, d.id, range);
        return (
          <div key={d.id}>
            <div className="sec">
              <h2>{d.n}</h2>
              <span className="rule" />
              <span
                className={`chip ${(dk || 0) >= 80 ? "green" : (dk || 0) > 0 ? "turq" : "red"}`}
              >
                {dk === null ? "—" : dk + "%"}
              </span>
            </div>
            {ks.length ? (
              <div className="grid g3">
                {ks.map((k) => {
                  const v = kpiValRange(S, k, range);
                  const sc = kpiScoreRange(S, k, range);
                  const target = kpiTargetRange(k, range);
                  const spark = sparkMonths.map((m) => ({ m: monthLabel(m), v: kpiVal(S, k, m) }));
                  return (
                    <div className="kpi" key={k.id}>
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{k.n}</div>
                          <div className="mini">
                            {k.system
                              ? "automat · de sistem"
                              : k.assignee
                                ? memName(S, k.assignee)
                                : "la nivel de departament"}                          </div>
                        </div>
                        {elevated && !k.system && (
                          <button
                            className="btn ghost sm"
                            style={{ display: "inline-flex", alignItems: "center" }}
                            onClick={() => editKpi(k.id)}
                            title="Editează"
                          >
                            <Pencil size={15} />
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
                          / {fmtNum(target)} {k.unit}
                        </span>
                      </div>
                      <Bar pct={sc} cls="gold" />
                      <Spark data={spark} />
                      <div className="row" style={{ marginTop: 10 }}>
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
