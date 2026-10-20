import { MarkdownRenderChild } from 'obsidian';
import {
	ArcElement, BarController, BarElement, CategoryScale, Chart, DoughnutController, Filler, Legend,
	LinearScale, LineController, LineElement, PieController, PointElement, RadarController,
	RadialLinearScale, ScatterController, Title, Tooltip,
} from 'chart.js';
import { resolveColors } from './colors.ts';
import { colorCount, toChartConfig } from './config.ts';
import { parse } from './parse.ts';
import type { SChartsSettings } from './settings.ts';
import { readTheme } from './theme.ts';

Chart.register(
	ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Filler, Legend,
	LinearScale, LineController, LineElement, PieController, PointElement, RadarController,
	RadialLinearScale, ScatterController, Title, Tooltip,
);

export interface BlockHost {
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
	private chart?: Chart;

	constructor(el: HTMLElement, private source: string, private host: BlockHost) {
		super(el);
	}

	onload() {
		this.host.blocks.add(this);
		this.redraw();
	}

	onunload() {
		this.host.blocks.delete(this);
		this.chart?.destroy();
		this.chart = undefined;
	}

	redraw() {
		this.chart?.destroy();
		this.chart = undefined;
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
		if (spec.source) {
			// ponytail: properties mode is M4.
			renderMessages(el, 's-chart-error', [{ text: 'Properties source is not built yet.' }]);
			return;
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
		const wrap = el.createDiv({ cls: 's-chart' });
		wrap.setCssProps({ '--s-chart-height': `${spec.height ?? settings.defaultHeight}px` });
		const label = `${spec.title ?? 'Chart'}: ${spec.type} chart of ${spec.series.map((s) => s.name).join(', ')}`;
		// aria-labelledby, not aria-label: Obsidian shows every aria-label as a hover tooltip.
		const labelId = `s-chart-label-${++labelCount}`;
		wrap.createSpan({ cls: 's-chart-label', text: label, attr: { id: labelId } });
		const canvas = wrap.createEl('canvas', { attr: { role: 'img', 'aria-labelledby': labelId } });
		const config = toChartConfig(spec, colors, theme, settings.animations && !printing);
		if (printing && config.options) config.options.devicePixelRatio = 2;
		this.chart = new Chart(canvas, config);

		if (printing) {
			// A canvas prints at screen width and gets cut off; an image scales to the page.
			wrap.createEl('img', { cls: 's-chart-print', attr: { src: this.chart.toBase64Image(), alt: label } });
			this.chart.destroy();
			this.chart = undefined;
			canvas.remove();
			wrap.addClass('is-printed');
		}
		if (notices.length) renderMessages(el, 's-chart-notice', notices);
	}
}
