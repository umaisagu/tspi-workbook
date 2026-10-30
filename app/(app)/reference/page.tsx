import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { FormType } from "@/generated/prisma/enums";
import { AVAILABLE_FORMS, FORM_INFO } from "@/lib/forms";
import { REFERENCE_FILES, WORKBOOK } from "@/lib/reference/workbook";
import { currentTeamFor } from "@/lib/server/teams";
import { requirePageUser } from "@/lib/server/viewer";
import { PHASES } from "@/lib/tsp/phases";
import { deltaMinutes, parseClock } from "@/lib/tsp/time";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { RefTable } from "@/components/reference/ref-table";

export const metadata: Metadata = { title: "Reference" };

const SECTIONS = [
  ["downloads", "Downloads"],
  ["milestones", "Milestones"],
  ["manual", "How to run the process"],
  ["sample", "Worked sample: team AUV"],
  ["roles", "Roles"],
  ["phases", "Phases"],
  ["defect-types", "Defect types"],
  ["planning", "Planning guidelines"],
  ["quality", "Quality guidelines"],
  ["troubleshooting", "Things that go wrong"],
] as const;

/** Workbook sheet name → app form, for the forms the app already has. */
function appForm(sheet: string): FormType | undefined {
  const form = (sheet === "FORM-SI" ? "SI" : sheet) as FormType;
  return AVAILABLE_FORMS.includes(form) ? form : undefined;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const yn = (v: string) => (v === "Y" ? "Yes" : v === "N" ? "No" : v);

export default async function ReferencePage() {
  const user = await requirePageUser();
  const current = await currentTeamFor(user);
  const teamId = current?.team.id;
  const appPhases = new Set<string>(PHASES.map((p) => p.code));
  const s = WORKBOOK.sample;
  const m = WORKBOOK.manual;

  const formCell = (sheet: string): ReactNode => {
    const form = appForm(sheet);
    if (!form) return (
      <span className="whitespace-nowrap">
        {sheet} <Badge>workbook only for now</Badge>
      </span>
    );
    return teamId ? (
      <Link href={`/t/${teamId}/forms/${FORM_INFO[form].slug}`} className="whitespace-nowrap font-medium text-blue-700 underline">
        {sheet}
      </Link>
    ) : (
      <span className="whitespace-nowrap font-medium">{sheet}</span>
    );
  };

  const delta = (start: unknown, stop: unknown, interrupt: unknown) => {
    const a = typeof start === "string" ? parseClock(start) : null;
    const b = typeof stop === "string" ? parseClock(stop) : null;
    if (a === null || b === null) return null;
    try {
      return deltaMinutes({ startMin: a, stopMin: b, interruptMin: Number(interrupt ?? 0) });
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reference"
        subtitle={
          <>
            {WORKBOOK.title.replace(/\s+-\s+/, " · ")}. {WORKBOOK.subtitle}. Prepared by {WORKBOOK.author}.
          </>
        }
      />

      <nav aria-label="On this page" className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <ol className="grid gap-1 sm:grid-cols-2 lg:grid-cols-5">
          {SECTIONS.map(([id, label], i) => (
            <li key={id}>
              <a href={`#${id}`} className="text-blue-700 underline">
                {i + 1}. {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="downloads" className="scroll-mt-4">
        <Card title="Downloads">
          <p className="mb-3 text-sm text-slate-600">
            The app follows your lecturer&apos;s TSPi Team Workbook v3.0. Download the workbook for the full manual, and the worked sample to see
            what a complete record looks like. In the sample, all names, matric numbers, emails, phone numbers and the client are fictional.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(REFERENCE_FILES).map(([key, f]) => (
              <a key={key} href={`/api/reference/${key}`} className="block rounded-md border border-slate-200 p-3 hover:bg-slate-50" download>
                <span className="block font-medium text-blue-700 underline">{f.label}</span>
                <span className="text-xs text-slate-500">{f.file} · Excel</span>
              </a>
            ))}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            {WORKBOOK.about
              .filter((a) => ["What this is", "Honesty clause"].includes(a.label))
              .map((a) => (
                <div key={a.label}>
                  <dt className="font-medium">{a.label}</dt>
                  <dd className="text-slate-700">{a.text}</dd>
                </div>
              ))}
          </dl>
        </Card>
      </section>

      <section id="milestones" className="scroll-mt-4 space-y-4">
        <Card title="Milestones">
          <RefTable
            caption="Milestones"
            head={["", "Milestone", "Week", "Due", "Weight", "Key deliverables"]}
            rows={WORKBOOK.milestones.map((x) => [x.id, x.name, x.week, x.due, pct(x.weight), x.deliverables])}
          />
          <h3 className="mb-2 mt-5 text-sm font-semibold">Course thresholds (cumulative, by milestone)</h3>
          <RefTable
            caption="Course thresholds"
            head={["Threshold", ...WORKBOOK.thresholds.columns, "Notes"]}
            rows={WORKBOOK.thresholds.rows.map((r) => [
              r.label,
              ...r.values.map((v) => (typeof v === "number" && v > 0 && v < 1 ? pct(v) : v)),
              r.note,
            ])}
          />
        </Card>
      </section>

      <section id="manual" className="scroll-mt-4 space-y-4">
        <Card title="How to run the process">
          <dl className="mb-4 space-y-2 text-sm">
            {m.intro.map((a) => (
              <div key={a.label}>
                <dt className="font-medium">{a.label}</dt>
                <dd className="text-slate-700">{a.text}</dd>
              </div>
            ))}
          </dl>
          <p className="mb-3 text-sm text-slate-600">
            Form names link to the form in this app. Forms marked <Badge>workbook only for now</Badge> are coming to the app; until then keep
            them in the workbook.
          </p>
          {m.stages.map((stage) => (
            <div key={stage.title} className="mt-5">
              <h3 className="mb-2 text-sm font-semibold">{stage.title.replace(/^\d+\.\s+/, "")}</h3>
              <RefTable
                caption={stage.title}
                head={["#", "Step", "What to do", "Form", "Who / when"]}
                rows={stage.steps.map((x) => [x.n, <span key="s" className="font-medium">{x.step}</span>, x.what, formCell(x.form), x.who])}
              />
            </div>
          ))}
          <h3 className="mb-2 mt-6 text-sm font-semibold">Every form, and what it is for</h3>
          <RefTable caption="Forms" head={["Form", "What it holds", "Who owns it", "Feeds into"]} rows={m.forms.map((f) => [formCell(f.form), f.holds, f.owner, f.feeds])} />
          <h3 className="mb-2 mt-6 text-sm font-semibold">Worked examples</h3>
          <RefTable caption="Worked examples" head={["Situation", "What you record"]} rows={m.examples.map((x) => [x.situation, x.record])} />
          <p className="mt-4 text-sm italic text-slate-600">{m.closing}</p>
        </Card>
      </section>

      <section id="sample" className="scroll-mt-4 space-y-4">
        <Card title={`Worked sample: team ${s.team.name}`}>
          <p className="mb-3 text-sm text-slate-600">{s.note}</p>
          <dl className="mb-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {(
              [
                ["Project", s.team.project],
                ["Client", s.team.client],
                ["Repository", s.team.repository],
                ["Lab group", s.team.labGroup],
                ["Demonstrator", s.team.demonstrator],
                ["Team size", s.team.size],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-28 shrink-0 text-slate-500">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mb-2 text-sm font-semibold">FORM-SI: members and roles (one member holds two roles)</h3>
          <RefTable
            caption="Sample members"
            head={["Matric", "Name", "GitHub", "Primary role", "Secondary role"]}
            rows={s.members.map((x) => [x.matric, x.name, x.github, x.primaryRole, x.secondaryRole])}
          />
          <h3 className="mb-2 mt-5 text-sm font-semibold">Team charter</h3>
          <dl className="space-y-2 text-sm">
            {s.charter.map((c) => (
              <div key={c.label}>
                <dt className="font-medium">{c.label}</dt>
                <dd className="text-slate-700">{c.text ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <SampleCard title="TASK: the first tasks of the plan" note="Each task has one owner, a phase, plan hours and a plan week. Earned value is credited only when the status is Complete.">
          <RefTable caption="Sample TASK" head={["Task ID", "Milestone", "Phase", "Component", "Task", "Owner", "Plan h", "Plan wk", "Status"]} rows={s.task} />
        </SampleCard>
        <SampleCard title="LOGT: one row per working session" note="Delta = stop − start − interruption, calculated (shown here as the app calculates it). The Task ID ties the hours to TASK.">
          <RefTable
            caption="Sample LOGT"
            head={["Date", "Member", "Milestone", "Phase", "Task ID", "Worked on", "Start", "Stop", "Int. (min)", "Delta (min)", "AI used?", "Comments"]}
            rows={s.logt.map((r) => [...r.slice(0, 9), delta(r[6], r[7], r[8]), ...r.slice(9)])}
          />
        </SampleCard>
        <SampleCard title="LOGD: every defect, wherever it was found" note="Injected in is the phase where the mistake was made; removed in is where it was found and fixed.">
          <RefTable
            caption="Sample LOGD"
            head={["Date", "Defect ID", "Found by", "Milestone", "Type", "Component", "Injected in", "Removed in", "Fix (min)", "Fix ref.", "Severity", "From AI code?", "Description & root cause"]}
            rows={s.logd}
          />
        </SampleCard>
        <SampleCard title="LOGTEST: every test case">
          <RefTable
            caption="Sample LOGTEST"
            head={["Date run", "Test ID", "Module / screen", "What is tested", "Type", "Expected", "Actual", "Status", "Milestone", "Tester", "Defect ref.", "Automated?"]}
            rows={s.logtest}
          />
        </SampleCard>
        <SampleCard title="LOGAI: every AI-assisted change" note="The reviewer is a teammate, never the author. Keep % = lines kept ÷ lines generated.">
          <RefTable
            caption="Sample LOGAI"
            head={["Date", "Member", "Milestone", "File / module", "Feature", "AI tool", "Prompt (summarised)", "Lines gen.", "Lines kept", "Reviewer", "Verdict", "Tests?", "Test status", "Commit / PR", "Approved?"]}
            rows={s.logai}
          />
        </SampleCard>
        <SampleCard title="LOGCLIENT: client meetings" note="Workbook only for now. Milestones need 2, 4 and 6 meetings (cumulative).">
          <RefTable
            caption="Sample LOGCLIENT"
            head={["Date", "Milestone", "Mode", "Hours", "Team attendees", "Client attendees", "Purpose", "Decisions", "Actions & owners", "Evidence", "Sign-off?"]}
            rows={s.logclient}
          />
        </SampleCard>
        <SampleCard title="LOGGIT: weekly GitHub activity" note="Read from the repository's Insights tab. In this app the lecturer's GitHub sync collects commits, pull requests and reviews automatically.">
          <RefTable
            caption="Sample LOGGIT"
            head={["Week", "Milestone", "Member", "Commits", "PRs opened", "PRs merged", "Reviews", "Issues closed", "Lines +", "Lines −", "CI green?", "Notes"]}
            rows={s.loggit}
          />
        </SampleCard>
        <SampleCard title="CCR: change requests">
          <RefTable
            caption="Sample CCR"
            head={["CCR ID", "Date", "Raised by", "Type", "Component", "What changes", "Why", "Est. h", "Milestone", "Reviewer", "Decision", "Decided on", "Notes"]}
            rows={s.ccr}
          />
        </SampleCard>
        <SampleCard title="WEEK: the weekly status record" note="Hours and earned value fill themselves; the team writes the biggest risk and next week's commitment.">
          <RefTable caption="Sample WEEK" head={["Week", "Week starting", "Milestone", "Met?", "Present", "Biggest risk or issue", "Commitment for next week"]} rows={s.week} />
        </SampleCard>
      </section>

      <section id="roles" className="scroll-mt-4">
        <Card title="Roles">
          <RefTable caption="Roles" head={["Role", "What this role owns in TMA3084"]} rows={WORKBOOK.roles.map((r) => [<span key="r" className="font-medium">{r.role}</span>, r.owns])} />
          <p className="mt-3 text-sm text-slate-700">{WORKBOOK.roleRule}</p>
        </Card>
      </section>

      <section id="phases" className="scroll-mt-4">
        <Card title="Process phase standard">
          <p className="mb-3 text-sm text-slate-600">
            Use the code exactly as it appears. Phases marked <Badge tone="amber">coming</Badge> (AIGEN, BUILD, WT, CICD, UAT) are being added to the
            app; until then log BUILD as COMPILE and UAT as AT, and AIGEN, WT and CICD work under CODE, UT and IT.
          </p>
          <RefTable
            caption="Phases"
            head={["Code", "Phase", "Scope", "Log time", "Injected", "Removed", "Development", "Size basis", "What belongs in this phase"]}
            rows={WORKBOOK.phases.map((p) => [
              <span key="c" className="whitespace-nowrap font-mono font-medium">
                {p.code} {!appPhases.has(p.code) && <Badge tone="amber">coming</Badge>}
              </span>,
              p.name,
              p.scope,
              yn(p.logTime),
              yn(p.injected),
              yn(p.removed),
              yn(p.development),
              p.sizeBasis,
              p.belongs,
            ])}
          />
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
            {WORKBOOK.phaseNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Card>
      </section>

      <section id="defect-types" className="scroll-mt-4">
        <Card title="Defect type standard">
          <RefTable
            caption="Defect types"
            head={["Type", "Name", "What it covers", "A Flutter example"]}
            rows={WORKBOOK.defectTypes.map((t) => [<span key="c" className="font-mono font-medium">{t.code}</span>, t.name, t.covers, t.example])}
          />
          <p className="mt-3 text-sm text-slate-700">{WORKBOOK.defectTypeNote}</p>
        </Card>
      </section>

      <section id="planning" className="scroll-mt-4">
        <Card title="Planning guidelines">
          <dl className="mb-4 space-y-2 text-sm">
            {WORKBOOK.planGuide.notes.map((n) => (
              <div key={n.label}>
                <dt className="font-medium">{n.label}</dt>
                <dd className="text-slate-700">{n.text}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="min-w-0">
              <h3 className="mb-2 text-sm font-semibold">Splitting the effort across phases</h3>
              <RefTable caption="Effort split" head={["Phase group", "Share", "Phases"]} rows={WORKBOOK.planGuide.shares.map((x) => [x.group, x.share, x.phases])} />
            </div>
            <div className="min-w-0">
              <h3 className="mb-2 text-sm font-semibold">Rates to plan against</h3>
              <RefTable caption="Planning rates" head={["Activity", "Planning rate", "Why"]} rows={WORKBOOK.planGuide.rates.map((x) => [x.activity, x.rate, x.why])} />
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-700">
            <span className="font-medium">A warning about the AI rate. </span>
            {WORKBOOK.planGuide.aiWarning}
          </p>
        </Card>
      </section>

      <section id="quality" className="scroll-mt-4">
        <Card title="Quality guidelines">
          <p className="mb-3 text-sm text-slate-700">{WORKBOOK.qualGuide.idea}</p>
          <RefTable caption="Quality guidelines" head={["Measure", "Aim for", "If yours is below it"]} rows={WORKBOOK.qualGuide.measures.map((x) => [x.measure, x.aim, x.below])} />
          <p className="mt-3 text-sm text-slate-700">
            <span className="font-medium">The order to fix things in. </span>
            {WORKBOOK.qualGuide.fixOrder}
          </p>
        </Card>
      </section>

      <section id="troubleshooting" className="scroll-mt-4">
        <Card title="Things that go wrong (in the workbook)">
          <RefTable caption="Troubleshooting" head={["Symptom", "Cause and fix"]} rows={m.troubleshooting.map((x) => [x.symptom, x.fix])} />
        </Card>
      </section>
    </div>
  );
}

function SampleCard({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <Card title={title}>
      {note && <p className="mb-3 text-sm text-slate-600">{note}</p>}
      {children}
    </Card>
  );
}
