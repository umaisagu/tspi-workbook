"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PeerData } from "@/lib/server/forms/team-forms";
import { PEER_CRITERIA, PEER_MAX } from "@/lib/tsp/peer";
import { Alert, Button, Select, sendJson } from "@/components/ui/form";
import { StatusBadge } from "./status-badge";

const dateFmt = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuching" });

type Draft = Record<string, { scores: Record<string, string>; comment: string }>;

/** PEER: the member rates themselves and each teammate on the rubric's 10 criteria (1–5). Private to them and the lecturer. */
export function PeerForm({
  teamId,
  data,
  canEdit,
  milestoneId,
  memberQuery = "",
}: {
  teamId: string;
  data: PeerData;
  canEdit: boolean;
  milestoneId: string;
  /** "&member=…" when the lecturer views a member's evaluation. */
  memberQuery?: string;
}) {
  const router = useRouter();
  const ms = data.milestones.find((m) => m.id === milestoneId);
  const build = (): Draft =>
    Object.fromEntries(
      data.members.map((m) => {
        const r = ms?.ratings.find((x) => x.evaluateeId === m.id);
        return [m.id, { scores: Object.fromEntries(PEER_CRITERIA.map((c) => [c.key, r ? String(r.scores[c.key] ?? "") : ""])), comment: r?.comment ?? "" }];
      }),
    );
  const [draft, setDraft] = useState<Draft>(build);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const [pending, setPending] = useState(false);

  if (!ms) return <Alert kind="info">No milestone collects PEER evaluations yet.</Alert>;

  const total = (id: string) => PEER_CRITERIA.reduce((s, c) => s + Number(draft[id]?.scores[c.key] || 0), 0);
  const filled = (id: string) => PEER_CRITERIA.every((c) => draft[id]?.scores[c.key]);

  async function save(submit: boolean) {
    setError(undefined);
    setSaved(undefined);
    const ready = data.members.filter((m) => filled(m.id));
    if (submit && ready.length !== data.members.length) return setError("Rate every criterion for yourself and each teammate before submitting.");
    if (ready.length === 0) return setError("Rate at least one member to save.");
    setPending(true);
    const r = await sendJson(`/api/teams/${teamId}/peer`, "PUT", {
      milestoneId: ms!.id,
      submit,
      ratings: ready.map((m) => ({ evaluateeId: m.id, scores: draft[m.id]!.scores, comment: draft[m.id]!.comment })),
    });
    setPending(false);
    if (!r.ok) return setError(r.error);
    setSaved(submit ? "Submitted." : "Draft saved.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Alert kind="info">Only you and the lecturer can see these ratings. Rate honestly: 1 is the lowest and 5 the highest level of the rubric.</Alert>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="mr-2 text-slate-600">Milestone</span>
          <Select value={milestoneId} className="w-auto" onChange={(e) => router.push(`?milestone=${e.target.value}${memberQuery}`)}>
            {data.milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} {m.title}
              </option>
            ))}
          </Select>
        </label>
        <StatusBadge status={ms.status} />
        <span className="text-sm text-slate-600">
          Due {dateFmt.format(new Date(ms.dueAt))}
          {ms.submittedAt && ` · submitted ${dateFmt.format(new Date(ms.submittedAt))}`}
        </span>
      </div>
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="px-2 py-2 text-left font-medium">Criterion</th>
              {data.members.map((m) => (
                <th key={m.id} className="px-2 py-2 text-center font-medium">
                  {m.self ? "Self" : m.name.split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PEER_CRITERIA.map((c) => (
              <tr key={c.key} className="border-b border-slate-100">
                <td className="px-2 py-1">
                  {c.label}
                  <span className="block text-xs text-slate-500">{c.hint}</span>
                </td>
                {data.members.map((m) => (
                  <td key={m.id} className="px-2 py-1 text-center">
                    <select
                      aria-label={`${c.label} for ${m.self ? "yourself" : m.name}`}
                      disabled={!canEdit}
                      className="w-14 rounded border border-slate-300 py-1"
                      value={draft[m.id]?.scores[c.key] ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, [m.id]: { ...draft[m.id]!, scores: { ...draft[m.id]!.scores, [c.key]: e.target.value } } })
                      }
                    >
                      <option value="" />
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="px-2 py-2">Total (out of {PEER_MAX})</td>
              {data.members.map((m) => (
                <td key={m.id} className="px-2 py-2 text-center">
                  {total(m.id)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-2 py-1 align-top">Comment (optional)</td>
              {data.members.map((m) => (
                <td key={m.id} className="px-2 py-1">
                  <textarea
                    aria-label={`Comment for ${m.self ? "yourself" : m.name}`}
                    disabled={!canEdit}
                    rows={3}
                    className="w-36 rounded border border-slate-300 px-1 py-1 text-xs"
                    value={draft[m.id]?.comment ?? ""}
                    onChange={(e) => setDraft({ ...draft, [m.id]: { ...draft[m.id]!, comment: e.target.value } })}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {error && <Alert>{error}</Alert>}
      {saved && <Alert kind="success">{saved}</Alert>}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save(true)} disabled={pending}>
            {ms.submittedAt ? "Update submitted evaluation" : "Submit evaluation"}
          </Button>
          <Button variant="secondary" onClick={() => save(false)} disabled={pending}>
            Save draft
          </Button>
        </div>
      )}
    </div>
  );
}
