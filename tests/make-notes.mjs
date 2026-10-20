// Writes dated notes with properties for properties-mode charts.
// Usage: node tests/make-notes.mjs <folder> <count> [tag]
import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [folder, countArg, tag = 'daily'] = process.argv.slice(2);
const count = Number(countArg);
if (!folder || !Number.isInteger(count) || count < 1) {
	console.error('Usage: node tests/make-notes.mjs <folder> <count> [tag]');
	process.exit(1);
}
if (existsSync(folder) && readdirSync(folder).length) {
	console.error(`${folder} is not empty. Pick a new folder.`);
	process.exit(1);
}
mkdirSync(folder, { recursive: true });
const start = Date.UTC(2026, 0, 1);
for (let i = 0; i < count; i++) {
	const date = new Date(start + i * 86400000).toISOString().slice(0, 10);
	const weight = (82 - i * 0.08 + Math.sin(i / 3) * 0.6).toFixed(1);
	const steps = Math.round(7000 + Math.sin(i / 5) * 2500 + (i % 7) * 300);
	writeFileSync(
		join(folder, `${date}.md`),
		`---\ntags: [${tag}]\ndate: ${date}\nweight: ${weight}\nsteps: ${steps}\n---\n\nDaily note ${i + 1}.\n`,
	);
}
console.log(`Wrote ${count} notes to ${folder}`);
