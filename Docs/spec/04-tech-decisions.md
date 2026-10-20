# Tech decisions

Status: signed off 2026-10-18

For each decision: what was chosen, what else was considered, and why, traced to a requirement (Stage 3) or the mission and users (Stages 1 and 2).

> **Constraints going in:** TypeScript and esbuild, the same setup as S-Calc. Obsidian plugin API only. Free to run, no servers. Must pass community review (NFR-07). Safi asked to consider React plus shadcn charts, or Chart.js.
> **Changes:** none yet.

## Overall architecture

- **Choice:** a single plain-TypeScript Obsidian plugin. A code block processor hands each `s-chart` block to a pure parser, which returns a chart spec plus errors. A colour resolver turns the spec, the settings and the live theme into a list of colours. A thin renderer draws the chart with Chart.js inside a `MarkdownRenderChild` that destroys it on unload.
- **Considered:** a CodeMirror 6 extension like S-Calc (not needed: S-Calc paints results while you type, but a chart only has to redraw when the block changes, and the code block processor already does that in live preview). An iframe sandbox like Prism (too heavy for what S-Charts needs, and needs a postMessage theme bridge).
- **Why:** the parser and colour resolver are pure functions, so they can be tested without Obsidian (testing section). The processor covers reading view and live preview in one hook (FR-RENDER-03).

## Chart library

- **Choice:** Chart.js 4.5.1, tree-shaken, registering only the controllers and elements in use.
- **Considered:**
    - **shadcn/ui charts (React 19 + Recharts 3.10.1 + Tailwind).** shadcn charts are a styling layer over Recharts, so this means shipping React, Recharts and Tailwind. Tailwind's base styles and utility classes would fight theme CSS inside notes. Every code block would need its own React root, mounted and unmounted by hand. S-Calc started from a Svelte, Tailwind and shadcn template and had all three stripped out for the same reason: a code block processor doesn't need them. The good part of shadcn, colours as numbered CSS variables, is kept as the palette design (Stage 1 references). Recharts draws SVG, which would read CSS variables directly and stay sharp in PDF. That's its real advantage, and it's why this is an open question, not a closed one.
    - **ECharts 6.1.0:** more chart types, but the largest bundle by far.
    - **Plain hand-written SVG:** smallest possible, but means building axes, ticks, tooltips, legends and resizing from scratch.
- **Measured bundle size** (esbuild `--minify`, 2026-10-18, same chart set of bar, line, area, pie, legend, tooltip):

    | Option                      | Minified | Gzipped |
    | --------------------------- | -------- | ------- |
    | Chart.js 4.5.1, tree-shaken | 192 KB   | 67 KB   |
    | React 19 + Recharts 3.10.1  | 664 KB   | 194 KB  |
    | ECharts 6.1.0               | 1,142 KB | 383 KB  |

    Obsidian loads `main.js` from disk uncompressed, so the minified number is the one that counts, mostly on mobile.

- **Why:** smallest bundle that keeps the NFR-01 limit of 250 KB with room for the plugin's own code. Ships every Must and Should chart type (FR-RENDER-01, FR-RENDER-02). Canvas stays fast at 500 rows (NFR-04). MIT licence.
- **Landmines:**
    - A canvas can't read CSS variables. Theme colours have to be read with `getComputedStyle` at render time, and charts have to redraw on the theme change event (FR-THEME-01, FR-THEME-02).
    - PDF export prints the canvas as an image. If an animation is still running, or the pixel ratio is 1, the chart can come out half-drawn or blurry. This is the top risk and the M0 spike (FR-UX-04).
    - Every `Chart` instance has to be destroyed when its block unloads, or memory grows each time a note re-renders.
    - Responsive mode needs a wrapper element with `position: relative` and a set height, or the chart grows forever.

## Header parsing

- **Choice:** Obsidian's built-in `parseYaml` for the header lines, plus a small hand-written parser for the markdown table.
- **Considered:** the `yaml` npm package (adds weight for no gain). A hand-written `key: value` parser (the edge cases aren't worth it).
- **Why:** no extra dependency (NFR-01). Users already know YAML from note properties.
- **Landmines:** `#` starts a YAML comment, so `source: #daily` must be quoted as `source: "#daily"`. The FR-UX-01 error has to say so when `source` comes out empty.

## Theme colours

- **Choice:** read `--color-accent`, `--color-blue`, `--color-green`, `--color-orange`, `--color-purple`, `--color-red`, `--color-cyan`, `--color-yellow`, `--color-pink`, `--text-normal`, `--text-muted`, `--background-modifier-border`, `--background-secondary` and `--font-interface` from `document.body` with `getComputedStyle`. Listen to `workspace.on('css-change')` and redraw.
- **Considered:** a fixed palette (looks foreign in most themes, which is the gap S-Charts exists to close).
- **Why:** FR-THEME-01, FR-THEME-02, NFR-08. Obsidian core defines all of these variables, so they exist even when a theme doesn't override them.

## Settings and palettes UI

- **Choice:** Obsidian's `PluginSettingTab` and `Setting` with `addColorPicker`, `addText` and `addExtraButton`, plus Obsidian's `Modal` for the delete confirmation. Stored with `loadData` and `saveData`.
- **Considered:** a React or Svelte settings page (adds a framework for one screen).
- **Why:** looks native in every theme for free, and keeps the bundle small (FR-PAL-01, FR-SET-01, NFR-07).

## Properties source

- **Choice:** `app.metadataCache` for frontmatter, `getAllTags` for tag matching, and `metadataCache.on('changed')` with a 500 ms debounce for updates.
- **Considered:** depending on the Dataview API (adds a required plugin, which the product promises not to do).
- **Why:** FR-SRC-01, FR-SRC-02, and no dependency.

## Testing

- **Choice:** `node:test` with plain `assert` on the pure parser and colour resolver, run through esbuild (`npm test`). A `test-vault/` folder with one note per chart type, every error case and a PDF export note, checked by hand in 3 themes before each release.
- **Considered:** Jest or Vitest (more setup than one test file needs). Playwright against Obsidian (too much work for a plugin this size).
- **Why:** the logic that can break quietly (number parsing, palette lookup, colour cycling) is pure and easy to test. Rendering is checked by eye in the test vault (NFR-08).

## Distribution and CI

- **Choice:** a GitHub Actions workflow that builds and attaches `main.js`, `manifest.json` and `styles.css` to a GitHub release when a version tag is pushed. First listing through a pull request to `obsidianmd/obsidian-releases`. Same flow as S-Calc.
- **Why:** NFR-07. It's already worked once for S-Calc.

## Layers that don't apply

Backend, database, auth, hosting, file storage, email, payments, search and analytics: none. It's a local plugin with no servers (NFR-02).

## Reused from existing work

- S-Calc repo (`github.com/Abdulkader-Safi/obsidian-s_calc-plugins`): esbuild config, `manifest.json` shape, release workflow, README layout, the theme-variable styling approach, and the assert-style self-check.

## Cost

Zero to run. No APIs, no hosting.

## Licensing

S-Charts: MIT. Chart.js: MIT. Obsidian API types: MIT. Nothing to clear.

## Top technical risks

1. **Canvas charts in PDF export come out blank (also the first Reddit commenter's condition for switching), half-drawn or blurry.** M0 spike: one bar chart, export to PDF on macOS, check at 200% zoom. If it fails: turn animation off and draw at 2x pixel ratio during print. If that still fails, switch to SVG rendering (Recharts or hand-written SVG) and update this file.
2. **Theme variables differ across themes.** Some themes set `--color-accent` but leave `--color-blue` and the others at core defaults, so charts can come out half themed. M0: print the resolved list in the default theme, Minimal and AnuPpuccin.
3. **Not different enough from Fancy Charts.** Not a code risk, but the biggest one. Wait for the Reddit replies before M1. The first reply backs the properties source and PDF export as the reasons to switch, so those two get the most polish.
4. **Live preview redraws while typing.** The processor runs again on every change inside the block. Check that typing in a 200-row table doesn't lag. If it does, debounce the redraw.

---

### Open questions

None.

### Assumptions confirmed

1. **Chart library : RESOLVED.** Chart.js 4.5.1 (Safi). Recharts SVG is the fallback only if the M0 PDF spike fails.
2. **Minimum Obsidian version : RESOLVED.** 1.5.0 (Safi).
3. **Repo : RESOLVED.** `obsidian-s-charts` under Safi's GitHub account (default, follows the new plugin ID).
