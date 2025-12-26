import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  js.configs.recommended,
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/", "node_modules/"],
  },
]);
