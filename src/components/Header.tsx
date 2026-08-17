"use client";
// ============================================================
//  HEADER + NAVIGAȚIE (portat din <header>)
// ============================================================
import { signOut } from "firebase/auth";
import { mem } from "@/lib/calc";
import { TABS } from "@/lib/constants";
import { firebaseReady, getAuthClient } from "@/lib/firebase";
import { whoAmI } from "@/lib/forms";
import { useStore } from "@/lib/store";

const syncTxt: Record<string, string> = { ok: "salvat", wait: "salvez…", err: "doar local" };

export function Header() {
  const S = useStore((s) => s.S)!;
  const me = useStore((s) => s.me);
  const tab = useStore((s) => s.tab);
  const sync = useStore((s) => s.sync);
  const setTab = useStore((s) => s.setTab);

  const meMember = me ? mem(S, me) : undefined;

  return (
    <header className="app-header">
      <div className="hbar">
        <div className="mark">E</div>
        <div>
          <div className="htitle">Emthrive</div>
          <div className="hsub">CRM intern · echipă &amp; KPI</div>
        </div>
        <button className="chip turq" style={{ marginLeft: "auto" }} onClick={() => whoAmI()}>
          {meMember ? meMember.n.split(" ")[0] + " · eu" : "cine sunt?"}
        </button>
        <div className="sync" style={{ marginLeft: 6 }}>
          <span className={`dot ${sync === "err" ? "err" : sync === "wait" ? "wait" : ""}`} />
          <span>{syncTxt[sync]}</span>
        </div>
        {firebaseReady && (
          <button
            className="chip"
            style={{ marginLeft: 4, cursor: "pointer" }}
            title="Ieşi din cont"
            onClick={() => signOut(getAuthClient())}
          >
            ieşi
          </button>
        )}
      </div>
      <nav className="app-nav">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === tab ? "on" : ""} onClick={() => setTab(t.id)}>
            {t.n}
          </button>
        ))}
      </nav>
    </header>
  );
}
