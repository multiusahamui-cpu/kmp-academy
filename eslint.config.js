// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

// Mengikuti pola eslint.config.js garuda-superapp.
export default tseslint.config(
  // -- File ignores --
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "migrations/**", "drizzle/**", "static/**", "*.cjs"],
  },

  // -- Base JS rules --
  js.configs.recommended,

  // -- TypeScript rules (server + shared + client) --
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),

  {
    rules: {
      "no-empty": "warn",
      "no-useless-catch": "warn",
      "no-useless-escape": "warn",
      "prefer-const": "warn",
      "no-undef": "off", // TypeScript handles this
    },
  },

  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },

  // -- Server & test files --
  {
    files: ["server/**/*.ts", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // -- Client files --
  {
    files: ["client/src/**/*.ts", "client/src/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // -- React rules (client only) --
  {
    files: ["client/src/**/*.tsx", "client/src/**/*.ts"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/react-in-jsx-scope": "off",
      "react/jsx-key": "warn",
      "react/no-unknown-property": "warn",
    },
  },
);
