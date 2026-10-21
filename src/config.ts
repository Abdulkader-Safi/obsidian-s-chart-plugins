// Pure: ChartSpec to an ECharts option. No Obsidian or ECharts runtime imports.
import type { EChartsCoreOption } from 'echarts/core';
import { parseNumber } from './numbers.ts';
import type { ChartSpec } from './parse.ts';
import type { ThemeColors } from './theme.ts';

type Theme = Omit<ThemeColors, 'lookup' | 'series'>;

/** Tooltips are HTML, and labels come from the note, so they are escaped. */
export function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Pie and doughnut colour each slice, so they need one colour per label. Heatmap uses one colour. */
export function colorCount(spec: ChartSpec): number {
	if (spec.type === 'pie' || spec.type === 'doughnut') return spec.labels.length;
	return spec.type === 'heatmap' ? 1 : spec.series.length;
}

/** 7 → 10, 34 → 50, 1200 → 2000: one scale shared by every radar spoke. */
function niceMax(v: number): number {
	if (!(v > 0)) return 1;
	const p = 10 ** Math.floor(Math.log10(v));
	const n = v / p;
	return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

interface TipParams {
	seriesName?: string;
	seriesIndex?: number;
	name?: string;
	value?: unknown;
	dataIndex?: number;
}

export function toChartOption(
	spec: ChartSpec,
	colors: string[],
	theme: Theme,
	animations: boolean,
	height: number,
): EChartsCoreOption {
	const fmt = new Intl.NumberFormat();
	const num = (v: unknown) => (typeof v === 'number' ? fmt.format(v) : '');
	const { type } = spec;
	// ECharts writes the font inside a double-quoted SVG attribute without escaping it.
	const font = theme.font.replace(/"/g, "'");
	const round = type === 'pie' || type === 'doughnut';
	// A heatmap's scale under the chart does the legend's job.
	const legend = type === 'heatmap' ? 'none' : spec.legend ?? (round || spec.series.length > 1 ? 'top' : 'none');

	// Vertical space taken by the title and a top legend, so the plot starts below them.
	const titleH = spec.title ? 30 : 0;
	const legendTop = legend === 'top' ? 26 : 0;
	const top = titleH + legendTop + 12;
	// Horizontal bars swap axes, so the y-label sits under the chart and the x-label beside it.
	const horizontal = spec.horizontal && type === 'bar';
	const below = horizontal ? spec.yLabel : spec.xLabel;
	const beside = horizontal ? spec.xLabel : spec.yLabel;
	const bottom = (legend === 'bottom' ? 48 : 16) + (below ? 24 : 0);

	const line = { lineStyle: { color: theme.border } };
	const axis = {
		axisLine: line,
		axisTick: { show: false },
		axisLabel: { color: theme.muted },
		splitLine: line,
		nameTextStyle: { color: theme.muted },
		nameLocation: 'middle',
	};
	const category = (data: string[], name?: string, gap = 30) => ({ ...axis, type: 'category', data, name, nameGap: gap, splitLine: { show: false } });
	const value = (name?: string, gap = 30) => ({ ...axis, type: 'value', name, nameGap: gap, scale: type === 'line' || type === 'scatter' });
	const tip = (p: TipParams) => {
		const series = escapeHtml(p.seriesName ?? '');
		const name = escapeHtml(p.name ?? '');
		if (type === 'scatter') {
			const [x, y] = p.value as [number, number];
			return `${series}: (${num(x)}, ${num(y)})`;
		}
		if (type === 'radar') {
			const values = p.value as (number | null)[];
			return [series, ...spec.labels.map((l, i) => `${escapeHtml(l)}: ${num(values[i])}`)].join('<br>');
		}
		if (type === 'heatmap') {
			const [x, y, v] = p.value as [number, number, number];
			return `${escapeHtml(spec.labels[y] ?? '')}, ${escapeHtml(spec.series[x]?.name ?? '')}: ${num(v)}`;
		}
		return `${name}, ${series}: ${num(p.value)}`;
	};

	const option: Record<string, unknown> = {
		animation: animations,
		color: colors,
		textStyle: { fontFamily: font, color: theme.text },
		title: {
			show: !!spec.title,
			text: spec.title ?? '',
			left: 'center',
			top: 4,
			textStyle: { color: theme.text, fontFamily: font, fontSize: 14, fontWeight: 'bold' },
		},
		legend: {
			show: legend !== 'none',
			top: legend === 'top' ? titleH + 2 : undefined,
			bottom: legend === 'bottom' ? 4 : undefined,
			icon: 'roundRect',
			itemWidth: 14,
			itemHeight: 10,
			textStyle: { color: theme.text },
		},
		tooltip: {
			trigger: 'item',
			confine: true,
			backgroundColor: theme.background,
			borderColor: theme.border,
			textStyle: { color: theme.text, fontFamily: font },
			formatter: tip,
		},
	};

	if (round) {
		const first = spec.series[0];
		option.series = [{
			type: 'pie',
			name: first?.name ?? '',
			radius: type === 'pie' ? '85%' : ['50%', '85%'],
			top, bottom,
			label: { show: false },
			itemStyle: { borderColor: theme.background, borderWidth: 2 },
			data: spec.labels.flatMap((l, i) => {
				const v = first?.values[i];
				return v === null || v === undefined ? [] : [{ name: l, value: v }];
			}),
		}];
		return option;
	}

	if (type === 'radar') {
		const max = niceMax(Math.max(0, ...spec.series.flatMap((s) => s.values.map((v) => v ?? 0))));
		option.radar = {
			indicator: spec.labels.map((name) => ({ name, max })),
			// Centred in the space left under the title and legend, leaving room for the spoke names.
			center: ['50%', (top + height - bottom) / 2],
			radius: Math.max(40, (height - top - bottom) / 2 - 24),
			axisName: { color: theme.muted },
			axisLine: line,
			splitLine: line,
			splitArea: { show: false },
		};
		option.series = [{
			type: 'radar',
			data: spec.series.map((s) => ({ name: s.name, value: s.values.map((v) => v ?? 0), areaStyle: { opacity: 0.2 } })),
		}];
		return option;
	}

	if (type === 'heatmap') {
		const cells = spec.series.flatMap((s, x) => s.values.flatMap((v, y) => (v === null ? [] : [[x, y, v] as [number, number, number]])));
		const vs = cells.map((c) => c[2]);
		const min = vs.length ? Math.min(...vs) : 0;
		const max = vs.length ? Math.max(...vs) : 1;
		const strong = (v: number) => max > min && (v - min) / (max - min) > 0.5;
		const gap = { borderColor: theme.background, borderWidth: 3, borderRadius: 6 };
		// The column headers sit on top, so an x-label goes above them, under the title.
		option.grid = { top: titleH + 28 + (spec.xLabel ? 22 : 0), bottom: 40, left: 8, right: 8 };
		option.xAxis = { ...category(spec.series.map((s) => s.name), spec.xLabel, 26), position: 'top', axisLine: { show: false } };
		option.yAxis = { ...category(spec.labels, spec.yLabel, 40), inverse: true, axisLine: { show: false } };
		option.visualMap = {
			type: 'continuous',
			seriesIndex: 1,
			min, max,
			orient: 'horizontal',
			right: 8,
			bottom: 4,
			itemWidth: 10,
			itemHeight: 140,
			text: [num(max), num(min)],
			textStyle: { color: theme.muted },
			inRange: { color: [colors[0] ?? theme.text], colorAlpha: [0.2, 1] },
		};
		option.series = [
			{
				// Every cell, faint, so missing values still show where they belong.
				type: 'heatmap',
				silent: true,
				itemStyle: { ...gap, color: theme.border, opacity: 0.35 },
				data: spec.series.flatMap((_, x) => spec.labels.map((_, y) => [x, y, 0])),
			},
			{
				type: 'heatmap',
				name: spec.title ?? '',
				itemStyle: gap,
				label: { show: true, formatter: (p: TipParams) => num((p.value as number[])[2]) },
				data: cells.map((c) => ({ value: c, label: { color: strong(c[2]) ? '#ffffff' : theme.text } })),
			},
		];
		return option;
	}

	const stack = spec.stacked ? 'total' : undefined;
	option.grid = { top, bottom, left: 8 + (beside ? 22 : 0), right: 16 };
	if (type === 'scatter') {
		const xs = spec.labels.map((l) => parseNumber(l));
		// A little room past the outermost points, so they aren't cut in half by the plot edge.
		const pad = { boundaryGap: ['5%', '5%'] };
		option.xAxis = { ...value(spec.xLabel), ...pad, splitLine: line };
		option.yAxis = { ...value(spec.yLabel, 44), ...pad };
		option.series = spec.series.map((s) => ({
			type: 'scatter',
			name: s.name,
			symbolSize: 8,
			data: s.values.flatMap((y, j) => (y === null ? [] : [[xs[j] ?? 0, y]])),
		}));
		return option;
	}

	const labelAxis = category(spec.labels, spec.xLabel, horizontal ? 44 : 30);
	const valueAxis = value(spec.yLabel, horizontal ? 30 : 44);
	option.xAxis = horizontal ? valueAxis : labelAxis;
	option.yAxis = horizontal ? { ...labelAxis, inverse: true } : valueAxis;
	option.series = spec.series.map((s) => (type === 'bar'
		? { type: 'bar', name: s.name, stack, data: s.values }
		: {
			type: 'line',
			name: s.name,
			stack,
			data: s.values,
			showSymbol: spec.labels.length <= 50,
			symbolSize: 6,
			lineStyle: { width: 2 },
			areaStyle: type === 'area' ? { opacity: 0.3 } : undefined,
		}));
	return option;
}
