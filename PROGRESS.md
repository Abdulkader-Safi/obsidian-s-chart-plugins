# Progress

Build log for S-Charts. The plan is `Docs/spec/06-build-spec.md`.

## Milestones

- M0 de-risk: done, two checks need Safi (see "Checks for Safi")
- M1 scaffold and parser: done
- M2 rendering and theme: done, Minimal and AnuPpuccin need Safi
- M3 palettes and settings: done
- M4 properties source: not started
- M5 polish and release: not started

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

## Checks for Safi

1. Minimal and AnuPpuccin, light and dark: open a chart note in each and check the colours look right (M5, NFR-08).
2. Open a PDF export at 200% in Preview and confirm it looks the same as the dumps described above.

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
- 2026-10-20: the spike lived in this repo instead of a separate scratch plugin, so it could be loaded in the same vault without a second folder.
