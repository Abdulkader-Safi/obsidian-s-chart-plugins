// Pure: ChartSpec to a Chart.js config. No Obsidian imports.
import type { ChartConfiguration, ChartDataset, TooltipItem } from 'chart.js';
import { color } from 'chart.js/helpers';
import { parseNumber } from './numbers.ts';
import type { ChartSpec } from './parse.ts';
import type { ThemeColors } from './theme.ts';

type Theme = Omit<ThemeColors, 'lookup' | 'series'>;

function fade(c: string, alpha: number): string {
	const parsed = color(c);
	return parsed.valid ? parsed.alpha(alpha).rgbString() : c;
}

/** Pie and doughnut colour each slice, so they need one colour per label. */
export function colorCount(spec: ChartSpec): number {
	return spec.type === 'pie' || spec.type === 'doughnut' ? spec.labels.length : spec.series.length;
}

export function toChartConfig(
	spec: ChartSpec,
	colors: string[],
	theme: Theme,
	animations: boolean,
): ChartConfiguration {
	const fmt = new Intl.NumberFormat();
	const round = spec.type === 'pie' || spec.type === 'doughnut';
	const radial = round || spec.type === 'radar';
	const c = (i: number) => colors[i % colors.length] ?? theme.text;

	let datasets: ChartDataset[];
	if (round) {
		const first = spec.series[0];
		datasets = [{
			label: first?.name ?? '',
			data: first?.values ?? [],
			backgroundColor: spec.labels.map((_, i) => c(i)),
			borderColor: theme.background,
		}];
	} else if (spec.type === 'scatter') {
		const xs = spec.labels.map((l) => parseNumber(l));
		datasets = spec.series.map((s, i) => ({
			label: s.name,
			data: s.values.flatMap((y, j) => (y === null ? [] : [{ x: xs[j] ?? 0, y }])),
			backgroundColor: c(i),
			borderColor: c(i),
		}));
	} else {
		const area = spec.type === 'area';
		datasets = spec.series.map((s, i) => ({
			label: s.name,
			data: s.values,
			borderColor: c(i),
			backgroundColor: spec.type === 'bar' ? c(i) : fade(c(i), area ? 0.3 : 0.2),
			fill: area ? (spec.stacked && i > 0 ? '-1' : 'origin') : spec.type === 'radar',
			tension: 0,
			pointRadius: spec.type === 'bar' ? undefined : spec.labels.length > 50 ? 0 : 3,
		}));
	}

	const legend = spec.legend ?? (round || spec.series.length > 1 ? 'top' : 'none');
	const grid = { color: theme.border };
	const ticks = { color: theme.muted };
	const axisTitle = (text?: string) => ({ display: !!text, text: text ?? '', color: theme.muted });
	const horizontal = spec.horizontal && spec.type === 'bar';
	const indexAxis = horizontal ? 'y' : 'x';
	const valueAxis = horizontal ? 'x' : 'y';

	const scales = radial
		? spec.type === 'radar'
			? { r: { grid, angleLines: grid, ticks: { ...ticks, backdropColor: 'transparent' }, pointLabels: { color: theme.muted } } }
			: {}
		: {
			[indexAxis]: {
				type: spec.type === 'scatter' ? 'linear' : 'category',
				stacked: spec.stacked,
				grid, ticks, border: grid,
				title: axisTitle(spec.xLabel),
			},
			[valueAxis]: {
				type: 'linear',
				stacked: spec.stacked,
				beginAtZero: spec.type === 'bar' || spec.type === 'area',
				grid, ticks, border: grid,
				title: axisTitle(spec.yLabel),
			},
		};

	return {
		type: spec.type === 'area' ? 'line' : spec.type,
		data: { labels: spec.type === 'scatter' ? undefined : spec.labels, datasets },
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: animations ? undefined : false,
			indexAxis,
			layout: { padding: 8 },
			color: theme.text,
			font: { family: theme.font },
			scales,
			plugins: {
				title: { display: !!spec.title, text: spec.title ?? '', color: theme.text, font: { family: theme.font, size: 14, weight: 'bold' } },
				legend: { display: legend !== 'none', position: legend === 'bottom' ? 'bottom' : 'top', labels: { color: theme.text } },
				tooltip: {
					backgroundColor: theme.background,
					titleColor: theme.text,
					bodyColor: theme.text,
					borderColor: theme.border,
					borderWidth: 1,
					callbacks: {
						title: () => '',
						label: (item: TooltipItem<'bar'>) => {
							const name = item.dataset.label ?? '';
							if (spec.type === 'scatter') {
								const p = item.raw as { x: number; y: number };
								return `${name}: (${fmt.format(p.x)}, ${fmt.format(p.y)})`;
							}
							const raw = item.raw;
							const value = typeof raw === 'number' ? fmt.format(raw) : '';
							return `${item.label}, ${name}: ${value}`;
						},
					},
				},
			},
		},
	} as ChartConfiguration;
}

/**
 * A pixel ratio at which Chart.js sizes the canvas to exactly `devW` x `devH` screen pixels.
 * Chart.js drops the fraction from `css * ratio`, so at zoom levels like 120% the canvas comes out
 * one pixel short and the browser stretches it, blurring text and lines. Undefined if no ratio fits both.
 */
export function snapRatio(cssW: number, cssH: number, devW: number, devH: number): number | undefined {
	if (!(cssW > 0 && cssH > 0 && devW > 0 && devH > 0)) return undefined;
	// Chart.js rounds to one decimal before dropping the fraction, so stay below devW + 0.95.
	const lo = Math.max(devW / cssW, devH / cssH);
	const hi = Math.min((devW + 0.95) / cssW, (devH + 0.95) / cssH);
	return lo < hi ? (lo + hi) / 2 : undefined;
}
