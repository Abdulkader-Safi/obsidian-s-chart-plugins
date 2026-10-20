// Pure: one table cell to a number. No Obsidian imports.

const CELL =
	/^([-+]?)\s*(?:[A-Z]{3}\s*|[$€£¥₹]\s*)?([-+]?)(\d[\d,]*(?:\.\d+)?|\.\d+)\s*(?:%|\s*[A-Z]{3}|[$€£¥₹])?$/;

/**
 * Reads `4200`, `4,200`, `$4,200`, `KWD 4,200`, `42%`, `-3.5`.
 * Empty gives null (a gap). Anything else gives NaN, which the parser reports.
 */
export function parseNumber(cell: string): number | null {
	const text = cell.trim();
	if (text === '') return null;
	const m = CELL.exec(text);
	if (!m) return NaN;
	const negative = (m[1] === '-') !== (m[2] === '-');
	const value = Number((m[3] ?? '').replace(/,/g, ''));
	return negative ? -value : value;
}
