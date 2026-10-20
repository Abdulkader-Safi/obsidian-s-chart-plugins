// Reads the active theme's colours and font from Obsidian's CSS variables.

export const SERIES_VARS = [
	'--color-accent', '--color-blue', '--color-green', '--color-orange', '--color-purple',
	'--color-red', '--color-cyan', '--color-yellow', '--color-pink',
];

export interface ThemeColors {
	series: string[];
	text: string;
	muted: string;
	border: string;
	background: string;
	font: string;
	/** Value of a CSS variable such as `--color-accent`, or "" when unset. */
	lookup(name: string): string;
}

/** `el` picks the document: PDF export renders in a popout window with its own body and theme class. */
export function readTheme(el: HTMLElement): ThemeColors {
	const css = el.win.getComputedStyle(el.doc.body);
	const lookup = (name: string) => css.getPropertyValue(name).trim();
	const text = lookup('--text-normal');
	const series = SERIES_VARS.map(lookup).filter((c) => c !== '');
	return {
		series: series.length ? series : [text],
		text,
		muted: lookup('--text-muted'),
		border: lookup('--background-modifier-border'),
		background: lookup('--background-secondary'),
		font: lookup('--font-interface'),
		lookup,
	};
}
