"use client";

import { useId, useState } from "react";
import { niceTicks } from "./line-chart";

export interface BarSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

const H = 240;
const M = { top: 12, right: 12, bottom: 44, left: 36 };

/**
 * Grouped bar chart (one y-axis): bars rounded at the data end, 2px gaps between bars,
 * per-bar hover tooltip, legend and table view.
 */
export function BarChart({ title, categories, categoryTitles, series, unit = "" }: { title: string; categories: string[]; categoryTitles?: string[]; series: BarSeries[]; unit?: string }) {
  const id = useId();
  const [hover, setHover] = useState<{ c: number; s: number } | null>(null);
  const [table, setTable] = useState(false);
  const MIN_W = 480;
  const groupW = Math.max(series.length * 16 + 12, (MIN_W - M.left - M.right) / Math.max(categories.length, 1));
  const W = M.left + M.right + categories.length * groupW;
  const ticks = niceTicks(Math.max(1, ...series.flatMap((s) => s.values)));
  const max = ticks.at(-1) ?? 1;
  const ih = H - M.top - M.bottom;
  const y = (v: number) => M.top + ih - (v / max) * ih;
  const barW = Math.min(24, (groupW - 12 - (series.length - 1) * 2) / series.length);
  const groupInner = series.length * barW + (series.length - 1) * 2;

  if (categories.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>;

  return (
    <figure className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-sm font-semibold text-slate-900">{title}</figcaption>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
              {s.label}
            </span>
          ))}
          <button type="button" className="text-blue-700 hover:underline" onClick={() => setTable(!table)} aria-expanded={table} aria-controls={`${id}-table`}>
            {table ? "Hide table" : "Show table"}
          </button>
        </div>
      </div>
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="relative" style={{ minWidth: MIN_W, maxWidth: Math.max(W, 720) }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#e7e5e4" />
                <text x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="#52514e">
                  {t}
                </text>
              </g>
            ))}
            {categories.map((cat, c) => {
              const gx = M.left + c * groupW + (groupW - groupInner) / 2;
              return (
                <g key={cat}>
                  <title>{categoryTitles?.[c] ?? cat}</title>
                  {series.map((s, si) => {
                    const v = s.values[c] ?? 0;
                    const x = gx + si * (barW + 2);
                    const top = y(v);
                    const h = M.top + ih - top;
                    const r = Math.min(4, h, barW / 2);
                    const lifted = hover?.c === c && hover.s === si;
                    return (
                      <g key={s.key}>
                        {v > 0 && (
                          <path
                            d={`M${x},${M.top + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${M.top + ih} Z`}
                            fill={s.color}
                            opacity={hover && !lifted ? 0.55 : 1}
                          />
                        )}
                        <rect
                          x={x - 1}
                          y={M.top}
                          width={barW + 2}
                          height={ih}
                          fill="transparent"
                          onPointerEnter={() => setHover({ c, s: si })}
                          onPointerDown={() => setHover({ c, s: si })}
                          onPointerLeave={() => setHover(null)}
                        />
                      </g>
                    );
                  })}
                  <text x={gx + groupInner / 2} y={H - M.bottom + 14} textAnchor="middle" fontSize="11" fill="#52514e">
                    {cat}
                  </text>
                </g>
              );
            })}
            <line x1={M.left} x2={W - M.right} y1={M.top + ih} y2={M.top + ih} stroke="#a8a29e" />
          </svg>
          {hover && (
            <div
              className="pointer-events-none absolute top-2 z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
              style={{ left: `${((M.left + hover.c * groupW + groupW / 2) / W) * 100}%`, transform: "translateX(-50%)" }}
            >
              <div className="font-semibold text-slate-900">{categoryTitles?.[hover.c] ?? categories[hover.c]}</div>
              {series.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-3 text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-medium text-slate-900">
                    {s.values[hover.c] ?? 0}
                    {unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {table && (
        <div id={`${id}-table`} className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="px-2 py-1" />
                {series.map((s) => (
                  <th key={s.key} className="px-2 py-1 text-right">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((c, i) => (
                <tr key={c} className="border-b border-slate-100">
                  <td className="px-2 py-1">{categoryTitles?.[i] ?? c}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-2 py-1 text-right">
                      {s.values[i] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
