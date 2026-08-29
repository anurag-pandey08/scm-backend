import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // Build output and the generated Prisma client are not ours to lint.
  globalIgnores(["dist/", "src/generated/"]),

  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
  },

  tseslint.configs.recommended,

  {
    files: ["**/*.{ts,mts,cts}"],
    rules: {
      // A leading underscore marks a binding that exists only to be discarded
      // — the `const { password: _password, ...rest }` omit idiom, and unused
      // middleware parameters that must stay for Express's arity checks.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]);
