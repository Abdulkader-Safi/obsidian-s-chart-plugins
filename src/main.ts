import { Plugin } from 'obsidian';
import { BlockHost, ChartBlock } from './chart-block.ts';
import { DEFAULT_SETTINGS, SChartsSettings } from './settings.ts';

export default class SChartsPlugin extends Plugin implements BlockHost {
	settings: SChartsSettings = { ...DEFAULT_SETTINGS };
	blocks = new Set<ChartBlock>();

	async onload() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<SChartsSettings>);

		this.registerMarkdownCodeBlockProcessor('s-chart', (source, el, ctx) => {
			ctx.addChild(new ChartBlock(el, source, this));
		});

		this.registerEvent(this.app.workspace.on('css-change', () => this.redrawAll()));
	}

	redrawAll() {
		for (const block of this.blocks) block.redraw();
	}
}
