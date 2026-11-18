import test from "node:test";
import assert from "node:assert/strict";
import {
  validateTitle,
  validDate,
  normalizeTasks,
  selectTasks,
  toggleTask,
  removeTask,
} from "../src/model.js";
const tasks = [
  {
    id: "a",
    title: "Read notes",
    project: "Study",
    priority: "Low",
    due: "2026-11-08",
    done: false,
  },
  {
    id: "b",
    title: "Build prototype",
    project: "Project",
    priority: "High",
    due: "2026-11-09",
    done: false,
  },
  {
    id: "c",
    title: "Done task",
    project: "Personal",
    priority: "Medium",
    due: "",
    done: true,
  },
];
test("rejects blank names and trims legitimate names", () => {
  assert.ok(validateTitle("  ").error);
  assert.equal(validateTitle(" Launch ").title, "Launch");
  assert.ok(validateTitle("x".repeat(141)).error);
});
test("validates calendar dates rather than accepting rollover dates", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(validDate(""), true);
  assert.equal(validDate("bad"), false);
});
test("combines search, view and collection filters", () => {
  assert.deepEqual(
    selectTasks(tasks, {
      view: "today",
      query: "NOTES",
      project: "Study",
      today: "2026-11-08",
    }).map((t) => t.id),
    ["a"],
  );
  assert.equal(
    selectTasks(tasks, { view: "upcoming", today: "2026-11-08" }).length,
    1,
  );
  assert.equal(selectTasks(tasks, { query: "missing" }).length, 0);
});
test("toggle and delete affect only the selected entry, without mutating the source", () => {
  const updated = toggleTask(tasks, "a");
  assert.equal(updated[0].done, true);
  assert.equal(tasks[0].done, false);
  assert.deepEqual(
    removeTask(tasks, "b").map((t) => t.id),
    ["a", "c"],
  );
  assert.equal(tasks.length, 3);
});
test("normalizes storage and rejects duplicates and malformed records", () => {
  assert.equal(
    normalizeTasks([
      ...tasks,
      tasks[0],
      { ...tasks[0], id: "bad", due: "2026-02-30" },
      null,
    ]).length,
    3,
  );
  assert.throws(() => normalizeTasks({}));
});
