"use client";
// ============================================================
//  NOTIFICĂRI — asignări de taskuri care așteaptă acceptare
// ============================================================
import { acceptAssignment, rejectAssignment } from "@/lib/actions";
import { currentMemberId, depName, memName } from "@/lib/calc";
import { prCls, prName } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { fmtDate } from "@/lib/utils";

export function Notifications() {
  const S = useStore((s) => s.S)!;
  const me = useStore((s) => s.me);
  const authEmail = useStore((s) => s.authEmail);

  const myId = currentMemberId(S, me, authEmail);
  const pending = S.tasks.filter((t) => t.pendingAssignee && t.pendingAssignee === myId);

  return (
    <>
      <div className="sec">
        <h2>Notificări</h2>
        <span className="rule" />
        <span className={`chip ${pending.length ? "gold" : ""}`}>{pending.length}</span>
      </div>
      <p className="mini" style={{ margin: "0 0 12px" }}>
        Taskuri asignate ție care trebuie acceptate. Până accepți, rămân la responsabilul curent.
      </p>

      {pending.length ? (
        pending.map((t) => (
          <div className="task" key={t.id}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="t">{t.title}</div>
                <div className="meta">
                  <span className={`chip ${prCls(t.priority)}`}>{prName(t.priority)}</span>
                  <span className="chip">{depName(S, t.dept)}</span>
                  {t.deadline && <span className="chip">{fmtDate(t.deadline)}</span>}
                  {t.assignedBy && <span className="chip turq">de la {memName(S, t.assignedBy)}</span>}
                </div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 11 }}>
              <button className="btn sm" onClick={() => acceptAssignment(t.id)}>
                Accept
              </button>
              <button className="btn danger sm" onClick={() => rejectAssignment(t.id)}>
                Refuz
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="empty">Nu ai nicio asignare în așteptare.</div>
      )}
    </>
  );
}
