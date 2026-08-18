"use client";
// ============================================================
//  DETALII TASK — modal deschis din board (click pe card):
//  toate informațiile + subtaskuri + acțiuni.
// ============================================================
import { useEffect, useState } from "react";
import { addSub, finish, moveTask, renew, reopen, toggleSub } from "@/lib/actions";
import { useRole } from "@/lib/admin";
import { currentMemberId, depName, isLate, mem, memName, taskProgress } from "@/lib/calc";
import { prCls, prName, stCls, stName, STATUS } from "@/lib/constants";
import { editSub, editTask } from "@/lib/forms";
import { useStore } from "@/lib/store";
import { evText, fmtEvDate } from "@/lib/history";
import type { StatusId, TaskEvent } from "@/lib/types";
import { daysLeft, fmtDate } from "@/lib/utils";
import { Avatar, Bar } from "./ui/primitives";

export function TaskDetailModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const S = useStore((s) => s.S)!;
  const me = useStore((s) => s.me);
  const authEmail = useStore((s) => s.authEmail);
  const { elevated } = useRole();
  const [subInput, setSubInput] = useState("");
  const [histOpen, setHistOpen] = useState(false);

  const t = S.tasks.find((x) => x.id === taskId);

  // Taskul a dispărut (șters) → închidem modalul.
  useEffect(() => {
    if (!t) onClose();
  }, [t, onClose]);
  if (!t) return null;

  const canEdit = elevated || t.assignee === currentMemberId(S, me, authEmail);
  const p = taskProgress(t);
  const late = isLate(t);
  const dl = daysLeft(t.deadline);
  const subs = t.subtasks || [];
  // Istoric: taskurile vechi (dinainte de jurnal) primesc o intrare sintetică de creare.
  const hist: TaskEvent[] = [...(t.history || [])];
  if (!hist.some((e) => e.k === "creat") && t.createdAt) hist.unshift({ d: t.createdAt, by: "", k: "creat" });
  const histDesc = hist.slice().reverse(); // cele mai noi primele
  const assigneeMember = t.assignee ? mem(S, t.assignee) : undefined;
  const dlTxt = t.deadline
    ? fmtDate(t.deadline) +
      (t.status !== "gata" && dl !== null
        ? dl < 0
          ? " · " + Math.abs(dl) + "z întârziere"
          : dl === 0
            ? " · azi"
            : " · în " + dl + "z"
        : "")
    : "";

  return (
    <div
      className="ovl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" style={{ maxWidth: 560 }}>
        <h3 style={{ paddingRight: 24 }}>{t.title}</h3>

        <div className="meta" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {subs.length > 0 ? <span className="chip gold">Epic</span> : <span className="chip turq">Task</span>}
          <span className={`chip ${stCls(t.status)}`}>{stName(t.status)}</span>
          <span className={`chip ${prCls(t.priority)}`}>{prName(t.priority)}</span>
          <span className="chip">{depName(S, t.dept)}</span>
          {t.deadline && <span className="chip red">{dlTxt}</span>}
          {t.recurring && (
            <span className="chip gold">{t.recurring === "lunar" ? "lunar" : "săptămânal"}</span>
          )}
          {(t.tags || []).map((g) => (
            <span className="chip turq" key={g}>
              #{g}
            </span>
          ))}
          {t.archived && <span className="chip">arhivat</span>}
        </div>

        <div className="row" style={{ gap: 10, marginBottom: 12 }}>
          <Avatar name={assigneeMember?.n || null} photo={assigneeMember?.photo} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              {assigneeMember ? assigneeMember.n : "nealocat"}
            </div>
            {t.pendingAssignee && (
              <div className="mini" style={{ color: "var(--color-gold)" }}>
                propus către {memName(S, t.pendingAssignee)} — așteaptă acceptare
              </div>
            )}
          </div>
          <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--color-muted)" }}>
            {p}%
          </span>
        </div>
        <Bar pct={p} cls={late ? "red" : ""} />

        {t.notes && (
          <div style={{ marginTop: 12 }}>
            <div className="lbl" style={{ marginBottom: 4 }}>Note</div>
            <p className="mini" style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{t.notes}</p>
          </div>
        )}

        {canEdit && (
          <div style={{ marginTop: 12 }}>
            <div className="lbl" style={{ marginBottom: 6 }}>Schimbă statusul</div>
            <select
              className="stselect"
              value={t.status}
              onChange={(e) => moveTask(t.id, e.target.value as StatusId)}
            >
              {STATUS.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.n}
                </option>
              ))}
            </select>
          </div>
        )}

        {subs.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="lbl" style={{ marginBottom: 4 }}>
              Taskuri · {subs.filter((s) => s.done).length}/{subs.length}
            </div>
            {subs.map((s) => (
              <div className={`sub ${s.done ? "done" : ""}`} key={s.id}>
                <button className={`cb ${s.done ? "on" : ""}`} onClick={() => toggleSub(t.id, s.id)}>
                  {s.done ? "✓" : ""}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="st">{s.title}</div>
                  <div className="mini">
                    {s.assignee ? memName(S, s.assignee) : "nealocat"}
                    {s.deadline ? " · " + fmtDate(s.deadline) : ""}
                  </div>
                </div>
                {canEdit && (
                  <button className="btn ghost sm" onClick={() => editSub(t.id, s.id)}>
                    ⋯
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="subadd">
          <input
            value={subInput}
            placeholder="Task nou în Epic…"
            onChange={(e) => setSubInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addSub(t.id, subInput);
                setSubInput("");
              }
            }}
          />
          <button
            className="btn sm"
            onClick={() => {
              addSub(t.id, subInput);
              setSubInput("");
            }}
          >
            Adaugă
          </button>
        </div>


        {histDesc.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <button
              className="btn ghost sm"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => setHistOpen((o) => !o)}
            >
              <span
                style={{
                  display: "inline-block",
                  transition: "transform .15s",
                  transform: histOpen ? "rotate(90deg)" : "none",
                }}
              >
                ▸
              </span>
              Istoric · {histDesc.length}
            </button>
            {histOpen && (
              <div style={{ marginTop: 6 }}>
                {histDesc.map((e, i) => (
                  <div
                    className="mini"
                    key={e.d + ":" + i}
                    style={{ display: "flex", gap: 8, padding: "3px 0", lineHeight: 1.5 }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b>{e.by ? memName(S, e.by) : "—"}</b> {evText(e)}
                    </span>
                    <span className="mono" style={{ color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                      {fmtEvDate(e.d)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="row" style={{ marginTop: 14 }}>
          {t.status !== "gata" ? (
            <button className="btn sm" onClick={() => finish(t.id)}>
              Marchez finalizat
            </button>
          ) : (
            <button className="btn ghost sm" onClick={() => reopen(t.id)}>
              Redeschid
            </button>
          )}
          {t.recurring && (
            <button className="btn ghost sm" onClick={() => renew(t.id)}>
              Reînnoiesc ciclul
            </button>
          )}
          {canEdit && (
            <button className="btn ghost sm" onClick={() => editTask(t.id)}>
              Editează
            </button>
          )}
          <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={onClose}>
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}
