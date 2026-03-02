import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // FSD: 슬라이스 내부 모듈 직접 import 금지 (shared 제외)
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "@/entities/*/ui/*",
            "@/entities/*/model/*",
            "@/entities/*/api/*",
            "@/features/*/ui/*",
            "@/features/*/model/*",
            "@/features/*/api/*",
            "@/widgets/*/ui/*",
            "@/widgets/*/model/*",
            "@/views/*/ui/*",
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
