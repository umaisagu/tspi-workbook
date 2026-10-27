"use client";

import { useId, useRef, useState } from "react";

export interface LineSeries {
  key: string;
  label: string;
  /** Categorical slot colour (reference palette, light mode). */
  color: string;
  dashed?: boolean;
  /** One value per x position; null = no point. */
  values: (number | null)[];
}

/** Reference palette (dataviz skill), categorical slots 1–2, light mode. */
export const SERIES_COLORS = { blue: "#2a78d6", orange: "#eb6834" } as const;

const W = 640;
const H = 260;
const M = { top: 12, right: 96, bottom: 28, left: 44 };

/** Axis ticks on a 1-2-5 step, about five intervals, from 0 to at least `v`. */
export function niceTicks(v: number): number[] {
  if (v <= 0) return [0, 0.25, 0.5, 0.75, 1];
  const raw = v / 5;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  const top = Math.ceil(v / step - 1e-9) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Math.round(i * step * 1e6) / 1e6);
}

/**
 * Line chart with one y-axis: legend, direct end labels, recessive grid, crosshair tooltip
 * snapping to the nearest x, and a table view.
 */
export function LineChart({
  title,
  xLabels,
  series,
  formatY,
  yMax,
  markerX,
  markerLabel,
}: {
  title: string;
  xLabels: string[];
  series: LineSeries[];
  formatY: (v: number) => string;
  yMax?: number;
  /** Index of a vertical reference line (e.g. the current week). */
  markerX?: number;
  markerLabel?: string;
}) {
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  const n = xLabels.length;
  const ticks = yMax !== undefined ? [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax) : niceTicks(Math.max(0, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null))));
  const max = ticks.at(-1) ?? 1;
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = (i: number) => M.left + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => M.top + ih - (Math.min(v, max) / max) * ih;

  function path(values: (number | null)[]): string {
    let d = "";
    let pen = false;
    values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  }

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.left) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  const lastIndex = (vals: (number | null)[]) => {
    for (let i = vals.length - 1; i >= 0; i--) if (vals[i] !== null) return i;
    return -1;
  };

  return (
    <figure className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-sm font-semibold text-slate-900">{title}</figcaption>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <svg width="18" height="6" aria-hidden>
                <line x1="0" y1="3" x2="18" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} />
              </svg>
              {s.label}
            </span>
          ))}
          <button type="button" className="text-blue-700 hover:underline" onClick={() => setTable(!table)} aria-expanded={table} aria-controls={`${id}-table`}>
            {table ? "Hide table" : "Show table"}
          </button>
        </div>
      </div>
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="relative min-w-[520px]">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#e7e5e4" strokeWidth="1" />
                <text x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="#52514e">
                  {formatY(t)}
                </text>
              </g>
            ))}
            {xLabels.map((l, i) =>
              n <= 16 || i % 2 === 0 ? (
                <text key={l} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#52514e">
                  {l}
                </text>
              ) : null,
            )}
            {markerX !== undefined && markerX >= 0 && markerX < n && (
              <g>
                <line x1={x(markerX)} x2={x(markerX)} y1={M.top} y2={M.top + ih} stroke="#a8a29e" strokeDasharray="2 3" />
                {markerLabel && (
                  <text x={x(markerX) + 4} y={M.top + 10} fontSize="10" fill="#52514e">
                    {markerLabel}
                  </text>
                )}
              </g>
            )}
            {series.map((s) => (
              <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeDasharray={s.dashed ? "6 4" : undefined} />
            ))}
            {series.map((s) => {
              const li = lastIndex(s.values);
              const v = li >= 0 ? s.values[li] : null;
              if (v === null || v === undefined) return null;
              return (
                <g key={`${s.key}-end`}>
                  <circle cx={x(li)} cy={y(v)} r="4" fill={s.color} stroke="#ffffff" strokeWidth="2" />
                  <text x={x(li) + 8} y={y(v)} dy="0.32em" fontSize="11" fill="#0b0b0b">
                    {s.label}: {formatY(v)}
                  </text>
                </g>
              );
            })}
            {hover !== null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + ih} stroke="#52514e" strokeWidth="1" />
                {series.map((s) => {
                  const v = s.values[hover];
                  return v === null || v === undefined ? null : <circle key={s.key} cx={x(hover)} cy={y(v)} r="4" fill={s.color} stroke="#ffffff" strokeWidth="2" />;
                })}
              </g>
            )}
            <rect
              x={M.left}
              y={M.top}
              width={iw}
              height={ih}
              fill="transparent"
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
              style={{ left: `${(x(hover) / W) * 100}%`, transform: x(hover) > W / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)" }}
            >
              <div className="mb-1 font-semibold text-slate-900">{xLabels[hover]}</div>
              {series.map((s) => {
                const v = s.values[hover];
                return (
                  <div key={s.key} className="flex items-center justify-between gap-3 text-slate-700">
                    <span className="inline-flex items-center gap-1.5">
                      <svg width="12" height="4" aria-hidden>
                        <line x1="0" y1="2" x2="12" y2="2" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "3 2" : undefined} />
                      </svg>
                      {s.label}
                    </span>
                    <span className="font-medium text-slate-900">{v === null || v === undefined ? "—" : formatY(v)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {table && (
        <div id={`${id}-table`} className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="px-2 py-1">Week</th>
                {series.map((s) => (
                  <th key={s.key} className="px-2 py-1 text-right">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {xLabels.map((l, i) => (
                <tr key={l} className="border-b border-slate-100">
                  <td className="px-2 py-1">{l}</td>
                  {series.map((s) => {
                    const v = s.values[i];
                    return (
                      <td key={s.key} className="px-2 py-1 text-right">
                        {v === null || v === undefined ? "—" : formatY(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
