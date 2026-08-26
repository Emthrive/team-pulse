"use client";
// ============================================================
//  PANOU (portat din viewDash + myBlock)
// ============================================================
import { onlyMine, toggleSub } from "@/lib/actions";
import { currentMemberId, depName, isLate, mem, memberStats, monthsInRange } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { daysLeft } from "@/lib/utils";
import { Avatar } from "../ui/primitives";

function MyBlock() {
  const S = useStore((s) => s.S)!;
  const me = useStore((s) => s.me);
  const authEmail = useStore((s) => s.authEmail);
  const kstart = useStore((s) => s.kstart);
  const kend = useStore((s) => s.kend);
  const emonth = useStore((s) => s.emonth);

  // Identitate automată din contul logat; dacă nu ai un membru asociat, blocul nu apare.
  const myId = currentMemberId(S, me, authEmail);
  const meMember = myId ? mem(S, myId) : undefined;
  if (!meMember) return null;

  const stt = memberStats(S, myId, monthsInRange(kstart, kend), emonth);
  const mine = S.tasks.filter((t) => t.assignee === myId && t.status !== "gata");
  const subs: { tid: string; sid: string; title: string; taskTitle: string; deadline: string }[] = [];
  S.tasks.forEach((t) =>
    (t.subtasks || []).forEach((x) => {
      if (x.assignee === myId && !x.done)
        subs.push({ tid: t.id, sid: x.id, title: x.title, taskTitle: t.title, deadline: x.deadline });
    }),
  );
  subs.sort((a, b) => String(a.deadline || "9").localeCompare(String(b.deadline || "9")));

  return (
    <>
      <div className="sec">
        <h2>Taskurile mele</h2>
        <span className="rule" />
        <button className="act" onClick={() => onlyMine()}>
          toate →
        </button>
      </div>
      <div className="card">
        <div className="row" style={{ alignItems: "center", gap: 11 }}>
          <Avatar name={meMember.n} photo={meMember.photo} lg />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{meMember.n}</div>
            <div className="mini">
              {mine.length} taskuri active · {subs.length} taskuri de bifat în Epice
              {stt.late ? (
                <>
                  {" "}
                  · <span style={{ color: "var(--color-red)" }}>{stt.late} întârziate</span>
                </>
              ) : null}
            </div>
          </div>
          <div style={{ textAlign: "center", minWidth: 46 }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: "var(--color-turq)" }}>
              {stt.doneMonth}
            </div>
            <div className="lbl">luna asta</div>
          </div>
        </div>
        {subs.slice(0, 6).map((x) => (
          <div className="sub" key={x.sid}>
            <button className="cb" onClick={() => toggleSub(x.tid, x.sid)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="st">{x.title}</div>
              <div className="mini">{x.taskTitle}</div>
            </div>
          </div>
        ))}
        {!mine.length && !subs.length && (
          <div className="mini" style={{ marginTop: 10 }}>
            Nimic alocat pe numele tău momentan.
          </div>
        )}
      </div>
    </>
  );
}

export function Dash() {
  const S = useStore((s) => s.S)!;
  const kstart = useStore((s) => s.kstart);
  const kend = useStore((s) => s.kend);
  const emonth = useStore((s) => s.emonth);
  const setTab = useStore((s) => s.setTab);
  const setFlt = useStore((s) => s.setFlt);
  const kmonths = monthsInRange(kstart, kend);

  const ts = S.tasks;
  const act = ts.filter((t) => t.status !== "gata");
  const late = act.filter(isLate);
  const soon = act.filter((t) => {
    const d = daysLeft(t.deadline);
    return d !== null && d >= 0 && d <= 7;
  });
  const gata = ts.filter((t) => t.status === "gata").length;
  const archived = ts.filter((t) => t.archived).length;

  // Clasament după câte taskuri a finalizat fiecare (motivează folosirea platformei).
  const board = S.members
    .filter((m) => m.active)
    .map((m) => ({ m, s: memberStats(S, m.id, kmonths, emonth) }))
    .sort((a, b) => b.s.doneMonth - a.s.doneMonth || a.m.n.localeCompare(b.m.n))
    .slice(0, 6);

  return (
    <>
      <div className="grid g2">
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

      <MyBlock />

      <div className="sec">
        <h2>Departamente</h2>
        <span className="rule" />
      </div>
      <div className="grid g3">
        {S.departments.map((d) => {
          const n = S.tasks.filter((t) => t.dept === d.id && t.status !== "gata").length;
          const l = S.tasks.filter((t) => t.dept === d.id && isLate(t)).length;
          const doneD = S.tasks.filter((t) => t.dept === d.id && t.status === "gata").length;
          return (
            <div
              className="card"
              key={d.id}
              onClick={() => {
                setFlt({ dept: d.id });
                setTab("tasks");
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h4 style={{ fontSize: 14.5 }}>{d.n}</h4>
                  <div className="mini" style={{ marginTop: 3 }}>
                    {n} active ·{" "}
                    {l ? <span style={{ color: "var(--color-red)" }}>{l} întârziate</span> : "la zi"}
                  </div>
                  {d.leadId && (
                    <div className="mini" style={{ marginTop: 6 }}>
                      Coordonator: {mem(S, d.leadId)?.n || "nealocat"}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "center", minWidth: 44 }}>
                  <div style={{ fontWeight: 800, fontSize: 22, color: "var(--color-turq)" }}>
                    {doneD}
                  </div>
                  <div className="lbl">finalizate</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sec">
        <h2>Clasament echipă</h2>
        <span className="rule" />
        <button className="act" onClick={() => setTab("team")}>
          evaluări →
        </button>
      </div>
      <div className="card">
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
    </>
  );
}
