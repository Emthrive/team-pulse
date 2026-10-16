"use client";
// ============================================================
//  CONFIRMARE — modal „eşti sigur?" (stil comun, ca la ieşirea din cont).
//  Se randează la rădăcină cu z mare + blur pe fundal.
// ============================================================
export function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmă",
  cancelLabel = "Renunţ",
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{ width: "min(460px, 92vw)", padding: 32, textAlign: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: 10, fontSize: 21 }}>{title}</h3>
        {message && (
          <p className="mini" style={{ marginBottom: 24, fontSize: 13.5 }}>
            {message}
          </p>
        )}
        <div className="row" style={{ justifyContent: "center", gap: 12 }}>
          <button className="btn ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={danger ? "btn danger" : "btn"} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
