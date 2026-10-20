# Functional requirements

Status: signed off 2026-10-18

Requirements say what the product must do, not how. Tech choices are in Stage 4. Each one traces back to the product (Stage 1) and the journey or core loop (Stage 2).

## The block format (reference for this stage)

````markdown
```s-chart
type: bar
title: Monthly revenue
palette: dsrpt
---
| Month | Revenue | Costs |
| ----- | ------- | ----- |
| Jan   | 4200    | 3100  |
| Feb   | 5100    | 3300  |
| Mar   | 6300    | 3500  |
```
````

The header holds `key: value` lines, then a `---` line, then the data table. In properties mode there is no table (see FR-SRC).

## Core features (MVP)

### Block (parsing)

- **FR-BLOCK-01 [Must]** The plugin must render any fenced code block with the language `s-chart` as a chart, using a header of `key: value` lines, a `---` separator and a markdown table.
  _Acceptance:_ the example above renders as a bar chart with 3 groups (Jan, Feb, Mar) and 2 series (Revenue, Costs).
- **FR-BLOCK-02 [Must]** The first table column must be the labels (x axis, or slice names). Each other column must be one series, named by its header.
  _Acceptance:_ adding a `Profit` column adds a third series called "Profit" with no other change.
- **FR-BLOCK-03 [Must]** The header must support these keys: `type` (required), `title`, `palette`, `height` (pixels), `stacked` (true/false), `horizontal` (true/false), `legend` (`top`, `bottom`, `none`), `x-label`, `y-label`.
  _Acceptance:_ each key changes the chart as described. An unknown key shows a warning line under the chart, with a suggestion when it's close to a real key (`pallet` gives "did you mean palette?"), and the chart still renders.
- **FR-BLOCK-04 [Must]** Number cells must accept `4200`, `4,200`, `$4,200`, `KWD 4,200`, `42%` and `-3.5`. An empty cell must leave a gap in that series.
  _Acceptance:_ a table using all those forms renders the right values. A blank cell leaves a gap in the line, not a zero.
- **FR-BLOCK-05 [Should]** A `colors:` key must take a comma-separated list of hex colours for that one block, overriding the palette.
  _Acceptance:_ `colors: #e11d48, #0ea5e9` colours series 1 and 2 with those colours.

### Rendering

- **FR-RENDER-01 [Must]** Supported `type` values: `bar`, `line`, `area`, `pie`, `doughnut`.
  _Acceptance:_ the same table renders in each of the 5 types. Pie and doughnut use the first series and show a notice if there are more.
- **FR-RENDER-02 [Should]** Also support `scatter` and `radar`.
  _Acceptance:_ a two-number-column table renders as a scatter, and a 5-row table renders as a radar.
- **FR-RENDER-03 [Must]** Charts must render in reading view and in live preview, and must update after the block text changes.
  _Acceptance:_ change a number, move the cursor out of the block, and the chart shows the new value.
- **FR-RENDER-04 [Must]** Hovering (desktop) or tapping (mobile) a bar, point or slice must show a tooltip with the label, series and formatted value.
  _Acceptance:_ hovering Feb/Revenue shows "Feb, Revenue: 5,100".
- **FR-RENDER-05 [Must]** Charts must fill the note width and resize when the pane or window resizes.
  _Acceptance:_ dragging the sidebar narrower redraws the chart to the new width with no horizontal scroll.

### Theme

- **FR-THEME-01 [Must]** With no `palette` or `colors`, series colours must come from the active theme's variables, in this order: `--color-accent`, `--color-blue`, `--color-green`, `--color-orange`, `--color-purple`, `--color-red`, `--color-cyan`, `--color-yellow`, `--color-pink`. Axis text, grid lines, tooltip and font must come from `--text-muted`, `--text-normal`, `--background-modifier-border`, `--background-secondary` and `--font-interface`.
  _Acceptance:_ in the default theme, series 1 is the accent colour. In Minimal with a custom accent, series 1 changes to match.
- **FR-THEME-02 [Must]** Charts must re-render when the theme or light/dark mode changes, without reopening the note.
  _Acceptance:_ toggle dark mode and every visible chart switches colours within a second.

### Palettes

- **FR-PAL-01 [Must]** The settings tab must let the user create, rename, edit and delete named palettes. A palette has a unique name (case-insensitive, letters, numbers, `-` and `_`) and 1 to 12 colours, each set with a colour picker or a hex field. Colours can be added, removed and reordered. Delete asks for confirmation.
  _Acceptance:_ create "dsrpt" with `#7853D5` and `#2E2A3B`, reload Obsidian, and the palette is still there. Deleting it asks first.
- **FR-PAL-02 [Must]** `palette: <name>` in a block must colour the series (or pie slices) in palette order, looping back to the start if there are more series than colours.
  _Acceptance:_ `palette: dsrpt` on a 3-series bar chart gives violet, dark, violet.
- **FR-PAL-03 [Must]** An unknown palette name must fall back to theme colours and show a one-line notice under the chart: "Palette 'x' not found, using theme colours."
  _Acceptance:_ `palette: nope` renders the chart in theme colours with the notice.
- **FR-PAL-04 [Should]** A "Default palette" setting (Theme, or any named palette) must apply to blocks with no `palette` key.
  _Acceptance:_ set the default to "dsrpt" and every block without a palette key turns dsrpt colours.
- **FR-PAL-05 [Should]** Editing a palette must re-render open charts that use it, without reopening the note.
  _Acceptance:_ change a colour in settings and the chart behind the settings window changes.
- **FR-PAL-06 [Could]** Ship 3 editable starter palettes (for example "soft", "bold", "mono") that meet 3:1 contrast on the default light and dark backgrounds.
- **FR-PAL-07 [Could]** Let a palette colour be a theme variable such as `var(--color-accent)`, so a palette can mix brand and theme colours.
- **FR-PAL-08 [Could]** Import and export palettes as JSON, to share in GitHub Discussions.

### Properties source

- **FR-SRC-01 [Must]** A block with `source:` and no table must build its data from note properties: `source: "#tag"` or `source: "folder/path"`, `x: <property>`, `y: <property>` (or a comma-separated list). Rows are sorted by `x`. Notes missing `x` are skipped.
  _Acceptance:_ 30 daily notes tagged `#daily` with `date` and `weight` properties render as a 30-point line.
- **FR-SRC-02 [Must]** Properties charts must update when a matching note's properties change, at most once every 500 ms.
  _Acceptance:_ edit `weight` in one daily note and the chart in another open note updates.

### Editing help

- **FR-UX-01 [Must]** An invalid block must show an inline error naming the line and the problem, for example "Line 1: unknown type 'bars'. Use bar, line, area, pie or doughnut." It must never fail silently or leave a blank space.
  _Acceptance:_ each of these shows a specific message: missing `type`, unknown `type`, no `---`, no table, a table with no number columns, an unreadable cell.
- **FR-UX-02 [Should]** A command "S-Charts: Insert chart" must insert a sample bar chart block at the cursor.
  _Acceptance:_ running it in an empty note inserts a block that renders straight away.
- **FR-UX-03 [Could]** Right-clicking a chart offers "Copy as image" (PNG).
- **FR-UX-04 [Must]** Charts must appear correctly in Obsidian's PDF export, fully drawn and sharp.
  _Acceptance:_ export a note with 3 charts to PDF. All 3 appear, fully drawn, and stay sharp at 200% zoom in Preview.

### Settings

- **FR-SET-01 [Must]** Settings must persist across restarts: palettes, default palette, default chart height (300 px), animations on or off.
  _Acceptance:_ change each setting, restart Obsidian, and they're all kept.

## Standard states

- Undo and redo: blocks are note text, so Obsidian's own undo covers them. Palette changes in settings have no undo, so delete asks for confirmation (FR-PAL-01).
- Empty states: block with no data gets the FR-UX-01 message. Settings with no palettes show "No palettes yet" and an "Add palette" button (FR-PAL-01).
- Loading and progress: inline charts draw at once. Properties charts show "Loading notes" if they take longer than 200 ms (FR-SRC-01).
- Error states: FR-UX-01, FR-PAL-03.
- Confirm before destructive actions: palette delete (FR-PAL-01).
- Autosave: settings save on every change (FR-SET-01). Blocks are part of the note.
- Search and filter: out of scope. Palettes will stay under 20 for almost everyone.
- Keyboard shortcuts: no default hotkeys (Obsidian guideline). The command can be bound by the user (FR-UX-02).
- Settings persist: FR-SET-01.
- First-run and onboarding: none needed. Theme colours work with no setup, and the README plus the insert command cover the rest (FR-UX-02).
- Offline: fully offline, no network ever (NFR-02).
- Permissions per role: out of scope, single user.
- Notifications: out of scope, nothing to notify.
- Import and export: PDF export is a Must (FR-UX-04). PNG copy (FR-UX-03) and palette JSON (FR-PAL-08) are Could.
- Delete and restore: palette delete with confirmation only. No trash.
- Audit log: out of scope.
- Multi-language and RTL: chart text renders as written, Arabic included. UI is English only (NFR-06).
- Accessibility: NFR-06.
- Mobile layout: NFR-05, FR-RENDER-05.
- Rate limits and quotas: out of scope, no external services.

## Account and auth

None. Local single-user plugin.

## Data the product handles

- **Chart block:** text inside the user's note. The user owns it, the plugin only reads it. Kept as long as the note exists.
- **Palette:** name plus 1 to 12 colours, stored in the plugin's `data.json` in `.obsidian/plugins/s-charts/`. Syncs with the vault.
- **Settings:** default palette, default height, animations. Same `data.json`.
- **Properties rows:** read from note frontmatter through Obsidian's metadata cache, kept in memory only, never written.

## Integrations

- **Obsidian API:** code block processor, settings tab, commands, metadata cache, theme change event. Nothing else. No Dataview dependency, no network.

## Non-functional requirements

- **NFR-01 Performance:** a 12-row, 4-series chart renders in under 50 ms on an M1 MacBook Air. A note with 10 charts opens with no visible stutter. Plugin load adds under 30 ms to Obsidian startup. Built `main.js` is under 250 KB minified.
- **NFR-02 Privacy and security:** no network requests, no telemetry, no `innerHTML` with user content. Note data never leaves the vault.
- **NFR-03 Offline:** works fully offline.
- **NFR-04 Scale:** inline tables up to 500 rows x 8 series. Properties charts over up to 2,000 notes build in under 300 ms on desktop.
- **NFR-05 Platforms:** desktop (macOS, Windows, Linux) and mobile (iOS, Android). Tested on a 390 px wide phone screen. `minAppVersion` 1.5.0.
- **NFR-06 Accessibility and locale:** `role="img"` and an `aria-label` on each chart. Tooltip numbers formatted with `Intl.NumberFormat`. Arabic labels render right to left. Settings tab meets WCAG 2.2 AA.
- **NFR-07 Community review:** passes Obsidian's plugin guidelines and the release bot on the `obsidian-releases` pull request: no default hotkeys, no inline styles where a CSS class works, everything cleaned up on unload, no console noise.
- **NFR-08 Theme compatibility:** looks right in light and dark on the default theme, Minimal and AnuPpuccin.

## Out of scope for MVP

- **GUI chart builder:** v2, if users ask for it. Fancy Charts already has one.
- **CSV files as a source:** v2.
- **Dataview queries and Bases views:** never as a dependency. Bases view maybe v2.
- **Dashboards and multi-chart layouts:** never. Prism and Bases cover this.
- **More chart types (sankey, heatmap, funnel, gauge, maps):** v2 only if people ask.
- **Live web or API data:** never. It breaks the offline and privacy promise.
- **Annotations, goal lines and dual axes:** v2.

---

### Open questions

None.

### Assumptions confirmed

1. **Chart types : RESOLVED.** bar, line, area, pie, doughnut are Must. scatter and radar are Should (default).
2. **Properties source : RESOLVED.** Must in v1 (Safi, 2026-10-18), backed by the first Reddit reply. The inline table inside the block stays the main way to give data (FR-BLOCK-01).
3. **Key style : RESOLVED.** kebab-case, for example `x-label` (Safi).
4. **`pallet:` alias : RESOLVED.** No alias. The unknown-key warning suggests "did you mean palette?" (default).
5. **Starter palettes : RESOLVED.** Could, only if M3 finishes early (default).
