// ============================================================
//  MODELUL DE DATE — portat din CRM-ul original
// ============================================================

export type StatusId = "todo" | "lucru" | "review" | "blocat" | "gata";
export type PriorityId = "critica" | "ridicata" | "medie" | "scazuta";
export type KpiDir = "up" | "down";
export type Recurring = "" | "saptamanal" | "lunar";

export interface Department {
  id: string;
  n: string;
  leadId: string;
}

export interface Member {
  id: string;
  n: string;
  role: string;
  dept: string;
  active: boolean;
  /** Emailul de acces — cine are email aici primește magic link (whitelist). */
  email?: string;
}

export interface Subtask {
  id: string;
  title: string;
  assignee: string;
  deadline: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  dept: string;
  assignee: string;
  /** Responsabil propus, în așteptarea acceptării (asignare care trebuie acceptată). */
  pendingAssignee?: string;
  /** Cine a propus asignarea (pentru notificare). */
  assignedBy?: string;
  deadline: string;
  priority: PriorityId;
  status: StatusId;
  progress: number;
  tags: string[];
  notes: string;
  recurring: Recurring;
  coverLabel?: string;
  coverDate?: string;
  subtasks: Subtask[];
  createdAt: string;
  completedAt: string;
}

export interface Kpi {
  id: string;
  n: string;
  dept: string;
  assignee: string;
  target: number;
  unit: string;
  dir: KpiDir;
  vals: Record<string, number>;
}

export interface Evaluation {
  id: string;
  member: string;
  month: string;
  scores: Record<string, number>;
  notes: string;
}

export interface Weights {
  exec: number;
  kpi: number;
  eval: number;
}

export interface CrmState {
  version: number;
  departments: Department[];
  members: Member[];
  tasks: Task[];
  kpis: Kpi[];
  evals: Evaluation[];
  weights: Weights;
}

export interface MemberStats {
  tasks: number;
  active: number;
  done: number;
  late: number;
  exec: number | null;
  kpi: number | null;
  eval: number | null;
  total: number | null;
}

export interface Filters {
  dept: string;
  member: string;
  status: string;
  only: "" | "late" | "week";
}

export type SyncState = "ok" | "wait" | "err";
export type TabId = "dash" | "tasks" | "kpi" | "team" | "notif" | "set";
