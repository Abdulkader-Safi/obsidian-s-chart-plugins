// Every chart shown in the docs. The build prints this text under each image, and
// scripts/capture-examples.js renders the same text in Obsidian to make the image.

const SALES = `| Month | Revenue | Costs |
| ----- | ------- | ----- |
| Jan   | 4200    | 3100  |
| Feb   | 5100    | 3300  |
| Mar   | 6300    | 3500  |
| Apr   | 5800    | 3400  |`;

const block = (header, table) => `${header}\n---\n${table}`;

export const examples = {
	'intro': block('type: bar\ntitle: Monthly revenue', SALES),

	'bar': block('type: bar\ntitle: Monthly revenue', SALES),
	'bar-stacked': block('type: bar\ntitle: Revenue and costs, stacked\nstacked: true', SALES),
	'bar-horizontal': block('type: bar\ntitle: Monthly revenue\nhorizontal: true\nlegend: bottom', SALES),
	'bar-labels': block('type: bar\ntitle: Monthly revenue\nx-label: Month\ny-label: KWD\nheight: 360', SALES),

	'line': block('type: line\ntitle: Monthly revenue', SALES),
	'line-gap': block('type: line\ntitle: Visits, with a missing week', `| Week | Visits |
| ---- | ------ |
| 1    | 820    |
| 2    | 940    |
| 3    |        |
| 4    | 1,120  |
| 5    | 1,260  |
| 6    | 1,180  |`),
	'line-stacked': block('type: line\ntitle: Signups by plan, stacked\nstacked: true\nlegend: bottom', `| Month | Free | Pro | Team |
| ----- | ---- | --- | ---- |
| Jan   | 120  | 40  | 10   |
| Feb   | 150  | 55  | 14   |
| Mar   | 170  | 70  | 22   |
| Apr   | 210  | 82  | 30   |`),

	'area': block('type: area\ntitle: Monthly revenue', SALES),
	'area-stacked': block('type: area\ntitle: Revenue and costs, stacked\nstacked: true\ny-label: KWD', SALES),

	'pie': block('type: pie\ntitle: Visits by channel', `| Channel | Visits |
| ------- | ------ |
| Search  | 5200   |
| Social  | 3100   |
| Email   | 1900   |
| Direct  | 1400   |`),
	'pie-legend': block('type: pie\ntitle: Visits by channel\nlegend: bottom\nheight: 360', `| Channel | Visits |
| ------- | ------ |
| Search  | 5200   |
| Social  | 3100   |
| Email   | 1900   |
| Direct  | 1400   |`),

	'doughnut': block('type: doughnut\ntitle: Users by plan', `| Plan | Users |
| ---- | ----- |
| Free | 6400  |
| Pro  | 2100  |
| Team | 900   |`),
	'doughnut-colors': block('type: doughnut\ntitle: Users by plan\ncolors: #0E653F, #B9D63A, #101614', `| Plan | Users |
| ---- | ----- |
| Free | 6400  |
| Pro  | 2100  |
| Team | 900   |`),

	'scatter': block('type: scatter\ntitle: Height and weight\nx-label: Height (cm)\ny-label: Weight (kg)', `| Height | Weight |
| ------ | ------ |
| 158    | 54     |
| 162    | 59     |
| 165    | 61     |
| 170    | 66     |
| 172    | 70     |
| 175    | 72     |
| 178    | 77     |
| 181    | 79     |
| 185    | 84     |`),
	'scatter-two': block('type: scatter\ntitle: Two groups\nx-label: Hours studied\ny-label: Score', `| Hours | Class A | Class B |
| ----- | ------- | ------- |
| 1     | 52      | 48      |
| 2     | 58      | 55      |
| 3     | 61      |         |
| 4     | 70      | 64      |
| 5     | 74      | 69      |
| 6     | 81      | 77      |`),

	'radar': block('type: radar\ntitle: Skills', `| Skill   | Ali | Sara |
| ------- | --- | ---- |
| Design  | 7   | 9    |
| Code    | 9   | 6    |
| Writing | 5   | 8    |
| Sales   | 4   | 7    |
| Support | 8   | 5    |`),

	'colors': block('type: bar\ntitle: Monthly revenue\ncolors: #e11d48, #0ea5e9', SALES),

	'properties': 'type: line\ntitle: Weight\nsource: "#daily"\nx: date\ny: weight',
	'properties-two': 'type: bar\ntitle: Weight and steps\nsource: "#daily"\nx: date\ny: weight, steps\nlegend: bottom',

	'numbers': block('type: line\ntitle: Every number format', `| Month | Value     |
| ----- | --------- |
| Jan   | 4200      |
| Feb   | 4,200     |
| Mar   | $4,600    |
| Apr   | KWD 4,900 |
| May   |           |
| Jun   | 5,300     |`),

	'error-type': 'type: bars\n---\n| Month | Revenue |\n| ----- | ------- |\n| Jan   | 4200    |',
	'warning-key': block('type: bar\ntitle: Monthly revenue\npallet: brand', SALES),
};
