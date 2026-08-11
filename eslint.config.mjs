import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Raw browser captures from scripts/capture-page.mjs — third-party markup
    // with minified inline scripts, read as research input and never built.
    "docs/research/**/captures/**",
    ".chrome-capture/**",
  ]),
]);

export default eslintConfig;
