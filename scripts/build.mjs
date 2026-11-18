import * as sass from "sass-embedded";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
export async function buildApp() {
  await mkdir("dist", { recursive: true });
  await build({
    entryPoints: ["src/App.jsx"],
    bundle: true,
    outdir: "dist",
    entryNames: "app",
    minify: true,
    legalComments: "eof",
    define: { "process.env.NODE_ENV": '"production"' },
    target: ["es2022"],
  });
  const css = sass.compile("src/style.scss", { style: "expanded" }).css;
  const processed = await postcss([autoprefixer]).process(css, { from: "src/style.scss", to: "dist/app.css" });
  await writeFile("dist/app.css", processed.css);
  await writeFile(
    "dist/index.html",
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#132b22"><title>Orbit Desk — Personal mission control</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js" defer></script></body></html>',
  );
  console.log("Production build created in dist.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildApp();
