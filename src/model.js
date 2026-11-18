export const STORAGE_KEY = "orbit-desk.tasks.v1";
export const PROJECTS = ["Study", "Personal", "Project"];
export const PRIORITIES = ["High", "Medium", "Low"];
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDate(date);
}
export function validateTitle(value) {
  const title = String(value).trim();
  if (!title) return { error: "Give your mission a name." };
  if (title.length > 140)
    return { error: "Keep the mission name to 140 characters or fewer." };
  return { title };
}
export function validDate(value) {
  if (value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}
export function normalizeTasks(value) {
  if (!Array.isArray(value)) throw new Error("Saved tasks must be a list.");
  const ids = new Set();
  return value
    .filter((task) => {
      if (
        !task ||
        typeof task.id !== "string" ||
        !task.id ||
        ids.has(task.id) ||
        typeof task.title !== "string" ||
        validateTitle(task.title).error ||
        !PROJECTS.includes(task.project) ||
        !PRIORITIES.includes(task.priority) ||
        !validDate(task.due) ||
        typeof task.done !== "boolean"
      )
        return false;
      ids.add(task.id);
      return true;
    })
    .map((task) => ({
      id: task.id,
      title: task.title.trim(),
      project: task.project,
      priority: task.priority,
      due: task.due,
      done: task.done,
    }));
}
export function initialTasks() {
  return [
    {
      id: "sample-1",
      title: "Finish the React laboratory",
      project: "Study",
      priority: "High",
      due: offsetDate(0),
      done: false,
    },
    {
      id: "sample-2",
      title: "Read a chapter of the astronomy book",
      project: "Personal",
      priority: "Low",
      due: offsetDate(0),
      done: false,
    },
    {
      id: "sample-3",
      title: "Sketch ideas for the portfolio",
      project: "Project",
      priority: "Medium",
      due: offsetDate(1),
      done: false,
    },
    {
      id: "sample-4",
      title: "Take a walk and clear my head",
      project: "Personal",
      priority: "Low",
      due: offsetDate(0),
      done: false,
    },
    {
      id: "sample-5",
      title: "Review this week’s lecture notes",
      project: "Study",
      priority: "Medium",
      due: offsetDate(2),
      done: false,
    },
    {
      id: "sample-6",
      title: "Set up the project workspace",
      project: "Project",
      priority: "Medium",
      due: offsetDate(0),
      done: true,
    },
  ];
}
export function selectTasks(
  tasks,
  {
    view = "all",
    project = "all",
    query = "",
    sort = "priority",
    today = localDate(),
  } = {},
) {
  const ranks = { High: 0, Medium: 1, Low: 2 };
  return tasks
    .filter(
      (task) =>
        (view === "all" ||
          (view === "today" && task.due === today && !task.done) ||
          (view === "upcoming" && task.due > today && !task.done) ||
          (view === "completed" && task.done)) &&
        (project === "all" || task.project === project) &&
        task.title.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title)
        : sort === "due"
          ? (a.due || "9999").localeCompare(b.due || "9999")
          : Number(a.done) - Number(b.done) ||
            ranks[a.priority] - ranks[b.priority],
    );
}
export function toggleTask(tasks, id) {
  return tasks.map((task) =>
    task.id === id ? { ...task, done: !task.done } : task,
  );
}
export function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}
