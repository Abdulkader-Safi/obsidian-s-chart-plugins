// Renders every docs example in the running Obsidian and saves it as a PNG.
// Run from the repo root after `node scripts/build-docs.mjs`:
//   obsidian eval code="globalThis.SCHARTS_ROOT='$PWD';eval(require('fs').readFileSync('$PWD/scripts/capture-examples.js','utf8'))"
// Needs: S-Charts enabled, a note with any s-chart block open (the class is taken from it),
// and notes tagged #daily with date, weight and steps for the properties examples.
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

	// Obsidian's default light theme, theme colours, no animation. Put everything back after.
	const saved = { css: app.customCss.theme, mode: app.getTheme(), anim: p.settings.animations, def: p.settings.defaultPalette };
	p.settings.animations = false;
	p.settings.defaultPalette = 'theme';
	app.customCss.setTheme('');
	app.changeTheme('moonstone');
	await wait(800);

	const host = document.body.createDiv();
	host.setCssProps({ position: 'fixed', left: '0', top: '0', width: '560px', 'z-index': '-1' });
	const done = [];
	try {
		for (const [id, src] of Object.entries(examples)) {
			const el = host.createDiv();
			const b = new Block(el, /^height:/m.test(src) ? src : 'height: 320\n' + src, p);
			b.load();
			if (b.chart) {
				b.chart.options.devicePixelRatio = 2;
				b.chart.resize();
				b.chart.update('none');
				const s = b.chart.canvas;
				const c = document.createElement('canvas');
				const pad = 24;
				c.width = s.width + pad * 2;
				c.height = s.height + pad * 2;
				const x = c.getContext('2d');
				x.fillStyle = '#ffffff';
				x.fillRect(0, 0, c.width, c.height);
				x.drawImage(s, pad, pad);
				fs.writeFileSync(path.join(outDir, id + '.png'), Buffer.from(c.toDataURL('image/png').split(',')[1], 'base64'));
				done.push(id);
			}
			b.unload();
			el.remove();
		}
	} finally {
		host.remove();
		p.settings.animations = saved.anim;
		p.settings.defaultPalette = saved.def;
		app.customCss.setTheme(saved.css);
		app.changeTheme(saved.mode);
	}
	return 'Captured ' + done.length + ': ' + done.join(', ');
})();
