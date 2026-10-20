// Builds the docs site: wraps each fragment in site/pages/ in the shared layout and writes docs/.
// Usage: node scripts/build-docs.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { examples } from '../site/examples.mjs';

const REPO = 'https://github.com/Abdulkader-Safi/obsidian-s-chart-plugins';

const NAV = [
	{ title: 'Getting started', items: [
		['index', 'Introduction'],
		['first-chart', 'Your first chart'],
		['data', 'Writing the table'],
	] },
	{ title: 'Chart types', items: [
		['bar', 'Bar'],
		['line', 'Line'],
		['area', 'Area'],
		['pie', 'Pie'],
		['doughnut', 'Doughnut'],
		['scatter', 'Scatter'],
		['radar', 'Radar'],
	] },
	{ title: 'Customise', items: [
		['options', 'Options reference'],
		['colours', 'Colours and palettes'],
		['properties', 'Charts from properties'],
	] },
	{ title: 'Reference', items: [
		['settings', 'Plugin settings'],
		['errors', 'Errors and warnings'],
		['pdf', 'PDF export'],
	] },
];

const pages = NAV.flatMap((s) => s.items);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fence = (id) => {
	const src = examples[id];
	if (src === undefined) throw new Error(`Unknown example: ${id}`);
	return '```s-chart\n' + src + '\n```';
};
const codeBox = (id) =>
	`<div class="code"><button class="copy" type="button">Copy</button><pre><code>${esc(fence(id))}</code></pre></div>`;

/** Width and height from a PNG header, so the page reserves the right space before the image loads. */
function size(id) {
	const file = `docs/img/examples/${id}.png`;
	if (!existsSync(file)) throw new Error(`Missing ${file}. Run scripts/capture-examples.js in Obsidian.`);
	const png = readFileSync(file);
	return `width="${png.readUInt32BE(16)}" height="${png.readUInt32BE(20)}"`;
}

function expand(html) {
	return html
		.replace(/\{\{example ([\w-]+)\}\}/g, (_, id) =>
			`<figure class="example"><div class="example-chart"><img src="img/examples/${id}.png" alt="The chart this block draws" loading="lazy" ${size(id)}></div>${codeBox(id)}</figure>`)
		.replace(/\{\{code ([\w-]+)\}\}/g, (_, id) => codeBox(id));
}

const slug = (text) => text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function layout(page, title, body) {
	const i = pages.findIndex(([p]) => p === page);
	const prev = pages[i - 1];
	const next = pages[i + 1];

	// Give every h2 an id and list them in "On this page".
	const toc = [];
	body = body.replace(/<h2>(.*?)<\/h2>/g, (_, text) => {
		const id = slug(text);
		toc.push([id, text.replace(/<[^>]+>/g, '')]);
		return `<h2 id="${id}">${text}</h2>`;
	});

	const nav = NAV.map((s) => `<div class="nav-section"><p>${s.title}</p><ul>${s.items.map(([p, t]) =>
		`<li><a href="${p}.html"${p === page ? ' aria-current="page"' : ''}>${t}</a></li>`).join('')}</ul></div>`).join('');

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${page === 'index' ? 'S-Charts docs' : `${title}, S-Charts docs`}</title>
	<meta name="description" content="Documentation for S-Charts, the Obsidian plugin that draws charts from markdown tables and note properties.">
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@600;800&family=Funnel+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="style.css">
</head>
<body>
	<header class="topbar">
		<a class="logo" href="index.html"><span class="logo-mark" aria-hidden="true"><i></i><i></i><i></i></span>S-Charts <span class="logo-docs">docs</span></a>
		<button class="menu" type="button" aria-expanded="false" aria-controls="sidebar">Menu</button>
		<a class="btn btn-ink" href="${REPO}">GitHub</a>
	</header>
	<div class="shell">
		<nav class="sidebar" id="sidebar" aria-label="Docs">${nav}<a class="more" href="https://community.obsidian.md/users/abdulkader-safi">More plugins by Abdulkader Safi</a></nav>
		<main class="content">
			<article class="doc">
				<h1>${title}</h1>
				${body}
			</article>
			<nav class="pager" aria-label="Previous and next page">
				${prev ? `<a class="pager-prev" href="${prev[0]}.html"><span>Previous</span>${prev[1]}</a>` : '<span></span>'}
				${next ? `<a class="pager-next" href="${next[0]}.html"><span>Next</span>${next[1]}</a>` : '<span></span>'}
			</nav>
		</main>
		<aside class="toc" aria-label="On this page">${toc.length ? `<p>On this page</p><ul>${toc.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ul>` : ''}</aside>
	</div>
	<footer class="footer"><p>© 2026 <a href="https://abdulkadersafi.com">Abdulkader Safi</a></p></footer>
	<script src="site.js"></script>
</body>
</html>
`;
}

for (const [page] of pages) {
	const raw = readFileSync(`site/pages/${page}.html`, 'utf8');
	// The first line of each fragment is its title: <!-- title: ... -->
	const m = /^<!-- title: (.*?) -->\n/.exec(raw);
	if (!m) throw new Error(`site/pages/${page}.html needs a title line`);
	writeFileSync(`docs/${page}.html`, layout(page, m[1], expand(raw.slice(m[0].length))));
}

// The capture script reads this to know what to render.
writeFileSync('site/examples.json', JSON.stringify(examples, null, '\t') + '\n');
console.log(`Built ${pages.length} pages`);
