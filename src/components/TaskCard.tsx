"use client";
// ============================================================
//  CARD DE TASK (portat din taskCard)
// ============================================================
import { useState } from "react";
import { addSub, finish, renew, reopen, toggleSub } from "@/lib/actions";
import { useIsAdmin } from "@/lib/admin";
import { currentMemberId, depName, isLate, memName, taskProgress } from "@/lib/calc";
import { prCls, prName, stCls, stName } from "@/lib/constants";
import { editSub, editTask, setCover } from "@/lib/forms";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { daysLeft, fmtDate } from "@/lib/utils";
import { Avatar, Bar } from "./ui/primitives";

export function TaskCard({ task }: { task: Task }) {
  const S = useStore((s) => s.S)!;
  const me = useStore((s) => s.me);
  const authEmail = useStore((s) => s.authEmail);
  const open = useStore((s) => !!s.open[task.id]);
  const toggleOpen = useStore((s) => s.toggleOpen);
  const admin = useIsAdmin();
  const [subInput, setSubInput] = useState("");

  // Poţi edita dacă eşti admin sau eşti responsabilul taskului.
  const canEdit = admin || task.assignee === currentMemberId(S, me, authEmail);

  const t = task;
  const p = taskProgress(t);
  const late = isLate(t);
  const dl = daysLeft(t.deadline);
  const subs = t.subtasks || [];
  const dlTxt = t.deadline
    ? fmtDate(t.deadline) +
      (t.status !== "gata" && dl !== null
        ? dl < 0
          ? " · " + Math.abs(dl) + "z întârziere"
          : dl === 0
            ? " · azi"
            : " · în " + dl + "z"
        : "")
    : "fără termen";

  return (
    <div className={`task ${late ? "late" : ""} ${t.status === "gata" ? "done" : ""}`}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => toggleOpen(t.id)}>
          <div className="t">{t.title}</div>
          <div className="meta">
            {subs.length > 0 ? (
              <span className="chip gold">Epic</span>
            ) : (
              <span className="chip turq">Task</span>
            )}
            <span className={`chip ${stCls(t.status)}`}>{stName(t.status)}</span>
            <span className={`chip ${prCls(t.priority)}`}>{prName(t.priority)}</span>
            <span className="chip">{depName(S, t.dept)}</span>
            <span className={`chip ${late ? "red" : ""}`}>{dlTxt}</span>
            {t.recurring && (
              <span className="chip gold">{t.recurring === "lunar" ? "lunar" : "săptămânal"}</span>
            )}
            {t.coverLabel && (
              <span className={`chip ${t.coverDate ? "gold" : ""}`}>
                {t.coverLabel}: {t.coverDate ? fmtDate(t.coverDate) : "completează"}
              </span>
            )}
            {(t.tags || []).map((g) => (
              <span className="chip turq" key={g}>
                #{g}
              </span>
            ))}
            {subs.length > 0 && (
              <span className="chip">
                {subs.filter((s) => s.done).length}/{subs.length} subtaskuri
              </span>
            )}
          </div>
        </div>
        <Avatar name={t.assignee ? memName(S, t.assignee) : null} />
      </div>

      <div style={{ marginTop: 10 }} className="row">
        <div style={{ flex: 1, minWidth: 80 }}>
          <Bar pct={p} cls={late ? "red" : ""} />
        </div>
        <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-muted)" }}>
          {p}%
        </span>
        <button className="btn ghost sm" onClick={() => toggleOpen(t.id)}>
          {open ? "▲" : "▼"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
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

          <div className="subadd">
            <input
              value={subInput}
              placeholder="Subtask nou (ex: cover postare SP 12 august)"
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

          {t.notes && (
            <p className="mini" style={{ marginTop: 10, lineHeight: 1.5 }}>
              {t.notes}
            </p>
          )}

          <div className="row" style={{ marginTop: 11 }}>
            {t.status !== "gata" ? (
              <button className="btn sm" onClick={() => finish(t.id)}>
                Marchez finalizat
              </button>
            ) : (
              <button className="btn ghost sm" onClick={() => reopen(t.id)}>
                Redeschid
              </button>
            )}
            <button className="btn ghost sm" onClick={() => setCover(t.id)}>
              {t.coverLabel || "Data acoperită"}
            </button>
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
          </div>
        </div>
      )}
    </div>
  );
}
