"use client";
// ============================================================
//  ECHIPĂ (portat din viewTeam)
// ============================================================
import { useRole } from "@/lib/admin";
import { currentMemberId, depName, memberDepts, memberStats, monthsInRange } from "@/lib/calc";
import { editMember, newMember } from "@/lib/forms";
import { inviteUser } from "@/lib/invite";
import { useStore } from "@/lib/store";

async function sendLink(email: string) {
  const r = await inviteUser(email);
  alert(r.ok ? "Link de acces trimis către " + email + "." : "Nu s-a putut trimite: " + r.error);
}
import { Avatar } from "../ui/primitives";

export function Team() {
  const S = useStore((s) => s.S)!;
  const me = useStore((s) => s.me);
  const authEmail = useStore((s) => s.authEmail);
  const kstart = useStore((s) => s.kstart);
  const kend = useStore((s) => s.kend);
  const emonth = useStore((s) => s.emonth);
  const setFlt = useStore((s) => s.setFlt);
  const setTab = useStore((s) => s.setTab);
  const { admin } = useRole();

  const myId = currentMemberId(S, me, authEmail);

  const list = S.members
    .filter((m) => m.active)
    .map((m) => ({ m, s: memberStats(S, m.id, monthsInRange(kstart, kend), emonth) }))
    .sort((a, b) => b.s.doneMonth - a.s.doneMonth || a.m.n.localeCompare(b.m.n));

  return (
    <>
      {admin && (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn sm" onClick={() => newMember()}>
            + Persoană
          </button>
        </div>
      )}

      <div className="grid g4" style={{ marginTop: 14 }}>
        {list.map(({ m, s }) => {
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
                    {m.platformRole === "manager"
                      ? "toate departamentele"
                      : memberDepts(m).map((id) => depName(S, id)).join(" · ") || "fără departament"}
                    {m.email ? " · " + m.email : " · fără email"}
                    {m.activatedAt && (
                      <span style={{ color: "var(--color-green)" }}> · activ</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "center", minWidth: 46 }}>
                  <div style={{ fontWeight: 800, fontSize: 22, color: "var(--color-turq)" }}>
                    {s.doneMonth}
                  </div>
                  <div className="lbl">luna asta</div>
                </div>
              </div>
              <div className="grid g2" style={{ marginTop: 12 }}>
                <div>
                  <div className="lbl">Taskuri luna asta</div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{s.doneMonth}</div>
                </div>
                <div>
                  <div className="lbl">Taskuri total</div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{s.done}</div>
                </div>
              </div>
              <div className="row" style={{ marginTop: 11 }}>
                <span className="chip">{s.active} active</span>
                <span className="chip green">{s.done} finalizate</span>
                {s.late ? <span className="chip red">{s.late} întârziate</span> : null}
              </div>
              <div className="row" style={{ marginTop: 12 }}>
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
