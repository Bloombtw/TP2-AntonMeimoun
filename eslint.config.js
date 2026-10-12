import tseslint from "typescript-eslint";

// Mise en place du lint — ticket INFRA-212.
// Le parser TypeScript est branche et le jeu de regles recommande de
// typescript-eslint est actif : variables inutilisees, comparaisons laxistes,
// code mort et pieges TypeScript courants sont desormais verifies.
export default tseslint.config(
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error"
    }
  }
);
