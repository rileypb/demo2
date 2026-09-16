import test from "node:test";
import assert from "node:assert/strict";

// Verifies the toolchain itself: node --test discovers this file, ES module
// syntax works without a build step, and strict assertions are wired up.
// Safe to delete once real test files exist.
test("test harness runs ES modules with strict assertions", () => {
  assert.equal(typeof test, "function");
  assert.throws(() => assert.equal(1, "1"));
});
