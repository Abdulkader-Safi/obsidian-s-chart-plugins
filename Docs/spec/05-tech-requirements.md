# Technical requirements

Status: signed off 2026-10-18

The engineering blueprint. Tech context: TypeScript plugin, esbuild, Chart.js 4.5.1, Obsidian API only.

## Architecture

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

The keystone is the `ChartSpec` that `parse` returns. Everything after it (properties loading, colours, Chart.js config) is a function of spec plus settings plus theme. So any redraw (theme change, palette edit, properties change) is just "run the same steps again", and the parser never touches Chart.js.

## Data models

No database. IDs are palette names (unique, case-insensitive). No timestamps.

### ChartSpec (from the block, in memory)

| Field          | Type                                                                       | Notes                                           |
| -------------- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| type           | `"bar" \| "line" \| "area" \| "pie" \| "doughnut" \| "scatter" \| "radar"` | required                                        |
| title          | string?                                                                    |                                                 |
| palette        | string?                                                                    | palette name, looked up case-insensitively      |
| colors         | string[]?                                                                  | hex codes from `colors:` (FR-BLOCK-05)          |
| height         | number?                                                                    | pixels, 120 to 1200, otherwise settings default |
| stacked        | boolean                                                                    | default false                                   |
| horizontal     | boolean                                                                    | bar only, default false                         |
| legend         | `"top" \| "bottom" \| "none"`                                              | default `top`, `none` when there's one series   |
| xLabel, yLabel | string?                                                                    | from `x-label`, `y-label`                       |
| source         | string?                                                                    | `#tag` or a folder path, properties mode        |
| x, y           | string?, string[]?                                                         | property names, properties mode                 |
| labels         | string[]                                                                   | first column, or the x values                   |
| series         | Series[]                                                                   |                                                 |

### Series

| Field  | Type               | Notes                             |
| ------ | ------------------ | --------------------------------- |
| name   | string             | column header or property name    |
| values | (number \| null)[] | null = empty cell, drawn as a gap |

### Palette (in `data.json`)

| Field  | Type     | Notes                                                                              |
| ------ | -------- | ---------------------------------------------------------------------------------- |
| name   | string   | `^[A-Za-z0-9_-]{1,32}$`, unique ignoring case                                      |
| colors | string[] | 1 to 12 items. Each is `#rgb`, `#rrggbb`, `#rrggbbaa` or (FR-PAL-07) `var(--name)` |

### Settings (in `data.json`)

| Field          | Type      | Notes                                          |
| -------------- | --------- | ---------------------------------------------- |
| version        | number    | schema version, starts at 1                    |
| palettes       | Palette[] | default `[]`                                   |
| defaultPalette | string    | `"theme"` or a palette name, default `"theme"` |
| defaultHeight  | number    | default 300                                    |
| animations     | boolean   | default true, always off during print          |

## API / command surface

No network API. These are the internal modules and the user-facing commands.

### Pure modules (no Obsidian imports)

- **`parse(source: string) -> { spec?: ChartSpec, warnings: Msg[], errors: Msg[] }`** : splits header from table at the first `---` line, reads the header with `parseYaml` (passed in, so tests can use a stub), checks keys and types, parses the table and numbers (FR-BLOCK-01 to 05, FR-UX-01). `Msg = { line: number, text: string }`.
- **`parseNumber(cell: string) -> number | null`** : drops currency symbols and codes, thousands commas and `%`. Empty means null. Anything else unreadable becomes an error with the line number (FR-BLOCK-04).
- **`resolveColors(spec, settings, theme: ThemeColors, count: number) -> { colors: string[], notice?: string }`** : order is `spec.colors`, then `spec.palette`, then `settings.defaultPalette`, then theme. Loops to fill `count`. An unknown palette gives the FR-PAL-03 notice. `var(--x)` entries are resolved through `theme.lookup` (FR-THEME-01, FR-PAL-02 to 04, FR-PAL-07).
- **`toChartConfig(spec, colors, theme, animations) -> ChartConfiguration`** : maps the spec to Chart.js options. Area is a line with fill. Horizontal is `indexAxis: 'y'`. Tooltip numbers use `Intl.NumberFormat`.

### Obsidian side

- **`readTheme() -> ThemeColors`** : `getComputedStyle(document.body)` for the variables in Stage 4.
- **`loadRows(spec, app) -> { labels, series, skipped }`** : properties mode (FR-SRC-01).
- **Command `s-charts:insert-chart`** "Insert chart" : inserts the sample block at the cursor (FR-UX-02). No default hotkey.
- **Context menu "Copy as image"** (Could, FR-UX-03) : `canvas.toBlob` then `navigator.clipboard.write`.

## Permissions

Single user, nothing to enforce. The plugin only reads notes and only writes its own `data.json`.

## Pages, screens and key components

### Chart block (in the note)

- **Purpose:** show the chart (FR-BLOCK-01, FR-RENDER-01 to 05).
- **Components:** wrapper `div.s-chart` (position relative, height from spec), `canvas` with `role="img"` and an `aria-label`, an optional `div.s-chart-notice` (warnings, palette not found).
- **States:** success (chart), warning (chart plus notice line), error (`div.s-chart-error` listing each message with its line number, no chart), loading (properties mode only, "Loading notes" after 200 ms).

### Settings tab

- **Purpose:** palettes and defaults (FR-PAL-01, FR-PAL-04, FR-SET-01).
- **Components:** "Default palette" dropdown, "Default height" number field, "Animations" toggle, then a "Palettes" heading. Each palette is a row with a name field, a strip of colour swatches (each with a picker, a hex field, move left/right and remove) and "Add colour" and "Delete palette" buttons. An "Add palette" button sits at the bottom.
- **States:** empty ("No palettes yet"), name clash (inline error, not saved), invalid hex (field marked, not saved), delete confirmation modal.

## State management

- The note text is the source of truth for each chart, and `data.json` is the source of truth for palettes and settings.
- `ChartRegistry` (a `Set<ChartBlock>` on the plugin) holds every rendered block. `css-change` and any settings save call `redraw()` on all of them (FR-THEME-02, FR-PAL-05). Blocks remove themselves in `onunload`.
- Undo for block edits belongs to Obsidian. Settings have no undo, so delete has a confirmation.

## Background and long-running tasks

- **Properties watcher:** only registered while a properties-mode block is on screen. Fires on `metadataCache` `changed`, debounced 500 ms, and redraws only blocks whose `source` matches the changed file (FR-SRC-02). No retries needed.

## Security

- Never use `innerHTML` with user text. Build with `createEl` and `setText` (NFR-02, NFR-07).
- Validate colours with a regex before they reach Chart.js or the DOM. Only allow `var(--[a-z0-9-]+)` for theme references.
- Palette names checked against the regex in the data model.
- No `eval`, no network, no file writes outside `data.json`.

## Logging and observability

Nothing logged in normal use (NFR-07). Errors are shown in the block itself. A caught exception during render shows "S-Charts hit a bug, please report it" in the block plus `console.error` with the stack. Note content is never logged.

## Testing strategy

- `tests/parse.test.ts` and `tests/colors.test.ts` with `node:test` and `assert`, run by `npm test`. They must cover every number format in FR-BLOCK-04, each FR-UX-01 error, palette order and looping, an unknown palette, `colors` overriding `palette`, and the default palette.
- `test-vault/`: one note per chart type, one per error case, a properties note with 30 dated notes, a 500-row stress note, and a PDF export note. Checked by hand in light and dark on the default theme, Minimal and AnuPpuccin, and on a phone, before each release.

## Environment and configuration

No environment variables and no secrets. Build settings live in `esbuild.config.mjs`, the same as S-Calc.

## Migrations and seed data

- `settings.version` starts at 1. `loadSettings` merges defaults, then runs `migrate(from, to)` steps if the version is older.
- No seed palettes unless FR-PAL-06 makes it in.

---

### Open questions

None.

### Assumptions confirmed

1. **Palette size : RESOLVED.** 1 to 12 colours (default).
2. **Currency codes in cells : RESOLVED.** Yes, symbols and 3-letter codes such as `KWD` (default).
