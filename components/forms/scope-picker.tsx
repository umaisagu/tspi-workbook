"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select } from "@/components/ui/form";

/** SUMP/SUMQ assembly selector: SYSTEM or one component (workbook Assembly Selector Control). */
export function ScopePicker({ scopes, current }: { scopes: { id: string; name: string }[]; current: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <label className="text-sm">
      <span className="mr-2 text-slate-600">Assembly</span>
      <Select value={current ?? ""} onChange={(e) => router.push(e.target.value ? `${pathname}?component=${e.target.value}` : pathname)} className="w-auto">
        <option value="">SYSTEM</option>
        {scopes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
    </label>
  );
}
