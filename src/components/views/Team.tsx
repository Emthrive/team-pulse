"use client";
// ============================================================
//  ECHIPĂ (portat din viewTeam)
// ============================================================
import { claim } from "@/lib/actions";
import { useIsAdmin } from "@/lib/admin";
import { depName, memberStats } from "@/lib/calc";
import { editMember, evalMember, joinTeam, newMember, whoAmI } from "@/lib/forms";
import { useStore } from "@/lib/store";
import { Avatar, Bar, MonthPicker, Ring } from "../ui/primitives";

export function Team() {
  const S = useStore((s) => s.S)!;
  const me = useStore((s) => s.me);
  const kmonth = useStore((s) => s.kmonth);
  const emonth = useStore((s) => s.emonth);
  const setEMonth = useStore((s) => s.setEMonth);
  const setFlt = useStore((s) => s.setFlt);
  const setTab = useStore((s) => s.setTab);
  const admin = useIsAdmin();

  const W = S.weights;
  const meMember = me ? S.members.find((m) => m.id === me) : undefined;

  const list = S.members
    .filter((m) => m.active)
    .map((m) => ({ m, s: memberStats(S, m.id, kmonth, emonth) }))
    .sort((a, b) => (b.s.total === null ? -1 : b.s.total) - (a.s.total === null ? -1 : a.s.total));

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="filters" style={{ flex: 1 }}>
          <MonthPicker value={emonth} onChange={setEMonth} />
        </div>
        {admin && (
          <button className="btn sm" onClick={() => newMember()}>
            + Persoană
          </button>
        )}
      </div>

      {admin && (
        <div className="card" style={{ marginTop: 12, borderColor: "rgba(212,175,55,.35)" }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: 14.5 }}>
                {meMember ? "Eşti în echipă ca " + meMember.n : "Lucrezi în echipa Emthrive?"}
              </h4>
              <div className="mini">
                {meMember
                  ? "Taskurile tale apar primele în Panou."
                  : "Adaugă-te singur, spune ce faci şi îţi apar taskurile tale în Panou."}
              </div>
            </div>
            <button className="btn gold sm" onClick={() => (meMember ? whoAmI() : joinTeam())}>
              {meMember ? "Schimb" : "Mă adaug în echipă"}
            </button>
          </div>
        </div>
      )}

      <p className="mini" style={{ margin: "10px 0 0" }}>
        Scor final = {W.exec}% execuţie taskuri + {W.kpi}% realizare KPI + {W.eval}% evaluare
        calitativă. Ponderile se schimbă în Setări.
      </p>

      <div className="grid g3" style={{ marginTop: 14 }}>
        {list.map(({ m, s }) => {
          const ev = S.evals.find((e) => e.member === m.id && e.month === emonth);
          return (
            <div className="card" key={m.id}>
              <div className="row" style={{ alignItems: "flex-start", gap: 11 }}>
                <Avatar name={m.n} lg />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 15 }}>
                    {m.n} {m.id === me && <span className="chip gold">eu</span>}
                  </h4>
                  <div className="mini">{m.role || ""}</div>
                  <div className="mini">
                    {depName(S, m.dept)}
                    {m.email ? " · " + m.email : " · fără email"}
                  </div>
                </div>
                <Ring pct={s.total === null ? 0 : s.total} />
              </div>
              <div className="grid g2" style={{ marginTop: 12 }}>
                <div>
                  <div className="lbl">Execuţie</div>
                  <div style={{ fontWeight: 800 }}>{s.exec === null ? "—" : s.exec + "%"}</div>
                  <Bar pct={s.exec || 0} />
                </div>
                <div>
                  <div className="lbl">KPI</div>
                  <div style={{ fontWeight: 800 }}>{s.kpi === null ? "—" : s.kpi + "%"}</div>
                  <Bar pct={s.kpi || 0} cls="gold" />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div className="lbl">Evaluare calitativă</div>
                <div style={{ fontWeight: 800 }}>{s.eval === null ? "neevaluat" : s.eval + "%"}</div>
                <Bar pct={s.eval || 0} />
              </div>
              <div className="row" style={{ marginTop: 11 }}>
                <span className="chip">{s.active} active</span>
                <span className="chip green">{s.done} finalizate</span>
                {s.late ? <span className="chip red">{s.late} întârziate</span> : null}
              </div>
              {ev && ev.notes && (
                <p className="mini" style={{ marginTop: 10, lineHeight: 1.5 }}>
                  „{ev.notes}”
                </p>
              )}
              <div className="row" style={{ marginTop: 12 }}>
                {admin && (
                  <button className="btn sm" onClick={() => evalMember(m.id)}>
                    {ev ? "Editează evaluarea" : "Evaluează"}
                  </button>
                )}
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    setFlt({ dept: "", member: m.id, status: "", only: "" });
                    setTab("tasks");
                  }}
                >
                  Taskuri
                </button>
                {m.id !== me && (
                  <button className="btn ghost sm" onClick={() => claim(m.id)}>
                    Sunt eu
                  </button>
                )}
                {admin && (
                  <button className="btn ghost sm" onClick={() => editMember(m.id)}>
                    ⋯
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {S.members.some((m) => !m.active) && (
        <>
          <div className="sec">
            <h2>Inactivi</h2>
            <span className="rule" />
          </div>
          <div className="card">
            {S.members
              .filter((m) => !m.active)
              .map((m) => (
                <div className="lead" key={m.id}>
                  <Avatar name={m.n} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.n}</div>
                    <div className="mini">{m.role || ""}</div>
                  </div>
                  {admin && (
                    <button className="btn ghost sm" onClick={() => editMember(m.id)}>
                      ⋯
                    </button>
                  )}
                </div>
              ))}
          </div>
        </>
      )}
    </>
  );
}
