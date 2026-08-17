"use client";
// ============================================================
//  ECHIPĂ (portat din viewTeam)
// ============================================================
import { useIsAdmin } from "@/lib/admin";
import { currentMemberId, depName, memberDepts, memberStats, monthsInRange } from "@/lib/calc";
import { editMember, evalMember, newMember } from "@/lib/forms";
import { inviteUser } from "@/lib/invite";
import { useStore } from "@/lib/store";

async function sendLink(email: string) {
  const r = await inviteUser(email);
  alert(r.ok ? "Link de acces trimis către " + email + "." : "Nu s-a putut trimite: " + r.error);
}
import { Avatar, Bar, MonthPicker, Ring } from "../ui/primitives";

export function Team() {
  const S = useStore((s) => s.S)!;
  const me = useStore((s) => s.me);
  const authEmail = useStore((s) => s.authEmail);
  const kstart = useStore((s) => s.kstart);
  const kend = useStore((s) => s.kend);
  const emonth = useStore((s) => s.emonth);
  const setEMonth = useStore((s) => s.setEMonth);
  const setFlt = useStore((s) => s.setFlt);
  const setTab = useStore((s) => s.setTab);
  const admin = useIsAdmin();

  const W = S.weights;
  const myId = currentMemberId(S, me, authEmail);

  const list = S.members
    .filter((m) => m.active)
    .map((m) => ({ m, s: memberStats(S, m.id, monthsInRange(kstart, kend), emonth) }))
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
                <Avatar name={m.n} photo={m.photo} lg />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 15 }}>
                    {m.n} {m.id === myId && <span className="chip gold">eu</span>}{" "}
                    {m.platformRole === "manager" && <span className="chip turq">manager</span>}
                  </h4>
                  <div className="mini">{m.role || ""}</div>
                  <div className="mini">
                    {memberDepts(m).map((id) => depName(S, id)).join(" · ") || "fără departament"}
                    {m.email ? " · " + m.email : " · fără email"}
                    {m.activatedAt && (
                      <span style={{ color: "var(--color-green)" }}> · activ</span>
                    )}
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
                {admin && m.email && !m.activatedAt && (
                  <button className="btn ghost sm" onClick={() => sendLink(m.email!)}>
                    Trimite link
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
                  <Avatar name={m.n} photo={m.photo} />
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
