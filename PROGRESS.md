# Progress

Build log for S-Charts. The plan is `Docs/spec/06-build-spec.md`.

## Milestones

- M0 de-risk: done, two checks need Safi (see "Checks for Safi")
- M1 scaffold and parser: not started
- M2 rendering and theme: not started
- M3 palettes and settings: not started
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

## Checks for Safi

1. Minimal and AnuPpuccin, light and dark: open a chart note in each and check the colours look right (M5, NFR-08).
2. Open a PDF export at 200% in Preview and confirm it looks the same as the dumps described above.

## Decisions and deviations

- 2026-10-20: commit after each step and push to GitHub, at Safi's request. The spec said once per milestone. Local `main` pushes to the repo's default branch `master`.
- 2026-10-20: the repo and folder are `obsidian-s-chart-plugins`, not `obsidian-s-charts` as the spec wrote. The plugin ID is `s-charts`.
- 2026-10-20: `authorUrl` is the GitHub profile, the same as Property Reminders.
- 2026-10-20: the spike lived in this repo instead of a separate scratch plugin, so it could be loaded in the same vault without a second folder.
