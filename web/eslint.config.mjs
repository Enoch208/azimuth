import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // A hook factory runs during the render that declares it, so capturing a
      // const declared further down throws "cannot access before
      // initialization" — in the browser only, where typecheck, lint, tests and
      // build all stay green. This turns that into a lint error instead.
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": [
        "error",
        { functions: false, classes: false, variables: true, typedefs: false, enums: false },
      ],
    },
  },
  {
    // Node-only tooling. `@inco/lightning-js` ships an ESM build with
    // extensionless internal imports, which bare node cannot resolve — the
    // bundler can. Scripts that drive a real wallet therefore have to be CJS.
    files: ["scripts/**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
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
