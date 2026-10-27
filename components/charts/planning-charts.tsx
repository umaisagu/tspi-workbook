"use client";

import { LineChart } from "./line-chart";
import { SERIES_COLORS } from "./colors";

interface WeekPoint {
  week: number;
  cumPlanHours: number;
  cumActualHours: number;
  cumPlannedValue: number;
  cumEarnedValue: number;
  cumPredictedEarnedValue: number | null;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const hrs = (v: number) => `${Math.round(v)} h`;

/** Workbook PROJECT charts: cumulative planned vs earned (and predicted) value, and planned vs actual hours. */
export function PlanningCharts({ weeks, currentWeek }: { weeks: WeekPoint[]; currentWeek: number }) {
  const labels = weeks.map((w) => `W${w.week}`);
  const ci = weeks.findIndex((w) => w.week === currentWeek);
  const upToNow = <T,>(i: number, v: T) => (weeks[i]!.week <= currentWeek ? v : null);
  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <LineChart
        title="Cumulative planned vs earned value"
        xLabels={labels}
        yMax={1}
        formatY={pct}
        markerX={ci}
        markerLabel="Now"
        series={[
          { key: "pv", label: "Planned", color: SERIES_COLORS.blue, values: weeks.map((w) => w.cumPlannedValue) },
          { key: "ev", label: "Earned", color: SERIES_COLORS.orange, values: weeks.map((w, i) => upToNow(i, w.cumEarnedValue)) },
          {
            key: "pred",
            label: "Predicted",
            color: SERIES_COLORS.orange,
            dashed: true,
            // starts at the current week so the dashed line continues the earned line
            values: weeks.map((w) => (w.week === currentWeek ? w.cumEarnedValue : w.cumPredictedEarnedValue)),
          },
        ]}
      />
      <LineChart
        title="Cumulative planned vs actual hours"
        xLabels={labels}
        formatY={hrs}
        markerX={ci}
        markerLabel="Now"
        series={[
          { key: "plan", label: "Planned", color: SERIES_COLORS.blue, values: weeks.map((w) => w.cumPlanHours) },
          { key: "actual", label: "Actual", color: SERIES_COLORS.orange, values: weeks.map((w, i) => upToNow(i, w.cumActualHours)) },
        ]}
      />
    </div>
  );
}
