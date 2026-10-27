"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select } from "@/components/ui/form";

/** Staff choose whose individual form to view. */
export function MemberPicker({ members, current }: { members: { membershipId: string; name: string }[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <label className="text-sm">
      <span className="mr-2 text-slate-600">Member</span>
      <Select value={current} onChange={(e) => router.push(`${pathname}?member=${e.target.value}`)} className="w-auto">
        {members.map((m) => (
          <option key={m.membershipId} value={m.membershipId}>
            {m.name}
          </option>
        ))}
      </Select>
    </label>
  );
}
