import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snapRatio } from '../src/config.ts';

// Same steps as Chart.js retinaScale: round to one decimal, then the canvas drops the fraction.
const canvasSize = (css: number, r: number) => Math.trunc(Math.round(css * r * 10) / 10);

test('snapRatio fills the screen pixel box exactly', () => {
	const cases: [number, number, number, number][] = [[1546.5, 220, 1856, 264], [1546.5, 300, 1856, 360], [520.4, 220, 624, 264], [700, 300, 1400, 600]];
	for (const [w, h, dw, dh] of cases) {
		const r = snapRatio(w, h, dw, dh);
		assert.ok(r, `no ratio for ${w}x${h}`);
		assert.equal(canvasSize(w, r), dw);
		assert.equal(canvasSize(h, r), dh);
	}
});

test('snapRatio gives up when no single ratio fits', () => {
	assert.equal(snapRatio(100, 100, 120, 200), undefined);
	assert.equal(snapRatio(0, 100, 120, 120), undefined);
});
