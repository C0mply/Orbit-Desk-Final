# Orbit Desk

Final project for Web Application Development Tools. Orbit Desk extends the React task planner from Laboratory Work N2 with an Express REST API and database persistence.

## Start

Use Node.js 24 or newer. Run `npm ci` and `npm start`. Open http://localhost:3003. The application binds to loopback for a single-user classroom demonstration. Windows users can also run `start.cmd` after installing dependencies.

SQLite is the default. Tasks are stored in `data/orbit.sqlite`; the first launch seeds six example tasks. The server records initialization, so deleting every task does not reseed the list. To use the optional MongoDB adapter, start MongoDB separately and set `MONGODB_URI` to its connection URI before running `npm start`. The SQLite adapter was verified locally. MongoDB execution was blocked by Windows application control during verification.

## Application

Create and edit a mission, complete or reopen it, delete it and undo the latest deletion. Search, view filters, collection filters and sorting work in the browser. The progress summary updates after successful writes. React reloads the list from the API after a page refresh.

| Method | Route | Result |
|---|---|---|
| GET | /api/tasks | 200 with the task list |
| POST | /api/tasks | 201 with the created task |
| PUT | /api/tasks/:id | 200 with the updated task |
| DELETE | /api/tasks/:id | 204 after removal |

Requests use JSON and server-side validation. Task fields are id, title, project, priority, due date and done. Missing items return 404 and invalid task data returns 400. SQLite statements use parameters. The app has a single local workspace and no account system.

## Build and verification

`npm run build` bundles React through esbuild and compiles `src/style.scss` with Dart Sass. PostCSS then runs Autoprefixer on the result. The SCSS uses variables, a focus mixin and nested rules.

`npm test` runs five domain tests. Browser verification covered creating, reloading, editing, completing, filtering, searching, deleting, undoing and checking the layout at 390 px. An API request with invalid task data returned 400.

Source, build instructions and screenshots are in this repository. The PDF report and presentation are in the submission folder.
