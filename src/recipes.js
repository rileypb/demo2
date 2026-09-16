// The recipe model: what a recipe is, and what makes one valid.
// Pure functions over plain objects — no DOM, no storage.

const isBlank = (value) => String(value ?? "").trim() === "";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
};

/**
 * Collects everything wrong with a recipe, so a cook filling in a form sees
 * every problem at once rather than one per submit.
 * @returns {string[]} empty when the recipe is valid
 */
export function validateRecipe(input) {
  const problems = [];
  const { name, servings, ingredients } = input ?? {};

  if (isBlank(name)) {
    problems.push("Recipe needs a name.");
  }

  const servingCount = toNumber(servings);
  if (!Number.isInteger(servingCount) || servingCount < 1) {
    problems.push("Servings must be a whole number greater than zero.");
  }

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    problems.push("Recipe needs at least one ingredient.");
  } else {
    ingredients.forEach((ingredient, index) => {
      const position = index + 1;
      if (isBlank(ingredient?.name)) {
        problems.push(`Ingredient ${position} needs a name.`);
      }
      const quantity = toNumber(ingredient?.quantity);
      if (!(quantity > 0)) {
        problems.push(
          `Ingredient ${position} needs a quantity greater than zero.`,
        );
      }
    });
  }

  return problems;
}

export class InvalidRecipeError extends Error {
  constructor(problems) {
    super(problems.join(" "));
    this.name = "InvalidRecipeError";
    this.problems = problems;
  }
}

/**
 * Builds a stored recipe from raw form input, normalizing as it goes.
 * Form fields arrive as strings, so quantities are coerced to numbers here —
 * everything downstream can then assume real numbers.
 * @throws {InvalidRecipeError} when the input does not validate
 */
export function createRecipe(input, { id, now } = {}) {
  const problems = validateRecipe(input);
  if (problems.length > 0) {
    throw new InvalidRecipeError(problems);
  }

  return {
    id: id ? id() : crypto.randomUUID(),
    name: input.name.trim(),
    servings: toNumber(input.servings),
    ingredients: input.ingredients.map((ingredient) => ({
      name: ingredient.name.trim(),
      quantity: toNumber(ingredient.quantity),
      unit: String(ingredient.unit ?? "").trim(),
    })),
    createdAt: now ? now() : new Date().toISOString(),
  };
}

const plural = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/**
 * The one-line summary shown beside a recipe's name in the list.
 * Ingredients lead: what's in it identifies a recipe better than how many
 * people it feeds.
 */
export function describeRecipe({ ingredients = [], servings = 0 } = {}) {
  return `${plural(ingredients.length, "ingredient")} · ${plural(servings, "serving")}`;
}
