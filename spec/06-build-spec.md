# Build spec: S-Charts

> **This is the hand-off document for Claude Code.** It is self-contained: build from this file alone. It pulls together the product, users, requirements and tech decisions from stages 1 to 5. Where it says "see Stage N", that is optional background.

Status: signed off 2026-10-18. Sources: 01 to 05 as of that date.

## 1. What we're building

S-Charts is a free, MIT-licensed Obsidian community plugin. It renders fenced code blocks with the language `s-chart` as charts. Data comes from a markdown table inside the block, or from note properties across many notes (`source: "#daily"`, `x: date`, `y: weight`). Charts use the active theme's colours by default and redraw when the theme or light/dark mode changes. Users can define named colour palettes in settings and apply one with `palette: <name>`. It's for people who keep numbers in their notes and want charts that look native, without Dataview JavaScript or a spreadsheet. It's the second plugin in Safi's "s-" family, after S-Calc, so it stays small, has few dependencies, and keeps data as plain text.

Display name **S-Charts**, plugin ID **`s-charts`**, code block language **`s-chart`**.

## 2. Stack (decided, see Stage 4)

| Layer             | Choice                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Language          | TypeScript                                                                                 |
| Bundler           | esbuild (config copied from S-Calc)                                                        |
| Charts            | Chart.js 4.5.1, tree-shaken (only the controllers and elements in use)                     |
| Header parsing    | Obsidian `parseYaml`                                                                       |
| Table parsing     | small hand-written parser                                                                  |
| Theme             | `getComputedStyle(document.body)` on Obsidian CSS variables, plus the `css-change` event   |
| Settings UI       | Obsidian `PluginSettingTab`, `Setting`, `addColorPicker`, `Modal`                          |
| Storage           | `loadData` / `saveData` (`data.json`)                                                      |
| Properties source | `app.metadataCache`, `getAllTags`, `metadataCache.on('changed')`                           |
| Tests             | `node:test` + `assert` on pure modules, plus a hand-checked `test-vault/`                  |
| CI / release      | GitHub Actions: build and attach `main.js`, `manifest.json`, `styles.css` on a version tag |
| Distribution      | PR to `obsidianmd/obsidian-releases`                                                       |
| Minimum Obsidian  | 1.5.0, `isDesktopOnly: false`                                                              |
| Licence           | MIT                                                                                        |

Not used, on purpose: React, Recharts, shadcn, Tailwind, Svelte, ECharts, Dataview. Chart.js is 192 KB minified, against 664 KB for React plus Recharts and 1,142 KB for ECharts (measured 2026-10-18).

## 3. Architecture and principles

```
note text
   |
   v
registerMarkdownCodeBlockProcessor("s-chart")
   |
   v
parse(source)  -> { spec, warnings, errors }        pure, tested
   |                                   \
   |  spec.source set?                  errors -> renderError(el)
   v
loadRows(spec, metadataCache)  (properties mode only)
   |
   v
resolveColors(spec, settings, readTheme())  -> string[]   pure, tested
   |
   v
ChartBlock (MarkdownRenderChild)
   - new Chart(canvas, toChartConfig(spec, rows, colors, theme))
   - onunload: chart.destroy()
   - registry.add(this)   <- redraw() on css-change and palette edits
```

The keystone is the `ChartSpec` that `parse` returns. Every redraw (theme change, palette edit, properties change) runs the same steps again from the spec.

**Non-negotiable principles:**

1. Plain text is the source of truth: the plugin never writes to notes. Charts are rebuilt from block text, settings and theme every time.
2. Pure core: `parse`, `parseNumber`, `resolveColors` and `toChartConfig` import nothing from Obsidian and are unit tested.
3. Theme first: no hard-coded colours anywhere except user palettes and `colors:`. Every UI colour and font comes from Obsidian CSS variables.
4. Clean up: every `Chart` is destroyed, and every listener is registered through `registerEvent` or `register`, so disabling the plugin leaves nothing behind.
5. Offline and private: no network calls, no telemetry, no `innerHTML` with user text, no `eval`.
6. Fail loudly in the block: an invalid block always shows a specific message with a line number, never a blank.
7. Small: `main.js` under 250 KB minified. Adding any runtime dependency needs a note in `PROGRESS.md` explaining why.

## 4. Repository structure

```
obsidian-s-charts/
  src/
    main.ts            plugin entry: processor, command, settings tab, registry, css-change
    parse.ts           pure: block text -> ChartSpec + messages
    numbers.ts         pure: parseNumber
    colors.ts          pure: resolveColors, colour validation
    config.ts          pure: ChartSpec -> Chart.js config
    theme.ts           readTheme() from CSS variables
    properties.ts      loadRows() for source mode, watcher
    chart-block.ts     MarkdownRenderChild that owns one Chart instance
    settings.ts        Settings type, defaults, migrate(), PluginSettingTab
    confirm-modal.ts   delete confirmation
  tests/
    parse.test.ts
    colors.test.ts
  test-vault/          one note per chart type and error case, properties notes, stress note, PDF note
  styles.css           .s-chart, .s-chart-notice, .s-chart-error, settings rows
  manifest.json        id s-charts, name S-Charts, minAppVersion 1.5.0
  versions.json
  esbuild.config.mjs
  .github/workflows/release.yml
  README.md
  PROGRESS.md
  LICENSE              MIT
```

## 5. Data model

- **ChartSpec:** `type` (bar, line, area, pie, doughnut, scatter, radar), `title?`, `palette?`, `colors?` (hex list), `height?` (120 to 1200 px), `stacked`, `horizontal`, `legend` (top, bottom, none), `xLabel?`, `yLabel?` (from `x-label`, `y-label`), `source?`, `x?`, `y?` (list), `labels` (string list), `series` (Series list).
- **Series:** `name`, `values` ((number or null) list, null means a gap).
- **Palette:** `name` matching `^[A-Za-z0-9_-]{1,32}$`, unique ignoring case. `colors` holds 1 to 12 entries, each `#rgb`, `#rrggbb`, `#rrggbbaa` or `var(--name)`.
- **Settings:** `version` (1), `palettes` (default empty), `defaultPalette` (`"theme"` or a palette name), `defaultHeight` (300), `animations` (true, always off while printing).
- **Properties rows:** in memory only, never written.

## 6. API / command surface

- `parse(source, parseYaml) -> { spec?, warnings, errors }`, where each message is `{ line, text }`.
- `parseNumber(cell) -> number | null`. Accepts `4200`, `4,200`, `$4,200`, `KWD 4,200`, `42%`, `-3.5`. Empty gives null. Anything else is an error.
- `resolveColors(spec, settings, theme, count) -> { colors, notice? }`. Order: `spec.colors`, then `spec.palette`, then `settings.defaultPalette`, then theme. Loops to fill `count`.
- `toChartConfig(spec, colors, theme, animations) -> ChartConfiguration`. Area is a filled line. Horizontal is `indexAxis: 'y'`. Tooltips use `Intl.NumberFormat`.
- `readTheme() -> ThemeColors`. Reads `--color-accent`, `--color-blue`, `--color-green`, `--color-orange`, `--color-purple`, `--color-red`, `--color-cyan`, `--color-yellow`, `--color-pink`, `--text-normal`, `--text-muted`, `--background-modifier-border`, `--background-secondary` and `--font-interface`, plus `lookup(varName)`.
- `loadRows(spec, app) -> { labels, series, skipped }`. Matches `#tag` with `getAllTags`, or a folder path by prefix. Sorts by `x`.
- Command `insert-chart` ("Insert chart"): inserts the sample bar block at the cursor. No default hotkey.
- Context menu "Copy as image" (Could).

## 7. Screens

- **Chart block:** wrapper `div.s-chart` (position relative, fixed height) with a `canvas` (`role="img"`, `aria-label` like "Monthly revenue: bar chart of Revenue, Costs"), and an optional `div.s-chart-notice`. States: chart; chart plus notice; error list `div.s-chart-error` with one line per message; "Loading notes" after 200 ms in properties mode.
- **Settings tab:** "Default palette" dropdown (Theme plus each palette), "Default height" number, "Animations" toggle, then "Palettes". Each palette row has a name field, colour swatches (picker, hex field, move left/right, remove), "Add colour" and "Delete palette". An "Add palette" button sits at the bottom. States: "No palettes yet"; name clash (inline error, not saved); bad hex (field marked, not saved); delete confirmation modal.

## 8. Build plan (milestones)

### M0: de-risk (do this first)

Throwaway spike in a scratch plugin: one hard-coded Chart.js bar chart in an `s-chart` block.

- Export the note to PDF on macOS, open it at 200% zoom.
- Print the resolved theme colour list in the default theme, Minimal and AnuPpuccin, light and dark.
- Type quickly in a 200-row table in live preview and watch for lag.
- **Exit criteria:** the PDF shows the chart fully drawn and sharp; theme colours resolve in all 3 themes (log which ones fall back to core defaults); typing has no visible lag. Fallbacks: for PDF, turn animation off and render at 2x pixel ratio when printing (`window.matchMedia('print')`, `beforeprint`). If it still fails, stop and report, because the chart library decision has to be revisited (Recharts SVG). For lag, debounce the redraw by 150 ms.

### M1: scaffold and parser

- **Builds:** FR-BLOCK-01, FR-BLOCK-02, FR-BLOCK-03, FR-BLOCK-04, FR-BLOCK-05, FR-UX-01
- **Tasks:** repo from S-Calc's esbuild setup, `manifest.json`, `parse.ts`, `numbers.ts`, error and warning rendering, unknown-key suggestions (`pallet` gives "did you mean palette?"), `tests/parse.test.ts` covering every number format and every FR-UX-01 error.
- **Exit criteria:** `npm test` passes. Every error note in `test-vault/` shows the right message and line.

### M2: rendering and theme

- **Builds:** FR-RENDER-01, FR-RENDER-02, FR-RENDER-03, FR-RENDER-04, FR-RENDER-05, FR-THEME-01, FR-THEME-02, FR-UX-04, NFR-06
- **Tasks:** `config.ts`, `theme.ts`, `chart-block.ts`, registry, `css-change` redraw, print handling from M0, aria labels, `Intl.NumberFormat` tooltips.
- **Exit criteria:** every type renders in reading view and live preview; resizing works; switching dark mode recolours open charts; a PDF of the stress note and the 3-chart note is sharp.

### M3: palettes and settings

- **Builds:** FR-PAL-01, FR-PAL-02, FR-PAL-03, FR-PAL-04, FR-PAL-05, FR-SET-01
- **Tasks:** `settings.ts` with defaults and `migrate()`, settings tab, confirmation modal, `colors.ts` with validation, `tests/colors.test.ts`, redraw on save. FR-PAL-06 to FR-PAL-08 only if time is left.
- **Exit criteria:** `npm test` passes. Create "dsrpt" (`#7853D5`, `#2E2A3B`), use it in a block, restart, and it's still applied. `palette: nope` shows the notice. Editing a colour updates open charts.

### M4: properties source

- **Builds:** FR-SRC-01, FR-SRC-02
- **Tasks:** `properties.ts`, a watcher registered only while a source block is on screen, a 500 ms debounce, the quoted `#` hint in the error, 30 dated test notes plus a 2,000-note generated set.
- **Exit criteria:** `source: "#daily"` draws 30 points sorted by date; editing one note's property updates the chart; 2,000 notes build in under 300 ms on desktop.

### M5: polish and release

- **Builds:** FR-UX-02, FR-UX-03, NFR-01, NFR-02, NFR-03, NFR-04, NFR-05, NFR-07, NFR-08
- **Tasks:** insert command, optional copy-as-image, bundle size check, phone test at 390 px, theme pass (default, Minimal, AnuPpuccin, light and dark), guideline self-review, README with GIFs, release workflow, tag 0.1.0, PR to `obsidian-releases`.
- **Exit criteria:** every box in section 9 ticked, release builds on tag, PR opened (Safi opens it, see section 13).

## 9. Acceptance criteria

### POC (proves the core idea)

- [ ] **FR-BLOCK-01** The Monthly revenue example renders as a bar chart with 3 groups and 2 series.
- [ ] **FR-BLOCK-02** Adding a column adds a series named after its header.
- [ ] **FR-RENDER-01** The same table renders as bar, line, area, pie and doughnut.
- [ ] **FR-RENDER-03** Editing a number and leaving the block redraws the chart, in reading view and live preview.
- [ ] **FR-THEME-01** With no palette, series 1 is the theme accent and the rest follow the theme colour order. Axis text, grid and font match the theme.
- [ ] **FR-THEME-02** Toggling dark mode recolours every open chart within a second.
- [ ] **FR-UX-04** A note with 3 charts exports to PDF with every chart fully drawn and sharp at 200% zoom.

### MVP (shippable v1)

- [ ] **FR-BLOCK-03** Every header key works. An unknown key warns, with a suggestion when it's close to a real key.
- [ ] **FR-BLOCK-04** All listed number formats parse. Empty cells leave gaps.
- [ ] **FR-BLOCK-05** `colors:` overrides the palette for one block.
- [ ] **FR-RENDER-02** Scatter and radar render.
- [ ] **FR-RENDER-04** Hover or tap shows label, series and a formatted value.
- [ ] **FR-RENDER-05** Charts fill the width and redraw on resize, with no horizontal scroll.
- [ ] **FR-PAL-01** Palettes can be created, renamed, edited, reordered and deleted (with confirmation), and survive a restart.
- [ ] **FR-PAL-02** `palette: <name>` colours series in order, looping when needed.
- [ ] **FR-PAL-03** An unknown palette falls back to theme colours with the notice.
- [ ] **FR-PAL-04** The default palette applies to blocks without a palette key.
- [ ] **FR-PAL-05** Editing a palette redraws open charts that use it.
- [ ] **FR-SRC-01** `source:`, `x:` and `y:` chart properties across notes, sorted by x, skipping notes without x.
- [ ] **FR-SRC-02** Changing a matching note's property updates the chart, at most once per 500 ms.
- [ ] **FR-UX-01** Each listed mistake shows a specific message with its line number.
- [ ] **FR-UX-02** "Insert chart" inserts a working sample block.
- [ ] **FR-SET-01** All settings survive a restart.
- [ ] **NFR-01** 12x4 chart renders in under 50 ms on an M1 Air; 10 charts in a note open without stutter; startup cost under 30 ms; `main.js` under 250 KB.
- [ ] **NFR-02** No network requests (checked in DevTools), no `innerHTML` with user text.
- [ ] **NFR-03** Works with networking off.
- [ ] **NFR-04** 500 rows x 8 series renders. 2,000 notes in properties mode build in under 300 ms.
- [ ] **NFR-05** Works on desktop and on a 390 px phone screen.
- [ ] **NFR-06** `role="img"` and `aria-label` on each chart; locale number formatting; Arabic labels render right to left; settings tab meets WCAG 2.2 AA.
- [ ] **NFR-07** Passes the Obsidian plugin guidelines and the `obsidian-releases` bot.
- [ ] **NFR-08** Looks right in light and dark on the default theme, Minimal and AnuPpuccin.

## 10. Standard states

- Undo and redo: Obsidian's own, since blocks are note text. Palette delete asks first (FR-PAL-01).
- Empty states: no-data block message (FR-UX-01), "No palettes yet" (FR-PAL-01).
- Loading: "Loading notes" in properties mode after 200 ms (FR-SRC-01).
- Errors: FR-UX-01, FR-PAL-03.
- Confirm destructive: palette delete (FR-PAL-01).
- Autosave: settings save on change (FR-SET-01).
- Keyboard shortcuts: none by default, the command can be bound (FR-UX-02).
- Settings persist: FR-SET-01.
- Offline: NFR-03.
- Import and export: PDF (FR-UX-04); PNG copy and palette JSON are Could (FR-UX-03, FR-PAL-08).
- Multi-language and RTL, accessibility: NFR-06.
- Mobile layout: NFR-05, FR-RENDER-05.
- Out of scope: search and filter, onboarding, roles, notifications, trash and restore, audit log, rate limits.

## 11. Out of scope for MVP

Don't build these even if they look easy: GUI chart builder, CSV files as a source, Dataview or Bases integration, dashboards or multi-chart layouts, sankey, heatmap, funnel, gauge or maps, live web or API data, annotations, goal lines, dual axes, a `pallet:` alias.

## 12. Top risks and mitigations

1. **Canvas in PDF export comes out blank or blurry** (the first Reddit commenter's condition for switching): M0 spike. Animation off and 2x pixel ratio while printing. Stop and report if that fails.
2. **Theme variables vary across themes:** M0 dump in 3 themes. Core defaults cover anything a theme leaves out. The NFR-08 theme pass in M5.
3. **Live preview lag while typing:** M0 check. Debounce the redraw if needed.
4. **Not different enough from Fancy Charts:** product risk, not code. Polish the two things users asked for most, properties source (M4) and PDF (M0, M2).

## 13. Instructions for Claude Code

- Build milestone by milestone, in order. Finish M0 before any feature work.
- Keep a `PROGRESS.md` at the repo root: milestone status, decisions made, deviations from this spec and why.
- At the end of each milestone, run the tests and tick the acceptance boxes it covers. Don't move on with a failing box.
- Don't add features outside this spec. If something seems missing, note it in `PROGRESS.md` and ask.
- If a spec decision turns out to be wrong in practice, stop and explain. Don't silently swap a stack choice (especially Chart.js).
- Commit after each milestone with a message naming the milestone.
- Keep secrets out of the repo. There are no environment variables.
- Don't publish anything: no tags pushed to the public repo, no release, no PR to `obsidian-releases` without Safi's OK.

---

_Companion files in `docs/spec/`: 01-product, 02-users, 03-requirements, 04-tech-decisions, 05-tech-requirements. This build spec is the entry point._
