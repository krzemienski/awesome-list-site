import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // Base JavaScript rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Prettier integration (disable conflicting rules)
  prettierConfig,

  // Global configuration
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // React configuration for client-side code
  {
    files: ["client/**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "react-refresh": reactRefreshPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },

  // Server-side TypeScript configuration
  {
    files: ["server/**/*.ts"],
    rules: {
      // Server-specific rules can be added here
    },
  },

  // Shared code configuration
  {
    files: ["shared/**/*.ts"],
    rules: {
      // Shared code rules can be added here
    },
  },

  // Configuration files
  {
    files: ["*.config.{js,ts}", "*.config.*.{js,ts}"],
    rules: {
      // Allow require() in config files
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // The task 566 browser harness is a checked-in ESM JavaScript validator,
  // rather than an application module included by tsconfig.json. Keep the
  // normal JavaScript checks while opting this file out of TypeScript-only
  // rules that require a typed program.
  {
    files: [
      "scripts/validation/contact-variants-566.mjs",
      "scripts/validation/verify-design-system.mjs",
    ],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: {
        applyDesignSystem: "readonly",
        console: "readonly",
        document: "readonly",
        Event: "readonly",
        fetch: "readonly",
        getComputedStyle: "readonly",
        HTMLInputElement: "readonly",
        localStorage: "readonly",
        process: "readonly",
        requestAnimationFrame: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
        window: "readonly",
      },
    },
  },

  // Ignore patterns
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".auto-claude/**",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
  },
);
