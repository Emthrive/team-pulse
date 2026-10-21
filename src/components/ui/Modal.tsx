"use client";
// ============================================================
//  MODAL / FORMULAR GENERIC (portat din openForm)
// ============================================================
import { useEffect, useState } from "react";
import { useStore, type FormField } from "@/lib/store";

export function Modal() {
  const form = useStore((s) => s.form);
  const submitForm = useStore((s) => s.submitForm);
  const closeForm = useStore((s) => s.closeForm);
  const deleteForm = useStore((s) => s.deleteForm);

  const [data, setData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (form) {
      const init: Record<string, string> = {};
      form.fields.forEach((f) => {
        init[f.key] = f.value == null ? "" : String(f.value);
      });
      setData(init);
      setErrors({});
    }
  }, [form]);

  if (!form) return null;

  // La editarea unui câmp ştergem eroarea lui (dispare pe măsură ce completezi).
  const clearErr = (k: string) => setErrors((e) => (e[k] ? { ...e, [k]: "" } : e));
  const setField = (k: string, v: string) => {
    setData((d) => ({ ...d, [k]: v }));
    clearErr(k);
  };
  // Aplică schimbarea + câmpurile derivate (ex: departament precompletat din responsabil).
  const change = (fl: FormField, v: string) => {
    setData((d) => {
      const next = { ...d, [fl.key]: v };
      const derived = fl.onChange?.(v, next);
      return derived ? { ...next, ...derived } : next;
    });
    clearErr(fl.key);
  };

  // Validare înainte de salvare: dacă întoarce mesaje, le afişăm sub câmpuri şi nu salvăm.
  const onSave = () => {
    const errs = form.validate?.(data) || null;
    if (errs && Object.values(errs).some(Boolean)) {
      setErrors(errs);
      return;
    }
    submitForm(data);
  };

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
          // Câmp condiţionat (ex: departamentele dispar când rolul e Manager).
          if (fl.showIf && !fl.showIf(data)) return null;
          const v = data[fl.key] ?? "";
          let ctl: React.ReactNode;
          if (fl.type === "select") {
            const opts = fl.optionsFn ? fl.optionsFn(data) : fl.options || [];
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
              <select value={v} onChange={(e) => change(fl, e.target.value)}>
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
                {(typeof fl.required === "function" ? fl.required(data) : fl.required) && (
                  <span style={{ color: "var(--color-red)", marginLeft: 3 }}>*</span>
                )}
                {fl.type === "range" && <> · <span className="rv">{v}</span></>}
              </label>
              {ctl}
              {errors[fl.key] && (
                <div style={{ color: "var(--color-red)", fontSize: 11.5, marginTop: 5 }}>
                  {errors[fl.key]}
                </div>
              )}
            </div>
          );
        })}

        <div className="actions">
          <button className="btn ghost" onClick={closeForm}>
            Renunţ
          </button>
          <button className="btn" onClick={onSave}>
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
