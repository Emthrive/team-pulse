// ============================================================
//  MODELUL DE DATE — portat din CRM-ul original
// ============================================================

export type StatusId = "backlog" | "todo" | "lucru" | "testing" | "gata";
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
  /** Departamentul principal (primul din `depts`) — păstrat pentru compatibilitate. */
  dept: string;
  /** Toate departamentele membrului (un user poate fi în mai multe; doar adminul le setează). */
  depts?: string[];
  active: boolean;
  /** Emailul de acces — cine are email aici primește magic link (whitelist). */
  email?: string;
  /** Data primului login reușit — setat automat; ascunde butonul „Trimite link”. */
  activatedAt?: string;
  /** Rol în platformă: gol = utilizator normal; „manager” = ca adminul pe taskuri/KPI/Setări,
   *  dar fără gestionarea utilizatorilor, fără ştergeri (KPI/departamente) şi fără zona de date. */
  platformRole?: "" | "manager";
  /** Poza de profil — data-URL JPEG 128×128, comprimată (limită dură la upload). */
  photo?: string;
}

export interface Subtask {
  id: string;
  title: string;
  assignee: string;
  deadline: string;
  done: boolean;
  /** Data la care a fost bifat — permite numărarea pe lună în KPI-urile automate. */
  doneAt?: string;
}

/** O finalizare de task (jurnal) — supraviețuiește reînnoirii ciclului recurent. */
export interface Completion {
  d: string;
  onTime: boolean;
  /** Câte taskuri avea Epicul la finalizare (0 = task simplu). */
  n?: number;
}

/** Tipurile de evenimente din jurnalul de activitate al unui task. */
export type TaskEventKind =
  | "creat" | "asignat" | "propus" | "acceptat" | "refuzat"
  | "status" | "finalizat" | "redeschis" | "reinnoit" | "editat" | "subtask";

/** Un eveniment din jurnalul taskului. */
export interface TaskEvent {
  /** Momentul (ISO cu oră). */
  d: string;
  /** Membrul care a făcut acțiunea ("" = necunoscut — ex. intrare sintetizată). */
  by: string;
  k: TaskEventKind;
  /** Detaliu gata de afișat (nume status / persoană / câmpuri editate). */
  v?: string;
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
  subtasks: Subtask[];
  createdAt: string;
  completedAt: string;
  /** Jurnal de finalizări — sursa KPI-urilor automate (istoric corect lună de lună). */
  completions?: Completion[];
  /** Jurnal de activitate — cine a creat/asignat/mutat/editat (plafonat). */
  history?: TaskEvent[];
  /** Arhivat automat: în Finalizat de peste 30 de zile (de la ultima finalizare). */
  archived?: boolean;
}

/** Sursa unui KPI automat — metrică derivată din taskuri. Gol = manual. */
export type KpiAuto = "" | "tasks_done" | "epics_done" | "on_time_rate" | "subtasks_done" | "tasks_created";

export interface Kpi {
  id: string;
  n: string;
  dept: string;
  assignee: string;
  target: number;
  unit: string;
  dir: KpiDir;
  vals: Record<string, number>;
  /** Setat → valoarea lunii se calculează automat din taskuri (fără +/−). */
  auto?: KpiAuto;
  /** Filtru opțional pe etichetă pentru KPI-urile automate (ex: „Video”). */
  tag?: string;
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
