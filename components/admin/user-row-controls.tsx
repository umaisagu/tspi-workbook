"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppRole } from "@/generated/prisma/enums";
import { Select, sendJson } from "@/components/ui/form";

export function UserRowControls({ userId, appRole, isActive, isSelf }: { userId: string; appRole: AppRole; isActive: boolean; isSelf: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function patch(body: { appRole?: AppRole; isActive?: boolean }) {
    setPending(true);
    setError(undefined);
    const r = await sendJson(`/api/users/${userId}`, "PATCH", body);
    setPending(false);
    if (!r.ok) setError(r.error);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="App role"
          value={appRole}
          disabled={pending || isSelf}
          onChange={(e) => patch({ appRole: e.target.value as AppRole })}
          className="w-auto"
        >
          <option value="STUDENT">Student</option>
          <option value="DEMONSTRATOR">Demonstrator</option>
          <option value="LECTURER">Lecturer</option>
        </Select>
        <label className="inline-flex items-center gap-1 text-sm">
          <input type="checkbox" checked={isActive} disabled={pending || isSelf} onChange={(e) => patch({ isActive: e.target.checked })} />
          Active
        </label>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
