// The parts of ECharts S-Charts uses. Imported on the first chart, not at startup.
import { init, use } from 'echarts/core';
import { BarChart, HeatmapChart, LineChart, PieChart, RadarChart, ScatterChart } from 'echarts/charts';
import {
	GridComponent, LegendComponent, RadarComponent, TitleComponent, TooltipComponent, VisualMapContinuousComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

use([
	BarChart, HeatmapChart, LineChart, PieChart, RadarChart, ScatterChart,
	GridComponent, LegendComponent, RadarComponent, TitleComponent, TooltipComponent, VisualMapContinuousComponent,
	SVGRenderer,
]);

export { init };
