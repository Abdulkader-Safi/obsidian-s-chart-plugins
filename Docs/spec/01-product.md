# S-Charts _(working name)_

Status: signed off 2026-10-18

## Mission

S-Charts is the second plugin in Safi's "s-" family of small, native Obsidian plugins, after [[Projects/Personal/s-calc/overview|S-Calc]]. It is free and open source. It earns reputation with the technical audience, gives the socials a real project to show, and backs up freelance and dsrpt pitches with shipped work.

That shapes every decision below: few dependencies, a small bundle, data that stays readable plain text, and colours that come from the user's theme unless they say otherwise.

## One-liner

An `s-chart` code block that turns a markdown table in your note into a chart that looks like part of your theme, plus named colour palettes you set once in settings and reuse anywhere with `palette: <name>`.

## The problem

People keep numbers in their notes: monthly income, habit counts, client report figures, workout logs. To see the trend they copy the table into a spreadsheet, make the chart there, and paste a screenshot back. The screenshot goes stale the moment a number changes.

Chart plugins already exist. Downloads and last-update dates are from Obsidian's `community-plugin-stats.json`, pulled 2026-10-18:

| Plugin            | Downloads | Last update | How it works                                                                      | Gap                                          |
| ----------------- | --------- | ----------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| Charts (phibr0)   | 331,258   | 2024-01-26  | Charts from tables or CSV                                                         | Not updated in almost 3 years                |
| Tracker           | 367,974   | 2026-02-21  | Tracks values from frontmatter and tags across daily notes                        | Own syntax, built around daily-note tracking |
| Charts View       | 97,667    | 2025-12-08  | Ant Design Charts, lots of chart types                                            | Long YAML config, heavy bundle               |
| Bases Chart Views | 15,201    | 2026-10-09  | ECharts views on top of Bases                                                     | Only works on Bases, not inside a note       |
| Fancy Charts      | 2,044     | 2026-08-24  | ECharts, YAML header plus a markdown table, builder modal, follows light and dark | No reusable palettes, ECharts bundle         |
| Prism             | 873       | 2026-10-17  | Sandboxed iframe, theme bridge, dashboards, Mermaid, KaTeX                        | Broad and aimed at AI agents writing code    |
| GoodCharts        | 127       | 2026-08-26  | TanStack Charts, table-to-chart toggle                                            | Very early                                   |

What they have in common: colours are either the chart library's default palette or hex codes typed into each chart. None of the READMEs above lets you define a palette once and call it by name in any block. The ECharts-based ones also ship about 1.1 MB of minified JavaScript (measured, see Stage 4).

**Honest read:** the gap is narrow. Fancy Charts already uses nearly the same syntax. What S-Charts adds is theme-first colours, named palettes, a bundle about a sixth of the size, and charts from note properties without Dataview. Whether that's enough is what the [[Content/Socials/posts/2026-10-18-obsidian-chart-plugin-reddit/post|Reddit post]] is for. Don't start M1 until the replies are in.

**First Reddit reply (2026-10-18):** a user of phibr0's Charts for "a couple years" said that plugin's mobile rendering is "hit or miss" and its dark theme support is "basically nonexistent without hacking the CSS". They called pulling data from properties "the real killer app", because the alternative is Dataview and "a wall of javascript", and said they'd "switch in a heartbeat" if the syntax is as clean as the example. Their condition for switching is PDF export that actually works. All four points are already in the requirements: mobile (NFR-05), theme (FR-THEME-01, FR-THEME-02), properties (FR-SRC-01, now a Must) and PDF (FR-UX-04, the M0 spike). One reply isn't a go decision, but it points the same way.

## The value

Safi writes an SEO audit note for a client. Under the findings he types a six-row table of monthly clicks, puts `s-chart` and `type: line` on top, and adds `palette: dsrpt`. The chart comes out in dsrpt violet on the page, matches the rest of the note, and goes into the PDF export as is. Next month he changes one number and the chart follows.

Versus Fancy Charts, the user gets:

- Named palettes: set brand or personal colours once and use them by name, so 20 charts across a vault stay consistent and one settings change updates them all.
- Theme colours by default: series colours come from the theme's own colour variables, so a chart looks native in Minimal, AnuPpuccin or the default theme without any setup.
- A smaller plugin: about 192 KB minified against about 1.14 MB for ECharts, which matters most on mobile.
- Charts from note properties: `source: "#daily"` with `x: date` and `y: weight` charts a property across many notes, no Dataview needed.

What it deliberately is not: a dashboard builder, a BI tool, a Dataview replacement, a way to chart live web data, or a GUI chart designer in v1. People who need those should use Dataview, Bases or Prism.

## Product category

An in-note visualisation plugin in the Obsidian community directory. It competes with Charts, Fancy Charts and GoodCharts on "chart from a table in a note", and with Tracker on "chart a property over time". The white space is consistent, theme-native colour across the whole vault.

## Business model and licence

Free, MIT licence, the same as S-Calc. No paid tier, no telemetry. Donation link to be decided.

## Platforms

Obsidian desktop (macOS, Windows, Linux) and mobile (iOS, Android) from day one. `isDesktopOnly: false`.

## What success looks like

One year in: S-Charts is listed in the community directory with 5,000+ downloads, issues get a reply within a week, Safi uses it in his own report and project notes, and it has had at least one Instagram or YouTube post. Measurable signals: download count from `community-plugin-stats.json`, GitHub stars, open versus closed issues, palettes users share in GitHub Discussions.

## UI and product references

- **S-Calc** (Safi's own): keep the native feel. Styling reads Obsidian CSS variables, the block renders in place, and there are no extra panels.
- **shadcn/ui charts**: keep the palette idea. Charts read colours from numbered variables (`--chart-1` to `--chart-5`), so changing the palette restyles every chart. S-Charts does the same with named palettes.
- **Fancy Charts**: keep the YAML header plus markdown table format, which people already know. Skip its two separate modes.

---

### Open questions

None.

### Assumptions confirmed

1. **Go or no-go : RESOLVED.** Spec is finished now. Build starts with M0 (the PDF spike). Keep reading Reddit replies before M1.
2. **Name : RESOLVED.** Display name "S-Charts", plugin ID `s-charts`, code block language `s-chart` (the block keyword tells the plugin which code blocks are its own). Neither ID is taken in `community-plugins.json` as of 2026-10-18.
3. **Licence : RESOLVED.** MIT.
4. **Donation link : RESOLVED.** None at launch (default).
5. **Success target : RESOLVED.** 5,000 downloads in the first year (default).
