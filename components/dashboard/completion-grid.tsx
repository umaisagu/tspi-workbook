import Link from "next/link";
import type { FormType } from "@/generated/prisma/enums";
import type { MilestoneCompletion } from "@/lib/tsp/completion";
import { FORM_INFO } from "@/lib/forms";
import { StatusBadge } from "@/components/forms/status-badge";

/** Members × required individual forms, plus the team forms, for one milestone. */
export function CompletionGrid({
  teamId,
  result,
  names,
  linkMembers,
}: {
  teamId: string;
  result: MilestoneCompletion;
  names: Record<string, string>;
  /** Staff may open each member's individual forms. */
  linkMembers: boolean;
}) {
  const forms: FormType[] = [...new Set(result.members.flatMap((m) => m.forms.map((f) => f.form)))];
  return (
    <div className="space-y-4">
      {forms.length > 0 && (
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2 text-left font-medium">Member</th>
                {forms.map((f) => (
                  <th key={f} className="px-2 py-2 text-center font-medium">
                    {f === "SI" ? "FORM-SI" : f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.members.map((m) => (
                <tr key={m.memberId} className="border-b border-slate-100">
                  <td className="px-2 py-1 whitespace-nowrap">{names[m.memberId] ?? "Member"}</td>
                  {forms.map((f) => {
                    const s = m.forms.find((x) => x.form === f);
                    const badge = s ? <StatusBadge status={s.status} /> : "—";
                    return (
                      <td key={f} className="px-2 py-1 text-center">
                        {linkMembers && s ? <Link href={`/t/${teamId}/forms/${FORM_INFO[f].slug}?member=${m.memberId}`}>{badge}</Link> : badge}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {result.team.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Team forms</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {result.team.map((f) => (
              <li key={f.form} className="inline-flex items-center gap-1.5">
                <Link href={`/t/${teamId}/forms/${FORM_INFO[f.form].slug}`} className="hover:underline">
                  {f.form}
                </Link>
                <StatusBadge status={f.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
