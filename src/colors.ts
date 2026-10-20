// Pure: picks the colours for a chart. No Obsidian imports.
import type { ChartSpec } from './parse.ts';
import type { Palette } from './settings.ts';
import type { ThemeColors } from './theme.ts';

const PALETTE_COLOR = /^(?:#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|var\(--[a-z0-9-]+\))$/i;
const PALETTE_NAME = /^[A-Za-z0-9_-]{1,32}$/;

export function isPaletteColor(value: string): boolean {
	return PALETTE_COLOR.test(value.trim());
}

export function isPaletteName(value: string): boolean {
	return PALETTE_NAME.test(value);
}

export function findPalette(palettes: Palette[], name: string): Palette | undefined {
	const n = name.toLowerCase();
	return palettes.find((p) => p.name.toLowerCase() === n);
}

/**
 * Order: the block's `colors`, its `palette`, the default palette, then the theme.
 * Loops to fill `count`. `var(--x)` entries resolve through the theme.
 */
export function resolveColors(
	spec: Pick<ChartSpec, 'colors' | 'palette'>,
	settings: { palettes: Palette[]; defaultPalette: string },
	theme: Pick<ThemeColors, 'series' | 'lookup'>,
	count: number,
): { colors: string[]; notice?: string } {
	let base: string[] | undefined = spec.colors;
	let notice: string | undefined;
	if (!base && spec.palette) {
		base = findPalette(settings.palettes, spec.palette)?.colors;
		if (!base) notice = `Palette '${spec.palette}' not found, using theme colours.`;
	}
	if (!base && !notice && settings.defaultPalette !== 'theme') {
		base = findPalette(settings.palettes, settings.defaultPalette)?.colors;
	}
	const resolved = (base ?? [])
		.filter(isPaletteColor)
		.map((c) => (c.startsWith('var(') ? theme.lookup(c.slice(4, -1)) : c))
		.filter((c) => c !== '');
	const list = resolved.length ? resolved : theme.series;
	const colors = Array.from({ length: Math.max(count, 0) }, (_, i) => list[i % list.length] ?? '');
	return notice ? { colors, notice } : { colors };
}
