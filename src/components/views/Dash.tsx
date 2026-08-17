"use client";
// ============================================================
//  PANOU (portat din viewDash + myBlock)
// ============================================================
import { onlyMine } from "@/lib/actions";
import { deptKpi, deptProgress, depName, isLate, mem, memberStats, taskProgress } from "@/lib/calc";
import { joinTeam } from "@/lib/forms";
import { useStore } from "@/lib/store";
import { daysLeft } from "@/lib/utils";
import { TaskCard } from "../TaskCard";
import { Avatar, Bar, Ring } from "../ui/primitives";

function MyBlock() {
  const S = useStore((s) => s.S)!;
  const me = useStore((s) => s.me);
  const kmonth = useStore((s) => s.kmonth);
  const emonth = useStore((s) => s.emonth);
  const toggleSubAction = useStore((s) => s.mutate);

  const meMember = me ? mem(S, me) : undefined;
  if (!me || !meMember) {
    return (
      <div className="card" style={{ marginTop: 10, borderColor: "rgba(212,175,55,.35)" }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: 14.5 }}>Spune-mi cine eşti</h4>
            <div className="mini">
              Te adaugi în echipă o singură dată şi apoi îţi vezi doar taskurile tale.
            </div>
          </div>
          <button className="btn gold sm" onClick={() => joinTeam()}>
            Mă adaug în echipă
          </button>
        </div>
      </div>
    );
  }

  const stt = memberStats(S, me, kmonth, emonth);
  const mine = S.tasks.filter((t) => t.assignee === me && t.status !== "gata");
  const subs: { tid: string; sid: string; title: string; taskTitle: string; deadline: string }[] = [];
  S.tasks.forEach((t) =>
    (t.subtasks || []).forEach((x) => {
      if (x.assignee === me && !x.done)
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
          <Avatar name={meMember.n} lg />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{meMember.n}</div>
            <div className="mini">
              {mine.length} taskuri active · {subs.length} subtaskuri de bifat
              {stt.late ? (
                <>
                  {" "}
                  · <span style={{ color: "var(--color-red)" }}>{stt.late} întârziate</span>
                </>
              ) : null}
            </div>
          </div>
          <Ring pct={stt.total === null ? 0 : stt.total} />
        </div>
        {subs.slice(0, 6).map((x) => (
          <div className="sub" key={x.sid}>
            <button
              className="cb"
              onClick={() =>
                toggleSubAction((St) => {
                  const t = St.tasks.find((z) => z.id === x.tid);
                  const s = t?.subtasks.find((z) => z.id === x.sid);
                  if (!t || !s) return;
                  s.done = !s.done;
                  if (t.subtasks.every((z) => z.done) && t.status !== "gata") t.status = "review";
                })
              }
            />
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
  const kmonth = useStore((s) => s.kmonth);
  const emonth = useStore((s) => s.emonth);
  const setTab = useStore((s) => s.setTab);
  const setFlt = useStore((s) => s.setFlt);

  const ts = S.tasks;
  const act = ts.filter((t) => t.status !== "gata");
  const late = act.filter(isLate);
  const soon = act.filter((t) => {
    const d = daysLeft(t.deadline);
    return d !== null && d >= 0 && d <= 7;
  });
  const gata = ts.filter((t) => t.status === "gata").length;
  const gen = ts.length
    ? Math.round(ts.reduce((a, t) => a + taskProgress(t), 0) / ts.length)
    : 0;

  const board = S.members
    .filter((m) => m.active)
    .map((m) => ({ m, s: memberStats(S, m.id, kmonth, emonth) }))
    .filter((x) => x.s.total !== null)
    .sort((a, b) => (b.s.total as number) - (a.s.total as number))
    .slice(0, 6);

  const urgent = [...late, ...soon].slice(0, 7);

  return (
    <>
      <div className="grid g2">
        <div className="card">
          <div className="lbl">Progres general</div>
          <div className="big" style={{ color: "var(--color-turq)" }}>
            {gen}%
          </div>
          <Bar pct={gen} />
        </div>
        <div className="card">
          <div className="lbl">Taskuri active</div>
          <div className="big">{act.length}</div>
          <div className="mini">{gata} finalizate</div>
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
          const p = deptProgress(S, d.id);
          const k = deptKpi(S, d.id, kmonth);
          const n = S.tasks.filter((t) => t.dept === d.id && t.status !== "gata").length;
          const l = S.tasks.filter((t) => t.dept === d.id && isLate(t)).length;
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
                <Ring pct={p} />
              </div>
              <div style={{ marginTop: 11 }} className="lbl">
                Realizare KPI {k === null ? "—" : k + "%"}
              </div>
              <Bar pct={k || 0} cls="gold" />
            </div>
          );
        })}
      </div>

      <div className="sec">
        <h2>Necesită atenţie</h2>
        <span className="rule" />
        <button className="act" onClick={() => setTab("tasks")}>
          toate →
        </button>
      </div>
      {urgent.length ? (
        urgent.map((t) => <TaskCard task={t} key={t.id} />)
      ) : (
        <div className="empty">Nimic urgent. Termenele sunt sub control.</div>
      )}

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
              <Avatar name={x.m.n} />
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
                      (x.s.total as number) >= 80
                        ? "var(--color-green)"
                        : (x.s.total as number) >= 50
                          ? "var(--color-turq)"
                          : "var(--color-red)",
                  }}
                >
                  {x.s.total}
                </div>
                <div className="mini">scor</div>
              </div>
            </div>
          ))
        ) : (
          <div className="mini">Adaugă taskuri şi KPI pentru a genera scoruri.</div>
        )}
      </div>
    </>
  );
}
