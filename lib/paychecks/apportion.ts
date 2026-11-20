// FFH-P12 exact-cent proportional apportionment (issue #203 §6E). Pure.
//
// Splits a monthly amount in integer cents across weighted parts (the month's expected deposits, weighted by their
// expected net amounts) with deterministic largest-remainder rounding:
//   1. validate the amount and every weight (safe nonnegative integers, unique keys);
//   2. exact shares total * weight / sum(weights) in BigInt (no floating point);
//   3. floor each share to the cent;
//   4. give the leftover cents, one each, to the largest fractional remainders;
//   5. break ties by the caller's stable order (date, then source identity);
//   6. assert the shares sum exactly to the original amount.
// Zero total weight (no deposit, or only $0 deposits) cannot carry a share: the result is null, never invented shares.

// BigInt(n) rather than literals: the project's TypeScript target predates BigInt literal syntax.
const ZERO = BigInt(0);
const ONE = BigInt(1);

export type Weighted = { key: string; weight: number };

function assertCents(value: number, what: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`Invalid ${what}`);
}

export function apportionCents(totalCents: number, parts: Weighted[]): Map<string, number> | null {
  assertCents(totalCents, "amount");
  const keys = new Set<string>();
  let sum = ZERO;
  for (const part of parts) {
    assertCents(part.weight, "weight");
    if (keys.has(part.key)) throw new RangeError("Duplicate apportionment key");
    keys.add(part.key);
    sum += BigInt(part.weight);
  }
  if (sum === ZERO) return null;
  const total = BigInt(totalCents);
  const rows = parts.map((part, order) => {
    const exact = total * BigInt(part.weight);
    return { key: part.key, order, share: exact / sum, remainder: exact % sum };
  });
  let leftover = total - rows.reduce((acc, row) => acc + row.share, ZERO);
  const byRemainder = [...rows].sort((a, b) => (a.remainder === b.remainder ? a.order - b.order : a.remainder > b.remainder ? -1 : 1));
  for (const row of byRemainder) {
    if (leftover === ZERO) break;
    row.share += ONE;
    leftover -= ONE;
  }
  if (leftover !== ZERO || rows.reduce((acc, row) => acc + row.share, ZERO) !== total) throw new Error("Apportionment does not sum to the amount");
  return new Map(rows.map((row) => [row.key, Number(row.share)]));
}
