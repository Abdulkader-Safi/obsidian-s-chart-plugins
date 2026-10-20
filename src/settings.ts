// Settings type, defaults and migration. Pure: no Obsidian imports.
import { isPaletteColor, isPaletteName } from './colors.ts';

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

export const SETTINGS_VERSION = 1;
export const MAX_COLORS = 12;

export const DEFAULT_SETTINGS: SChartsSettings = {
	version: SETTINGS_VERSION,
	palettes: [],
	defaultPalette: 'theme',
	defaultHeight: 300,
	animations: true,
};

export function isHeight(n: number): boolean {
	return Number.isInteger(n) && n >= 120 && n <= 1200;
}

/**
 * Merges saved data over the defaults and drops anything that no longer validates,
 * so a hand-edited or synced `data.json` can't break rendering.
 */
export function migrate(raw: unknown): SChartsSettings {
	const data = (raw && typeof raw === 'object' ? raw : {}) as Partial<SChartsSettings>;
	// Version 1 is the first schema. Later versions add their steps here, oldest first.
	const seen = new Set<string>();
	const palettes: Palette[] = [];
	for (const p of Array.isArray(data.palettes) ? data.palettes : []) {
		if (!p || typeof p.name !== 'string' || !isPaletteName(p.name)) continue;
		if (seen.has(p.name.toLowerCase())) continue;
		const colors = (Array.isArray(p.colors) ? p.colors : [])
			.filter((c): c is string => typeof c === 'string' && isPaletteColor(c))
			.slice(0, MAX_COLORS);
		if (!colors.length) continue;
		seen.add(p.name.toLowerCase());
		palettes.push({ name: p.name, colors });
	}
	const def = typeof data.defaultPalette === 'string' ? data.defaultPalette : 'theme';
	return {
		version: SETTINGS_VERSION,
		palettes,
		defaultPalette: seen.has(def.toLowerCase()) ? def : 'theme',
		defaultHeight: typeof data.defaultHeight === 'number' && isHeight(data.defaultHeight) ? data.defaultHeight : DEFAULT_SETTINGS.defaultHeight,
		animations: typeof data.animations === 'boolean' ? data.animations : DEFAULT_SETTINGS.animations,
	};
}
