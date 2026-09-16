import test from "node:test";
import assert from "node:assert/strict";

import {
  EXPORT_FORMAT,
  toExportDocument,
  readExport,
  planImport,
} from "../src/share.js";

const soup = {
  id: "r1",
  name: "Lentil Soup",
  servings: 4,
  ingredients: [{ name: "lentils", quantity: 200, unit: "g" }],
  createdAt: "2026-09-16T00:00:00.000Z",
};

const toast = { ...soup, id: "r2", name: "Toast" };

const fileWith = (recipes) =>
  JSON.stringify(toExportDocument(recipes, { now: () => new Date(0) }));

const deps = { id: () => "fresh-id" };

test("a file this app exported reads back as the same recipes", () => {
  assert.deepEqual(readExport(fileWith([soup, toast])).recipes, [soup, toast]);
});

test("text that is not JSON is refused", () => {
  assert.throws(() => readExport("{not json"), /not a NutriBook export/i);
});

test("JSON without the NutriBook format tag is refused", () => {
  assert.throws(
    () => readExport(JSON.stringify({ recipes: [soup] })),
    /not a NutriBook export/i,
  );
});

test("a file from a newer version is refused with a clear reason", () => {
  assert.throws(
    () => readExport(JSON.stringify({ format: EXPORT_FORMAT, version: 99, recipes: [soup] })),
    /newer version of NutriBook/i,
  );
});

test("a well-formed file with no recipes is refused", () => {
  assert.throws(
    () => readExport(JSON.stringify({ format: EXPORT_FORMAT, version: 1, recipes: [] })),
    /no recipes/i,
  );
});

test("unusable recipes are dropped, the rest still import", () => {
  const file = JSON.stringify({
    format: EXPORT_FORMAT,
    version: 1,
    recipes: [soup, { name: "", servings: 0, ingredients: [] }],
  });
  const result = readExport(file);

  assert.deepEqual(result.recipes, [soup]);
  assert.equal(result.rejected, 1);
});

test("a file of only unusable recipes is refused", () => {
  assert.throws(
    () =>
      readExport(
        JSON.stringify({
          format: EXPORT_FORMAT,
          version: 1,
          recipes: [{ name: "", servings: 0, ingredients: [] }],
        }),
      ),
    /no recipes/i,
  );
});

test("an imported recipe missing an id is given one", () => {
  const { id, ...noId } = soup;
  const file = JSON.stringify({ format: EXPORT_FORMAT, version: 1, recipes: [noId] });

  assert.equal(readExport(file, deps).recipes[0].id, "fresh-id");
});

test("importing into an empty book saves everything", () => {
  const plan = planImport([], [soup, toast], deps);

  assert.deepEqual(plan.toSave, [soup, toast]);
  assert.equal(plan.added, 2);
  assert.equal(plan.duplicates, 0);
});

test("a recipe already held identically is skipped", () => {
  const plan = planImport([soup], [soup], deps);

  assert.deepEqual(plan.toSave, []);
  assert.equal(plan.added, 0);
  assert.equal(plan.duplicates, 1);
});

test("a different recipe sharing an id is imported alongside, never over", () => {
  const theirs = { ...soup, name: "Their Lentil Soup" };
  const plan = planImport([soup], [theirs], deps);

  assert.equal(plan.toSave.length, 1);
  assert.equal(plan.toSave[0].name, "Their Lentil Soup");
  // A fresh id, so the cook's own version survives.
  assert.equal(plan.toSave[0].id, "fresh-id");
  assert.equal(plan.added, 1);
});

test("planning an import never mutates what is already stored", () => {
  const existing = [soup];
  const snapshot = structuredClone(existing);
  planImport(existing, [{ ...soup, name: "Theirs" }], deps);

  assert.deepEqual(existing, snapshot);
});
