export function remainingContributionMonths(asOfDate: string | null, taxYear: number): number {
  if (!asOfDate) return 12;
  const date = new Date(`${asOfDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== taxYear) return 12;
  return 12 - date.getUTCMonth();
}
