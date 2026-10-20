// Settings type and defaults. The tab is added in M3.

export interface Palette {
	name: string;
	colors: string[];
}

export interface SChartsSettings {
	version: number;
	palettes: Palette[];
	/** "theme" or a palette name. */
	defaultPalette: string;
	defaultHeight: number;
	animations: boolean;
}

export const DEFAULT_SETTINGS: SChartsSettings = {
	version: 1,
	palettes: [],
	defaultPalette: 'theme',
	defaultHeight: 300,
	animations: true,
};
