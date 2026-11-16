import js from "@eslint/js";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  // Base JS rules
  js.configs.recommended,

  // TypeScript + React files
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      // TypeScript
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],

      // React
      ...reactPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // tidak perlu import React di React 17+
      "react/prop-types": "off", // sudah pakai TypeScript

      // React Hooks
      ...reactHooks.configs.recommended.rules,

      // General
      "no-console": "off",
      "no-unused-vars": "off", // dihandle @typescript-eslint/no-unused-vars
    },
    settings: {
      react: { version: "detect" },
    },
  },

  // Ignore folders
  {
    ignores: ["dist/**", "node_modules/**", "backend-academy/**"],
  },
];
