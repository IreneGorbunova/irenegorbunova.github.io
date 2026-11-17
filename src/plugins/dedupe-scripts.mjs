// Astro renders a component's script once per page, but on our MDX pages a component used several times sometimes gets
// its script once per use (the template depth that guards the deduplication goes wrong around the <template> of
// <More>). Our scripts set up every instance on the page at once, so a second copy sets them all up again: answers
// land twice in the sorting game, clicks and statistics events count twice. After the build every page keeps only the
// first copy of each identical module script outside <template>.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOKENS = /<template\b[^>]*>|<\/template>|<script type="module"(?: src="([^"]*)")?>([\s\S]*?)<\/script>/g;

/** @param {string} html */
export function dedupe(html) {
	const seen = new Set();
	let depth = 0;
	let removed = 0;
	const out = html.replace(TOKENS, (tag, src, body) => {
		if (tag.startsWith('<template')) depth++;
		else if (tag === '</template>') depth = Math.max(0, depth - 1);
		else if (depth === 0) {
			const key = src ? `src:${src}` : `inline:${body}`;
			if (seen.has(key)) {
				removed++;
				return '';
			}
			seen.add(key);
		}
		return tag;
	});
	return { html: out, removed };
}

/** @param {string} dir */
async function* htmlFiles(dir) {
	for (const e of await readdir(dir, { withFileTypes: true })) {
		const p = join(dir, e.name);
		if (e.isDirectory()) yield* htmlFiles(p);
		else if (e.name.endsWith('.html')) yield p;
	}
}

/** @returns {import('astro').AstroIntegration} */
export function dedupeScripts() {
	return {
		name: 'ig-dedupe-scripts',
		hooks: {
			'astro:build:done': async ({ dir, logger }) => {
				let pages = 0;
				let removed = 0;
				for await (const f of htmlFiles(fileURLToPath(dir))) {
					const r = dedupe(await readFile(f, 'utf8'));
					if (!r.removed) continue;
					await writeFile(f, r.html);
					pages++;
					removed += r.removed;
				}
				logger.info(`repeated scripts removed: ${removed} on ${pages} pages`);
			},
		},
	};
}
