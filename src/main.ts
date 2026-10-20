// M0 spike: one hard-coded bar chart. Replaced in M1.
import { Plugin } from 'obsidian';
import { BarController, BarElement, CategoryScale, Chart, LinearScale } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale);

export default class SChartsPlugin extends Plugin {
	onload() {
		this.registerMarkdownCodeBlockProcessor('s-chart', (_src, el) => {
			const wrap = el.createDiv();
			wrap.style.position = 'relative';
			wrap.style.height = '300px';
			const canvas = wrap.createEl('canvas');
			const css = getComputedStyle(document.body);
			const printing = !!el.closest('.print');
			const chart = new Chart(canvas, {
				type: 'bar',
				data: {
					labels: ['Jan', 'Feb', 'Mar'],
					datasets: [
						{ label: 'Revenue', data: [4200, 5100, 6300], backgroundColor: css.getPropertyValue('--color-accent') },
						{ label: 'Costs', data: [3100, 3300, 3500], backgroundColor: css.getPropertyValue('--color-blue') },
					],
				},
				options: { responsive: true, maintainAspectRatio: false, animation: printing ? false : undefined, devicePixelRatio: printing ? 2 : undefined },
			});
			if (printing) {
				const img = wrap.createEl('img', { attr: { src: chart.toBase64Image() } });
				img.style.width = '100%';
				chart.destroy();
				canvas.remove();
				wrap.style.height = 'auto';
			}
		});
	}
}
