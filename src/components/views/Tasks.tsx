"use client";
// ============================================================
//  TASKURI (portat din viewTasks)
// ============================================================
import { useEffect } from "react";
import { onlyMine } from "@/lib/actions";
import { useIsAdmin } from "@/lib/admin";
import { currentMemberId, isLate, mem } from "@/lib/calc";
import { STATUS } from "@/lib/constants";
import { useStore } from "@/lib/store";
import type { PriorityId } from "@/lib/types";
import { daysLeft } from "@/lib/utils";
import { TaskCard } from "../TaskCard";

const order: Record<PriorityId, number> = { critica: 0, ridicata: 1, medie: 2, scazuta: 3 };

export function Tasks() {
  const S = useStore((s) => s.S)!;
  const me = useStore((s) => s.me);
  const authEmail = useStore((s) => s.authEmail);
  const flt = useStore((s) => s.flt);
  const open = useStore((s) => s.open);
  const setFlt = useStore((s) => s.setFlt);
  const resetFlt = useStore((s) => s.resetFlt);
  const toggleOpen = useStore((s) => s.toggleOpen);
  const admin = useIsAdmin();

  // La deschidere, filtrul de membru vine preselectat cu userul curent —
  // mai puţin pentru admin şi manager, care văd toată echipa.
  const myId = currentMemberId(S, me, authEmail);
  const isManager = !!(myId && mem(S, myId)?.platformRole === "manager");
  useEffect(() => {
    if (!admin && !isManager && myId && !flt.member) setFlt({ member: myId });
    // rulează doar la montarea paginii
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let ts = S.tasks.slice();
  if (flt.dept) ts = ts.filter((t) => t.dept === flt.dept);
  if (flt.member)
    ts = ts.filter(
      (t) => t.assignee === flt.member || (t.subtasks || []).some((s) => s.assignee === flt.member),
    );
  if (flt.status) ts = ts.filter((t) => t.status === flt.status);
  if (flt.only === "late") ts = ts.filter(isLate);
  if (flt.only === "week")
    ts = ts.filter((t) => {
      const d = daysLeft(t.deadline);
      return d !== null && d <= 7 && t.status !== "gata";
    });

  ts.sort(
    (a, b) =>
      (Number(isLate(b)) - Number(isLate(a))) ||
      (order[a.priority] - order[b.priority]) ||
      String(a.deadline || "9").localeCompare(String(b.deadline || "9")),
  );

  const groups = STATUS.map((s) => ({ st: s, items: ts.filter((t) => t.status === s.id) })).filter(
    (g) => g.items.length,
  );

  return (
    <>
      <div className="dept-tabs">
        <button className={!flt.dept ? "on" : ""} onClick={() => setFlt({ dept: "" })}>
          Toate
        </button>
        {S.departments.map((d) => (
          <button
            key={d.id}
            className={flt.dept === d.id ? "on" : ""}
            onClick={() => setFlt({ dept: d.id })}
          >
            {d.n}
          </button>
        ))}
      </div>

      <div className="filters">
        <select value={flt.member} onChange={(e) => setFlt({ member: e.target.value })}>
          <option value="">Toată echipa</option>
          {S.members
            .filter((m) => m.active)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.n}
              </option>
            ))}
        </select>
        {me && mem(S, me) && (
          <button className="btn sm" onClick={() => onlyMine()}>
            Ale mele
          </button>
        )}
        <button className="btn ghost sm" onClick={() => resetFlt()}>
          Resetează
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        {groups.length ? (
          groups.map((g) => {
            const collapsed = !!open["grp_" + g.st.id];
            return (
              <div className="grp" key={g.st.id}>
                <div className="head" onClick={() => toggleOpen("grp_" + g.st.id)}>
                  <span className={`chip ${g.st.c}`}>{g.st.n}</span>
                  <span className="n">{g.items.length}</span>
                  <span className="mini">{collapsed ? "▼" : "▲"}</span>
                </div>
                {!collapsed && g.items.map((t) => <TaskCard task={t} key={t.id} />)}
              </div>
            );
          })
        ) : (
          <div className="empty">Niciun task pentru filtrele alese.</div>
        )}
      </div>
    </>
  );
}
