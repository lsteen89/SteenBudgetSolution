// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import react from "eslint-plugin-react";
import typescript from "@typescript-eslint/eslint-plugin"; // TypeScript plugin
import typescriptParser from "@typescript-eslint/parser"; // TypeScript parser

const config = [js.configs.recommended, {
  files: ["**/*.{ts,tsx}"], // Apply to TypeScript files
  languageOptions: {
    env: {
      browser: true, // Enable browser globals like window, document, etc.
    },
    globals: {
      console: "readonly", // Allow `console` globally
      setTimeout: "readonly", // Allow `setTimeout` globally
    },
    parser: typescriptParser, // Use TypeScript parser
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      tsconfigRootDir: process.cwd(),
      project: "./tsconfig.json", // Ensure TypeScript settings are used
    },
  },
  plugins: {
    react,
    "@typescript-eslint": typescript,
  },
  rules: {
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
  },
}, {
  files: ["**/*.{js,jsx}"], // Apply to JavaScript files
  languageOptions: {
    env: {
      browser: true, // Enable browser globals like window, document, etc.
    },
    globals: {
      console: "readonly", // Allow `console` globally
      setTimeout: "readonly", // Allow `setTimeout` globally
    },
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  plugins: {
    react,
  },
  rules: {
    "no-unused-vars": "warn",
  },
}, ...storybook.configs["flat/recommended"]];

export default config;
