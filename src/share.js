// Turning recipes into something a cook can hand to someone else.
// Pure functions: they build values, they do not download, copy, or read files.

import { validateRecipe } from "./recipes.js";

export const EXPORT_FORMAT = "nutribook.recipes";
export const EXPORT_VERSION = 1;

/**
 * Wraps recipes in a tagged, versioned envelope. The format and version are
 * what let a future import tell our files from anything else, and tell an old
 * export from a new one.
 * @throws {Error} when there is nothing to export
 */
export function toExportDocument(recipes, { now } = {}) {
  if (!Array.isArray(recipes) || recipes.length === 0) {
    throw new Error("There is nothing to export.");
  }

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: (now ? now() : new Date()).toISOString(),
    recipes,
  };
}

const slug = (text) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** A filename the cook will recognize in their downloads folder. */
export function toExportFilename(recipes, { now } = {}) {
  if (recipes.length === 1) {
    // A name of only punctuation slugs to "", so fall back to something usable.
    return `${slug(recipes[0].name) || "recipe"}.nutribook.json`;
  }

  const date = (now ? now() : new Date()).toISOString().slice(0, 10);
  return `nutribook-recipes-${date}.json`;
}

/** A plain-text rendering, for pasting into a message to someone. */
export function toShareText(recipe) {
  const ingredients = recipe.ingredients.map(({ name, quantity, unit }) =>
    `- ${[quantity, unit, name].filter(Boolean).join(" ")}`,
  );

  return [
    recipe.name,
    `Serves ${recipe.servings}`,
    "",
    ...ingredients,
    "",
    "Shared from NutriBook",
  ].join("\n");
}

/**
 * Reads the text of an export file back into recipes.
 *
 * Structural problems (not ours, not JSON, from the future, empty) refuse the
 * whole file — there is nothing useful to salvage. Individual bad recipes are
 * dropped instead, so one damaged entry does not cost the cook the other nine.
 *
 * @throws {Error} with a message written for the cook, not the console
 */
export function readExport(text, { id } = {}) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new Error("That file is not a NutriBook export.");
  }

  if (doc?.format !== EXPORT_FORMAT) {
    throw new Error("That file is not a NutriBook export.");
  }

  if (Number(doc.version) > EXPORT_VERSION) {
    throw new Error(
      "That file was made by a newer version of NutriBook than this one.",
    );
  }

  const candidates = Array.isArray(doc.recipes) ? doc.recipes : [];
  const recipes = candidates
    .filter((recipe) => validateRecipe(recipe).length === 0)
    .map((recipe) => ({
      ...recipe,
      // Files hand-edited or made elsewhere may be missing these.
      id: recipe.id ?? (id ? id() : crypto.randomUUID()),
      createdAt: recipe.createdAt ?? new Date().toISOString(),
    }));

  if (recipes.length === 0) {
    throw new Error("That file has no recipes we can read.");
  }

  return { recipes, rejected: candidates.length - recipes.length };
}

const sameRecipe = (a, b) =>
  JSON.stringify({ ...a, id: null }) === JSON.stringify({ ...b, id: null });

/**
 * Works out what importing would actually change, without changing anything.
 *
 * Importing must never destroy a cook's own work, so a recipe whose id matches
 * something already stored but whose contents differ comes in under a fresh id
 * rather than overwriting. An exact match is simply skipped.
 */
export function planImport(existing, incoming, { id } = {}) {
  const byId = new Map(existing.map((recipe) => [recipe.id, recipe]));
  const toSave = [];
  let duplicates = 0;

  for (const recipe of incoming) {
    const clash = byId.get(recipe.id);

    if (clash && sameRecipe(clash, recipe)) {
      duplicates += 1;
      continue;
    }

    toSave.push(
      clash
        ? { ...recipe, id: id ? id() : crypto.randomUUID() }
        : { ...recipe },
    );
  }

  return { toSave, added: toSave.length, duplicates };
}
