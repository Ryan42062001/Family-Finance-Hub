"use client";
import { useState } from "react";

// A number box with a "$" or "%" marker and a live, friendly hint. It submits exactly what is typed, under the
// same field name as before; the hint is display only and never sent to the server.
type Props = {
  name: string;
  label: string;
  example?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
  unit?: "money" | "percent";
  period?: "month" | "year";
  placeholder?: string;
};

const dollars = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

function hintFor(raw: string, period?: "month" | "year"): string | null {
  if (!raw.trim()) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  if (period === "month") return `That's ${dollars(value * 12)} a year`;
  if (period === "year") return `About ${dollars(value / 12)} a month`;
  return null;
}

export default function NumberField({ name, label, example, defaultValue, required = false, min = "0", max, step = "0.01", unit = "money", period, placeholder }: Props) {
  const initial = defaultValue === null || defaultValue === undefined ? "" : String(defaultValue);
  const [value, setValue] = useState(initial);
  const hint = unit === "money" ? hintFor(value, period) : null;
  return <label className="field">
    <span className="field-label">{label}</span>
    <span className={`field-affix field-affix-${unit}`}>
      {unit === "money" ? <span className="field-prefix" aria-hidden="true">$</span> : null}
      <input name={name} type="number" inputMode="decimal" min={min} max={max} step={step} required={required}
        defaultValue={initial} placeholder={placeholder ?? (required ? "0" : "Leave blank if unknown")}
        onChange={(event) => setValue(event.target.value)} />
      {unit === "percent" ? <span className="field-suffix" aria-hidden="true">%</span> : null}
    </span>
    {hint ? <small className="field-hint" aria-live="polite">{hint}</small> : example ? <small className="field-hint">{example}</small> : null}
  </label>;
}
