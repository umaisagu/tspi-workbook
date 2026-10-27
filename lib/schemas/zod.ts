import { z } from "zod";

// Zod 4 compiles fast parsers with `new Function`, probing for it first; under the app's Content-Security-Policy
// (no 'unsafe-eval') that probe raises a CSP violation in the browser. Jitless mode never tries eval.
// Import `z` from here (ESLint enforces it) so the setting is applied before any schema is built.
z.config({ jitless: true });

export { z };
export { ZodError } from "zod";
export type { ZodType } from "zod";
