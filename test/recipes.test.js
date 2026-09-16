import test from "node:test";
import assert from "node:assert/strict";

import { validateRecipe, createRecipe, describeRecipe } from "../src/recipes.js";

const validInput = {
  name: "Lentil Soup",
  servings: 4,
  ingredients: [{ name: "lentils", quantity: 200, unit: "g" }],
};

const deps = { id: () => "recipe-1", now: () => "2026-09-16T00:00:00.000Z" };

test("a complete recipe has no validation problems", () => {
  assert.deepEqual(validateRecipe(validInput), []);
});

test("a recipe needs a name", () => {
  assert.deepEqual(validateRecipe({ ...validInput, name: "   " }), [
    "Recipe needs a name.",
  ]);
});

test("a recipe needs at least one ingredient", () => {
  assert.deepEqual(validateRecipe({ ...validInput, ingredients: [] }), [
    "Recipe needs at least one ingredient.",
  ]);
});

test("every ingredient needs a name and a positive quantity", () => {
  const problems = validateRecipe({
    ...validInput,
    ingredients: [
      { name: "", quantity: 200, unit: "g" },
      { name: "salt", quantity: 0, unit: "g" },
    ],
  });

  assert.deepEqual(problems, [
    "Ingredient 1 needs a name.",
    "Ingredient 2 needs a quantity greater than zero.",
  ]);
});

test("servings must be a positive whole number", () => {
  assert.deepEqual(validateRecipe({ ...validInput, servings: 0 }), [
    "Servings must be a whole number greater than zero.",
  ]);
});

test("problems accumulate so the cook sees them all at once", () => {
  assert.deepEqual(validateRecipe({ name: "", servings: 0, ingredients: [] }), [
    "Recipe needs a name.",
    "Servings must be a whole number greater than zero.",
    "Recipe needs at least one ingredient.",
  ]);
});

test("createRecipe stamps an id and a creation time", () => {
  const recipe = createRecipe(validInput, deps);

  assert.equal(recipe.id, "recipe-1");
  assert.equal(recipe.createdAt, "2026-09-16T00:00:00.000Z");
});

test("createRecipe trims surrounding whitespace off names", () => {
  const recipe = createRecipe(
    {
      ...validInput,
      name: "  Lentil Soup  ",
      ingredients: [{ name: "  lentils ", quantity: 200, unit: " g " }],
    },
    deps,
  );

  assert.equal(recipe.name, "Lentil Soup");
  assert.deepEqual(recipe.ingredients[0], {
    name: "lentils",
    quantity: 200,
    unit: "g",
  });
});

test("createRecipe coerces numeric strings from form fields", () => {
  const recipe = createRecipe(
    {
      ...validInput,
      servings: "4",
      ingredients: [{ name: "lentils", quantity: "200", unit: "g" }],
    },
    deps,
  );

  assert.equal(recipe.servings, 4);
  assert.equal(recipe.ingredients[0].quantity, 200);
});

test("createRecipe refuses invalid input and reports every problem", () => {
  assert.throws(
    () => createRecipe({ name: "", servings: 1, ingredients: [] }, deps),
    (error) => {
      assert.match(error.message, /Recipe needs a name/);
      assert.deepEqual(error.problems, [
        "Recipe needs a name.",
        "Recipe needs at least one ingredient.",
      ]);
      return true;
    },
  );
});

test("createRecipe returns a plain serializable object", () => {
  const recipe = createRecipe(validInput, deps);

  assert.deepEqual(JSON.parse(JSON.stringify(recipe)), recipe);
});

test("the recipe summary leads with ingredients, then servings", () => {
  assert.equal(
    describeRecipe({ ...validInput, servings: 4 }),
    "1 ingredient · 4 servings",
  );
});

test("the recipe summary pluralizes both counts", () => {
  assert.equal(
    describeRecipe({
      servings: 2,
      ingredients: [
        { name: "lentils", quantity: 200, unit: "g" },
        { name: "carrot", quantity: 2, unit: "whole" },
      ],
    }),
    "2 ingredients · 2 servings",
  );
});

test("the recipe summary handles a single serving", () => {
  assert.equal(
    describeRecipe({ ...validInput, servings: 1 }),
    "1 ingredient · 1 serving",
  );
});
