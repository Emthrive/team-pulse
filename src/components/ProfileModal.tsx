"use client";
// ============================================================
//  PROFILUL MEU — setări de profil (deocamdată: poza).
//  La încărcare intri în modul de încadrare: tragi poza ca să o
//  poziţionezi (stânga/dreapta/sus/jos) şi faci zoom in/out,
//  apoi salvezi. Rezultatul: JPEG 128×128, comprimat.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { currentMemberId, mem } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { initials } from "@/lib/utils";

// Limită dură pentru data-URL (~60KB) — tot state-ul stă într-un singur
// document Firestore (max 1MB), deci pozele trebuie să rămână minuscule.
const MAX_CHARS = 80_000;
const VIEW = 220; // latura ferestrei de încadrare (px)
const OUT = 128; // dimensiunea finală a pozei

interface CropState {
  url: string;
  iw: number;
  ih: number;
}

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const S = useStore((s) => s.S);
  const me = useStore((s) => s.me);
  const authEmail = useStore((s) => s.authEmail);
  const mutate = useStore((s) => s.mutate);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const [crop, setCrop] = useState<CropState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  const myId = S ? currentMemberId(S, me, authEmail) : "";
  const m = S && myId ? mem(S, myId) : undefined;

  // Curăţăm object URL-ul la închidere / schimbare.
  useEffect(() => {
    return () => {
      if (crop) URL.revokeObjectURL(crop.url);
    };
  }, [crop]);

  // Geometria încadrării: la zoom=1 poza acoperă exact fereastra (cover).
  const baseScale = crop ? VIEW / Math.min(crop.iw, crop.ih) : 1;
  const scale = baseScale * zoom;
  const dw = crop ? crop.iw * scale : 0;
  const dh = crop ? crop.ih * scale : 0;

  const clampOffset = (x: number, y: number, z = zoom) => {
    if (!crop) return { x: 0, y: 0 };
    const s = baseScale * z;
    const maxX = Math.max(0, (crop.iw * s - VIEW) / 2);
    const maxY = Math.max(0, (crop.ih * s - VIEW) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  };

  const setZoomClamped = (z: number) => {
    const nz = Math.max(1, Math.min(3, z));
    setZoom(nz);
    setOffset((o) => clampOffset(o.x, o.y, nz));
  };

  const onFile = (f?: File) => {
    if (!f || !m) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setCrop({ url, iw: img.naturalWidth, ih: img.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert("Nu am putut citi imaginea. Încearcă alt fişier.");
    };
    img.src = url;
    if (fileRef.current) fileRef.current.value = "";
  };

  const saveCrop = () => {
    if (!crop || !m || !imgRef.current) return;
    setBusy(true);
    try {
      // Fereastra de încadrare, transpusă în coordonatele imaginii originale.
      const srcSize = VIEW / scale;
      const cx = crop.iw / 2 - offset.x / scale;
      const cy = crop.ih / 2 - offset.y / scale;
      const c = document.createElement("canvas");
      c.width = OUT;
      c.height = OUT;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(imgRef.current, cx - srcSize / 2, cy - srcSize / 2, srcSize, srcSize, 0, 0, OUT, OUT);
      const dataUrl = c.toDataURL("image/jpeg", 0.72);
      if (dataUrl.length > MAX_CHARS) {
        alert("Imaginea e prea mare şi după comprimare. Încearcă alta.");
        return;
      }
      const id = m.id;
      mutate((St) => {
        const mm = St.members.find((x) => x.id === id);
        if (mm) mm.photo = dataUrl;
      });
      URL.revokeObjectURL(crop.url);
      setCrop(null);
    } catch {
      alert("Nu am putut procesa imaginea.");
    } finally {
      setBusy(false);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    setOffset(clampOffset(d.ox + (e.clientX - d.x), d.oy + (e.clientY - d.y)));
  };
  const onPointerUp = () => {
    dragRef.current = null;
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
          crop ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, margin: "10px 0 4px" }}>
                <div
                  className="crop-view"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onWheel={(e) => setZoomClamped(zoom - Math.sign(e.deltaY) * 0.12)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={crop.url}
                    alt="încadrare"
                    draggable={false}
                    style={{
                      width: dw,
                      height: dh,
                      left: VIEW / 2 + offset.x - dw / 2,
                      top: VIEW / 2 + offset.y - dh / 2,
                    }}
                  />
                </div>
                <div className="row" style={{ width: VIEW, gap: 10 }}>
                  <button className="step" onClick={() => setZoomClamped(zoom - 0.2)} aria-label="Zoom out">
                    −
                  </button>
                  <input
                    type="range"
                    min={100}
                    max={300}
                    value={Math.round(zoom * 100)}
                    onChange={(e) => setZoomClamped(Number(e.target.value) / 100)}
                    style={{ flex: 1, accentColor: "var(--color-turq)" }}
                    aria-label="Zoom"
                  />
                  <button className="step" onClick={() => setZoomClamped(zoom + 0.2)} aria-label="Zoom in">
                    +
                  </button>
                </div>
                <p className="mini" style={{ textAlign: "center", margin: 0 }}>
                  Trage poza ca să o încadrezi · zoom din slider sau scroll
                </p>
              </div>
              <div className="actions">
                <button
                  className="btn ghost"
                  onClick={() => {
                    URL.revokeObjectURL(crop.url);
                    setCrop(null);
                  }}
                >
                  Renunţ
                </button>
                <button className="btn" onClick={saveCrop} disabled={busy}>
                  {busy ? "Se salvează…" : "Salvează poza"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, margin: "10px 0 4px" }}>
                <button
                  className="pf-photo"
                  onClick={() => fileRef.current?.click()}
                  title="Schimbă poza de profil"
                >
                  {m.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photo} alt={m.n} />
                  ) : (
                    <span className="pf-initials">{initials(m.n)}</span>
                  )}
                  <span className="pf-hint">schimbă poza</span>
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
                Click pe poză ca să încarci una din calculator — apoi o încadrezi şi îi faci zoom.
                <br />
                În curând: alte setări de profil.
              </p>
              <div className="actions">
                <button className="btn ghost" onClick={onClose}>
                  Închide
                </button>
              </div>
            </>
          )
        ) : (
          <>
            <p className="mini" style={{ lineHeight: 1.6 }}>
              Contul tău nu e asociat încă unui membru din echipă — cere unui admin să te adauge cu
              emailul tău.
            </p>
            <div className="actions">
              <button className="btn ghost" onClick={onClose}>
                Închide
              </button>
            </div>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
