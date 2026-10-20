import { Plugin } from 'obsidian';
import { SAMPLE_BLOCK } from './sample.ts';
import { BlockHost, ChartBlock } from './chart-block.ts';
import { DEFAULT_SETTINGS, SChartsSettings, migrate } from './settings.ts';
import { SChartsSettingTab } from './settings-tab.ts';

export default class SChartsPlugin extends Plugin implements BlockHost {
	settings: SChartsSettings = { ...DEFAULT_SETTINGS };
	blocks = new Set<ChartBlock>();
	private tab?: SChartsSettingTab;

	async onload() {
		this.settings = migrate(await this.loadData());

		this.registerMarkdownCodeBlockProcessor('s-chart', (source, el, ctx) => {
			ctx.addChild(new ChartBlock(el, source, this));
		});

		this.addCommand({
			id: 'insert-chart',
			name: 'Insert chart',
			editorCallback: (editor) => editor.replaceSelection(SAMPLE_BLOCK),
		});

		this.tab = new SChartsSettingTab(this.app, this);
		this.addSettingTab(this.tab);

		this.registerEvent(this.app.workspace.on('css-change', () => this.redrawAll()));
	}

	/** `data.json` changed on disk, for example through sync. */
	async onExternalSettingsChange() {
		this.settings = migrate(await this.loadData());
		this.tab?.refresh();
		this.redrawAll();
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.redrawAll();
	}

	redrawAll() {
		for (const block of this.blocks) block.redraw();
	}
}
