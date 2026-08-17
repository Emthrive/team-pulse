// ============================================================
//  HELPERI GENERICI (date, id, numere)
// ============================================================

export const uid = () => Math.random().toString(36).slice(2, 9);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const monthISO = (d?: Date) => (d || new Date()).toISOString().slice(0, 7);

export function fmtDate(d?: string) {
  if (!d) return "";
  const [y, m, dd] = d.split("-");
  return dd + "." + m + "." + y.slice(2);
}

export function fmtNum(v: number | string) {
  const n = Number(v) || 0;
  return n >= 1000 ? n.toLocaleString("ro-RO") : String(n);
}

export function daysLeft(d?: string): number | null {
  if (!d) return null;
  return Math.round(
    (new Date(d + "T00:00:00").getTime() - new Date(todayISO() + "T00:00:00").getTime()) / 864e5,
  );
}

export const initials = (n: string) =>
  String(n || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/** clamp la [0,100] și rotunjire, pentru procente de progres */
export const pct = (v: number) => Math.max(0, Math.min(100, Math.round(v || 0)));
