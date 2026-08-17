"use client";
// ============================================================
//  SIDEBAR STÂNGA — navigație colapsabilă + branding TeamPulse
// ============================================================
import { signOut } from "firebase/auth";
import {
  LayoutDashboard,
  ListChecks,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
  Target,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useIsAdmin } from "@/lib/admin";
import { mem } from "@/lib/calc";
import { firebaseReady, getAuthClient } from "@/lib/firebase";
import { whoAmI } from "@/lib/forms";
import { useStore } from "@/lib/store";
import type { TabId } from "@/lib/types";
import { LogoMark, Wordmark } from "./Brand";

const NAV: { id: TabId; n: string; Icon: LucideIcon }[] = [
  { id: "dash", n: "Panou", Icon: LayoutDashboard },
  { id: "tasks", n: "Taskuri", Icon: ListChecks },
  { id: "kpi", n: "KPI", Icon: Target },
  { id: "team", n: "Echipă", Icon: Users },
  { id: "set", n: "Setări", Icon: SettingsIcon },
];

const syncTxt: Record<string, string> = { ok: "salvat", wait: "salvez…", err: "doar local" };

export function Sidebar() {
  const S = useStore((s) => s.S);
  const me = useStore((s) => s.me);
  const authEmail = useStore((s) => s.authEmail);
  const tab = useStore((s) => s.tab);
  const sync = useStore((s) => s.sync);
  const setTab = useStore((s) => s.setTab);
  const collapsed = useStore((s) => s.collapsed);
  const toggleCollapsed = useStore((s) => s.toggleCollapsed);
  const admin = useIsAdmin();

  // Utilizatorul normal nu vede Setări.
  const nav = admin ? NAV : NAV.filter((n) => n.id !== "set");

  // Identitatea afișată: membrul ales manual > membrul cu emailul contului logat > emailul contului.
  // S poate fi încă null cât timp se încarcă datele din Firestore — nu accesăm nimic pe null.
  const meMember = S
    ? (me ? mem(S, me) : undefined) ||
      (authEmail ? S.members.find((m) => (m.email || "").toLowerCase() === authEmail) : undefined)
    : undefined;

  const identityName = meMember ? meMember.n : authEmail || "Cine sunt?";
  const identitySub = meMember && authEmail ? authEmail : null;

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="side-top">
        {collapsed ? (
          <LogoMark size={34} />
        ) : (
          <div className="brand-expanded">
            <Wordmark height={22} />
            <div className="hsub">powered by Emthrive</div>
          </div>
        )}
        <button
          className="collapse-btn"
          onClick={toggleCollapsed}
          title={collapsed ? "Extinde meniul" : "Restrânge meniul"}
          aria-label={collapsed ? "Extinde meniul" : "Restrânge meniul"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="side-nav">
        {nav.map(({ id, n, Icon }) => (
          <button
            key={id}
            className={id === tab ? "on" : ""}
            onClick={() => setTab(id)}
            title={collapsed ? n : undefined}
          >
            <Icon size={19} strokeWidth={2.2} />
            {!collapsed && <span className="label">{n}</span>}
          </button>
        ))}
      </nav>

      <div className="side-foot">
        <button
          className="foot-id"
          onClick={() => whoAmI()}
          title={identitySub || identityName}
        >
          <span className="foot-ic">
            <UserRound size={18} strokeWidth={2.2} />
          </span>
          {!collapsed && (
            <span className="foot-txt">
              <span className="foot-name">{identityName}</span>
              <span className="foot-mail">{identitySub || (meMember ? "membru în echipă" : "cont conectat")}</span>
              <span className={`foot-sync ${sync}`}>
                <span className={`dot ${sync === "err" ? "err" : sync === "wait" ? "wait" : ""}`} />
                {syncTxt[sync]}
              </span>
            </span>
          )}
        </button>
        {firebaseReady && (
          <button
            className="foot-out"
            onClick={() => signOut(getAuthClient())}
            title="Ieşi din cont"
            aria-label="Ieşi din cont"
          >
            <LogOut size={18} strokeWidth={2.2} />
            {!collapsed && <span className="label">Ieşi</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
