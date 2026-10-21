// Renders every docs example in the running Obsidian and saves it as a PNG, then the README
// gallery in light and dark. Run from the repo root after `node scripts/build-docs.mjs`:
//   obsidian eval code="globalThis.SCHARTS_ROOT='$PWD';eval(require('fs').readFileSync('$PWD/scripts/capture-examples.js','utf8'))"
// Needs: S-Charts enabled, a note with any s-chart block open (the class is taken from it),
// and notes tagged #daily with date, weight and steps for the properties examples.
// The result lands in globalThis.SCHARTS_CAPTURE when it finishes.
globalThis.SCHARTS_CAPTURE = 'running';
(async () => {
	const fs = require('fs');
	const path = require('path');
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const root = globalThis.SCHARTS_ROOT;
	if (!root) return 'Set globalThis.SCHARTS_ROOT to the repo folder first.';
	const examples = JSON.parse(fs.readFileSync(path.join(root, 'site/examples.json'), 'utf8'));
	const outDir = path.join(root, 'docs/img/examples');
	fs.mkdirSync(outDir, { recursive: true });

	const p = app.plugins.plugins['s-charts'];
	const Block = [...p.blocks][0]?.constructor;
	if (!Block) return 'Open a note with an s-chart block first.';

	const host = document.body.createDiv();
	host.setCssProps({ position: 'fixed', left: '0', top: '0', 'z-index': '-1' });

	/** Draws one block at `width` CSS pixels and returns its SVG. */
	async function svgOf(src, width) {
		host.setCssProps({ width: `${width}px` });
		const el = host.createDiv();
		const b = new Block(el, src, p);
		b.load();
		for (let i = 0; i < 40 && !b.chart; i++) await wait(50);
		const svg = b.chart?.renderToSVGString();
		b.unload();
		el.remove();
		return svg;
	}

	/** SVG to a canvas at 2x, on `bg`, with `pad` device pixels around it. */
	async function raster(svg, bg, pad) {
		const img = new Image();
		img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
		await img.decode();
		const c = document.createElement('canvas');
		c.width = img.naturalWidth * 2 + pad * 2;
		c.height = img.naturalHeight * 2 + pad * 2;
		const x = c.getContext('2d');
		x.fillStyle = bg;
		x.fillRect(0, 0, c.width, c.height);
		x.drawImage(img, pad, pad, img.naturalWidth * 2, img.naturalHeight * 2);
		return c;
	}

	const save = (canvas, file) => fs.writeFileSync(file, Buffer.from(canvas.toDataURL('image/png').split(',')[1], 'base64'));

	// Obsidian's default theme, theme colours, no animation. Put everything back after.
	const saved = { css: app.customCss.theme, mode: app.getTheme(), anim: p.settings.animations, def: p.settings.defaultPalette };
	p.settings.animations = false;
	p.settings.defaultPalette = 'theme';
	app.customCss.setTheme('');
	const done = [];
	try {
		app.changeTheme('moonstone');
		await wait(800);
		for (const [id, src] of Object.entries(examples)) {
			const svg = await svgOf(/^height:/m.test(src) ? src : 'height: 320\n' + src, 560);
			if (!svg) continue;
			save(await raster(svg, '#ffffff', 24), path.join(outDir, id + '.png'));
			done.push(id);
		}

		// The README gallery: one tile per type, three to a row, titled by type.
		const tiles = [
			['bar', 'Bar'], ['line', 'Line'], ['area', 'Area'],
			['pie', 'Pie'], ['doughnut', 'Doughnut'], ['scatter', 'Scatter'],
			['radar', 'Radar'], ['heatmap', 'Heatmap'], ['properties', 'From note properties'],
		];
		for (const mode of ['light', 'dark']) {
			app.changeTheme(mode === 'light' ? 'moonstone' : 'obsidian');
			await wait(800);
			const bg = getComputedStyle(document.body).getPropertyValue('--background-primary').trim();
			const shots = [];
			for (const [id, title] of tiles) {
				const src = 'height: 200\n' + examples[id].replace(/^title: .*$/m, `title: ${title}`).replace(/^x-label: .*\n|^y-label: .*\n/gm, '');
				shots.push(await raster(await svgOf(src, 300), bg, 0));
			}
			const gap = 24;
			const w = Math.max(...shots.map((s) => s.width));
			const h = Math.max(...shots.map((s) => s.height));
			const sheet = document.createElement('canvas');
			sheet.width = w * 3 + gap * 4;
			sheet.height = h * 3 + gap * 4;
			const x = sheet.getContext('2d');
			x.fillStyle = bg;
			x.fillRect(0, 0, sheet.width, sheet.height);
			shots.forEach((s, i) => x.drawImage(s, gap + (i % 3) * (w + gap), gap + Math.floor(i / 3) * (h + gap)));
			save(sheet, path.join(root, `docs/img/gallery-${mode}.png`));
			done.push(`gallery-${mode}`);
		}
	} finally {
		host.remove();
		p.settings.animations = saved.anim;
		p.settings.defaultPalette = saved.def;
		app.customCss.setTheme(saved.css);
		app.changeTheme(saved.mode);
	}
	return 'Captured ' + done.length + ': ' + done.join(', ');
})().then((r) => { globalThis.SCHARTS_CAPTURE = r; }, (e) => { globalThis.SCHARTS_CAPTURE = 'Failed: ' + (e?.stack ?? e); });
