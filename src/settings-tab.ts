import {
	DropdownComponent, PluginSettingTab, Setting, requireApiVersion,
	type App, type ColorComponent, type SettingDefinitionItem,
} from 'obsidian';
import { isPaletteColor, paletteNameError } from './colors.ts';
import { ConfirmModal, destructive } from './confirm-modal.ts';
import type SChartsPlugin from './main.ts';
import { MAX_COLORS, isHeight } from './settings.ts';

/** One settings row. `fill` adds its controls. It must not return the `Setting`, which has a `then` method. */
interface Row {
	name: string;
	desc?: string;
	fill?: (setting: Setting) => void;
}

interface Section {
	heading?: string;
	rows: Row[];
}

// A new colour starts grey so it reads as "pick me" in light and dark.
const NEW_COLOR = '#888888';

/** The colour picker takes #rrggbb only. */
function pickerValue(c: string): string | undefined {
	if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map((x) => x + x).join('');
	if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(c)) return c.slice(0, 7);
	return undefined;
}

function showError(setting: Setting, input: HTMLElement, error: string | undefined) {
	input.toggleClass('s-chart-invalid', !!error);
	input.setAttr('aria-invalid', error ? 'true' : 'false');
	setting.descEl.toggleClass('s-chart-setting-error', !!error);
	setting.setDesc(error ?? '');
}

export class SChartsSettingTab extends PluginSettingTab {
	private dropdown?: DropdownComponent;

	constructor(app: App, private plugin: SChartsPlugin) {
		super(app, plugin);
	}

	/** Obsidian 1.13.0 and later render the tab from these, which also puts the settings in settings search. */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return this.sections().flatMap((section): SettingDefinitionItem[] => {
			const items = section.rows.map((row) => ({
				name: row.name,
				desc: row.desc,
				render: (setting: Setting) => this.fillRow(setting, row),
			}));
			return section.heading === undefined ? items : [{ type: 'group', heading: section.heading, items }];
		});
	}

	/** Older versions never call `getSettingDefinitions`, so the same rows are drawn by hand. */
	display(): void {
		this.drawByHand();
	}

	private drawByHand(): void {
		const { containerEl } = this;
		containerEl.empty();
		for (const section of this.sections()) {
			if (section.heading !== undefined) new Setting(containerEl).setName(section.heading).setHeading();
			for (const row of section.rows) this.fillRow(new Setting(containerEl), row);
		}
	}

	/** Redraws after rows were added, moved or removed, or settings changed outside the tab. */
	refresh(): void {
		if (requireApiVersion('1.13.0')) this.update();
		else this.drawByHand();
	}

	private fillRow(setting: Setting, row: Row): void {
		setting.setName(row.name);
		if (row.desc !== undefined) setting.setDesc(row.desc);
		row.fill?.(setting);
	}

	private async save() {
		await this.plugin.saveSettings();
	}

	private fillDropdown() {
		const d = this.dropdown;
		if (!d) return;
		d.selectEl.empty();
		d.addOption('theme', 'Theme');
		for (const p of this.plugin.settings.palettes) d.addOption(p.name, p.name);
		d.setValue(this.plugin.settings.defaultPalette);
	}

	private sections(): Section[] {
		const s = this.plugin.settings;
		const general: Row[] = [
			{
				name: 'Default palette',
				desc: 'Used by charts with no palette or colors line.',
				fill: (setting) => {
					setting.addDropdown((d) => {
						this.dropdown = d;
						d.selectEl.setAttr('aria-label', 'Default palette');
						this.fillDropdown();
						d.onChange(async (v) => {
							s.defaultPalette = v;
							await this.save();
						});
					});
				},
			},
			{
				name: 'Default height',
				desc: 'Chart height in pixels, from 120 to 1200.',
				fill: (setting) => {
					setting.addText((t) => {
						t.inputEl.type = 'number';
						t.inputEl.setAttr('aria-label', 'Default height in pixels');
						t.inputEl.min = '120';
						t.inputEl.max = '1200';
						t.setValue(String(s.defaultHeight)).onChange(async (v) => {
							const n = Number(v);
							const ok = isHeight(n);
							t.inputEl.toggleClass('s-chart-invalid', !ok);
							t.inputEl.setAttr('aria-invalid', ok ? 'false' : 'true');
							if (!ok) return;
							s.defaultHeight = n;
							await this.save();
						});
					});
				},
			},
			{
				name: 'Animations',
				desc: 'Animate charts when they draw. Always off in PDF export.',
				fill: (setting) => {
					setting.addToggle((t) =>
						t.setValue(s.animations).onChange(async (v) => {
							s.animations = v;
							await this.save();
						}),
					);
				},
			},
		];

		const palettes: Row[] = [];
		if (!s.palettes.length) palettes.push({ name: 'No palettes yet', desc: 'Add one, then use it in a chart with palette: name.' });
		s.palettes.forEach((_, i) => palettes.push(...this.paletteRows(i)));
		palettes.push({
			name: 'Add palette',
			fill: (setting) => {
				setting.addButton((b) =>
					b.setButtonText('Add palette').setCta().onClick(async () => {
						let n = s.palettes.length + 1;
						while (paletteNameError(`palette-${n}`, s.palettes, -1)) n++;
						s.palettes.push({ name: `palette-${n}`, colors: [NEW_COLOR] });
						await this.save();
						this.refresh();
					}),
				);
			},
		});

		return [{ rows: general }, { heading: 'Palettes', rows: palettes }];
	}

	private paletteRows(index: number): Row[] {
		const s = this.plugin.settings;
		const palette = s.palettes[index];
		if (!palette) return [];
		const rows: Row[] = [
			{
				name: `Palette ${index + 1}`,
				fill: (setting) => {
					setting.settingEl.addClass('s-chart-palette-row');
					setting.addText((t) => {
						t.inputEl.setAttr('aria-label', `Palette ${index + 1} name`);
						t.setValue(palette.name).onChange(async (v) => {
							const name = v.trim();
							const error = paletteNameError(name, s.palettes, index);
							showError(setting, t.inputEl, error);
							if (error) return;
							if (s.defaultPalette.toLowerCase() === palette.name.toLowerCase()) s.defaultPalette = name;
							palette.name = name;
							this.fillDropdown();
							await this.save();
						});
					});
					setting.addButton((b) =>
						b.setButtonText('Add colour').setDisabled(palette.colors.length >= MAX_COLORS).onClick(async () => {
							palette.colors.push(NEW_COLOR);
							await this.save();
							this.refresh();
						}),
					);
					setting.addButton((b) =>
						destructive(b.setButtonText('Delete palette')).onClick(() => {
							new ConfirmModal(this.app, `Delete the palette "${palette.name}"? Charts that use it switch to theme colours.`, 'Delete', async () => {
								s.palettes.splice(index, 1);
								if (s.defaultPalette.toLowerCase() === palette.name.toLowerCase()) s.defaultPalette = 'theme';
								await this.save();
								this.refresh();
							}).open();
						}),
					);
				},
			},
		];

		palette.colors.forEach((c, j) => {
			rows.push({
				// Names are keys in the declarative API, so they must be unique across palettes.
				name: `Palette ${index + 1}, colour ${j + 1}`,
				fill: (setting) => {
					setting.settingEl.addClass('s-chart-color-row');
					let picker: ColorComponent | undefined;
					// Set while the hex field updates the picker, so the picker doesn't write back mid-typing.
					let syncing = false;
					const pv = pickerValue(c);
					if (pv) {
						setting.addColorPicker((p) => {
							picker = p;
							p.setValue(pv).onChange(async (v) => {
								if (syncing) return;
								palette.colors[j] = v;
								hex.setValue(v);
								showError(setting, hex.inputEl, undefined);
								await this.save();
							});
						});
					}
					let hex!: { setValue(v: string): unknown; inputEl: HTMLInputElement };
					setting.addText((t) => {
						hex = t;
						t.inputEl.setAttr('aria-label', `Palette ${index + 1}, colour ${j + 1}`);
						t.setPlaceholder('#7853D5').setValue(c).onChange(async (v) => {
							const value = v.trim();
							const ok = isPaletteColor(value);
							showError(setting, t.inputEl, ok ? undefined : 'Use a hex colour like #7853d5, or var(--color-accent).');
							if (!ok) return;
							palette.colors[j] = value;
							const next = pickerValue(value);
							if (next && picker) {
								syncing = true;
								picker.setValue(next);
								syncing = false;
							}
							await this.save();
						});
					});
					const move = async (to: number) => {
						const [moved] = palette.colors.splice(j, 1);
						if (moved !== undefined) palette.colors.splice(to, 0, moved);
						await this.save();
						this.refresh();
					};
					setting.addExtraButton((b) =>
						b.setIcon('arrow-up').setTooltip('Move earlier').setDisabled(j === 0).onClick(() => void move(j - 1)),
					);
					setting.addExtraButton((b) =>
						b.setIcon('arrow-down').setTooltip('Move later').setDisabled(j === palette.colors.length - 1).onClick(() => void move(j + 1)),
					);
					setting.addExtraButton((b) =>
						b.setIcon('x').setTooltip('Remove colour').setDisabled(palette.colors.length === 1).onClick(async () => {
							palette.colors.splice(j, 1);
							await this.save();
							this.refresh();
						}),
					);
				},
			});
		});
		return rows;
	}
}
