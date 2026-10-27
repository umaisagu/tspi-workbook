"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { TspiRole } from "@/generated/prisma/enums";
import { studentInfoSchema } from "@/lib/schemas/forms";
import { fieldErrorsFrom } from "@/lib/schemas/errors";
import { Alert, Button, Field, Input, Select, sendJson, type FieldErrors } from "@/components/ui/form";
import { TSPI_ROLES } from "@/lib/tsp/roles";
import {
  CHATGPT_PLANS,
  CLAUDE_PLANS,
  COMMITMENT_CODES,
  COMMITMENT_DAYS,
  COMMITMENT_SLOTS,
  LAB_SLOT,
  LAPTOP_OS,
  MEETING_AVAILABILITY,
  RESIDENCE_OPTIONS,
  SKILL_AREAS,
  slotLabel,
} from "@/lib/tsp/student-info";

type Grid = Record<string, Record<string, string>>;

export interface SiValues {
  fullName: string;
  matricNo: string;
  date: string;
  programme: string;
  yearOfStudy: string;
  creditsRegistered: string;
  expectedGradSemester: string;
  expectedGradYear: string;
  phone: string;
  githubUsername: string;
  skills: Record<string, { rating: string; evidence: string }>;
  resources: {
    laptopCanRunEmulator: boolean;
    laptopOs: string;
    laptopRamGb: string;
    androidVersion: string;
    iosVersion: string;
    noTestDevice: boolean;
    chatgpt: string;
    claude: string;
    otherAiTools: string;
  };
  experience: string;
  previousProjects: string;
  leadership: string;
  clientContact: string;
  appIdea: string;
  aiFeatureIdea: string;
  preferredTeammates: string;
  residence: string;
  residenceOther: string;
  ownTransport: boolean;
  meetingAvailability: string[];
  weeklyCommitments: Grid;
  commitmentNotes: string;
  preferredMeetingSlot: string;
  rolePreferences: Record<string, string>;
  declared: boolean;
}

/** Converts the form state into the API payload (empty strings → null for optional numbers). */
function toPayload(v: SiValues) {
  const n = (s: string) => (s.trim() === "" ? null : s);
  return {
    ...v,
    expectedGradSemester: n(v.expectedGradSemester),
    expectedGradYear: n(v.expectedGradYear),
    resources: { ...v.resources, laptopOs: n(v.resources.laptopOs), laptopRamGb: n(v.resources.laptopRamGb) },
    rolePreferences: Object.fromEntries(Object.entries(v.rolePreferences).filter(([, r]) => r !== "")),
  };
}

const textareaClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base shadow-sm outline-none focus:border-blue-600 disabled:bg-slate-50 sm:text-sm";

function Section({ letter, title, children }: { letter: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-base font-semibold">
        {letter}. {title}
      </h2>
      {children}
    </section>
  );
}

export function StudentInfoForm({
  teamId,
  initial,
  email,
  labGroup,
  readOnly,
  submittedAt,
}: {
  teamId: string;
  initial: SiValues;
  email: string;
  labGroup: string;
  readOnly: boolean;
  submittedAt: string | null;
}) {
  const router = useRouter();
  const [v, setV] = useState<SiValues>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const err = (path: string) => errors[path];
  function update(patch: Partial<SiValues>) {
    const next = { ...v, ...patch };
    setV(next);
    setSaved(false);
    if (Object.keys(errors).length) {
      const r = studentInfoSchema.safeParse(toPayload(next));
      setErrors(r.success ? {} : fieldErrorsFrom(r.error));
    }
  }

  async function save() {
    setFormError(undefined);
    const payload = toPayload(v);
    const r = studentInfoSchema.safeParse(payload);
    if (!r.success) {
      setErrors(fieldErrorsFrom(r.error));
      setFormError("Some answers need attention — see the highlighted fields.");
      return;
    }
    setPending(true);
    const res = await sendJson(`/api/teams/${teamId}/si`, "PUT", payload);
    setPending(false);
    if (!res.ok) {
      setFormError(res.error);
      setErrors(res.fields ?? {});
      return;
    }
    setErrors({});
    setSaved(true);
    router.refresh();
  }

  const text = (name: keyof SiValues, label: string, props: { type?: string; placeholder?: string; hint?: string } = {}) => (
    <Field label={label} error={err(name)} hint={props.hint}>
      <Input
        type={props.type ?? "text"}
        value={String(v[name] ?? "")}
        placeholder={props.placeholder}
        invalid={!!err(name)}
        onChange={(e) => update({ [name]: e.target.value } as Partial<SiValues>)}
      />
    </Field>
  );
  const area = (name: "experience" | "previousProjects" | "leadership", hint: string) => (
    <Field label="" error={err(name)}>
      <textarea rows={4} className={textareaClass} placeholder={hint} value={v[name]} onChange={(e) => update({ [name]: e.target.value })} />
    </Field>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      noValidate
      className="space-y-4"
    >
      <fieldset disabled={readOnly} className="min-w-0 space-y-4">
        <Section letter="A" title="Student details">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {text("fullName", "Full name")}
            {text("matricNo", "Matric no.")}
            {text("date", "Date", { type: "date" })}
            {text("programme", "Programme / major")}
            {text("yearOfStudy", "Year of study", { type: "number" })}
            {text("creditsRegistered", "Credits registered this semester", { type: "number" })}
            <div className="grid grid-cols-2 gap-2">
              {text("expectedGradSemester", "Expected graduation: semester", { type: "number" })}
              {text("expectedGradYear", "Year", { type: "number" })}
            </div>
            <Field label="UNIMAS e-mail">
              <Input value={email} disabled readOnly />
            </Field>
            {text("phone", "Phone / WhatsApp", { type: "tel" })}
            {text("githubUsername", "GitHub username", { hint: "Needed for the course GitHub organisation and contribution reports" })}
            <Field label="Lab group">
              <Input value={labGroup} disabled readOnly />
            </Field>
          </div>
        </Section>

        <Section letter="B" title="Technical self-assessment">
          <p className="mb-3 text-sm text-slate-600">1 = never used, 3 = used in a course assignment, 5 = built a working product with it.</p>
          <div className="space-y-3">
            {SKILL_AREAS.map((s) => (
              <div key={s.key} className="grid gap-2 sm:grid-cols-[1fr_7rem_1fr] sm:items-start">
                <span className="text-sm">{s.label}</span>
                <Field label="" error={err(`skills.${s.key}.rating`)}>
                  <Select
                    aria-label={`${s.label} rating`}
                    value={v.skills[s.key]?.rating ?? ""}
                    invalid={!!err(`skills.${s.key}.rating`)}
                    onChange={(e) => update({ skills: { ...v.skills, [s.key]: { rating: e.target.value, evidence: v.skills[s.key]?.evidence ?? "" } } })}
                  >
                    <option value="">Rate</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Input
                  aria-label={`${s.label} evidence`}
                  placeholder="Evidence (course, project, link)"
                  value={v.skills[s.key]?.evidence ?? ""}
                  onChange={(e) => update({ skills: { ...v.skills, [s.key]: { rating: v.skills[s.key]?.rating ?? "", evidence: e.target.value } } })}
                />
              </div>
            ))}
          </div>
        </Section>

        <Section letter="C" title="Development resources and AI tool access">
          <p className="mb-3 text-sm text-slate-600">
            A paid AI plan is not required. Never share accounts, and never paste client data or API keys into AI tools.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={v.resources.laptopCanRunEmulator}
                onChange={(e) => update({ resources: { ...v.resources, laptopCanRunEmulator: e.target.checked } })}
              />
              My laptop can run Android Studio + emulator
            </label>
            <Field label="Laptop OS">
              <Select value={v.resources.laptopOs} onChange={(e) => update({ resources: { ...v.resources, laptopOs: e.target.value } })}>
                <option value="">—</option>
                {LAPTOP_OS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </Field>
            <Field label="RAM (GB)" error={err("resources.laptopRamGb")}>
              <Input type="number" value={v.resources.laptopRamGb} onChange={(e) => update({ resources: { ...v.resources, laptopRamGb: e.target.value } })} />
            </Field>
            <Field label="Android test device (version)">
              <Input value={v.resources.androidVersion} onChange={(e) => update({ resources: { ...v.resources, androidVersion: e.target.value } })} />
            </Field>
            <Field label="iPhone (iOS version)">
              <Input value={v.resources.iosVersion} onChange={(e) => update({ resources: { ...v.resources, iosVersion: e.target.value } })} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={v.resources.noTestDevice} onChange={(e) => update({ resources: { ...v.resources, noTestDevice: e.target.checked } })} />
              No physical test device
            </label>
            <div />
            <Field label="ChatGPT / Codex">
              <Select value={v.resources.chatgpt} onChange={(e) => update({ resources: { ...v.resources, chatgpt: e.target.value } })}>
                {CHATGPT_PLANS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </Field>
            <Field label="Claude">
              <Select value={v.resources.claude} onChange={(e) => update({ resources: { ...v.resources, claude: e.target.value } })}>
                {CLAUDE_PLANS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Other AI tools (own account)">
                <Input value={v.resources.otherAiTools} onChange={(e) => update({ resources: { ...v.resources, otherAiTools: e.target.value } })} />
              </Field>
            </div>
          </div>
        </Section>

        <Section letter="D" title="Relevant experience and interests">
          {area("experience", "Apps or systems you have built, languages and frameworks, design or testing work, internships, interest areas")}
        </Section>
        <Section letter="E" title="Previous team projects">
          {area("previousProjects", "For each project: title, team size, your role, what you personally delivered, tools used")}
        </Section>
        <Section letter="F" title="Leadership or management positions">
          {area("leadership", "At work, in clubs, societies, residential colleges or events")}
        </Section>

        <Section letter="G" title="Project and client ideas (optional)">
          <div className="grid gap-3 sm:grid-cols-3">
            {text("clientContact", "Possible client and contact")}
            {text("appIdea", "Mobile app idea")}
            {text("aiFeatureIdea", "AI feature idea")}
          </div>
        </Section>

        <Section letter="H" title="Team preferences and meeting logistics">
          <div className="grid gap-3 sm:grid-cols-2">
            {text("preferredTeammates", "Classmates you would like to work with (optional)")}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Where you stay" error={err("residence")}>
                <Select value={v.residence} invalid={!!err("residence")} onChange={(e) => update({ residence: e.target.value })}>
                  <option value="">Choose</option>
                  {RESIDENCE_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </Select>
              </Field>
              {v.residence === "Other" && text("residenceOther", "Where?")}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={v.ownTransport} onChange={(e) => update({ ownTransport: e.target.checked })} />
              Own transport for client site visits
            </label>
            <Field label="Available for client meetings" error={err("meetingAvailability")}>
              <div className="flex flex-wrap gap-4 text-sm">
                {MEETING_AVAILABILITY.map((o) => (
                  <label key={o} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={v.meetingAvailability.includes(o)}
                      onChange={(e) =>
                        update({ meetingAvailability: e.target.checked ? [...v.meetingAvailability, o] : v.meetingAvailability.filter((x) => x !== o) })
                      }
                    />
                    {o}
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </Section>

        <Section letter="I" title="Weekly commitments">
          <p className="mb-2 text-sm text-slate-600">C = class, W = part-time work, A = club / sport / other activity. Leave free slots blank.</p>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="min-w-full text-center text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left">Time</th>
                  {COMMITMENT_DAYS.map((d) => (
                    <th key={d} className="px-1 py-1">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMMITMENT_SLOTS.map((slot) => (
                  <tr key={slot}>
                    <td className="px-2 py-1 text-left whitespace-nowrap">{slotLabel(slot)}</td>
                    {COMMITMENT_DAYS.map((d) =>
                      d === LAB_SLOT.day && slot === LAB_SLOT.slot ? (
                        <td key={d} className="px-1 py-1 text-xs font-semibold text-blue-800">
                          LAB
                        </td>
                      ) : (
                        <td key={d} className="px-1 py-1">
                          <select
                            aria-label={`${d} ${slotLabel(slot)}`}
                            className="w-12 rounded border border-slate-300 py-1"
                            value={v.weeklyCommitments[slot]?.[d] ?? ""}
                            onChange={(e) =>
                              update({ weeklyCommitments: { ...v.weeklyCommitments, [slot]: { ...v.weeklyCommitments[slot], [d]: e.target.value } } })
                            }
                          >
                            <option value="" />
                            {COMMITMENT_CODES.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {text("commitmentNotes", "Notes (exact times)")}
            {text("preferredMeetingSlot", "Preferred slot for the weekly team meeting", { placeholder: "e.g. Thu 20:00–21:00" })}
          </div>
        </Section>

        <Section letter="J" title="TSPi role preferences">
          <p className="mb-3 text-sm text-slate-600">
            Rank each role from 1 (least preferred) to 5 (most preferred); several roles may share a rank. Every member also develops and owns at least one feature.
          </p>
          <div className="space-y-2">
            {TSPI_ROLES.map((r) => (
              <div key={r.role} className="grid gap-2 sm:grid-cols-[1fr_7rem] sm:items-center">
                <span className="text-sm">
                  <span className="font-medium">{r.label}</span> <span className="text-slate-500">({r.projectRole})</span>
                </span>
                <Field label="" error={err(`rolePreferences.${r.role}`)}>
                  <Select
                    aria-label={`${r.label} rank`}
                    value={v.rolePreferences[r.role] ?? ""}
                    invalid={!!err(`rolePreferences.${r.role}`)}
                    onChange={(e) => update({ rolePreferences: { ...v.rolePreferences, [r.role as TspiRole]: e.target.value } })}
                  >
                    <option value="">Rank</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            ))}
          </div>
        </Section>

        <Section letter="K" title="Declaration">
          <Field label="" error={err("declared")}>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={v.declared} onChange={(e) => update({ declared: e.target.checked })} />
              <span>
                I confirm that the information above is accurate. I understand that it will be used for team formation and role assignment, that I must
                follow the TMA3084 AI usage rules (spec first, PR review, LOGAI records), and that I remain responsible for all work I submit under the
                UNIMAS academic integrity policy.
              </span>
            </label>
          </Field>
        </Section>
      </fieldset>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : submittedAt ? "Save changes" : "Submit FORM-SI"}
          </Button>
          {saved && <span className="text-sm text-green-700">Saved.</span>}
          {formError && <span className="text-sm text-red-700">{formError}</span>}
        </div>
      )}
      {readOnly && formError && <Alert>{formError}</Alert>}
    </form>
  );
}
