import { getAllTags, normalizePath, type App, type TFile } from 'obsidian';
import type { ChartSpec } from './parse.ts';
import { buildRows, type Rows } from './rows.ts';

/** `#tag` matches the tag and its nested tags. Anything else is a folder path. */
export function matches(app: App, file: TFile, source: string): boolean {
	if (source.startsWith('#')) {
		const want = source.toLowerCase();
		const cache = app.metadataCache.getFileCache(file);
		const tags = cache ? getAllTags(cache) ?? [] : [];
		return tags.some((t) => {
			const tag = t.toLowerCase();
			return tag === want || tag.startsWith(want + '/');
		});
	}
	const folder = normalizePath(source).replace(/^\/+|\/+$/g, '');
	return folder === '' || file.path.startsWith(folder + '/');
}

/** Reads properties through the metadata cache. Nothing is written. */
export function loadRows(spec: ChartSpec, app: App): Rows & { paths: Set<string> } {
	const source = spec.source ?? '';
	const paths = new Set<string>();
	const notes: Record<string, unknown>[] = [];
	for (const file of app.vault.getMarkdownFiles()) {
		if (!matches(app, file, source)) continue;
		paths.add(file.path);
		notes.push((app.metadataCache.getFileCache(file)?.frontmatter ?? {}));
	}
	return { ...buildRows(notes, spec.x ?? '', spec.y ?? []), paths };
}
