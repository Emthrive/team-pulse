"use client";
// ============================================================
//  TASKURI — board Kanban (ca la Jira): coloane pe status,
//  carduri compacte, click = modal cu detalii, drag & drop
//  (userul doar taskurile lui, adminul şi managerul pe toate).
// ============================================================
import { useEffect, useState } from "react";
import { moveTask } from "@/lib/actions";
import { useRole } from "@/lib/admin";
import { currentMemberId, depName, isLate, mem, memName, taskProgress } from "@/lib/calc";
import { prCls, prName, STATUS } from "@/lib/constants";
import { useStore } from "@/lib/store";
import type { PriorityId, StatusId, Task } from "@/lib/types";
import { fmtDate } from "@/lib/utils";
import { TaskDetailModal } from "../TaskDetailModal";
import { Avatar, Bar } from "../ui/primitives";

const order: Record<PriorityId, number> = { critica: 0, ridicata: 1, medie: 2, scazuta: 3 };

export function Tasks() {
  const S = useStore((s) => s.S)!;
  const me = useStore((s) => s.me);
  const authEmail = useStore((s) => s.authEmail);
  const flt = useStore((s) => s.flt);
  const setFlt = useStore((s) => s.setFlt);
  const resetFlt = useStore((s) => s.resetFlt);
  const { elevated } = useRole();

  const [detail, setDetail] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<StatusId | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  // Pe telefon: coloanele curg vertical şi nu există drag & drop (statusul se
  // schimbă din modalul taskului, cu comutatorul rapid).
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const upd = () => setIsMobile(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);

  // La deschidere, filtrul de membru vine preselectat cu userul curent —
  // mai puţin pentru admin şi manager, care văd toată echipa.
  const myId = currentMemberId(S, me, authEmail);
  useEffect(() => {
    if (!elevated && myId && !flt.member) setFlt({ member: myId });
    // rulează doar la montarea paginii
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let ts = S.tasks.slice();
  if (flt.dept) ts = ts.filter((t) => t.dept === flt.dept);
  if (flt.member)
    ts = ts.filter(
      (t) => t.assignee === flt.member || (t.subtasks || []).some((s) => s.assignee === flt.member),
    );

  ts.sort(
    (a, b) =>
      (Number(isLate(b)) - Number(isLate(a))) ||
      (order[a.priority] - order[b.priority]) ||
      String(a.deadline || "9").localeCompare(String(b.deadline || "9")),
  );

  const canDrag = (t: Task) => elevated || (!!myId && t.assignee === myId);

  const onDrop = (e: React.DragEvent, st: StatusId) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setOver(null);
    setDragId(null);
    if (id) moveTask(id, st);
  };

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
        <button className="btn ghost sm" onClick={() => resetFlt()}>
          Resetează
        </button>
      </div>

      <div className="kanban">
        {STATUS.map((st) => {
          // Finalizat: implicit doar cele recente; arhiva (30+ zile) e pe comutator.
          const archivedCount =
            st.id === "gata" ? ts.filter((t) => t.status === "gata" && t.archived).length : 0;
          const items = ts.filter(
            (t) =>
              t.status === st.id &&
              (st.id !== "gata" || (showArchived ? !!t.archived : !t.archived)),
          );
          return (
            <div
              key={st.id}
              className={`kcol ${over === st.id ? "over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (over !== st.id) setOver(st.id);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) setOver(null);
              }}
              onDrop={(e) => onDrop(e, st.id)}
            >
              <div className="kcol-head">
                <span className={`chip ${st.c}`}>{st.n}</span>
                {st.id === "gata" && archivedCount > 0 && (
                  <button
                    className={`karh ${showArchived ? "on" : ""}`}
                    onClick={() => setShowArchived(!showArchived)}
                    title={showArchived ? "Înapoi la cele recente" : "Vezi taskurile arhivate (30+ zile)"}
                  >
                    {showArchived ? "recente" : `arhivă (${archivedCount})`}
                  </button>
                )}
                <span className="n">{items.length}</span>
              </div>
              <div className="kcol-body">
                {items.map((t) => {
                  const p = taskProgress(t);
                  const late = isLate(t);
                  const am = t.assignee ? mem(S, t.assignee) : undefined;
                  const draggable = canDrag(t) && !isMobile;
                  return (
                    <div
                      key={t.id}
                      className={`kcard ${late ? "late" : ""} ${t.status === "gata" ? "done" : ""} ${dragId === t.id ? "dragging" : ""}`}
                      draggable={draggable}
                      title={draggable ? "Trage în altă coloană pentru a schimba statusul" : undefined}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", t.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(t.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                      onClick={() => setDetail(t.id)}
                    >
                      <div className="kc-title">{t.title}</div>
                      <div className="kc-meta">
                        {(t.subtasks || []).length > 0 ? (
                          <span className="chip gold">Epic</span>
                        ) : (
                          <span className="chip turq">Task</span>
                        )}
                        <span className={`chip ${prCls(t.priority)}`}>{prName(t.priority)}</span>
                        {!flt.dept && <span className="chip">{depName(S, t.dept)}</span>}
                        {t.deadline && <span className="chip red">{fmtDate(t.deadline)}</span>}
                        {(t.subtasks || []).length > 0 && (
                          <span className="chip">
                            {(t.subtasks || []).filter((s) => s.done).length}/{(t.subtasks || []).length}
                          </span>
                        )}
                        {t.archived && <span className="chip">arhivat</span>}
                      </div>
                      <div className="kc-foot">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Bar pct={p} cls={late ? "red" : ""} />
                        </div>
                        <span className="mini mono">{p}%</span>
                        <Avatar name={am ? am.n : memName(S, t.assignee)} photo={am?.photo} />
                      </div>
                    </div>
                  );
                })}
                {!items.length && (
                  <div className="kcol-empty">
                    {st.id === "gata" && showArchived ? "nimic în arhivă" : "trage un task aici"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {detail && <TaskDetailModal taskId={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
