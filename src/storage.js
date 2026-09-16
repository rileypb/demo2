// The only module that talks to localStorage. Everything else is handed data.

export const STORAGE_KEY = "nutribook.v1";

const clone = (value) => structuredClone(value);

/**
 * A recipe store over any localStorage-shaped object ({getItem, setItem}).
 * Tests pass a plain object; the browser passes window.localStorage.
 */
export function createRecipeStore(storage) {
  function read() {
    let raw;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      // Private browsing and blocked site data can throw on access.
      return [];
    }
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      // Anything but a recipe array means data we did not write, or wrote in
      // an older shape. Start clean rather than crash the app on load.
      return Array.isArray(parsed?.recipes) ? parsed.recipes : [];
    } catch {
      return [];
    }
  }

  function write(recipes) {
    storage.setItem(STORAGE_KEY, JSON.stringify({ recipes }));
  }

  return {
    /** Every stored recipe. The caller gets a copy it can safely mutate. */
    all: () => clone(read()),

    get(id) {
      const found = read().find((recipe) => recipe.id === id);
      return found ? clone(found) : undefined;
    },

    /** Inserts a recipe, or replaces the existing one with the same id. */
    save(recipe) {
      const recipes = read();
      const index = recipes.findIndex((stored) => stored.id === recipe.id);

      if (index === -1) {
        recipes.push(clone(recipe));
      } else {
        recipes[index] = clone(recipe);
      }

      write(recipes);
      return clone(recipe);
    },

    remove(id) {
      write(read().filter((recipe) => recipe.id !== id));
    },
  };
}
