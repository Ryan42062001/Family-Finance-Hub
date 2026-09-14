const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function remainingContributionMonths(asOfDate: string | null, taxYear: number): number {
  if (!asOfDate) return 12;
  const match = ISO_DATE_PATTERN.exec(asOfDate);
  if (!match) return 12;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    year !== taxYear
    || month < 1
    || month > 12
    || day < 1
    || day > daysInMonth(year, month)
  ) return 12;

  return 13 - month;
}