type MonthLike = {
  yearMonth: string;
};

function compareYearMonthAsc(a: string, b: string) {
  return a.localeCompare(b);
}

export function getSortedYearMonths<T extends MonthLike>(
  months: T[],
): string[] {
  return [...months]
    .map((m) => m.yearMonth)
    .filter(Boolean)
    .sort(compareYearMonthAsc);
}

export function getAdjacentYearMonths(
  yearMonths: string[],
  currentYearMonth: string,
) {
  const index = yearMonths.indexOf(currentYearMonth);

  if (index === -1) {
    return {
      previousYearMonth: null,
      nextYearMonth: null,
      canGoPrevious: false,
      canGoNext: false,
    };
  }

  const previousYearMonth = index > 0 ? yearMonths[index - 1] : null;
  const nextYearMonth =
    index >= 0 && index < yearMonths.length - 1 ? yearMonths[index + 1] : null;

  return {
    previousYearMonth,
    nextYearMonth,
    canGoPrevious: !!previousYearMonth,
    canGoNext: !!nextYearMonth,
  };
}
