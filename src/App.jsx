import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  PROJECTS,
  PRIORITIES,
  validateTitle,
  validDate,
  localDate,
  selectTasks,
} from "./model.js";
import { request } from "./api.js";
function Icon({ name, size = 20 }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4m10-4v4M3 11h18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
      </>
    ),
    edit: (
      <>
        <path d="m15 4 5 5M4 20l4-1L20 7a3 3 0 0 0-4-4L4 15z" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    rocket: (
      <>
        <path d="M12 14C6 8 11 3 21 3c0 10-5 15-11 9M7 10l-4 1 4 4m7 2-1 4-4-4M5 19l-1 1" />
        <circle cx="16" cy="8" r="2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.grid}
    </svg>
  );
}
function App() {
  const [tasks, setTasks] = useState([]);
  const [storageError, setStorageError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const busy = useRef(false);
  const [view, setView] = useState("all");
  const [project, setProject] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("priority");
  const [notice, setNotice] = useState("");
  const [deleted, setDeleted] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({
    title: "",
    project: "Study",
    priority: "Medium",
    due: localDate(),
  });
  const [formError, setFormError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef(null),
    titleInput = useRef(null),
    returnFocus = useRef(null);
  const today = localDate();
  const completed = tasks.filter((task) => task.done).length;
  const pending = tasks.length - completed;
  const dueToday = tasks.filter(
    (task) => task.due === today && !task.done,
  ).length;
  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  const visible = selectTasks(tasks, { view, project, query, sort, today });
  const labels = {
    all: "All missions",
    today: "Today’s missions",
    upcoming: "Upcoming missions",
    completed: "Completed missions",
  };
  function loadTasks() {
    request().then((items) => {
      setTasks(items);
      setLoaded(true);
      setStorageError("");
    }).catch(() => setStorageError("Could not load tasks. Check the server and retry."));
  }
  useEffect(loadTasks, []);
  async function save(action) {
    if (!loaded || busy.current) return;
    busy.current = true;
    setStorageError("");
    try { await action(); }
    catch (error) {
      setStorageError(error.message);
      if (dialog.current.open) setFormError(error.message);
    } finally { busy.current = false; }
  }
  function announce(message) {
    setNotice(message);
  }
  function navigate(next, category = "all") {
    setView(next);
    setProject(category);
    setMenuOpen(false);
    setQuery("");
  }
  function openEditor(task = null) {
    returnFocus.current = document.activeElement;
    setEditing(task?.id || null);
    setDraft(
      task
        ? {
            title: task.title,
            project: task.project,
            priority: task.priority,
            due: task.due,
          }
        : {
            title: "",
            project: project === "all" ? "Study" : project,
            priority: "Medium",
            due: today,
          },
    );
    setFormError("");
    dialog.current.showModal();
    requestAnimationFrame(() => titleInput.current?.focus());
  }
  function closeEditor() {
    dialog.current.close();
    returnFocus.current?.focus();
  }
  function submit(event) {
    event.preventDefault();
    const validated = validateTitle(draft.title);
    if (validated.error) {
      setFormError(validated.error);
      titleInput.current.focus();
      return;
    }
    if (!validDate(draft.due)) {
      setFormError("Choose a valid due date.");
      return;
    }
    const entry = { ...draft, title: validated.title };
    save(async () => {
      const existing = tasks.find((task) => task.id === editing);
      const task = await request(existing ? "/" + existing.id : "", existing ? "PUT" : "POST",
        existing ? { ...existing, ...entry } : { id: crypto.randomUUID(), ...entry, done: false });
      setTasks((items) => existing ? items.map((item) => item.id === task.id ? task : item) : [task, ...items]);
      setDeleted(null);
      announce(existing ? "Mission updated." : "New mission added.");
      closeEditor();
    });
  }
  function toggle(id) {
    save(async () => {
      const entry = tasks.find((task) => task.id === id);
      const task = await request("/" + id, "PUT", { ...entry, done: !entry.done });
      setTasks((items) => items.map((item) => item.id === id ? task : item));
      setDeleted(null);
      announce("Mission status updated.");
    });
  }
  function erase(task) {
    save(async () => {
      await request("/" + task.id, "DELETE");
      setTasks((items) => items.filter((item) => item.id !== task.id));
      setDeleted(task);
      announce(`Deleted “${task.title}”.`);
    });
  }
  function undo() {
    if (!deleted) return;
    save(async () => {
      const task = await request("", "POST", deleted);
      setTasks((items) => [task, ...items]);
      setDeleted(null);
      announce("Mission restored.");
    });
  }
  if (!loaded) return <main><h1>Orbit Desk</h1>{storageError ? <><p role="alert">{storageError}</p><button onClick={loadTasks}>Retry</button></> : <p role="status">Loading missions…</p>}</main>;
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (menuOpen ? "mobile-open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            navigate("all");
          }}
        >
          <span className="orbit-logo" aria-hidden="true">
            <i />
          </span>
          <span>
            orbit<span className="brand-light">desk</span>
            <small>A LITTLE SPACE TO FOCUS</small>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">O</span>
          <span>
            Personal workspace<small>Your own little universe</small>
          </span>
          <span className="workspace-dot" />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Mission views">
          {[
            ["all", "grid", "All missions", tasks.length],
            ["today", "sun", "Today", dueToday],
            [
              "upcoming",
              "calendar",
              "Upcoming",
              tasks.filter((t) => t.due > today && !t.done).length,
            ],
            ["completed", "check", "Completed", completed],
          ].map(([key, icon, label, count]) => (
            <button
              key={key}
              className={
                "nav-item " +
                (view === key && project === "all" ? "selected" : "")
              }
              onClick={() => navigate(key)}
              aria-current={
                view === key && project === "all" ? "page" : undefined
              }
            >
              <Icon name={icon} />
              <span>{label}</span>
              <span className="nav-count">{count}</span>
            </button>
          ))}
        </nav>
        <p className="nav-label project-label">COLLECTIONS</p>
        <div className="collections">
          {PROJECTS.map((name) => (
            <button
              key={name}
              className={project === name ? "chosen" : ""}
              onClick={() => navigate("all", name)}
            >
              <span className={"collection-dot " + name.toLowerCase()} />
              {name}
              <span>{tasks.filter((t) => t.project === name).length}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-note">
          <span className="mini-stars">✧ · ✧</span>
          <h3>
            Small steps.
            <br />
            Bigger horizons.
          </h3>
          <p>
            You don’t need to do it all.
            <br />
            Just start with one mission.
          </p>
          <button onClick={() => openEditor()}>
            Plan your next step <Icon name="arrow" size={16} />
          </button>
        </div>
        <div className="local-profile">
          <span className="profile-avatar">
            <Icon name="rocket" size={18} />
          </span>
          <span>
            Independent explorer<small>Saved to the database</small>
          </span>
          <span className="online-dot" />
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name="menu" />
            </button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>Mission control</strong>
          </div>
          <div className="topbar-right">
            <span className="save-indicator">
              <i />
              {storageError ? "Server error" : "Local workspace"}
            </span>
            <span className="topbar-date">
              {new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">MAKE ROOM FOR WHAT MATTERS</p>
              <h1>
                Your day, in orbit<span>.</span>
              </h1>
              <p>
                A clear head starts with a clear plan. Let’s find your next
                small step.
              </p>
            </div>
            <button
              className="primary-button heading-add"
              onClick={() => openEditor()}
            >
              <Icon name="plus" size={18} />
              New mission
            </button>
          </div>
          {storageError && (
            <p className="storage-warning" role="alert">
              {storageError}
            </p>
          )}
          <section className="overview" aria-label="Mission overview">
            <div className="stat">
              <span className="stat-icon green">
                <Icon name="grid" />
              </span>
              <div>
                <p>Total missions</p>
                <strong>{tasks.length.toString().padStart(2, "0")}</strong>
                <span>in your universe</span>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon amber">
                <Icon name="sun" />
              </span>
              <div>
                <p>In progress</p>
                <strong>{pending.toString().padStart(2, "0")}</strong>
                <span>one step at a time</span>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon lavender">
                <Icon name="check" />
              </span>
              <div>
                <p>Completed</p>
                <strong>{completed.toString().padStart(2, "0")}</strong>
                <span>small wins count</span>
              </div>
            </div>
            <div className="progress-card">
              <div
                className="progress-ring"
                style={{ "--progress": `${progress}%` }}
              >
                <span>
                  {progress}
                  <small>%</small>
                </span>
              </div>
              <div>
                <strong>You’re making progress</strong>
                <p>
                  {completed} of {tasks.length} missions complete.
                  <br />
                  Keep your momentum going.
                </p>
              </div>
            </div>
          </section>
          <div className="content-columns">
            <section className="missions-panel" aria-labelledby="list-title">
              <div className="list-heading">
                <div>
                  <h2 id="list-title">
                    {project === "all" ? labels[view] : project + " missions"}
                    <span>{visible.length}</span>
                  </h2>
                  <p>
                    {view === "completed"
                      ? "A little proof of how far you’ve come."
                      : "A little intention. A little action. A little closer."}
                  </p>
                </div>
                <label className="sort-label">
                  Sort by
                  <select
                    aria-label="Sort missions"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="priority">Priority</option>
                    <option value="due">Due date</option>
                    <option value="name">Name</option>
                  </select>
                </label>
              </div>
              <div className="list-toolbar">
                <div
                  className="view-pills"
                  role="group"
                  aria-label="Quick mission views"
                >
                  {[
                    ["all", "All missions"],
                    ["today", "Today"],
                    ["completed", "Completed"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      className={view === key ? "active" : ""}
                      aria-pressed={view === key}
                      onClick={() => navigate(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="search-field">
                  <Icon name="search" size={17} />
                  <input
                    type="search"
                    aria-label="Search missions"
                    placeholder="Find a mission…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className="table-head" aria-hidden="true">
                <span>MISSION</span>
                <span>COLLECTION</span>
                <span>PRIORITY</span>
                <span>DUE</span>
                <span />
              </div>
              <ul className="task-list" aria-label="Missions">
                {visible.map((task) => (
                  <li
                    className={"task-row " + (task.done ? "is-done" : "")}
                    key={task.id}
                    data-task-id={task.id}
                  >
                    <label className="task-check">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggle(task.id)}
                        aria-label={`Mark ${task.title} as ${task.done ? "active" : "complete"}`}
                      />
                      <span aria-hidden="true">
                        <Icon name="check" size={13} />
                      </span>
                    </label>
                    <span className="task-title">{task.title}</span>
                    <span
                      className={"project-tag " + task.project.toLowerCase()}
                    >
                      <i />
                      {task.project}
                    </span>
                    <span
                      className={"priority-tag " + task.priority.toLowerCase()}
                    >
                      <i />
                      {task.priority}
                    </span>
                    <span
                      className={
                        "due-date " +
                        (!task.done && task.due && task.due < today
                          ? "overdue"
                          : "")
                      }
                    >
                      {!task.due
                        ? "No date"
                        : task.due === today
                          ? "Today"
                          : new Date(task.due + "T12:00:00").toLocaleDateString(
                              "en-GB",
                              { day: "numeric", month: "short" },
                            )}
                    </span>
                    <div className="task-actions">
                      <button
                        aria-label={`Edit ${task.title}`}
                        onClick={() => openEditor(task)}
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        aria-label={`Delete ${task.title}`}
                        onClick={() => erase(task)}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {visible.length === 0 && (
                <div className="empty-state">
                  <Icon name="rocket" size={32} />
                  <h3>
                    {tasks.length === 0
                      ? "A fresh universe awaits."
                      : "Nothing in this orbit yet."}
                  </h3>
                  <p>
                    {query
                      ? "Try another search or clear your filters."
                      : "Add a mission or explore another view."}
                  </p>
                  <button
                    onClick={() => openEditor()}
                    className="secondary-button"
                  >
                    Add a mission
                  </button>
                </div>
              )}
              <button className="add-row" onClick={() => openEditor()}>
                <Icon name="plus" size={17} />
                Add another small step
                <span>Every mission starts somewhere</span>
              </button>
              <div className="list-footer">
                <span>
                  {visible.length}{" "}
                  {visible.length === 1 ? "mission" : "missions"} in this view
                </span>
                <span>
                  <i />
                  Stored on the server
                </span>
              </div>
            </section>
            <aside className="right-column">
              <section className="focus-card">
                <p className="eyebrow">YOUR DAILY PERSPECTIVE</p>
                <div className="orbital-art" aria-hidden="true">
                  <div className="art-orbit a" />
                  <div className="art-orbit b" />
                  <div className="art-planet" />
                  <span className="art-moon" />
                  <span className="art-star">✧</span>
                  <span className="art-star second">✦</span>
                </div>
                <h2>
                  Focus on your
                  <br />
                  next orbit.
                </h2>
                <p>
                  Big things are built from small, everyday actions. Pick one
                  mission and give it your attention.
                </p>
                <button onClick={() => navigate("today")}>
                  See today’s missions <Icon name="arrow" size={17} />
                </button>
              </section>
              <section className="today-card">
                <div>
                  <span className="today-icon">
                    <Icon name="sun" size={19} />
                  </span>
                  <h3>On the radar</h3>
                  <span className="radar-count">{dueToday}</span>
                </div>
                <p>
                  {dueToday
                    ? `${dueToday} active ${dueToday === 1 ? "mission is" : "missions are"} due today.`
                    : "No active missions due today."}
                  <br />
                  Leave a little space to breathe.
                </p>
                <button onClick={() => navigate("today")}>
                  Take a look <span>↗</span>
                </button>
              </section>
              <p className="sample-note">
                Starts with six sample missions.
                <br />
                Make this space your own.
              </p>
            </aside>
          </div>
          <footer className="page-footer">
            <span>ONE SMALL STEP AT A TIME</span>
            <span>Orbit Desk · Your personal mission control</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        className="mission-dialog"
        aria-labelledby="dialog-title"
        onCancel={() => returnFocus.current?.focus()}
        onClick={(event) => {
          const r = dialog.current.getBoundingClientRect();
          if (
            event.target === dialog.current &&
            (event.clientX < r.left ||
              event.clientX > r.right ||
              event.clientY < r.top ||
              event.clientY > r.bottom)
          )
            closeEditor();
        }}
      >
        <form noValidate onSubmit={submit}>
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">ONE SMALL STEP</p>
              <h2 id="dialog-title">
                {editing ? "Edit your mission" : "Plan a new mission"}
              </h2>
            </div>
            <button type="button" aria-label="Close form" onClick={closeEditor}>
              <Icon name="close" />
            </button>
          </div>
          <label>
            Mission name
            <input
              ref={titleInput}
              aria-label="Mission name"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="What would you like to move forward?"
              maxLength={140}
              aria-invalid={Boolean(formError)}
              aria-describedby={formError ? "form-error" : undefined}
            />
          </label>
          <div className="form-pair">
            <label>
              Collection
              <select
                aria-label="Collection"
                value={draft.project}
                onChange={(e) =>
                  setDraft({ ...draft, project: e.target.value })
                }
              >
                {PROJECTS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                aria-label="Priority"
                value={draft.priority}
                onChange={(e) =>
                  setDraft({ ...draft, priority: e.target.value })
                }
              >
                {PRIORITIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Due date <span className="optional">optional</span>
            <input
              aria-label="Due date"
              type="date"
              value={draft.due}
              onChange={(e) => setDraft({ ...draft, due: e.target.value })}
            />
          </label>
          {formError && (
            <p className="form-error" id="form-error" role="alert">
              {formError}
            </p>
          )}
          <p className="form-hint">
            A small, specific step is a great place to start.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={closeEditor}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button">
              {editing ? "Save changes" : "Add mission"}
              <Icon name="arrow" size={17} />
            </button>
          </div>
        </form>
      </dialog>
      {notice && (
        <div className="toast" role="status" aria-live="polite">
          <Icon name="check" size={18} />
          <span>{notice}</span>
          {deleted && <button onClick={undo}>Undo delete</button>}
          <button
            aria-label="Dismiss notification"
            onClick={() => {
              setNotice("");
              setDeleted(null);
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
