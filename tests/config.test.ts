import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, toChartOption } from '../src/config.ts';
import { parse } from '../src/parse.ts';

const theme = { text: '#111', muted: '#666', border: '#ddd', background: '#fff', font: 'sans-serif' };

test('heatmap puts columns on x, rows on y, and skips empty cells', () => {
	const { spec } = parse('type: heatmap\n---\n| Cohort | Week 0 | Week 1 |\n| --- | --- | --- |\n| Jan | 100 | 62 |\n| Feb | 100 |  |');
	assert.ok(spec);
	const option = toChartOption(spec, ['#3b82f6'], theme, false, 300) as { series: { data: unknown[] }[]; visualMap: { min: number; max: number } };
	const cells = option.series[1]?.data.map((d) => (d as { value: number[] }).value);
	assert.deepEqual(cells, [[0, 0, 100], [0, 1, 100], [1, 0, 62]]);
	assert.equal(option.series[0]?.data.length, 4);
	assert.deepEqual([option.visualMap.min, option.visualMap.max], [62, 100]);
});

test('tooltip text from the note is escaped', () => {
	assert.equal(escapeHtml('<img src=x onerror="a()">'), '&#60;img src=x onerror=&#34;a()&#34;&#62;');
});

test('font names lose double quotes, which break the exported SVG', () => {
	const { spec } = parse('type: bar\n---\n| A | B |\n| - | - |\n| x | 1 |');
	assert.ok(spec);
	const option = toChartOption(spec, ['#000'], { ...theme, font: '"Inter", sans-serif' }, false, 300) as { textStyle: { fontFamily: string } };
	assert.equal(option.textStyle.fontFamily, "'Inter', sans-serif");
});
