# NutriBook

We are creating a nutrition value calculator that allows the user to store recipes and search for them. For each recipe the app will calculate its nutrition values, and rate them as high protein, high carb, etc.

## What kind of app this is

A **local, browser-based, vanilla JavaScript app**. No framework, no build step, no bundler, no server.

- Plain ES modules (`<script type="module">`), loaded directly by the browser.
- No runtime dependencies. No React, no Vue, no jQuery, no CSS framework.
- `npm` is used only for the test runner and nothing else.
- All data lives on the user's machine in `localStorage`. There is no account, no sync, no network request.
- Run it with `npm start`, then open http://localhost:8000. (That script is just `python3 -m http.server`; a plain static server is needed because `file://` blocks ES module loading.) Never introduce a build step.

## Test-first is the rule

Every change starts with a failing test. Do not write implementation code before a test that fails for the right reason exists.

The cycle, one small behavior at a time:

1. Write a test that describes the next behavior. Run it. **Confirm it fails**, and that the failure message is about the missing behavior, not a typo or a bad import.
2. Write the smallest implementation that makes it pass.
3. Run the whole suite. Everything must be green.
4. Refactor if needed, with the suite staying green.
5. Commit.

Rules that follow from this:

- If asked to add a feature, the first file touched is a test file.
- Never delete or weaken a test to make the suite pass. If a test is genuinely wrong, say so and explain why before changing it.
- A bug report becomes a test that reproduces the bug first, then a fix.
- Don't write tests after the fact to cover code that was already written; that is not what this project does.
- Tests are not optional for "small" changes.

## Testing setup

Node's built-in test runner (`node --test`). Node 25 is installed; it runs ES modules and needs no dependencies.

```
npm test          # run the whole suite
npm run test:watch  # re-run continuously while working
```

- Tests live in `test/`, named `<module>.test.js`, mirroring `src/`.
- Import with `node:test` and `node:assert/strict`.
- No mocking library. Pass collaborators in as arguments so tests can supply plain objects.

## Structure

```
index.html          entry point, minimal markup
styles.css          hand-written CSS
src/
  nutrition.js      nutrition math for a recipe
  ratings.js        high-protein / high-carb / etc. classification
  recipes.js        recipe model, validation
  storage.js        localStorage read/write, the only place that touches it
  search.js         recipe search and filtering
  ui.js             DOM rendering and event wiring
test/
  nutrition.test.js
  ...
```

## Keep logic testable

The reason the structure looks like that: **the DOM is a thin edge, not where the thinking happens.**

- Nutrition math, ratings, validation, and search are pure functions over plain objects. They import nothing from the browser and are tested directly under Node.
- `ui.js` reads state, calls those functions, and writes DOM. It holds no business rules.
- `storage.js` is the only module that names `localStorage`. Everything else receives data.
- If a piece of logic is hard to test without a DOM, that is a signal it is in the wrong module — move it, don't reach for a DOM emulator.

## Code style

- Modern JS: `const`/`let`, arrow functions, destructuring, optional chaining, `async`/`await`. No transpiling, so anything current browsers support is fair game.
- Named exports, one concern per module.
- Pure functions by default; no shared mutable module-level state.
- Recipes and nutrition totals are plain serializable objects — no classes wrapping data.
- Two-space indent, semicolons, double quotes.
- Comments explain *why*, not *what*. Most functions should not need one.

## General Rules
- Don't commit to git unless explicitly told to.
- Ask questions if a requirement is ambiguous or there are other open questions.
- I will give you user stories and you will implement them.