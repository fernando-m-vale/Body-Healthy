// RF07 (Spec 01, seção 4 passo 7) — margem de tolerância sugerida na spec: variação <5% = "stable"
const STABLE_THRESHOLD_PCT = 0.05;

export type Trend = "up" | "down" | "stable";

export function calculateTrend(currentValue: number, previousValue: number): Trend {
  if (previousValue === 0) {
    return currentValue === 0 ? "stable" : "up";
  }

  const changeRatio = (currentValue - previousValue) / Math.abs(previousValue);

  if (Math.abs(changeRatio) < STABLE_THRESHOLD_PCT) {
    return "stable";
  }

  return changeRatio > 0 ? "up" : "down";
}
