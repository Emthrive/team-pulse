"use client";
// ============================================================
//  COMPONENTE MICI — ring, bar, avatar, month picker
// ============================================================
import { MONTH_NAMES } from "@/lib/constants";
import { initials, monthISO } from "@/lib/utils";

export function Ring({ pct, color }: { pct: number; color?: string }) {
  const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
  const r = 22;
  const c = 2 * Math.PI * r;
  const col =
    color ||
    (p >= 80
      ? "var(--color-green)"
      : p >= 50
        ? "var(--color-turq)"
        : p >= 25
          ? "var(--color-gold)"
          : "var(--color-red)");
  return (
    <div className="ring">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="5" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={col}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * p) / 100}
        />
      </svg>
      <b>{p}</b>
    </div>
  );
}

export function Bar({ pct, cls }: { pct: number; cls?: string }) {
  return (
    <div className={`bar ${cls || ""}`}>
      <i style={{ width: `${Math.max(0, Math.min(100, pct || 0))}%` }} />
    </div>
  );
}

export function Avatar({ name, lg }: { name?: string | null; lg?: boolean }) {
  return (
    <div className={`av ${lg ? "lg" : ""}`} title={name || "nealocat"}>
      {name ? initials(name) : "—"}
    </div>
  );
}

export function MonthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const opts: string[] = [];
  const now = new Date();
  now.setDate(1);
  for (let i = -6; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push(monthISO(d));
  }
  if (!opts.includes(value)) opts.push(value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {opts.map((o) => {
        const [y, m] = o.split("-");
        return (
          <option key={o} value={o}>
            {MONTH_NAMES[+m - 1]} {y}
          </option>
        );
      })}
    </select>
  );
}
