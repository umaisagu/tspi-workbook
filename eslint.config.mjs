import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-restricted-imports": ["error", { paths: [{ name: "zod", message: 'Import { z } from "@/lib/schemas/zod" (jitless mode, required by the CSP).' }] }],
    },
  },
  { files: ["lib/schemas/zod.ts"], rules: { "no-restricted-imports": "off" } },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "generated/**", "coverage/**"]),
]);

export default eslintConfig;
