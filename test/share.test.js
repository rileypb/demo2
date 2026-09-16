import test from "node:test";
import assert from "node:assert/strict";

import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  toExportDocument,
  toExportFilename,
  toShareText,
} from "../src/share.js";

const soup = {
  id: "r1",
  name: "Lentil Soup",
  servings: 4,
  ingredients: [
    { name: "lentils", quantity: 200, unit: "g" },
    { name: "carrot", quantity: 2, unit: "" },
  ],
  createdAt: "2026-09-16T00:00:00.000Z",
};

const toast = {
  id: "r2",
  name: "Toast & Jam",
  servings: 1,
  ingredients: [{ name: "bread", quantity: 2, unit: "slice" }],
  createdAt: "2026-09-16T00:00:00.000Z",
};

const at = (iso) => ({ now: () => new Date(iso) });
const noon = at("2026-09-16T12:00:00.000Z");

test("an export document is tagged with format and version", () => {
  const doc = toExportDocument([soup], noon);

  assert.equal(doc.format, EXPORT_FORMAT);
  assert.equal(doc.version, EXPORT_VERSION);
});

test("an export document records when it was exported", () => {
  assert.equal(toExportDocument([soup], noon).exportedAt, "2026-09-16T12:00:00.000Z");
});

test("an export document carries the recipes verbatim", () => {
  assert.deepEqual(toExportDocument([soup, toast], noon).recipes, [soup, toast]);
});

test("an export document is plain JSON-safe data", () => {
  const doc = toExportDocument([soup], noon);
  assert.deepEqual(JSON.parse(JSON.stringify(doc)), doc);
});

test("exporting nothing is refused rather than writing an empty file", () => {
  assert.throws(() => toExportDocument([], noon), /nothing to export/i);
});

test("one recipe exports under its own name", () => {
  assert.equal(toExportFilename([soup], noon), "lentil-soup.nutribook.json");
});

test("a filename is safe even when the recipe name is not", () => {
  assert.equal(toExportFilename([toast], noon), "toast-jam.nutribook.json");
});

test("a recipe named only in punctuation still gets a usable filename", () => {
  assert.equal(
    toExportFilename([{ ...soup, name: "!!!" }], noon),
    "recipe.nutribook.json",
  );
});

test("several recipes export under a dated collection name", () => {
  assert.equal(
    toExportFilename([soup, toast], noon),
    "nutribook-recipes-2026-09-16.json",
  );
});

test("share text leads with the name and servings", () => {
  const lines = toShareText(soup).split("\n");

  assert.equal(lines[0], "Lentil Soup");
  assert.equal(lines[1], "Serves 4");
});

test("share text lists each ingredient with quantity and unit", () => {
  assert.match(toShareText(soup), /^- 200 g lentils$/m);
});

test("share text omits a missing unit rather than leaving a gap", () => {
  assert.match(toShareText(soup), /^- 2 carrot$/m);
});

test("share text says where it came from", () => {
  assert.match(toShareText(soup), /NutriBook/);
});

test("share text uses a single serving when there is one", () => {
  assert.match(toShareText(toast), /^Serves 1$/m);
});
