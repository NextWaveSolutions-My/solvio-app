import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const compilerRules = Object.fromEntries(
  Object.keys(reactHooks.configs.flat["recommended-latest"].rules)
    .filter(
      (ruleName) =>
        ruleName !== "react-hooks/rules-of-hooks" &&
        ruleName !== "react-hooks/exhaustive-deps"
    )
    .map((ruleName) => [ruleName, "warn"])
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    // Surface compiler diagnostics without turning incremental adoption into a repo-wide blocker.
    rules: compilerRules,
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
