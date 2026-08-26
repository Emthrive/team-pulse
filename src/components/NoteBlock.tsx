// ============================================================
//  NOTE — casetă de notă reutilizabilă (card board + modal detaliu)
// ============================================================
import type { CSSProperties } from "react";

/** Eticheta „Note" + textul notei într-un chenar discret.
 *  `clamp` = pe card (max 3 rânduri + „…"); fără = integral (modal). */
export function NoteBlock({
  notes,
  clamp = false,
  style,
}: {
  notes?: string;
  clamp?: boolean;
  style?: CSSProperties;
}) {
  if (!notes) return null;
  return (
    <div style={{ minWidth: 0, ...style }}>
      <div className="lbl" style={{ marginBottom: 4 }}>
        Note
      </div>
      <p className={clamp ? "note-preview" : "note-box"} style={{ margin: 0 }}>
        {notes}
      </p>
    </div>
  );
}
