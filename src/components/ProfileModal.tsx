"use client";
// ============================================================
//  PROFILUL MEU — setări de profil (deocamdată: poza).
//  Click pe poză → alegi o imagine din calculator; e decupată
//  pătrat şi comprimată la 128px ca să rămână mică în Firestore.
// ============================================================
import { useRef, useState } from "react";
import { currentMemberId, mem } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { initials } from "@/lib/utils";

// Limită dură pentru data-URL (~60KB) — tot state-ul stă într-un singur
// document Firestore (max 1MB), deci pozele trebuie să rămână minuscule.
const MAX_CHARS = 80_000;

async function fileToAvatar(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("bad image"));
      img.src = url;
    });
    const SIZE = 128;
    const c = document.createElement("canvas");
    c.width = SIZE;
    c.height = SIZE;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    // decupare pătrată din centru
    const side = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
    return c.toDataURL("image/jpeg", 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const S = useStore((s) => s.S);
  const me = useStore((s) => s.me);
  const authEmail = useStore((s) => s.authEmail);
  const mutate = useStore((s) => s.mutate);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const myId = S ? currentMemberId(S, me, authEmail) : "";
  const m = S && myId ? mem(S, myId) : undefined;

  const onFile = async (f?: File) => {
    if (!f || !m) return;
    setBusy(true);
    try {
      const dataUrl = await fileToAvatar(f);
      if (dataUrl.length > MAX_CHARS) {
        alert("Imaginea e prea mare şi după comprimare. Încearcă alta.");
        return;
      }
      mutate((St) => {
        const mm = St.members.find((x) => x.id === m.id);
        if (mm) mm.photo = dataUrl;
      });
    } catch {
      alert("Nu am putut citi imaginea. Încearcă alt fişier.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div
      className="ovl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" style={{ maxWidth: 400 }}>
        <h3>Profilul meu</h3>
        {m ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, margin: "10px 0 4px" }}>
              <button
                className="pf-photo"
                onClick={() => fileRef.current?.click()}
                title="Schimbă poza de profil"
                disabled={busy}
              >
                {m.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo} alt={m.n} />
                ) : (
                  <span className="pf-initials">{initials(m.n)}</span>
                )}
                <span className="pf-hint">{busy ? "se încarcă…" : "schimbă poza"}</span>
              </button>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{m.n}</div>
              <div className="mini">{m.email || authEmail}</div>
              {m.photo && (
                <button
                  className="btn ghost sm"
                  onClick={() =>
                    mutate((St) => {
                      const mm = St.members.find((x) => x.id === m.id);
                      if (mm) mm.photo = "";
                    })
                  }
                >
                  Şterge poza
                </button>
              )}
            </div>
            <p className="mini" style={{ textAlign: "center", lineHeight: 1.6, marginTop: 10 }}>
              Click pe poză ca să încarci una din calculator (se decupează pătrat, 128px).
              <br />
              În curând: alte setări de profil.
            </p>
          </>
        ) : (
          <p className="mini" style={{ lineHeight: 1.6 }}>
            Contul tău nu e asociat încă unui membru din echipă — cere unui admin să te adauge cu
            emailul tău.
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <div className="actions">
          <button className="btn ghost" onClick={onClose}>
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}
