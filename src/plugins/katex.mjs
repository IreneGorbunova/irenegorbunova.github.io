// Renders $…$ and $$…$$ (parsed by Sätteri's math feature) with KaTeX at build time.
import katex from 'katex';

const render = (/** @type {string} */ tex, /** @type {boolean} */ displayMode) => ({
	raw: katex.renderToString(tex, { displayMode, throwOnError: false }),
	mdxExpressions: false,
});

export const katexPlugin = {
	name: 'katex',
	math: (/** @type {{ value: string }} */ node) => render(node.value, true),
	inlineMath: (/** @type {{ value: string }} */ node) => render(node.value, false),
};
