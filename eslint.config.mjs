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
    // Build output that is not at the root and so slipped past the patterns
    // above: an agent worktree carries its own .next, and the Netlify CLI
    // writes compiled bundles under .netlify. Between them they added ~2,250
    // errors in somebody else's minified code, which failed `npm run check`
    // for reasons that had nothing to do with this codebase.
    "**/.next/**",
    ".netlify/**",
    ".claude/worktrees/**",
    // Raw browser captures from scripts/capture-page.mjs — third-party markup
    // with minified inline scripts, read as research input and never built.
    "docs/research/**/captures/**",
    ".chrome-capture/**",
  ]),
]);

export default eslintConfig;
