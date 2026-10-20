import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPaletteColor, paletteNameError, resolveColors } from '../src/colors.ts';
import { migrate } from '../src/settings.ts';

const theme = {
	series: ['accent', 'blue', 'green'],
	lookup: (name: string) => (name === '--color-accent' ? 'hsl(258, 88%, 66%)' : ''),
};
const dsrpt = { name: 'dsrpt', colors: ['#7853D5', '#2E2A3B'] };
const settings = { palettes: [dsrpt], defaultPalette: 'theme' };

test('theme colours in order when nothing is set', () => {
	assert.deepEqual(resolveColors({}, settings, theme, 2), { colors: ['accent', 'blue'] });
});

test('theme colours loop past the end', () => {
	assert.deepEqual(resolveColors({}, settings, theme, 4).colors, ['accent', 'blue', 'green', 'accent']);
});

test('a palette colours series in order and loops', () => {
	assert.deepEqual(resolveColors({ palette: 'dsrpt' }, settings, theme, 3).colors, ['#7853D5', '#2E2A3B', '#7853D5']);
});

test('palette names match without case', () => {
	assert.deepEqual(resolveColors({ palette: 'DSRPT' }, settings, theme, 1).colors, ['#7853D5']);
});

test('an unknown palette falls back to the theme with a notice', () => {
	assert.deepEqual(resolveColors({ palette: 'nope' }, settings, theme, 2), {
		colors: ['accent', 'blue'],
		notice: "Palette 'nope' not found, using theme colours.",
	});
});

test('colors overrides palette', () => {
	assert.deepEqual(resolveColors({ colors: ['#e11d48', '#0ea5e9'], palette: 'dsrpt' }, settings, theme, 2).colors, ['#e11d48', '#0ea5e9']);
});

test('the default palette applies when the block has none', () => {
	const s = { ...settings, defaultPalette: 'dsrpt' };
	assert.deepEqual(resolveColors({}, s, theme, 2).colors, ['#7853D5', '#2E2A3B']);
	assert.deepEqual(resolveColors({ colors: ['#fff'] }, s, theme, 1).colors, ['#fff']);
});

test('an unknown palette does not fall to the default palette', () => {
	const s = { ...settings, defaultPalette: 'dsrpt' };
	assert.deepEqual(resolveColors({ palette: 'nope' }, s, theme, 1).colors, ['accent']);
});

test('var() entries resolve through the theme, empty ones are dropped', () => {
	const p = { name: 'mix', colors: ['var(--color-accent)', 'var(--nothing)', '#000'] };
	assert.deepEqual(resolveColors({ palette: 'mix' }, { palettes: [p], defaultPalette: 'theme' }, theme, 2).colors, ['hsl(258, 88%, 66%)', '#000']);
});

test('colour validation', () => {
	for (const c of ['#abc', '#AABBCC', '#aabbcc80', 'var(--color-accent)']) assert.ok(isPaletteColor(c), c);
	for (const c of ['red', '#ab', '#abcd', 'var(--x);background:url(x)', 'rgb(1,2,3)', 'var(--X Y)']) assert.ok(!isPaletteColor(c), c);
});

test('palette name validation', () => {
	assert.equal(paletteNameError('dsrpt', [], -1), undefined);
	assert.equal(paletteNameError('DSRPT', [dsrpt], 0), undefined);
	assert.match(paletteNameError('DSRPT', [dsrpt], -1) ?? '', /already/);
	assert.match(paletteNameError('my palette', [], -1) ?? '', /letters/);
	assert.match(paletteNameError('', [], -1) ?? '', /letters/);
	assert.match(paletteNameError('x'.repeat(33), [], -1) ?? '', /letters/);
	assert.match(paletteNameError('Theme', [], -1) ?? '', /reserved/);
});

test('migrate fills defaults and drops bad data', () => {
	assert.deepEqual(migrate(null), { version: 1, palettes: [], defaultPalette: 'theme', defaultHeight: 300, animations: true });
	const m = migrate({
		palettes: [dsrpt, { name: 'DSRPT', colors: ['#000'] }, { name: 'bad name', colors: ['#000'] }, { name: 'empty', colors: ['red'] }],
		defaultPalette: 'gone',
		defaultHeight: 5,
		animations: false,
	});
	assert.deepEqual(m.palettes, [dsrpt]);
	assert.equal(m.defaultPalette, 'theme');
	assert.equal(m.defaultHeight, 300);
	assert.equal(m.animations, false);
	assert.equal(migrate({ palettes: [dsrpt], defaultPalette: 'dsrpt' }).defaultPalette, 'dsrpt');
	assert.equal(migrate({ palettes: [{ name: 'big', colors: Array(20).fill('#000') }] }).palettes[0]?.colors.length, 12);
});
