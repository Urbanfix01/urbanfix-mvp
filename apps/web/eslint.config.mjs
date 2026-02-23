import nextVitals from "eslint-config-next/core-web-vitals.js";
import nextTs from "eslint-config-next/typescript.js";

const toConfigArray = (value) => (Array.isArray(value) ? value : [value]);

const eslintConfig = [
  ...toConfigArray(nextVitals),
  ...toConfigArray(nextTs),
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
