// Pure: note properties to chart rows. No Obsidian imports.
import { parseNumber } from './numbers.ts';
import type { Series } from './parse.ts';

export interface Rows {
	labels: string[];
	series: Series[];
	/** Notes that matched the source but have no x property. */
	skipped: number;
}

/** Property names match without case, the same as Obsidian's properties view. */
function get(fm: Record<string, unknown>, key: string): unknown {
	if (key in fm) return fm[key];
	const k = key.toLowerCase();
	const found = Object.keys(fm).find((name) => name.toLowerCase() === k);
	return found === undefined ? undefined : fm[found];
}

function toNumber(v: unknown): number | null {
	if (typeof v === 'number') return Number.isFinite(v) ? v : null;
	if (typeof v !== 'string') return null;
	const n = parseNumber(v);
	return n === null || Number.isNaN(n) ? null : n;
}

/** One row per note, sorted by x. Numbers sort as numbers, anything else as text (ISO dates sort right). */
export function buildRows(notes: Record<string, unknown>[], x: string, y: string[]): Rows {
	const rows: { x: string | number; y: (number | null)[] }[] = [];
	let skipped = 0;
	for (const fm of notes) {
		const xv = get(fm, x);
		if (typeof xv !== 'string' && typeof xv !== 'number') {
			skipped++;
			continue;
		}
		if (typeof xv === 'string' && xv.trim() === '') {
			skipped++;
			continue;
		}
		rows.push({ x: xv, y: y.map((name) => toNumber(get(fm, name))) });
	}
	rows.sort((a, b) =>
		typeof a.x === 'number' && typeof b.x === 'number'
			? a.x - b.x
			: String(a.x).localeCompare(String(b.x), undefined, { numeric: true }),
	);
	return {
		labels: rows.map((r) => String(r.x)),
		series: y.map((name, i) => ({ name, values: rows.map((r) => r.y[i] ?? null) })),
		skipped,
	};
}
