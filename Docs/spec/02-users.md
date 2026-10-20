# Users and usage

Status: signed off 2026-10-18

## Personas

### Primary: "Noor," the tracker in her notes

- **Background:** freelance product designer in Kuwait. Keeps her life in Obsidian: monthly income, a habit log, project hours.
- **What drives them:** wants to see whether things are going up or down without leaving the note. Likes a tidy vault and changes themes every few months.
- **Current workaround:** copies tables into Google Sheets, makes the chart there, pastes a screenshot back. Tried Charts (phibr0), but the colours clashed with her theme and she couldn't fix them without hex codes in every block.
- **Tech comfort:** happy editing markdown tables and a few `key: value` lines. Won't write JavaScript or Dataview queries.
- **Relationship to theming:** "if it doesn't match my theme, I don't want it in my vault."
- **Devices and environment:** MacBook in light mode, iPhone for quick checks. English UI, some Arabic labels.

### Secondary: "Safi," the developer who writes reports

- **Background:** lead engineer at dsrpt. Writes SEO audits, project notes and client reports in the vault, and exports some to PDF.
- **What drives them:** charts in the client's or dsrpt's brand colours (dsrpt violet `#7853D5`) without styling each one by hand.
- **Current workaround:** builds charts as HTML or images outside Obsidian and links them in.
- **Tech comfort:** high. Would also use the properties source.
- **Relationship to theming:** wants brand palettes that override the theme on purpose.
- **Devices and environment:** Mac desktop, PDF export.
- **Why not the beachhead:** a small group. Noor's need (native-looking charts with zero setup) is what grows downloads. Safi's need (named palettes) is what makes S-Charts different.

### Not the target

Data analysts who want pivots, joins and dashboards (use Dataview, Bases or Prism). People who want charts of live web or API data. People who only want a GUI and never want to see the block text. We won't add a query language or a dashboard layout to win them over.

## Roles and permissions

Single user, local only. No roles.

## Jobs to be done

- When **Noor adds a month to her income table**, she wants **the chart under it to update**, so she can **see the trend at a glance**.
- When **Noor switches theme or goes from light to dark**, she wants **every chart to follow**, so she can **keep her vault looking consistent**.
- When **Safi writes a client report**, he wants **charts in the client's brand colours**, so he can **send a PDF that looks designed**.
- When **Safi's brand colours change**, he wants **to edit one palette in settings**, so he can **update every chart that uses it**.
- When **Noor logs weight in daily-note properties**, she wants **one chart across all those notes**, so she can **see progress without copying data into a table**.
- When **anyone writes a block wrong**, they want **a clear message on the line that's wrong**, so they can **fix it without guessing**.

## Primary user journey

1. **Discovery:** Reddit r/ObsidianMD, the community directory search "chart", or Safi's Instagram post. Pitch: "Charts that match your theme. Set your colours once."
2. **Setup:** install and enable. Nothing else is needed, and theme colours work straight away.
3. **First use:** runs "S-Charts: Insert chart", gets a sample bar chart block, and edits the table.
4. **Aha moment:** switches from light to dark and the chart switches with it, in the theme's own colours.
5. **Optional power-up:** creates a palette in settings and adds `palette: mine` to a block. Or uses `source:` to chart properties.
6. **Finish:** the chart stays in the note. It renders in reading view, live preview and PDF export.
7. **Ongoing use:** updates numbers in the table, adds new charts with the command, reuses palettes.

## Core loop

**The repeated action:** edit a number in the table -> leave the block -> chart re-renders -> read the trend.

**What pulls users back:**

- Their data already lives in notes, so the chart costs nothing extra to keep up to date.
- One palette change restyles every chart, which keeps them using palettes and keeps the vault consistent.

## Language, accessibility and locale

- Plugin UI (settings, commands, errors) in English for v1.
- Chart text (labels, title, legend) shows whatever the user writes, Arabic included, in the right direction.
- Numbers in tooltips use the system locale via `Intl.NumberFormat`.
- Each chart gets `role="img"` and an `aria-label` built from the title, type and series names. Keyboard focus and tooltips follow Chart.js defaults.
- WCAG 2.2 AA for plugin UI (settings tab). Colour contrast of user palettes is the user's choice, but the starter palettes must meet 3:1 against both the light and the dark default background.

---

### Open questions

None.

### Assumptions confirmed

1. **Primary persona : RESOLVED.** Noor (non-coding note-taker) first, Safi (developer writing reports) second (default).
2. **UI language : RESOLVED.** English only in v1. Chart text in any language, Arabic included (default).
