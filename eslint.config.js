import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default [
  ...tseslint.config(
    { ignores: ["**/dist/**", "**/coverage/**"] },
    {
      extends: [js.configs.recommended, ...tseslint.configs.recommended],
      files: ["**/*.{ts,tsx}"],
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
      },
      plugins: {
        "react-hooks": reactHooks,
        "react-refresh": reactRefresh,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        "react-refresh/only-export-components": [
          "warn",
          { allowConstantExport: true },
        ],
        // Honor the `_`-prefix convention for intentionally unused bindings,
        // and don't flag deliberately-ignored caught errors (silent catches).
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrors: "none",
          },
        ],
        // Silent catch blocks are used intentionally (e.g. permissive parsing).
        "no-empty": ["error", { allowEmptyCatch: true }],
        // `any` is deliberate in this library's value-agnostic type utilities
        // and in code mirrored verbatim from TanStack Router (see "Copied from"
        // comments). Surface it as a warning rather than blocking CI.
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-empty-object-type": "warn",
        "no-prototype-builtins": "warn",
      },
    },
    {
      // Tests deliberately use `@ts-expect-error` to assert compile-time
      // failures; the description requirement adds noise there.
      files: ["**/tests/**/*.{ts,tsx}"],
      rules: {
        "@typescript-eslint/ban-ts-comment": "off",
      },
    },
  ),
  eslintConfigPrettier,
];
