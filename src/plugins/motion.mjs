// Animations always play, whatever the system's «reduce motion» setting says: in a textbook the motion is the content,
// and the setting is often switched off without the pupil knowing (the teacher's decision, 8 Nov 2026).
// The components still contain the standard `prefers-reduced-motion` code; these two pieces neutralise it:
//  - motionCss: a PostCSS plugin that drops `@media (prefers-reduced-motion: reduce)` blocks and unwraps
//    `@media (prefers-reduced-motion: no-preference)` ones;
//  - MOTION_SCRIPT: an inline <head> script that makes matchMedia('(prefers-reduced-motion: …)') answer
//    as if nobody asked to reduce motion.

const QUERY = /\(\s*prefers-reduced-motion\s*:\s*(reduce|no-preference)\s*\)/;

/** @type {import('postcss').PluginCreator<void>} */
export const motionCss = () => ({
	postcssPlugin: 'ig-motion',
	AtRule: {
		media(at) {
			const m = at.params.match(QUERY);
			if (!m) return;
			if (m[1] === 'reduce') return void at.remove();
			const rest = at.params
				.replace(QUERY, '')
				.replace(/^\s*and\s+|\s+and\s*$/i, '')
				.trim();
			if (rest) at.params = rest;
			else at.replaceWith(at.nodes);
		},
	},
});
motionCss.postcss = true;

export const MOTION_SCRIPT = `(() => {
	const native = window.matchMedia.bind(window);
	window.matchMedia = (q) => {
		if (!/prefers-reduced-motion/.test(q)) return native(q);
		const matches = /no-preference/.test(q);
		const noop = () => {};
		return { media: q, matches, onchange: null, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop, dispatchEvent: () => true };
	};
})();`;
