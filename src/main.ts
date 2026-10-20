import { Plugin } from 'obsidian';
import { BarController, BarElement, CategoryScale, Chart, LinearScale } from 'chart.js';
import { parse, Msg } from './parse.ts';

Chart.register(BarController, BarElement, CategoryScale, LinearScale);

function renderMessages(el: HTMLElement, cls: string, msgs: Msg[]) {
	const box = el.createDiv({ cls });
	for (const m of msgs) box.createDiv({ text: `Line ${m.line}: ${m.text}` });
}

export default class SChartsPlugin extends Plugin {
	onload() {
		this.registerMarkdownCodeBlockProcessor('s-chart', (source, el) => {
			const { spec, warnings, errors } = parse(source);
			if (!spec) {
				renderMessages(el, 's-chart-error', errors);
				return;
			}
			// ponytail: M1 draws every type as a bar. M2 replaces this with config.ts and ChartBlock.
			const wrap = el.createDiv({ cls: 's-chart' });
			new Chart(wrap.createEl('canvas'), {
				type: 'bar',
				data: {
					labels: spec.labels,
					datasets: spec.series.map((s) => ({ label: s.name, data: s.values })),
				},
				options: { responsive: true, maintainAspectRatio: false },
			});
			if (warnings.length) renderMessages(el, 's-chart-notice', warnings);
		});
	}
}
