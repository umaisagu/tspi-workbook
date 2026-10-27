import { z } from "zod";

/**
 * Thresholds for contribution flags and team status, configurable per semester by the lecturer
 * (MonitoringSettings.thresholds). Missing keys fall back to these defaults.
 */
export const thresholdsSchema = z.object({
  lowShare: z
    .object({
      /** Flag when a member's share is below this fraction of the fair share (100% / team size). */
      fraction: z.coerce.number().min(0).max(1).default(0.5),
      windowWeeks: z.coerce.number().int().min(1).max(15).default(3),
    })
    .prefault({}),
  inactive: z
    .object({
      /** Consecutive working weeks with no LOGT entries. */
      weeks: z.coerce.number().int().min(1).max(10).default(2),
    })
    .prefault({}),
  hoursWithoutOutput: z
    .object({
      windowWeeks: z.coerce.number().int().min(1).max(15).default(3),
      /** Hours logged in the window before "no output" counts. */
      minHours: z.coerce.number().min(0).max(200).default(6),
    })
    .prefault({}),
  backfill: z
    .object({
      /** An entry is backdated when typed this many days or more after its date. */
      lagDays: z.coerce.number().int().min(1).max(60).default(3),
      /** Entries typed with gaps up to this long belong to one sitting. */
      sessionGapMinutes: z.coerce.number().int().min(5).max(1440).default(120),
      /** Backdated entries in one sitting that raise the flag. */
      minEntries: z.coerce.number().int().min(2).max(100).default(5),
      /** How close before a milestone deadline the sitting must be. */
      daysBeforeDeadline: z.coerce.number().min(0).max(30).default(3),
    })
    .prefault({}),
  peerMismatch: z
    .object({
      /** Self-rating total this many points (of 50) above the teammates' average. */
      selfAbovePeers: z.coerce.number().min(0).max(50).default(10),
      /** Teammates' average total at or below this (of 50). */
      lowPeerAverage: z.coerce.number().min(0).max(50).default(25),
    })
    .prefault({}),
  missingForms: z
    .object({
      week: z.boolean().default(true),
      peer: z.boolean().default(true),
    })
    .prefault({}),
  teamStatus: z
    .object({
      /** Schedule performance (cumulative EV / PV) below this is At risk … */
      atRiskSpi: z.coerce.number().min(0).max(2).default(0.9),
      /** … and below this is Behind. */
      behindSpi: z.coerce.number().min(0).max(2).default(0.75),
      /** Days without any team activity before At risk (twice this: Behind). */
      inactiveDays: z.coerce.number().int().min(1).max(60).default(7),
    })
    .prefault({}),
});
export type Thresholds = z.output<typeof thresholdsSchema>;

/** Stored JSON → thresholds with defaults filled in (invalid stored values fall back to defaults). */
export function readThresholds(stored: unknown): Thresholds {
  const r = thresholdsSchema.safeParse(stored ?? {});
  return r.success ? r.data : thresholdsSchema.parse({});
}

export const DEFAULT_THRESHOLDS: Thresholds = thresholdsSchema.parse({});
