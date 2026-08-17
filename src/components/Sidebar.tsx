"use client";
// ============================================================
//  SIDEBAR STÂNGA — navigație colapsabilă + branding TeamPulse
// ============================================================
import { signOut } from "firebase/auth";
import {
  Bell,
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
import { currentMemberId, mem } from "@/lib/calc";
import { firebaseReady, getAuthClient } from "@/lib/firebase";
import { useStore } from "@/lib/store";
import type { TabId } from "@/lib/types";
import { LogoMark, Wordmark } from "./Brand";

const NAV: { id: TabId; n: string; Icon: LucideIcon }[] = [
  { id: "dash", n: "Panou", Icon: LayoutDashboard },
  { id: "tasks", n: "Taskuri", Icon: ListChecks },
  { id: "kpi", n: "KPI", Icon: Target },
  { id: "team", n: "Echipă", Icon: Users },
  { id: "notif", n: "Notificări", Icon: Bell },
  { id: "set", n: "Setări", Icon: SettingsIcon },
];

export function Sidebar() {
  const S = useStore((s) => s.S);
  const me = useStore((s) => s.me);
  const authEmail = useStore((s) => s.authEmail);
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const collapsed = useStore((s) => s.collapsed);
  const toggleCollapsed = useStore((s) => s.toggleCollapsed);
  const admin = useIsAdmin();
  const setProfileOpen = useStore((s) => s.setProfileOpen);

  // Utilizatorul normal nu vede Setări.
  const nav = admin ? NAV : NAV.filter((n) => n.id !== "set");

  // Identitatea e automată: membrul al cărui email coincide cu contul logat.
  // S poate fi încă null cât timp se încarcă datele din Firestore — nu accesăm nimic pe null.
  const myId = S ? currentMemberId(S, me, authEmail) : "";
  const meMember = S && myId ? mem(S, myId) : undefined;
  // Notificări: asignări în așteptare pentru mine.
  const notifCount = S ? S.tasks.filter((t) => t.pendingAssignee && t.pendingAssignee === myId).length : 0;

  const identityName = meMember ? meMember.n : authEmail || "cont local";
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
        {nav.map(({ id, n, Icon }) => {
          const badge = id === "notif" && notifCount > 0 ? notifCount : 0;
          return (
            <button
              key={id}
              className={id === tab ? "on" : ""}
              onClick={() => setTab(id)}
              title={collapsed ? n : undefined}
            >
              <Icon size={19} strokeWidth={2.2} />
              {!collapsed && <span className="label">{n}</span>}
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </button>
          );
        })}
      </nav>

      <div className="side-foot">
        <button className="foot-id" onClick={() => setProfileOpen(true)} title="Profilul meu">
          <span className="foot-ic">
            {meMember?.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={meMember.photo} alt={identityName} />
            ) : (
              <UserRound size={18} strokeWidth={2.2} />
            )}
          </span>
          {!collapsed && (
            <span className="foot-txt">
              <span className="foot-name">{identityName}</span>
              <span className="foot-mail">{identitySub || (meMember ? "membru în echipă" : "cont conectat")}</span>
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
