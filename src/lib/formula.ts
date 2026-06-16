// Stat formula evaluator. Used for enemy/boss stats that scale with level.
// Formula syntax: arithmetic on numbers, `level`, `base`, and `Math.*` functions.
// Returns NaN for invalid input (UI falls back to base value).

export type FormulaContext = { level: number; base: number };

// ponytail: only allow these identifier tokens. Anything else (variables,
// function names not in this list) makes the formula invalid. This is a
// token-based check, not a regex, so adding new Math.* methods is just an
// array push.
const ALLOWED_TOKENS = new Set([
  "level", "base", "Math",
  "abs", "ceil", "floor", "round", "max", "min", "pow", "sqrt", "exp", "log",
  "sin", "cos", "tan", "PI", "E",
]);

// Match any identifier-like token (letters, digits, underscore, dot).
const ID_RE = /[A-Za-z_][A-Za-z0-9_.]*/g;

function isFormulaSafe(formula: string): boolean {
  const matches = formula.match(ID_RE) || [];
  for (const tok of matches) {
    // Allow `Math.pow`, `Math.sqrt`, etc. — but only if the prefix is `Math`
    // and the method is in the whitelist.
    if (tok.startsWith("Math.")) {
      const method = tok.slice(5);
      if (!ALLOWED_TOKENS.has(method)) return false;
    } else if (!ALLOWED_TOKENS.has(tok)) {
      return false;
    }
  }
  return true;
}

export function evalFormula(formula: string, ctx: FormulaContext): number {
  if (!formula || !formula.trim()) return ctx.base;
  if (!isFormulaSafe(formula)) return NaN;
  try {
    const fn = new Function("level", "base", "Math", `return (${formula})`);
    const result = fn(ctx.level, ctx.base, Math);
    return Number.isFinite(result) ? Math.round(result) : NaN;
  } catch {
    return NaN;
  }
}

// Common game-design formulas. All use `base` (the static value) and `level` (1..N).
export const FORMULA_PRESETS: { id: string; label: string; description: string; formula: string }[] = [
  { id: "flat", label: "Plano", description: "No escala con el nivel. Igual a `base`.", formula: "base" },
  { id: "linear", label: "Lineal", description: "+5 por nivel. Típico de juegos de acción.", formula: "base + 5 * (level - 1)" },
  { id: "linear-strong", label: "Lineal fuerte", description: "+15 por nivel. Para mini-bosses.", formula: "base + 15 * (level - 1)" },
  { id: "exponential", label: "Exponencial", description: "x1.15 por nivel. Típico de RPGs / idle.", formula: "base * Math.pow(1.15, level - 1)" },
  { id: "exponential-fast", label: "Exponencial rápido", description: "x1.3 por nivel. Endgame.", formula: "base * Math.pow(1.3, level - 1)" },
  { id: "polynomial", label: "Polinomial", description: "Crece rápido al principio. Típico strategy.", formula: "base * Math.pow(level, 1.5)" },
  { id: "diminishing", label: "Rendimientos decrecientes", description: "Crece rápido y se estanca. √ level.", formula: "base * Math.sqrt(level)" },
  { id: "logistic", label: "Logístico (S-curve)", description: "Sube rápido, se estanca en un máximo.", formula: "base * 4 / (1 + Math.exp(-0.5 * (level - 5)))" },
];
