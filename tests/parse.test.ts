import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNumber } from '../src/numbers.ts';
import { parse } from '../src/parse.ts';

const EXAMPLE = `type: bar
title: Monthly revenue
palette: dsrpt
---
| Month | Revenue | Costs |
| ----- | ------- | ----- |
| Jan   | 4200    | 3100  |
| Feb   | 5100    | 3300  |
| Mar   | 6300    | 3500  |`;

test('parseNumber reads every listed format', () => {
	assert.equal(parseNumber('4200'), 4200);
	assert.equal(parseNumber('4,200'), 4200);
	assert.equal(parseNumber('$4,200'), 4200);
	assert.equal(parseNumber('KWD 4,200'), 4200);
	assert.equal(parseNumber('42%'), 42);
	assert.equal(parseNumber('-3.5'), -3.5);
	assert.equal(parseNumber('-$3.5'), -3.5);
	assert.equal(parseNumber('4,200 KWD'), 4200);
	assert.equal(parseNumber('.5'), 0.5);
	assert.equal(parseNumber('  '), null);
	assert.equal(parseNumber(''), null);
	assert.ok(Number.isNaN(parseNumber('abc')));
	assert.ok(Number.isNaN(parseNumber('12abc')));
	assert.ok(Number.isNaN(parseNumber('1.2.3')));
});

test('the monthly revenue example gives 3 labels and 2 series', () => {
	const { spec, errors, warnings } = parse(EXAMPLE);
	assert.deepEqual(errors, []);
	assert.deepEqual(warnings, []);
	assert.equal(spec?.type, 'bar');
	assert.equal(spec?.title, 'Monthly revenue');
	assert.equal(spec?.palette, 'dsrpt');
	assert.deepEqual(spec?.labels, ['Jan', 'Feb', 'Mar']);
	assert.deepEqual(spec?.series, [
		{ name: 'Revenue', values: [4200, 5100, 6300] },
		{ name: 'Costs', values: [3100, 3300, 3500] },
	]);
});

test('a new column adds a series named after its header', () => {
	const src = EXAMPLE.replace('| Costs |', '| Costs | Profit |')
		.replace('| ----- |\n', '| ----- | --- |\n')
		.replace('3100  |', '3100  | 1100 |');
	const { spec } = parse(src);
	assert.equal(spec?.series.length, 3);
	assert.equal(spec?.series[2]?.name, 'Profit');
	assert.deepEqual(spec?.series[2]?.values, [1100, null, null]);
});

test('every header key is read', () => {
	const { spec, warnings } = parse(`type: Line
title: "Quoted"
colors: #e11d48, #0ea5e9
height: 400
stacked: true
horizontal: yes
legend: bottom
x-label: Month
y-label: KWD
---
| a | b |
| 1 | 2 |`);
	assert.deepEqual(warnings, []);
	assert.equal(spec?.type, 'line');
	assert.equal(spec?.title, 'Quoted');
	assert.deepEqual(spec?.colors, ['#e11d48', '#0ea5e9']);
	assert.equal(spec?.height, 400);
	assert.equal(spec?.stacked, true);
	assert.equal(spec?.horizontal, true);
	assert.equal(spec?.legend, 'bottom');
	assert.equal(spec?.xLabel, 'Month');
	assert.equal(spec?.yLabel, 'KWD');
});

test('empty cells are gaps and mixed formats parse', () => {
	const { spec, errors } = parse(`type: line
---
| m | v |
|---|---|
| a | $4,200 |
| b | |
| c | KWD 4,200 |
| d | 42% |
| e | -3.5 |`);
	assert.deepEqual(errors, []);
	assert.deepEqual(spec?.series[0]?.values, [4200, null, 4200, 42, -3.5]);
});

test('unknown key warns with a suggestion and still renders', () => {
	const { spec, warnings } = parse('type: bar\npallet: dsrpt\n---\n| a | b |\n| x | 1 |');
	assert.ok(spec);
	assert.deepEqual(warnings, [{ line: 2, text: 'unknown key "pallet", did you mean palette?' }]);
	const far = parse('type: bar\nzzzzzz: 1\n---\n| a | b |\n| x | 1 |');
	assert.deepEqual(far.warnings, [{ line: 2, text: 'unknown key "zzzzzz".' }]);
});

test('bad values warn and fall back', () => {
	const { spec, warnings } = parse('type: bar\nheight: 50\nstacked: maybe\nlegend: left\ncolors: red, #fff\n---\n| a | b |\n| x | 1 |');
	assert.equal(spec?.height, undefined);
	assert.equal(spec?.stacked, false);
	assert.equal(spec?.legend, undefined);
	assert.deepEqual(spec?.colors, ['#fff']);
	assert.deepEqual(warnings.map((w) => w.line), [2, 3, 4, 5]);
});

// FR-UX-01: each listed mistake has its own message and line.
test('missing type', () => {
	assert.deepEqual(parse('title: x\n---\n| a | b |\n| x | 1 |').errors, [
		{ line: 1, text: 'missing type. Add a line like type: bar.' },
	]);
});

test('unknown type', () => {
	assert.deepEqual(parse('title: x\ntype: bars\n---\n| a | b |\n| x | 1 |').errors, [
		{ line: 2, text: 'unknown type "bars". Use bar, line, area, pie, doughnut, scatter or radar.' },
	]);
});

test('no --- line', () => {
	assert.deepEqual(parse('type: bar\n| a | b |').errors.map((e) => e.line), [2]);
	assert.match(parse('type: bar\ntitle: x').errors[0]?.text ?? '', /no "---" line/);
});

test('no table', () => {
	assert.deepEqual(parse('type: bar\n---\n').errors, [
		{ line: 2, text: 'no table after "---". Add a markdown table.' },
	]);
});

test('a table with no number columns', () => {
	assert.deepEqual(parse('type: bar\n---\n| Month |\n|---|\n| Jan |').errors, [
		{ line: 3, text: 'the table has no number columns. Add a column after the labels.' },
	]);
});

test('an unreadable cell', () => {
	assert.deepEqual(parse('type: bar\n---\n| m | Revenue |\n|---|---|\n| Jan | 4200 |\n| Feb | lots |').errors, [
		{ line: 6, text: 'can\'t read "lots" as a number in column "Revenue".' },
	]);
});

test('header only, a stray line, and a bad header line', () => {
	assert.match(parse('type: bar\n---\n| a | b |').errors[0]?.text ?? '', /no rows/);
	assert.deepEqual(parse('type: bar\n---\n| a | b |\nhello\n| x | 1 |').errors.map((e) => e.line), [4]);
	assert.deepEqual(parse('type: bar\njust words\n---\n| a | b |\n| x | 1 |').errors.map((e) => e.line), [2]);
});

test('scatter needs numbers in the first column', () => {
	assert.ok(parse('type: scatter\n---\n| x | y |\n| 1 | 2 |\n| 3 | 4 |').spec);
	assert.deepEqual(parse('type: scatter\n---\n| x | y |\n| one | 2 |').errors.map((e) => e.line), [4]);
});

test('source mode needs no table', () => {
	const { spec, errors } = parse('type: line\nsource: "#daily"\nx: date\ny: weight, steps');
	assert.deepEqual(errors, []);
	assert.equal(spec?.source, '#daily');
	assert.equal(spec?.x, 'date');
	assert.deepEqual(spec?.y, ['weight', 'steps']);
	assert.equal(parse('type: line\nsource: #daily\nx: date\ny: weight').spec?.source, '#daily');
	assert.equal(parse('type: line\nsource: Daily\ny: weight').errors.length, 1);
});
