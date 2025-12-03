// @ts-check
import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import { defineConfig } from "eslint/config"

export default defineConfig(eslint.configs.recommended, ...tseslint.configs.recommended, {
  rules: {
    "no-restricted-globals": ["error", "_", "N_", "C_"],
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        caughtErrorsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-explicit-any": "off",
  },
})
