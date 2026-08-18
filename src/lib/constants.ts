import type { PriorityId, StatusId, TabId } from "./types";

export const CRM_DOC_ID = process.env.NEXT_PUBLIC_CRM_DOC_ID || "main";

export const STATUS: { id: StatusId; n: string; c: string }[] = [
  { id: "backlog", n: "Backlog", c: "" },
  { id: "todo", n: "De făcut", c: "" },
  { id: "lucru", n: "În lucru", c: "turq" },
  { id: "testing", n: "Testing", c: "gold" },
  { id: "gata", n: "Finalizat", c: "green" },
];

export const PRIO: { id: PriorityId; n: string; c: string }[] = [
  { id: "critica", n: "Critică", c: "red" },
  { id: "ridicata", n: "Ridicată", c: "gold" },
  { id: "medie", n: "Medie", c: "" },
  { id: "scazuta", n: "Scăzută", c: "" },
];

export const CRIT: { id: string; n: string }[] = [
  { id: "calitate", n: "Calitatea livrabilelor" },
  { id: "termene", n: "Respectarea termenelor" },
  { id: "comunicare", n: "Comunicare în echipă" },
  { id: "initiativa", n: "Inițiativă & idei noi" },
  { id: "autonomie", n: "Autonomie (fără supervizare)" },
];

export const TABS: { id: TabId; n: string }[] = [
  { id: "dash", n: "Panou" },
  { id: "tasks", n: "Taskuri" },
  { id: "kpi", n: "KPI" },
  { id: "team", n: "Echipă" },
  { id: "notif", n: "Notificări" },
  { id: "set", n: "Setări" },
];

export const stName = (id: string) => (STATUS.find((x) => x.id === id) || STATUS[0]).n;
export const stCls = (id: string) => (STATUS.find((x) => x.id === id) || STATUS[0]).c;
export const prName = (id: string) => (PRIO.find((x) => x.id === id) || PRIO[2]).n;
export const prCls = (id: string) => (PRIO.find((x) => x.id === id) || PRIO[2]).c;

export const MONTH_NAMES = [
  "ian", "feb", "mar", "apr", "mai", "iun",
  "iul", "aug", "sep", "oct", "noi", "dec",
];
