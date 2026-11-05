/**
 * Loads a lecture series into a semester (dev seed, `npm run seed-lectures`, and the lecturer's "Load series" action).
 * Idempotent, see planSeriesLoad: it only adds what is missing and never overwrites the lecturer's edits or views.
 * Soft-deleted lectures and resources count as present, so whatever the lecturer removed stays removed.
 * No "server-only" import: the CLI scripts use it too.
 */
import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import { seriesLectureSchema } from "../schemas/lectures";
import { planSeriesLoad, resourceKey } from "./logic";
import type { SeriesLecture, SeriesResource } from "./types";

const json = (v: unknown) => (v === undefined ? undefined : (v as Prisma.InputJsonValue));

export async function loadSeries(
  db: PrismaClient,
  semesterId: string,
  series: readonly SeriesLecture[],
  options: { actorId?: string | null; dryRun?: boolean } = {},
) {
  // Validate the whole file first: a bad entry loads nothing.
  for (const l of series) {
    const r = seriesLectureSchema.safeParse(l);
    if (!r.success) throw new Error(`${l.code}: ${r.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  }
  const existing = await db.lecture.findMany({
    where: { semesterId },
    select: { id: true, code: true, check: { select: { id: true } }, resources: { select: { kind: true, label: true, order: true } } },
  });
  const plan = planSeriesLoad(
    series,
    existing.map((e) => ({ code: e.code, hasCheck: e.check !== null, resourceKeys: e.resources.map(resourceKey) })),
  );
  if (options.dryRun) return plan;

  const audit = { createdById: options.actorId ?? null, updatedById: options.actorId ?? null };
  const resourceRows = (resources: readonly SeriesResource[], start: number) =>
    resources.map((r, i) => ({ kind: r.kind, label: r.label, url: r.url ?? null, fileName: r.fileName ?? null, order: start + i + 1, ...audit }));

  await db.$transaction(async (tx) => {
    for (const l of plan.create) {
      await tx.lecture.create({
        data: {
          semesterId,
          code: l.code,
          title: l.title,
          kicker: l.kicker,
          summary: l.summary,
          weekLabel: l.weekLabel,
          weekNumber: l.weekNumber ?? null,
          order: series.indexOf(l) + 1,
          status: l.status,
          covers: l.covers,
          parts: json(l.parts),
          activities: json(l.activities),
          notes: l.notes ?? null,
          ...audit,
          resources: { create: resourceRows(l.resources, 0) },
          ...(l.check ? { check: { create: { ...l.check, ...audit } } } : {}),
        },
      });
    }
    for (const a of plan.addResources) {
      const e = existing.find((x) => x.code === a.code)!;
      const start = e.resources.reduce((m, r) => Math.max(m, r.order), 0);
      await tx.lectureResource.createMany({ data: resourceRows(a.resources, start).map((r) => ({ ...r, lectureId: e.id })) });
    }
    for (const c of plan.addChecks) {
      const e = existing.find((x) => x.code === c.code)!;
      await tx.lectureCheck.create({ data: { lectureId: e.id, ...c.check, ...audit } });
    }
  });
  return plan;
}
