// Renders $…$ and $$…$$ (parsed by Sätteri's math feature) with KaTeX at build time.
// In a chapter with a `glossary:` in its frontmatter, quantities and units are marked so that they open a note.
import katex from 'katex';
import { annotate, symKey } from './annotate.mjs';

const OPTS = {
	throwOnError: false,
	trust: (/** @type {{ command: string }} */ ctx) => ctx.command === '\\htmlData',
	strict: (/** @type {string} */ code) => (code === 'htmlExtension' ? 'ignore' : 'warn'),
};

/** symbol key → index, cached per frontmatter object */
const cache = new WeakMap();
const glossaryOf = (/** @type {any} */ ctx) => {
	const fm = ctx?.data?.astro?.frontmatter;
	if (!fm || !Array.isArray(fm.glossary)) return undefined;
	if (!cache.has(fm)) cache.set(fm, new Map(fm.glossary.map((/** @type {{ s: string }} */ g, /** @type {number} */ i) => [symKey(g.s), i])));
	return cache.get(fm);
};

const render = (/** @type {string} */ tex, /** @type {boolean} */ displayMode, /** @type {any} */ ctx) => {
	const gloss = glossaryOf(ctx);
	return {
		raw: katex.renderToString(gloss ? annotate(tex, gloss) : tex, { ...OPTS, displayMode }),
		mdxExpressions: false,
	};
};

export const katexPlugin = {
	name: 'katex',
	math: (/** @type {{ value: string }} */ node, /** @type {any} */ ctx) => render(node.value, true, ctx),
	inlineMath: (/** @type {{ value: string }} */ node, /** @type {any} */ ctx) => render(node.value, false, ctx),
};
