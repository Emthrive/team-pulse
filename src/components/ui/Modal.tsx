"use client";
// ============================================================
//  MODAL / FORMULAR GENERIC (portat din openForm)
// ============================================================
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

export function Modal() {
  const form = useStore((s) => s.form);
  const submitForm = useStore((s) => s.submitForm);
  const closeForm = useStore((s) => s.closeForm);
  const deleteForm = useStore((s) => s.deleteForm);

  const [data, setData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (form) {
      const init: Record<string, string> = {};
      form.fields.forEach((f) => {
        init[f.key] = f.value == null ? "" : String(f.value);
      });
      setData(init);
    }
  }, [form]);

  if (!form) return null;

  const setField = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));

  const onDelete = () => {
    if (!confirm("Sigur ştergi? Acţiunea nu poate fi anulată.")) return;
    deleteForm();
  };

  return (
    <div
      className="ovl"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeForm();
      }}
    >
      <div className="sheet">
        <h3>{form.title}</h3>
        {form.note && <p className="mini" style={{ margin: "-8px 0 14px" }}>{form.note}</p>}

        {form.fields.map((fl) => {
          const v = data[fl.key] ?? "";
          let ctl: React.ReactNode;
          if (fl.type === "select") {
            const opts = fl.options || [];
            // Opțiunile consecutive cu același grup (g) apar sub un header <optgroup>.
            const rendered: React.ReactNode[] = [];
            let i = 0;
            while (i < opts.length) {
              const g = opts[i].g;
              if (!g) {
                rendered.push(
                  <option key={opts[i].v} value={opts[i].v}>
                    {opts[i].l}
                  </option>,
                );
                i++;
                continue;
              }
              const groupItems = [];
              while (i < opts.length && opts[i].g === g) {
                groupItems.push(opts[i]);
                i++;
              }
              rendered.push(
                <optgroup key={"g:" + g} label={g}>
                  {groupItems.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.l}
                    </option>
                  ))}
                </optgroup>,
              );
            }
            ctl = (
              <select value={v} onChange={(e) => setField(fl.key, e.target.value)}>
                {rendered}
              </select>
            );
          } else if (fl.type === "textarea") {
            ctl = (
              <textarea
                value={v}
                placeholder={fl.ph || ""}
                onChange={(e) => setField(fl.key, e.target.value)}
              />
            );
          } else if (fl.type === "checks") {
            const selected = new Set(v.split(",").map((x) => x.trim()).filter(Boolean));
            ctl = (
              <div className="checks">
                {(fl.options || []).map((o) => (
                  <label className={`check-item ${selected.has(o.v) ? "on" : ""}`} key={o.v}>
                    <input
                      type="checkbox"
                      checked={selected.has(o.v)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(o.v);
                        else next.delete(o.v);
                        setField(fl.key, Array.from(next).join(","));
                      }}
                    />
                    <span>{o.l}</span>
                  </label>
                ))}
              </div>
            );
          } else if (fl.type === "range") {
            ctl = (
              <input
                type="range"
                min={fl.min ?? 0}
                max={fl.max ?? 100}
                step={fl.step ?? 1}
                value={v}
                onChange={(e) => setField(fl.key, e.target.value)}
              />
            );
          } else {
            ctl = (
              <input
                type={fl.type || "text"}
                value={v}
                placeholder={fl.ph || ""}
                step={fl.step}
                onChange={(e) => setField(fl.key, e.target.value)}
              />
            );
          }
          return (
            <div className="f" key={fl.key}>
              <label className="lbl">
                {fl.label}
                {fl.type === "range" && <> · <span className="rv">{v}</span></>}
              </label>
              {ctl}
            </div>
          );
        })}

        <div className="actions">
          <button className="btn ghost" onClick={closeForm}>
            Renunţ
          </button>
          <button className="btn" onClick={() => submitForm(data)}>
            {form.ok || "Salvează"}
          </button>
        </div>
        {form.onDelete && (
          <button
            className="btn danger"
            style={{ width: "100%", marginTop: 8, padding: 11 }}
            onClick={onDelete}
          >
            Şterge definitiv
          </button>
        )}
      </div>
    </div>
  );
}
