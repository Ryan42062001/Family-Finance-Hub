// Display-only helper for the dashboard assets-vs-debt bar. It never changes the totals shown as text;
// it only decides whether a proportional bar can be drawn honestly.
export type BalanceBar =
  | { kind: "empty" } // nothing recorded: neutral track, no red
  | { kind: "unavailable" } // a negative or invalid amount: a ratio would mislead, so no bar
  | { kind: "share"; assetShare: number }; // 0..1 share of assets in (assets + debt)

export function balanceBar(assets: number, debt: number): BalanceBar {
  if (!Number.isFinite(assets) || !Number.isFinite(debt) || assets < 0 || debt < 0) return { kind: "unavailable" };
  const total = assets + debt;
  if (total === 0) return { kind: "empty" };
  return { kind: "share", assetShare: assets / total };
}
