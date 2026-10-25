/** Formatting only: never round values before financial calculations. */
export function formatSignedCurrency(value: number, maximumFractionDigits = 0): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(maximumFractionDigits));
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits,
  }).format(rounded === 0 ? 0 : value);
}

export function timeSavedLabel(months: number | null): string {
  if (months === null) return "—";
  if (months <= 0) return "0 months saved";
  return `${months} ${months === 1 ? "month" : "months"} saved`;
}

/** Display-only rounding; preserve unrounded profile conversions in calculations. */
export function paycheckInputDisplay(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(Number(value.toFixed(2)));
}
