// Pure: block text to a ChartSpec plus messages. No Obsidian imports.
import { parseNumber } from './numbers.ts';

export const CHART_TYPES = ['bar', 'line', 'area', 'pie', 'doughnut', 'scatter', 'radar', 'heatmap'] as const;
export type ChartType = (typeof CHART_TYPES)[number];
export type Legend = 'top' | 'bottom' | 'none';

export interface Series {
	name: string;
	values: (number | null)[];
}

export interface ChartSpec {
	type: ChartType;
	title?: string;
	palette?: string;
	colors?: string[];
	height?: number;
	stacked: boolean;
	horizontal: boolean;
	legend?: Legend;
	xLabel?: string;
	yLabel?: string;
	source?: string;
	x?: string;
	y?: string[];
	labels: string[];
	series: Series[];
}

export interface Msg {
	line: number;
	text: string;
}

export interface ParseResult {
	spec?: ChartSpec;
	warnings: Msg[];
	errors: Msg[];
}

const KEYS = [
	'type', 'title', 'palette', 'colors', 'height', 'stacked', 'horizontal',
	'legend', 'x-label', 'y-label', 'source', 'x', 'y',
];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isHex(value: string): boolean {
	return HEX.test(value);
}

function listOf(value: string): string[] {
	return value.split(',').map((s) => s.trim()).filter((s) => s !== '');
}

function unquote(value: string): string {
	const v = value.trim();
	if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) {
		return v.slice(1, -1);
	}
	return v;
}

function distance(a: string, b: string): number {
	const row = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let prev = row[0] ?? 0;
		row[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const cur = row[j] ?? 0;
			row[j] = Math.min(cur + 1, (row[j - 1] ?? 0) + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
			prev = cur;
		}
	}
	return row[b.length] ?? 0;
}

function suggest(key: string): string | undefined {
	let best: string | undefined;
	// pallet -> palette is 3 edits, so allow about half the key's length.
	let bestD = Math.max(2, Math.floor(key.length / 2)) + 1;
	for (const k of KEYS) {
		const d = distance(key, k);
		if (d < bestD) {
			best = k;
			bestD = d;
		}
	}
	return best;
}

function cells(row: string): string[] {
	let s = row.trim();
	if (s.startsWith('|')) s = s.slice(1);
	if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
	return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
}

/**
 * Header is `key: value` lines, then a `---` line, then a markdown table.
 * With `source:` set there is no table. Line numbers count from 1 inside the block.
 */
export function parse(source: string): ParseResult {
	const lines = source.split(/\r?\n/);
	const warnings: Msg[] = [];
	const errors: Msg[] = [];
	const sep = lines.findIndex((l) => l.trim() === '---');
	const headerEnd = sep === -1 ? lines.length : sep;

	const header = new Map<string, { value: string; line: number }>();
	let firstRow = -1;
	for (let i = 0; i < headerEnd; i++) {
		const raw = lines[i] ?? '';
		if (raw.trim() === '') continue;
		if (sep === -1 && raw.trim().startsWith('|')) {
			// A table with no --- above it: reported once below.
			if (firstRow === -1) firstRow = i + 1;
			continue;
		}
		const m = /^\s*([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(raw);
		if (!m) {
			errors.push({ line: i + 1, text: `can't read "${raw.trim()}". Use key: value.` });
			continue;
		}
		const key = (m[1] ?? '').toLowerCase();
		if (!KEYS.includes(key)) {
			const near = suggest(key);
			warnings.push({
				line: i + 1,
				text: `unknown key "${key}"` + (near ? `, did you mean ${near}?` : '.'),
			});
			continue;
		}
		header.set(key, { value: unquote(m[2] ?? ''), line: i + 1 });
	}

	const typeEntry = header.get('type');
	let type: ChartType | undefined;
	if (!typeEntry || typeEntry.value === '') {
		errors.push({ line: typeEntry?.line ?? 1, text: 'missing type. Add a line like type: bar.' });
	} else if ((CHART_TYPES as readonly string[]).includes(typeEntry.value.toLowerCase())) {
		type = typeEntry.value.toLowerCase() as ChartType;
	} else {
		errors.push({
			line: typeEntry.line,
			text: `unknown type "${typeEntry.value}". Use bar, line, area, pie, doughnut, scatter, radar or heatmap.`,
		});
	}

	const bool = (key: string): boolean => {
		const e = header.get(key);
		if (!e) return false;
		const v = e.value.toLowerCase();
		if (v === 'true' || v === 'yes') return true;
		if (v !== 'false' && v !== 'no') {
			warnings.push({ line: e.line, text: `${key} should be true or false. Using false.` });
		}
		return false;
	};

	const spec: ChartSpec = {
		type: type ?? 'bar',
		stacked: bool('stacked'),
		horizontal: bool('horizontal'),
		labels: [],
		series: [],
	};

	const text = (key: string): string | undefined => {
		const v = header.get(key)?.value;
		return v ? v : undefined;
	};
	spec.title = text('title');
	spec.palette = text('palette');
	spec.xLabel = text('x-label');
	spec.yLabel = text('y-label');

	const height = header.get('height');
	if (height) {
		const n = Number(height.value.replace(/px$/i, ''));
		if (Number.isInteger(n) && n >= 120 && n <= 1200) spec.height = n;
		else warnings.push({ line: height.line, text: 'height must be a whole number from 120 to 1200. Using the default.' });
	}

	const legend = header.get('legend');
	if (legend) {
		const v = legend.value.toLowerCase();
		if (v === 'top' || v === 'bottom' || v === 'none') spec.legend = v;
		else warnings.push({ line: legend.line, text: `legend "${legend.value}" should be top, bottom or none. Using top.` });
	}

	const colors = header.get('colors');
	if (colors) {
		const good: string[] = [];
		for (const c of listOf(colors.value)) {
			if (isHex(c)) good.push(c);
			else warnings.push({ line: colors.line, text: `"${c}" is not a hex colour like #e11d48. Skipped.` });
		}
		if (good.length) spec.colors = good;
	}

	const src = header.get('source');
	if (src) {
		spec.source = src.value;
		if (spec.source === '') errors.push({ line: src.line, text: 'source is empty. Use a tag like "#daily" or a folder path.' });
		spec.x = text('x');
		spec.y = listOf(header.get('y')?.value ?? '').map(unquote);
		if (!spec.x) errors.push({ line: src.line, text: 'source needs an x: line naming the property for the x axis.' });
		if (!spec.y.length) errors.push({ line: src.line, text: 'source needs a y: line naming one or more properties to plot.' });
		return done(spec, warnings, errors);
	}

	if (sep === -1) {
		errors.push({ line: firstRow === -1 ? lines.length : firstRow, text: 'no "---" line. Put --- between the settings and the table.' });
		return { warnings, errors };
	}

	const rows: { cells: string[]; line: number }[] = [];
	for (let i = sep + 1; i < lines.length; i++) {
		const raw = (lines[i] ?? '').trim();
		if (raw === '') continue;
		if (!raw.startsWith('|')) {
			errors.push({ line: i + 1, text: `not a table row: "${raw}". Rows start with |.` });
			continue;
		}
		const c = cells(raw);
		if (c.every((x) => /^:?-+:?$/.test(x))) continue;
		rows.push({ cells: c, line: i + 1 });
	}

	const head = rows.shift();
	if (!head) {
		errors.push({ line: sep + 1, text: 'no table after "---". Add a markdown table.' });
		return { warnings, errors };
	}
	if (head.cells.length < 2) {
		errors.push({ line: head.line, text: 'the table has no number columns. Add a column after the labels.' });
		return { warnings, errors };
	}
	if (!rows.length) {
		errors.push({ line: head.line, text: 'the table has a header but no rows.' });
		return { warnings, errors };
	}

	spec.series = head.cells.slice(1).map((name, i) => ({ name: name || `Series ${i + 1}`, values: [] }));
	for (const row of rows) {
		const label = row.cells[0] ?? '';
		spec.labels.push(label);
		if (spec.type === 'scatter') {
			const x = parseNumber(label);
			if (x === null || Number.isNaN(x)) {
				errors.push({ line: row.line, text: `scatter needs a number in the first column, not "${label}".` });
			}
		}
		spec.series.forEach((s, i) => {
			const cell = row.cells[i + 1] ?? '';
			const n = parseNumber(cell);
			if (n !== null && Number.isNaN(n)) {
				errors.push({ line: row.line, text: `can't read "${cell}" as a number in column "${s.name}".` });
				s.values.push(null);
			} else {
				s.values.push(n);
			}
		});
		if (row.cells.length > spec.series.length + 1) {
			warnings.push({ line: row.line, text: 'this row has more cells than the header. Extra cells ignored.' });
		}
	}

	return done(spec, warnings, errors);
}

function done(spec: ChartSpec, warnings: Msg[], errors: Msg[]): ParseResult {
	warnings.sort((a, b) => a.line - b.line);
	errors.sort((a, b) => a.line - b.line);
	return errors.length ? { warnings, errors } : { spec, warnings, errors };
}
