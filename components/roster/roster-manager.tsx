"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TspiRole } from "@/generated/prisma/enums";
import { Alert, Button, Field, Input, sendJson, useSubmit } from "@/components/ui/form";
import { TSPI_ROLES } from "@/lib/tsp/roles";

export interface RosterRow {
  membershipId: string;
  name: string;
  email: string;
  roles: TspiRole[];
  isSelf: boolean;
}

export function RosterManager({
  teamId,
  members,
  canManage,
  errors,
  warnings,
}: {
  teamId: string;
  members: RosterRow[];
  canManage: boolean;
  errors: string[];
  warnings: string[];
}) {
  const router = useRouter();
  const add = useSubmit();
  const [rowError, setRowError] = useState<string>();
  const [busy, setBusy] = useState<string>();

  async function toggleRole(m: RosterRow, role: TspiRole) {
    setRowError(undefined);
    setBusy(m.membershipId);
    const roles = m.roles.includes(role) ? m.roles.filter((r) => r !== role) : [...m.roles, role];
    const r = await sendJson(`/api/teams/${teamId}/members/${m.membershipId}/roles`, "PUT", { roles });
    setBusy(undefined);
    if (!r.ok) setRowError(r.error);
    router.refresh();
  }

  async function remove(m: RosterRow) {
    if (!confirm(`Remove ${m.name} from the team? Their records stay with the team.`)) return;
    setRowError(undefined);
    setBusy(m.membershipId);
    const r = await sendJson(`/api/teams/${teamId}/members/${m.membershipId}`, "DELETE");
    setBusy(undefined);
    if (!r.ok) setRowError(r.error);
    router.refresh();
  }

  async function onAdd(formData: FormData) {
    const r = await add.run(() => sendJson(`/api/teams/${teamId}/members`, "POST", { email: formData.get("email") }));
    if (r.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      {errors.map((e) => (
        <Alert key={e}>{e}</Alert>
      ))}
      {warnings.length > 0 && (
        <Alert kind="warning">
          <ul className="list-disc pl-4">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Alert>
      )}
      {rowError && <Alert>{rowError}</Alert>}

      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="px-4 py-2 font-medium sm:px-2">Member</th>
              {TSPI_ROLES.map((r) => (
                <th key={r.role} className="px-2 py-2 text-center font-medium" title={r.projectRole}>
                  {r.label}
                </th>
              ))}
              {canManage && <th className="px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.membershipId} className="border-b border-slate-100">
                <td className="px-4 py-2 sm:px-2">
                  <div className="font-medium text-slate-900">
                    {m.name} {m.isSelf && <span className="text-xs text-slate-500">(you)</span>}
                  </div>
                  <div className="text-xs text-slate-500">{m.email}</div>
                </td>
                {TSPI_ROLES.map((r) => (
                  <td key={r.role} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${m.name}: ${r.label}`}
                      className="h-5 w-5"
                      checked={m.roles.includes(r.role)}
                      disabled={!canManage || busy === m.membershipId}
                      onChange={() => toggleRole(m, r.role)}
                    />
                  </td>
                ))}
                {canManage && (
                  <td className="px-2 py-2 text-right">
                    <Button variant="secondary" onClick={() => remove(m)} disabled={busy === m.membershipId}>
                      Remove
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-slate-500">
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canManage && (
        <form action={onAdd} className="flex flex-col gap-2 sm:flex-row sm:items-end" noValidate>
          <div className="flex-1">
            <Field label="Add a member by UNIMAS e-mail" error={add.fields.email ?? (add.error && !Object.keys(add.fields).length ? [add.error] : undefined)}>
              <Input name="email" type="email" placeholder="matricno@siswa.unimas.my" invalid={!!add.fields.email} />
            </Field>
          </div>
          <Button type="submit" disabled={add.pending}>
            {add.pending ? "Adding…" : "Add member"}
          </Button>
        </form>
      )}
    </div>
  );
}
