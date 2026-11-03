"use client";

import Link from "next/link";
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

export interface RosterMilestone {
  id: string;
  code: string;
  /** In progress now. */
  current: boolean;
  /** Its matrix decides permissions now (the current one, or the fallback while the current one is empty). */
  applies: boolean;
  filled: boolean;
}

export function RosterManager({
  teamId,
  basePath,
  members,
  canManage,
  errors,
  warnings,
  milestones,
  milestoneId,
  load,
}: {
  teamId: string;
  /** Page path; the selected milestone is kept in ?ms= */
  basePath: string;
  members: RosterRow[];
  canManage: boolean;
  errors: string[];
  warnings: string[];
  milestones: RosterMilestone[];
  milestoneId: string | null;
  load: { name: string; counts: number[]; reading: string }[];
}) {
  const router = useRouter();
  const add = useSubmit();
  const [rowError, setRowError] = useState<string>();
  const [busy, setBusy] = useState<string>();

  async function toggleRole(m: RosterRow, role: TspiRole) {
    setRowError(undefined);
    setBusy(m.membershipId);
    const roles = m.roles.includes(role) ? m.roles.filter((r) => r !== role) : [...m.roles, role];
    const r = await sendJson(`/api/teams/${teamId}/members/${m.membershipId}/roles`, "PUT", { roles, milestoneId: milestoneId ?? undefined });
    setBusy(undefined);
    if (!r.ok) setRowError(r.error);
    router.refresh();
  }

  const selected = milestones.find((m) => m.id === milestoneId);
  const later = milestones.slice(milestones.findIndex((m) => m.id === milestoneId) + 1);

  async function copyForward() {
    if (!selected || later.length === 0) return;
    if (!confirm(`Copy the ${selected.code} roles to ${later.map((m) => m.code).join(", ")}? Roles already set there are replaced.`)) return;
    setRowError(undefined);
    setBusy("copy");
    const r = await sendJson(`/api/teams/${teamId}/roles/copy`, "POST", { fromMilestoneId: selected.id });
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
      {milestones.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Milestone" className="flex flex-wrap gap-1">
            {milestones.map((m) => (
              <Link
                key={m.id}
                href={`${basePath}?ms=${m.id}`}
                aria-current={m.id === milestoneId ? "page" : undefined}
                className={`rounded-md border px-3 py-1.5 text-sm ${m.id === milestoneId ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                {m.code}
                {m.current ? " · now" : ""}
                {!m.filled ? " · empty" : ""}
              </Link>
            ))}
          </nav>
          {canManage && later.length > 0 && (
            <Button variant="secondary" onClick={copyForward} disabled={busy === "copy"}>
              Copy {selected?.code} roles to later milestones
            </Button>
          )}
        </div>
      )}
      {selected && (
        <p className="text-sm text-slate-600">
          Roles for {selected.code}.{" "}
          {selected.applies
            ? "These roles decide who can do what in the app now."
            : selected.current
              ? "This milestone has no roles yet, so the roles of an earlier milestone apply until you assign them."
              : "They take effect when this milestone is in progress."}{" "}
          Six roles: one holder each, nobody holds more than two.
        </p>
      )}
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
                <th key={r.role} className="px-2 py-2 text-center font-medium" title={r.owns}>
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
                      aria-label={`${m.name}: ${r.label}${selected ? ` (${selected.code})` : ""}`}
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

      {load.length > 0 && milestones.length > 0 && (
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="min-w-full text-sm">
            <caption className="mb-1 text-left text-sm font-medium text-slate-700">Role load check (roles held per milestone)</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="px-4 py-2 font-medium sm:px-2">Member</th>
                {milestones.map((m) => (
                  <th key={m.id} className="px-2 py-2 text-center font-medium">
                    {m.code}
                  </th>
                ))}
                <th className="px-2 py-2 font-medium">Reading</th>
              </tr>
            </thead>
            <tbody>
              {load.map((l) => (
                <tr key={l.name} className="border-b border-slate-100">
                  <td className="px-4 py-1.5 sm:px-2">{l.name}</td>
                  {l.counts.map((c, j) => (
                    <td key={j} className={`px-2 py-1.5 text-center ${c === 0 || c > 2 ? "font-medium text-red-700" : ""}`}>
                      {c}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-slate-600">{l.reading}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
