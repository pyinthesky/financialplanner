export type PrintPortfolioSeriesKey =
  | "traditional"
  | "taxable"
  | "roth"
  | "cash"
  | "hsa";

export interface PrintPortfolioRow {
  age: number;
  traditional: number;
  taxable: number;
  roth: number;
  cash: number;
  hsa: number;
}

export const PRINT_PORTFOLIO_SERIES: ReadonlyArray<{
  key: PrintPortfolioSeriesKey;
  label: string;
  color: string;
}> = [
  { key: "traditional", label: "Tax-Deferred", color: "#11a68a" },
  { key: "taxable", label: "Taxable", color: "#2f7df4" },
  { key: "roth", label: "Roth", color: "#8567e8" },
  { key: "cash", label: "Cash", color: "#e8a82b" },
  { key: "hsa", label: "HSA", color: "#dc5d79" },
];

const niceCeiling = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
};

export function buildPrintPortfolioChart(
  rows: readonly PrintPortfolioRow[],
  width = 820,
  height = 270,
) {
  const plot = {
    left: 68,
    right: width - 16,
    top: 12,
    bottom: height - 38,
  };
  const plotWidth = Math.max(1, plot.right - plot.left);
  const plotHeight = Math.max(1, plot.bottom - plot.top);
  const totals = rows.map((row) =>
    PRINT_PORTFOLIO_SERIES.reduce(
      (sum, series) => sum + Math.max(0, row[series.key] || 0),
      0,
    ),
  );
  const maxValue = niceCeiling(Math.max(0, ...totals));
  const xPositions = rows.map((_, index) =>
    plot.left + (rows.length <= 1 ? 0 : (index / (rows.length - 1)) * plotWidth),
  );
  const y = (value: number) =>
    plot.bottom - (Math.max(0, value) / maxValue) * plotHeight;
  const cumulative = rows.map(() => 0);
  const polygons = PRINT_PORTFOLIO_SERIES.map((series) => {
    const baseline = cumulative.slice();
    const top = rows.map((row, index) => {
      cumulative[index] += Math.max(0, row[series.key] || 0);
      return cumulative[index];
    });
    const topPoints = top
      .map((value, index) => `${xPositions[index].toFixed(2)},${y(value).toFixed(2)}`)
      .join(" ");
    const bottomPoints = baseline
      .map((value, index) => `${xPositions[index].toFixed(2)},${y(value).toFixed(2)}`)
      .reverse()
      .join(" ");
    return {
      ...series,
      points: `${topPoints} ${bottomPoints}`.trim(),
      topPoints,
    };
  });
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    return {
      value: maxValue * (1 - ratio),
      y: plot.top + ratio * plotHeight,
    };
  });
  const ageTickIndexes = [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])]
    .filter((index) => index >= 0 && index < rows.length);

  return {
    width,
    height,
    plot,
    maxValue,
    xPositions,
    gridLines,
    ageTicks: ageTickIndexes.map((index) => ({
      age: rows[index].age,
      x: xPositions[index],
    })),
    polygons,
  };
}
