"use client";
// ============================================================
//  CALENDAR DE PERIOADĂ (interval de luni) — picker propriu,
//  funcționează identic în orice browser. Primul click alege
//  luna de început, al doilea pe cea de sfârșit.
// ============================================================
import { CalendarRange } from "lucide-react";
import { useState } from "react";
import { MONTH_NAMES } from "@/lib/constants";
import { monthISO } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const label = (m: string) => {
  const [y, mo] = m.split("-");
  return MONTH_NAMES[+mo - 1] + " " + y;
};

export function MonthRangePicker({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => +(end || monthISO()).split("-")[0]);
  // În timpul selecției: prima lună aleasă; a doua încheie și comite.
  const [pending, setPending] = useState<string | null>(null);

  const today = monthISO();

  const pick = (m: string) => {
    if (!pending) {
      setPending(m);
      return;
    }
    const a = pending <= m ? pending : m;
    const b = pending <= m ? m : pending;
    setPending(null);
    setOpen(false);
    onChange(a, b);
  };

  const inRange = (m: string) => {
    if (pending) return m === pending;
    return start <= m && m <= end;
  };
  const isEdge = (m: string) => (pending ? m === pending : m === start || m === end);

  const cells = Array.from({ length: 12 }, (_, i) => year + "-" + pad(i + 1));

  return (
    <div className="mrp">
      <button
        className="mrp-trigger"
        onClick={() => {
          setOpen(!open);
          setPending(null);
          setYear(+(end || monthISO()).split("-")[0]);
        }}
      >
        <CalendarRange size={15} strokeWidth={2.2} />
        <span>{start === end ? label(end) : label(start) + " → " + label(end)}</span>
      </button>

      {open && (
        <>
          <div
            className="mrp-backdrop"
            onClick={() => {
              setOpen(false);
              setPending(null);
            }}
          />
          <div className="mrp-pop">
            <div className="mrp-head">
              <button onClick={() => setYear(year - 1)} aria-label="Anul anterior">
                ‹
              </button>
              <b>{year}</b>
              <button onClick={() => setYear(year + 1)} aria-label="Anul următor">
                ›
              </button>
            </div>
            <div className="mrp-grid">
              {cells.map((m, i) => (
                <button
                  key={m}
                  className={`mrp-cell ${inRange(m) ? "in" : ""} ${isEdge(m) ? "edge" : ""} ${m === today ? "today" : ""}`}
                  onClick={() => pick(m)}
                >
                  {MONTH_NAMES[i]}
                </button>
              ))}
            </div>
            <div className="mrp-foot">
              <span className="mini">
                {pending ? "alege luna de sfârşit" : "click pe două luni pentru interval"}
              </span>
              <button
                className="btn ghost sm"
                onClick={() => {
                  setPending(null);
                  setOpen(false);
                  onChange(today, today);
                }}
              >
                Luna curentă
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
