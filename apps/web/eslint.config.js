import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    // Standalone Node scripts (e.g. check-messages.mjs) run outside the
    // browser/RSC environment the rest of this config assumes, so they need
    // Node's own globals declared explicitly.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
      },
    },
  },
];
