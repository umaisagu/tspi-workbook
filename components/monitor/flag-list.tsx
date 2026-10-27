"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FlagStatus, FlagType } from "@/generated/prisma/enums";
import { FLAG_LABELS } from "@/lib/monitoring/flags";
import { Badge } from "@/components/ui/card";
import { Button, sendJson } from "@/components/ui/form";

export interface FlagItem {
  memberId: string;
  memberName: string;
  type: FlagType;
  periodKey: string;
  summary: string;
  evidence: string[];
  status: FlagStatus;
  history: { status: FlagStatus; reason: string | null; by: string; at: string }[];
  teamId?: string;
  teamName?: string;
}

const dateFmt = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuching" });
const STATUS_TONE: Record<FlagStatus, "amber" | "green" | "slate"> = { OPEN: "amber", REVIEWED: "green", DISMISSED: "slate" };
const STATUS_LABEL: Record<FlagStatus, string> = { OPEN: "Open", REVIEWED: "Reviewed", DISMISSED: "Dismissed" };

function FlagCard({ f, canReview, showTeam }: { f: FlagItem; canReview: boolean; showTeam: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function review(status: FlagStatus) {
    setPending(true);
    setError(undefined);
    const r = await sendJson("/api/monitor/flags/review", "POST", { membershipId: f.memberId, type: f.type, periodKey: f.periodKey, status, reason });
    setPending(false);
    if (!r.ok) return setError(r.fields?.reason?.[0] ?? r.error);
    setReason("");
    router.refresh();
  }

  return (
    <li className="rounded-md border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone="amber">{FLAG_LABELS[f.type]}</Badge>
          <span className="font-medium">{f.memberName}</span>
          {showTeam && f.teamId && (
            <Link href={`/monitor/teams/${f.teamId}`} className="text-blue-700 hover:underline">
              {f.teamName}
            </Link>
          )}
          <span className="text-slate-500">{f.periodKey}</span>
        </div>
        <Badge tone={STATUS_TONE[f.status]}>{STATUS_LABEL[f.status]}</Badge>
      </div>
      <p className="mt-1 text-sm font-medium text-slate-800">{f.summary}</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
        {f.evidence.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
      {f.history.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
          {f.history.map((h) => (
            <li key={h.at}>
              {STATUS_LABEL[h.status]} by {h.by}, {dateFmt.format(new Date(h.at))}
              {h.reason ? ` — ${h.reason}` : ""}
            </li>
          ))}
        </ul>
      )}
      {canReview && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            aria-label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason / follow-up (required to dismiss)"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          {f.status === "OPEN" ? (
            <>
              <Button variant="secondary" onClick={() => review("REVIEWED")} disabled={pending}>
                Mark reviewed
              </Button>
              <Button variant="secondary" onClick={() => review("DISMISSED")} disabled={pending}>
                Dismiss
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => review("OPEN")} disabled={pending}>
              Reopen
            </Button>
          )}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}

/** Contribution flags with their evidence; prompts for review, never an automatic grade. */
export function FlagList({ flags, canReview, showTeam = false, emptyText = "No flags." }: { flags: FlagItem[]; canReview: boolean; showTeam?: boolean; emptyText?: string }) {
  if (flags.length === 0) return <p className="text-sm text-slate-600">{emptyText}</p>;
  return (
    <ul className="space-y-3">
      {flags.map((f) => (
        <FlagCard key={`${f.memberId}|${f.type}|${f.periodKey}`} f={f} canReview={canReview} showTeam={showTeam} />
      ))}
    </ul>
  );
}
