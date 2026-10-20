import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRows } from '../src/rows.ts';

test('rows sort by x and skip notes without x', () => {
	const r = buildRows(
		[
			{ date: '2026-10-03', weight: 80.1 },
			{ weight: 79 },
			{ date: '2026-10-01', weight: '81.5', steps: 9000 },
			{ date: '', weight: 1 },
			{ Date: '2026-10-02', Weight: 'n/a' },
		],
		'date',
		['weight', 'steps'],
	);
	assert.deepEqual(r.labels, ['2026-10-01', '2026-10-02', '2026-10-03']);
	assert.deepEqual(r.series, [
		{ name: 'weight', values: [81.5, null, 80.1] },
		{ name: 'steps', values: [9000, null, null] },
	]);
	assert.equal(r.skipped, 2);
});

test('numeric x sorts as numbers', () => {
	assert.deepEqual(buildRows([{ n: 10, v: 1 }, { n: 9, v: 2 }, { n: '100', v: 3 }], 'n', ['v']).labels, ['9', '10', '100']);
});
