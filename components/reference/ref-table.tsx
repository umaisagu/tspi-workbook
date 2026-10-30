import type { ReactNode } from "react";

/** A plain reference table (server component); scrolls sideways on small screens. */
export function RefTable({ head, rows, caption }: { head: string[]; rows: ReactNode[][]; caption?: string }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            {head.map((h) => (
              <th key={h} scope="col" className="px-2 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100 align-top last:border-0">
              {r.map((c, j) => (
                <td key={j} className="max-w-[28rem] whitespace-normal px-2 py-2 text-slate-800">
                  {c ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
