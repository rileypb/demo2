// Entry point: reads the DOM, calls the logic modules, writes the DOM back.
// No business rules live here — see CLAUDE.md.

import {
  createRecipe,
  validateRecipe,
  describeRecipe,
  InvalidRecipeError,
} from "./recipes.js";
import { createRecipeStore } from "./storage.js";
import {
  toExportDocument,
  toExportFilename,
  toShareText,
  readExport,
  planImport,
} from "./share.js";

const store = createRecipeStore(window.localStorage);

const els = {
  form: document.querySelector("#recipe-form"),
  name: document.querySelector("#recipe-name"),
  servings: document.querySelector("#recipe-servings"),
  ingredients: document.querySelector("#ingredient-list"),
  addIngredient: document.querySelector("#add-ingredient"),
  problems: document.querySelector("#recipe-problems"),
  newRecipe: document.querySelector("#new-recipe"),
  list: document.querySelector("#recipe-list"),
  exportAll: document.querySelector("#export-all"),
  importButton: document.querySelector("#import-recipes"),
  importFile: document.querySelector("#import-file"),
  importStatus: document.querySelector("#import-status"),
  exportRecipe: document.querySelector("#export-recipe"),
  copyRecipe: document.querySelector("#copy-recipe"),
  shareStatus: document.querySelector("#share-status"),
  listEmpty: document.querySelector("#recipe-list-empty"),
};

// The recipe currently open in the form; null means we are entering a new one.
let editingId = null;

function addIngredientRow({ name = "", quantity = "", unit = "" } = {}) {
  const row = document.createElement("li");
  row.className = "ingredient-row";
  row.innerHTML = `
    <input class="ingredient-name" type="text" placeholder="Ingredient" aria-label="Ingredient name" />
    <input class="ingredient-quantity" type="number" min="0" step="any" placeholder="Qty" aria-label="Quantity" />
    <input class="ingredient-unit" type="text" placeholder="Unit" aria-label="Unit" />
    <button type="button" class="remove-ingredient" aria-label="Remove ingredient">&times;</button>
  `;

  row.querySelector(".ingredient-name").value = name;
  row.querySelector(".ingredient-quantity").value = quantity;
  row.querySelector(".ingredient-unit").value = unit;

  row.querySelector(".remove-ingredient").addEventListener("click", () => {
    row.remove();
    if (els.ingredients.children.length === 0) addIngredientRow();
  });

  els.ingredients.append(row);
  return row;
}

function readForm() {
  return {
    name: els.name.value,
    servings: els.servings.value,
    ingredients: [...els.ingredients.querySelectorAll(".ingredient-row")]
      .map((row) => ({
        name: row.querySelector(".ingredient-name").value,
        quantity: row.querySelector(".ingredient-quantity").value,
        unit: row.querySelector(".ingredient-unit").value,
      }))
      // Blank rows are the cook not filling one in, not an error.
      .filter(
        (ingredient) =>
          ingredient.name.trim() !== "" || ingredient.quantity.trim() !== "",
      ),
  };
}

function showProblems(problems) {
  els.problems.replaceChildren(
    ...problems.map((problem) => {
      const item = document.createElement("li");
      item.textContent = problem;
      return item;
    }),
  );
}

function loadIntoForm(recipe) {
  editingId = recipe?.id ?? null;
  els.name.value = recipe?.name ?? "";
  els.servings.value = recipe?.servings ?? 4;
  els.ingredients.replaceChildren();

  const ingredients = recipe?.ingredients?.length ? recipe.ingredients : [{}];
  ingredients.forEach(addIngredientRow);

  showProblems([]);
  announce("");
  els.exportRecipe.hidden = editingId === null;
  els.copyRecipe.hidden = editingId === null;
  renderList();
  els.name.focus();
}

function renderList() {
  const recipes = store
    .all()
    .sort((a, b) => a.name.localeCompare(b.name));

  els.listEmpty.hidden = recipes.length > 0;
  els.exportAll.disabled = recipes.length === 0;

  els.list.replaceChildren(
    ...recipes.map((recipe) => {
      const item = document.createElement("li");
      item.className = recipe.id === editingId ? "is-open" : "";

      const open = document.createElement("button");
      open.type = "button";
      open.className = "link";
      open.textContent = recipe.name;
      open.addEventListener("click", () => loadIntoForm(store.get(recipe.id)));

      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = describeRecipe(recipe);

      item.append(open, meta);
      return item;
    }),
  );
}

function announce(message) {
  els.shareStatus.textContent = message;
}

/** Hands the browser a file to save. The only side effect in this module. */
function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportRecipes(recipes) {
  try {
    downloadJSON(toExportFilename(recipes), toExportDocument(recipes));
    announce(
      recipes.length === 1
        ? `Exported “${recipes[0].name}”.`
        : `Exported ${recipes.length} recipes.`,
    );
  } catch (error) {
    announce(error.message);
  }
}

els.addIngredient.addEventListener("click", () => {
  addIngredientRow().querySelector(".ingredient-name").focus();
});

els.newRecipe.addEventListener("click", () => loadIntoForm(null));

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = readForm();

  // Show problems as the model sees them, before attempting to build.
  const problems = validateRecipe(input);
  if (problems.length > 0) {
    showProblems(problems);
    return;
  }

  try {
    const existing = editingId ? store.get(editingId) : null;
    const recipe = createRecipe(input, {
      // Editing keeps the recipe's identity and original creation time.
      id: existing ? () => existing.id : undefined,
      now: existing ? () => existing.createdAt : undefined,
    });
    store.save(recipe);
    loadIntoForm(null);
  } catch (error) {
    if (error instanceof InvalidRecipeError) {
      showProblems(error.problems);
      return;
    }
    throw error;
  }
});

loadIntoForm(null);

els.exportAll.addEventListener("click", () => exportRecipes(store.all()));

els.exportRecipe.addEventListener("click", () => {
  const recipe = store.get(editingId);
  if (recipe) exportRecipes([recipe]);
});

els.copyRecipe.addEventListener("click", async () => {
  const recipe = store.get(editingId);
  if (!recipe) return;

  const text = toShareText(recipe);
  try {
    await navigator.clipboard.writeText(text);
    announce("Copied to clipboard.");
  } catch {
    // Clipboard access needs a secure context and permission; neither is
    // guaranteed for a local file, so fall back to something selectable.
    announce("Clipboard unavailable — press Ctrl/Cmd+C to copy:\n" + text);
  }
});

els.importButton.addEventListener("click", () => els.importFile.click());

els.importFile.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const { recipes, rejected } = readExport(await file.text());
    const plan = planImport(store.all(), recipes);
    plan.toSave.forEach((recipe) => store.save(recipe));

    const notes = [`Imported ${plan.added} of ${recipes.length}.`];
    if (plan.duplicates > 0) notes.push(`${plan.duplicates} already here.`);
    if (rejected > 0) notes.push(`${rejected} could not be read.`);
    els.importStatus.textContent = notes.join(" ");

    renderList();
  } catch (error) {
    els.importStatus.textContent = error.message;
  } finally {
    // Reset, so picking the same file again still fires a change event.
    event.target.value = "";
  }
});
