import { z } from "./zod";

const text = (max: number) => z.string().trim().min(1, "Required").max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const lectureCodeSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(20)
  .regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/, "Letters, digits and hyphens only (e.g. L06-07)");

/** Links must be http(s): content is rendered as text and links open in a new tab. */
export const resourceUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => /^https?:\/\/\S+$/i.test(v), "Must start with http:// or https://");

export const lectureCheckSchema = z
  .object({
    question: text(500),
    options: z.array(text(300)).min(2, "At least 2 options").max(5, "At most 5 options"),
    answerIndex: z.coerce.number().int().min(0),
    whenRight: text(1000),
    whenWrong: text(1000),
  })
  .refine((c) => c.answerIndex < c.options.length, { path: ["answerIndex"], message: "Choose one of the options" });

export const lectureResourceSchema = z
  .object({
    kind: z.enum(["SLIDES", "COMPANION", "VIDEO", "QUIZ", "HANDOUT", "FILE"]),
    label: text(200),
    url: resourceUrlSchema.optional(),
    fileName: optionalText(200),
  });

/** One lecture of a series file (validated before it is loaded into a semester). */
export const seriesLectureSchema = z.object({
  code: lectureCodeSchema,
  title: text(200),
  kicker: text(120),
  summary: text(1000),
  weekLabel: text(40),
  weekNumber: z.number().int().min(1).max(30).optional(),
  status: z.enum(["DELIVERED", "CURRENT", "PLANNED"]),
  covers: z.array(text(500)).max(30),
  parts: z.array(z.object({ title: text(200), detail: z.string().trim().max(1000) })).max(10).optional(),
  activities: z.array(z.object({ kind: text(40), detail: text(500) })).max(10).optional(),
  notes: optionalText(1000),
  resources: z.array(lectureResourceSchema).max(20),
  check: lectureCheckSchema.optional(),
});

/** A student's answer to the check question; the user comes from the session, never from the body. */
export const lectureAnswerSchema = z.object({ answerIndex: z.coerce.number().int().min(0).max(4) });
