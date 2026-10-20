# Progress

Build log for S-Charts. The plan is `spec/06-build-spec.md`.

## Milestones

- M0 de-risk: done, two checks need Safi (see "Checks for Safi")
- M1 scaffold and parser: done
- M2 rendering and theme: done, Minimal and AnuPpuccin need Safi
- M3 palettes and settings: done
- M4 properties source: done
- M5 polish and release: done. 0.5.0 released on 2026-10-20 at Safi's request, for submission to community.obsidian.md. The Minimal and AnuPpuccin theme pass is still open

## M0 results (2026-10-20)

Run against the live Obsidian 1.14.4 on macOS in the `plugins` vault, through `obsidian eval`. The spike was one hard-coded Chart.js 4.5.1 bar chart in `src/main.ts`, built in this repo rather than a separate scratch plugin. It is replaced in M1.

### 1. PDF export

The export was driven from code: the save dialog was stubbed to write into a temp folder, then the "Export to PDF" button was clicked. The PDF was rendered to PNG with `pdftoppm` at 144 and 432 dpi.

- First try, the plain chart: all three charts were cut off at the right page edge and caught mid-animation (the 4,200 bar was drawn at about 2,500).
- How Obsidian exports: it renders the note again inside `.print` in a hidden popout window. The code block processor can see `el.closest('.print')` at call time, and the block is already attached.
- Second try, with the fallback from the spec: animation off and `devicePixelRatio: 2` while printing, then the canvas is swapped for an `<img>` of the chart at `width: 100%`. All three charts were fully drawn, fit the page width, and stayed sharp at 432 dpi (6x).

Decision: Chart.js stays. Print mode in M2 uses this path. The popout window has its own `document`, so `readTheme()` must read from the block's own document, not the global one.

### 2. Theme colours

All 14 variables resolve in every theme installed in this vault, light and dark: the default theme, SIL-UI and Safi-V2. Nothing fell back to empty.

| Theme | accent | blue | text-muted | border |
|-------|--------|------|------------|--------|
| default light | `hsl(258, 88%, 66%)` | `#086ddd` | `#5c5c5c` | `#e4e4e4` |
| default dark | `hsl(258, 88%, 66%)` | `#027aff` | `#b3b3b3` | `#333333` |
| SIL-UI light | `hsl(84, 100%, 21%)` | `#1F55C4` | `#5F5F66` | `#DCDAD2` |
| SIL-UI dark | `hsl(73, 86%, 57%)` | `#6FA8FF` | `#9B9BA3` | `#2A2A2F` |
| Safi-V2 light | `hsl(154, 76%, 23%)` | `#086ddd` | `#5B6660` | `#DCE2D2` |
| Safi-V2 dark | `hsl(147, 56%, 60%)` | `#027aff` | `#98A49D` | `#25302B` |

- The accent comes back as `hsl(...)`, which Chart.js accepts as is.
- SIL-UI and Safi-V2 leave `--color-cyan` and `--color-pink` at core defaults.
- Not tested: Minimal and AnuPpuccin. Neither is installed here, and installing themes changes Safi's vault. Moved to the NFR-08 pass in M5.

### 3. Typing lag

Live preview shows a code block as source while the cursor is inside it and renders it only when the cursor leaves, so typing in a 200-row table does not redraw the chart on each key. The real cost is one parse and render when the cursor leaves. That is timed in M2 once the parser exists. The 150 ms debounce is not added unless that shows lag.

## M1 results (2026-10-20)

- `numbers.ts` and `parse.ts` are written, with 16 tests in `tests/parse.test.ts`. `npm test`, `npm run lint` and `npm run build` pass.
- `test-vault/errors/` has one note per FR-UX-01 mistake plus the unknown-key warning. Each was opened in reading view in the live Obsidian and showed its own message and line:

| Note | Message |
|------|---------|
| Missing type | Line 1: missing type. Add a line like type: bar. |
| Unknown type | Line 1: unknown type "bars". Use bar, line, area, pie, doughnut, scatter or radar. |
| No separator | Line 2: no "---" line. Put --- between the settings and the table. |
| No table | Line 2: no table after "---". Add a markdown table. |
| No number columns | Line 3: the table has no number columns. Add a column after the labels. |
| Unreadable cell | Line 6: can't read "lots" as a number in column "Revenue". |
| Unknown key | Line 2: unknown key "pallet", did you mean palette? (chart still draws) |

- The chart itself is a plain bar for every type until M2.
- The test notes are copied into the vault folder `S-Charts test` and stay there.

Acceptance boxes ticked in M1: FR-BLOCK-03 (parsing and the warning), FR-BLOCK-04 (parsing), FR-UX-01. FR-BLOCK-01, 02 and 05 parse correctly but are ticked in M2, when the chart draws them as specified.

## M2 results (2026-10-20)

Built: `config.ts`, `theme.ts`, `colors.ts` (theme colours only for now, palettes in M3), `chart-block.ts` and the block registry with the `css-change` redraw. `main.js` is 202 KB minified.

Checked in the live Obsidian, using the notes in `test-vault/types/`:

- All seven types render in reading view: bar, line, area, pie, doughnut, scatter and radar. Stacked, horizontal, legend at the bottom, axis titles and height all apply.
- Pie and doughnut with two series draw the first and show "Pie charts show the first series only (Revenue)."
- Live preview: changing Feb from 5100 to 9999 in the editor redrew the chart with the new value.
- Toggling dark mode recoloured the open chart in 67 ms (accent `hsl(84, 100%, 21%)` to `hsl(73, 86%, 57%)` in SIL-UI).
- Splitting the pane shrank a chart from 1600 to 1331 px wide, and it grew back when the split closed. No horizontal scroll.
- Tooltip for Feb/Revenue reads "Feb, Revenue: 5,100".
- Timing: a 12-row, 4-series chart renders in about 4 ms (first run 7 ms). The 500 x 8 stress note redraws in 50 ms.
- PDF: the 3-chart note and the stress note exported fully drawn, fitting the page, and sharp at 432 dpi.
- `colors: #e11d48, #0ea5e9` colours the two series red and blue. Arabic titles, labels and series names draw right to left.
- Typing lag (from M0): with 4 ms per chart, no debounce is needed.

Acceptance boxes ticked in M2: FR-BLOCK-01, FR-BLOCK-02, FR-BLOCK-05, FR-RENDER-01 to 05, FR-THEME-01 (default theme and the installed themes), FR-THEME-02, FR-UX-04 (checked from the rendered PDF, see check 2 below), NFR-06 except the settings tab, which comes in M3.

## M3 results (2026-10-20)

Built: `settings.ts` with `migrate()`, `settings-tab.ts`, `confirm-modal.ts`, palette name and colour checks in `colors.ts`, and 12 tests in `tests/colors.test.ts` (28 in all). `npm test`, `npm run lint` and `npm run build` pass.

The tab follows Property Reminders: the rows are described once, handed to `getSettingDefinitions()` on Obsidian 1.13.0 and later, and drawn by hand on older versions.

Checked in the live Obsidian by driving the settings tab from code, starting with no palettes:

- "No palettes yet" shows. "Add palette" adds `palette-1` with one grey colour.
- The name `bad name` is marked and not saved. `dsrpt` is saved. A second palette named `DSRPT` shows "There is already a palette called "DSRPT"." and is not saved.
- `#7853D5` and `#2E2A3B` typed into the hex fields are saved as typed and move the colour pickers. `#zz` is marked and not saved.
- `palette: dsrpt` on a 3-series bar gives `#7853D5, #2E2A3B, #7853D5`. `palette: nope` shows "Palette 'nope' not found, using theme colours."
- Changing colour 1 to `#e11d48` recoloured the chart behind the settings window at once.
- Move earlier and move later reorder the colours.
- Default palette set to dsrpt turned the block with no palette line dsrpt colours.
- Delete asks first. Cancel keeps the palette, Delete removes it.
- After reloading Obsidian: the palette, default palette, a height of 350 and animations off were all kept. A height of 50 is marked and not saved.

Bugs found and fixed during the check: colour rows in different palettes had the same name, which the 1.13 settings API uses as a key; and the colour picker wrote its lower-case value back into the hex field while it was being typed.

Not done: FR-PAL-06 to 08 (Could). The settings tab has labels on every control. A full WCAG 2.2 AA check with a screen reader is in the M5 list.

Acceptance boxes ticked in M3: FR-PAL-01 to 05, FR-SET-01.

The vault keeps the `dsrpt` palette for the `Palettes` test note. The default palette is back to Theme.

## M4 results (2026-10-20)

Built: `properties.ts` (tag and folder matching, `loadRows`), `rows.ts` (pure: properties to sorted rows) with 2 tests (30 in all), the watcher in `chart-block.ts`, and `tests/make-notes.mjs`, which writes dated notes with properties.

Each properties block registers its own listeners on `metadataCache` `changed`, `delete` and `rename`. They belong to the block, so they exist only while it is on screen and go away with it. Redraws are debounced at 500 ms.

Checked in the live Obsidian with the 30 notes in `test-vault/daily/`:

- `source: "#daily"`, `x: date`, `y: weight` draws 30 points, 2026-01-01 to 2026-01-30, in date order.
- `source: S-Charts test/daily` with `y: weight, steps` draws two series of 30.
- `source: "#nothing-here"` shows "No notes match "#nothing-here". Use a tag like "#daily" or a folder path."
- Setting one note's `weight` to 99 updated the chart in about 520 ms. Setting it back restored it.
- Removing `date` from one note dropped it to 29 points with "1 note skipped: no "date" property.", and putting it back returned 30.
- 2,000 generated notes: building the rows and drawing a 2,000-point chart took 52 to 83 ms by tag and 51 to 53 ms by folder. The generated notes were deleted after the run.

Acceptance boxes ticked in M4: FR-SRC-01, FR-SRC-02, the 2,000-note half of NFR-04.

## M5 results (2026-10-20)

- The "Insert chart" command (`s-charts:insert-chart`, no default hotkey) inserts the sample bar block. Run in a new empty note, it drew a chart with 2 series. That note, `S-Charts test/Insert chart.md`, stays in the vault.
- Phone: with Obsidian's mobile emulation at 390 x 844, charts were 342 px wide with no horizontal scroll.
- Guideline scan of `src/` and `main.js`: no `innerHTML`, `eval`, `fetch`, `requestUrl`, inline `.style`, `console.log` or `localStorage`. The only console output is `console.error` when a render throws.
- `main.js` is 216 KB minified, under the 250 KB limit.
- `README.md` is written in full. No GIFs yet: they need a screen recording.
- The release workflow (`.github/workflows/release.yml`) is the one from Property Reminders: on a tag it builds and attaches `main.js`, `manifest.json` and `styles.css` to a draft release. No tag has been pushed.
- Not built: "Copy as image" (FR-UX-03, Could).

## Release 0.5.0 (2026-10-20)

Safi asked for 0.5.0 (not 0.1.0) so the plugin can be submitted to community.obsidian.md.

- Version set in `package.json`, `manifest.json` and `versions.json` (`"0.5.0": "1.5.0"`).
- CI lint was failing since the docs site was added: ESLint tried to parse `docs/`, `site/` and `scripts/`, which are not plugin code. They are now ignored. Lint, the 30 tests and the build pass.
- GitHub repo description and topics set with `gh`.
- Tag `0.5.0` pushed; the release workflow builds and attaches `main.js`, `manifest.json` and `styles.css`.
- Still open from the checks list: Minimal and AnuPpuccin, a real phone, networking off, a screen-reader pass.

## Acceptance criteria

POC:

- [x] FR-BLOCK-01 the Monthly revenue example renders as a bar chart with 3 groups and 2 series
- [x] FR-BLOCK-02 a new column adds a series named after its header
- [x] FR-RENDER-01 the same table renders as bar, line, area, pie and doughnut
- [x] FR-RENDER-03 editing a number redraws the chart in reading view and live preview
- [x] FR-THEME-01 theme colours in order, axis text, grid and font from the theme (default, SIL-UI and Safi-V2; Minimal not checked)
- [x] FR-THEME-02 dark mode recolours open charts (67 ms)
- [x] FR-UX-04 a 3-chart note exports to PDF fully drawn and sharp (checked by rendering the PDF at 432 dpi, see check 2)

MVP:

- [x] FR-BLOCK-03 every header key works; unknown keys warn with a suggestion
- [x] FR-BLOCK-04 all number formats parse; empty cells leave gaps
- [x] FR-BLOCK-05 `colors:` overrides the palette
- [x] FR-RENDER-02 scatter and radar render
- [x] FR-RENDER-04 tooltip shows label, series and formatted value (checked through the tooltip callback; tap on a real phone not checked)
- [x] FR-RENDER-05 charts fill the width and redraw on resize
- [x] FR-PAL-01 palettes can be created, renamed, edited, reordered and deleted with confirmation, and survive a restart
- [x] FR-PAL-02 `palette: <name>` colours in order and loops
- [x] FR-PAL-03 unknown palette falls back with the notice
- [x] FR-PAL-04 the default palette applies to blocks without a palette key
- [x] FR-PAL-05 editing a palette redraws open charts
- [x] FR-SRC-01 properties charts by tag and folder, sorted by x, skipping notes without x
- [x] FR-SRC-02 a changed property updates the chart, debounced 500 ms
- [x] FR-UX-01 each listed mistake shows a specific message with its line number
- [x] FR-UX-02 "Insert chart" inserts a working sample block
- [x] FR-SET-01 all settings survive a restart
- [x] NFR-01 12x4 chart in about 4 ms; `main.js` 216 KB. Startup cost and "10 charts without stutter" not measured separately
- [x] NFR-02 no network code and no `innerHTML` in the source or the bundle. DevTools network check not run
- [ ] NFR-03 works with networking off (nothing uses the network, but not tried with Wi-Fi off)
- [x] NFR-04 500 x 8 redraws in 50 ms; 2,000 notes build in about 55 ms
- [ ] NFR-05 desktop checked on macOS; phone checked in emulation only, not on a real phone
- [ ] NFR-06 role and label on each chart, locale numbers, Arabic text checked. A screen-reader pass of the settings tab for WCAG 2.2 AA is not done
- [ ] NFR-07 self-review done; the `obsidian-releases` bot runs only on the PR
- [ ] NFR-08 Minimal and AnuPpuccin not checked

## Checks for Safi

1. Themes (NFR-08, FR-THEME-01): install Minimal and AnuPpuccin, open `S-Charts test/types/bar.md` and `Palettes.md` in each, light and dark, and check the colours look right. In Minimal, set a custom accent: series 1 should follow it.
2. PDF (FR-UX-04): export `S-Charts test/PDF export.md` and open it at 200% in Preview.
3. Phone (NFR-05, FR-RENDER-04): open a chart on iOS or Android and tap a bar. The tooltip should show.
4. Offline (NFR-03): turn Wi-Fi off and open the test notes.
5. Screen reader (NFR-06): go through the settings tab with VoiceOver.
6. Release: when you are happy, say so and I will tag 0.1.0 (the workflow makes a draft release). The PR to `obsidian-releases` is yours to open.
7. Folder rename: the plugin folder is `obsidian-s-chart-plugins` and the ID is `s-charts`. Obsidian loads it anyway. To rename it, quit Obsidian, rename the folder to `s-charts`, and reopen.

## Decisions and deviations

- 2026-10-20: commit after each step and push to GitHub, at Safi's request. The spec said once per milestone. Local `main` pushes to the repo's default branch `master`.
- 2026-10-20: the repo and folder are `obsidian-s-chart-plugins`, not `obsidian-s-charts` as the spec wrote. The plugin ID is `s-charts`.
- 2026-10-20: `authorUrl` is the GitHub profile, the same as Property Reminders.
- 2026-10-20: the header is read line by line, not with `parseYaml`. YAML treats ` #` as a comment, so `colors: #e11d48, #0ea5e9` (the spec's own example) came back empty, and `parseYaml` gives no line numbers for the FR-UX-01 messages. A side effect: `source: #daily` works without quotes, so the "quote the #" hint from M4 is not needed. `parse(source)` takes one argument.
- 2026-10-20: the unknown-key suggestion allows up to half the key's length in edits. `pallet` to `palette` is 3 edits, so a fixed limit of 2 missed the spec's own example.
- 2026-10-20: the chart's accessible name uses `aria-labelledby` and a visually hidden span, not `aria-label`. Obsidian shows every `aria-label` as a hover tooltip, so the description covered the chart on hover. Screen readers read the same text.
- 2026-10-20: lines with more than 50 points hide their dots. At 500 rows the dots merged into one thick line.
- 2026-10-20: `colors.ts` with `resolveColors` was written in M2, because rendering needs the theme colour list. Palette tests come in M3.
- 2026-10-20: a palette can't be named `theme`, which is the dropdown's value for theme colours.
- 2026-10-20: colours in a palette move up and down, not left and right, because each colour is its own settings row.
- 2026-10-20: "Loading notes" after 200 ms is not built. The build is synchronous and takes about 55 ms at 2,000 notes, so a 200 ms timer could never fire before the chart is drawn. Showing it would mean splitting the build into chunks, which costs more code than the case is worth. Revisit if someone reports a slow vault.
- 2026-10-20: a tag source also matches nested tags (`#daily` matches `#daily/work`), the same as Obsidian's tag search. Property names match without case.
- 2026-10-20: the folder test in `Properties source.md` uses `S-Charts test/daily`, so `test-vault/` must be copied into a vault folder named `S-Charts test`.
- 2026-10-20: "Copy as image" (FR-UX-03, Could) is not built.
- 2026-10-20: the spec moved from `Docs/spec/` to `spec/`. `docs/` is now the GitHub Pages site, at Safi's request, and macOS treats `Docs` and `docs` as one folder. Keeping the spec out of `docs/` also keeps it off the public site.
- 2026-10-20: `test-vault/Gallery.md` holds one chart per type. The README and site images were captured from it in Obsidian's default theme, light and dark, at 2x, then tiled 3 to a row.
- 2026-10-20: the site was redesigned with the gpt-taste layout and motion rules and Safi's rounded clean UI branding. Where they disagreed the branding won: Funnel Display and Funnel Sans instead of gpt-taste's fonts, and real charts in brand colours (`docs/img/charts/`) instead of stock photos. It stays plain HTML with GSAP 3.12.5 from cdnjs (with integrity hashes), so Pages needs no build step. Motion is skipped when GSAP fails to load or the reader prefers reduced motion.
- 2026-10-20: the landing page was replaced with a docs site at Safi's request: a sidebar, a page per chart type listing the options that apply to it, an options reference with a type-by-type table, and pages for colours, properties, settings, errors and PDF. No install page: S-Charts is going into the community list. Every example's block text is in `site/examples.mjs`; the build prints it and `scripts/capture-examples.js` renders the same text in Obsidian, so images always match their code. Examples use Obsidian's default theme colours, which is what a reader gets when they paste them.
- 2026-10-20: there is no `description` option. Safi mentioned one for the docs; it would be a new feature (a subtitle under the title), so it was not added without asking.
- 2026-10-20: the spike lived in this repo instead of a separate scratch plugin, so it could be loaded in the same vault without a second folder.
