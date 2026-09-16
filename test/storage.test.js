import test from "node:test";
import assert from "node:assert/strict";

import { createRecipeStore, STORAGE_KEY } from "../src/storage.js";

// A stand-in for localStorage: same tiny interface, plain object inside.
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

const soup = {
  id: "r1",
  name: "Lentil Soup",
  servings: 4,
  ingredients: [{ name: "lentils", quantity: 200, unit: "g" }],
  createdAt: "2026-09-16T00:00:00.000Z",
};

const toast = { ...soup, id: "r2", name: "Toast" };

test("a fresh store has no recipes", () => {
  const store = createRecipeStore(fakeStorage());
  assert.deepEqual(store.all(), []);
});

test("a saved recipe can be read back", () => {
  const store = createRecipeStore(fakeStorage());
  store.save(soup);

  assert.deepEqual(store.all(), [soup]);
  assert.deepEqual(store.get("r1"), soup);
});

test("recipes survive a new store over the same storage", () => {
  const storage = fakeStorage();
  createRecipeStore(storage).save(soup);

  // A later visit: fresh store object, same underlying storage.
  assert.deepEqual(createRecipeStore(storage).all(), [soup]);
});

test("saving a recipe with an existing id replaces it in place", () => {
  const store = createRecipeStore(fakeStorage());
  store.save(soup);
  store.save(toast);
  store.save({ ...soup, name: "Better Lentil Soup" });

  assert.deepEqual(
    store.all().map((recipe) => recipe.name),
    ["Better Lentil Soup", "Toast"],
  );
});

test("get returns undefined for an unknown id", () => {
  const store = createRecipeStore(fakeStorage());
  assert.equal(store.get("nope"), undefined);
});

test("a removed recipe is gone", () => {
  const store = createRecipeStore(fakeStorage());
  store.save(soup);
  store.save(toast);
  store.remove("r1");

  assert.deepEqual(
    store.all().map((recipe) => recipe.id),
    ["r2"],
  );
});

test("corrupt stored data reads as empty rather than throwing", () => {
  const store = createRecipeStore(fakeStorage({ [STORAGE_KEY]: "{not json" }));
  assert.deepEqual(store.all(), []);
});

test("stored data of the wrong shape reads as empty", () => {
  const store = createRecipeStore(
    fakeStorage({ [STORAGE_KEY]: '{"recipes":"nope"}' }),
  );
  assert.deepEqual(store.all(), []);
});

test("callers cannot mutate the store through the list they get back", () => {
  const store = createRecipeStore(fakeStorage());
  store.save(soup);

  store.all().push(toast);
  store.all()[0].name = "Tampered";

  assert.deepEqual(
    store.all().map((recipe) => recipe.name),
    ["Lentil Soup"],
  );
});

test("what lands in storage is JSON", () => {
  const storage = fakeStorage();
  createRecipeStore(storage).save(soup);

  assert.deepEqual(JSON.parse(storage.data[STORAGE_KEY]).recipes, [soup]);
});
