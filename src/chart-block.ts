import { MarkdownRenderChild, TFile, debounce, type App } from 'obsidian';
import type { EChartsType } from 'echarts/core';
import { resolveColors } from './colors.ts';
import { colorCount, toChartOption } from './config.ts';
import { parse } from './parse.ts';
import { loadRows, matches } from './properties.ts';
import type { SChartsSettings } from './settings.ts';
import { readTheme } from './theme.ts';

type ECharts = typeof import('./echarts.ts');
let echarts: ECharts | undefined;

/** ECharts is about 600 KB, so it loads with the first chart instead of slowing Obsidian's startup. */
async function loadECharts(): Promise<ECharts> {
	echarts ??= await import('./echarts.ts');
	return echarts;
}

export interface BlockHost {
	app: App;
	settings: SChartsSettings;
	blocks: Set<ChartBlock>;
}

function renderMessages(el: HTMLElement, cls: string, msgs: { line?: number; text: string }[]) {
	const box = el.createDiv({ cls });
	for (const m of msgs) box.createDiv({ text: m.line ? `Line ${m.line}: ${m.text}` : m.text });
}

let labelCount = 0;

/** Owns one chart. Every redraw runs parse to config again from the block text. */
export class ChartBlock extends MarkdownRenderChild {
	private chart?: EChartsType;
	private resizer?: ResizeObserver;
	/** Counts draws, so a draw still waiting for ECharts can tell it was replaced. */
	private drawn = 0;
	/** Notes the last properties build used, so a note that stops matching still triggers a redraw. */
	private paths = new Set<string>();

	constructor(el: HTMLElement, private source: string, private host: BlockHost) {
		super(el);
	}

	onload() {
		this.host.blocks.add(this);
		this.redraw();
		const source = parse(this.source).spec?.source;
		if (source !== undefined) this.watch(source);
	}

	/** Properties mode: redraw when a matching note's properties change, at most once per 500 ms. */
	private watch(source: string) {
		const { app } = this.host;
		const soon = debounce(() => this.redraw(), 500, true);
		const touches = (file: TFile, oldPath?: string) =>
			this.paths.has(file.path) || (oldPath !== undefined && this.paths.has(oldPath)) || matches(app, file, source);
		this.registerEvent(app.metadataCache.on('changed', (file) => {
			if (touches(file)) soon();
		}));
		this.registerEvent(app.vault.on('delete', (file) => {
			if (this.paths.has(file.path)) soon();
		}));
		this.registerEvent(app.vault.on('rename', (file, oldPath) => {
			if (file instanceof TFile && touches(file, oldPath)) soon();
		}));
	}

	onunload() {
		this.host.blocks.delete(this);
		this.drawn++;
		this.clear();
	}

	private clear() {
		this.resizer?.disconnect();
		this.resizer = undefined;
		this.chart?.dispose();
		this.chart = undefined;
	}

	redraw() {
		this.clear();
		this.containerEl.empty();
		try {
			this.draw();
		} catch (err) {
			console.error('S-Charts render error', err);
			this.containerEl.empty();
			renderMessages(this.containerEl, 's-chart-error', [{ text: 'S-Charts hit a bug, please report it.' }]);
		}
	}

	private draw() {
		const el = this.containerEl;
		const { spec, warnings, errors } = parse(this.source);
		if (!spec) {
			renderMessages(el, 's-chart-error', errors);
			return;
		}
		const notices: { line?: number; text: string }[] = [...warnings];
		if (spec.source !== undefined) {
			const rows = loadRows(spec, this.host.app);
			this.paths = rows.paths;
			if (!rows.labels.length) {
				const text = rows.paths.size
					? `${rows.paths.size} notes match "${spec.source}", but none has the property "${spec.x ?? ''}".`
					: `No notes match "${spec.source}". Use a tag like "#daily" or a folder path.`;
				renderMessages(el, 's-chart-error', [{ text }]);
				return;
			}
			spec.labels = rows.labels;
			spec.series = rows.series;
			if (rows.skipped) {
				notices.push({ text: `${rows.skipped} ${rows.skipped === 1 ? 'note' : 'notes'} skipped: no "${spec.x ?? ''}" property.` });
			}
		}

		const { settings } = this.host;
		const theme = readTheme(el);
		const { colors, notice } = resolveColors(spec, settings, theme, colorCount(spec));
		if (notice) notices.push({ text: notice });
		if ((spec.type === 'pie' || spec.type === 'doughnut') && spec.series.length > 1) {
			notices.push({ text: `${spec.type === 'pie' ? 'Pie' : 'Doughnut'} charts show the first series only (${spec.series[0]?.name ?? ''}).` });
		}

		// Obsidian's PDF export renders the note again inside .print in a hidden window.
		const printing = !!el.closest('.print');
		const height = spec.height ?? settings.defaultHeight;
		const wrap = el.createDiv({ cls: 's-chart' });
		wrap.setCssProps({ '--s-chart-height': `${height}px` });
		const label = `${spec.title ?? 'Chart'}: ${spec.type} chart of ${spec.series.map((s) => s.name).join(', ')}`;
		// aria-labelledby, not aria-label: Obsidian shows every aria-label as a hover tooltip.
		const labelId = `s-chart-label-${++labelCount}`;
		wrap.createSpan({ cls: 's-chart-label', text: label, attr: { id: labelId } });
		const box = wrap.createDiv({ cls: 's-chart-plot', attr: { role: 'img', 'aria-labelledby': labelId } });
		const option = toChartOption(spec, colors, theme, settings.animations && !printing, height);
		const draw = ++this.drawn;
		const render = (lib: ECharts) => {
			if (draw !== this.drawn) return;
			if (printing) {
				// PDF export: a fixed-size SVG as an image scales to the page and stays vector.
				const chart = lib.init(null, null, { renderer: 'svg', ssr: true, width: 700, height });
				chart.setOption(option);
				const svg = chart.renderToSVGString();
				chart.dispose();
				box.createEl('img', { cls: 's-chart-print', attr: { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, alt: label } });
				wrap.addClass('is-printed');
				return;
			}
			const chart = lib.init(box, null, { renderer: 'svg' });
			chart.setOption(option);
			this.chart = chart;
			this.resizer = new ResizeObserver(() => chart.resize());
			this.resizer.observe(box);
		};
		const fail = (err: unknown) => {
			console.error('S-Charts render error', err);
			el.empty();
			renderMessages(el, 's-chart-error', [{ text: 'S-Charts hit a bug, please report it.' }]);
		};
		// Once ECharts is loaded, draw straight away: PDF export doesn't wait for promises.
		if (echarts) render(echarts);
		else loadECharts().then(render).catch(fail);
		if (notices.length) renderMessages(el, 's-chart-notice', notices);
	}
}
