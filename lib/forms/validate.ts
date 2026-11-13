// Money and percentage parsing shared by the Financial profile forms and the guided
// setup (FFH-P05), so both enforce exactly the same rules. Moved unchanged from
// app/financial-profile/actions.ts. Invalid input throws; nothing is guessed.

export function amount(formData: FormData, key: string, { min = 0, required = true } = {}) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw && !required) return null;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) throw new Error(`Invalid ${key}`);
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > 999999999999.99) throw new Error(`Invalid ${key}`);
  return Math.round(value * 100) / 100;
}

export function percent(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  if (!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) throw new Error(`Invalid ${key}`);
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`Invalid ${key}`);
  return Math.round(value * 10000) / 10000;
}
