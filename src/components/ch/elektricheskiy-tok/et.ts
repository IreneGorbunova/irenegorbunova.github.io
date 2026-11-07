/** Helpers shared by the models of the chapter «Электрический ток»: numbers in Russian, KaTeX, theme colours. */
import katex from 'katex';

/** Rounds to `digits` decimals and drops trailing zeros: 0.5 → «0,5». */
export const ru = (v: number, digits = 2) =>
	(Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ru-RU', {
		maximumFractionDigits: digits,
		useGrouping: false,
	});

/** Fixed number of decimals: 0.5 → «0,50». */
export const fixed = (v: number, digits: number) =>
	v.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false });

/** Decimals that keep `n` significant digits. */
export const sigDigits = (v: number, n = 3) =>
	v === 0 ? n - 1 : Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(v))));

/** A number with `n` significant digits for text: 0.0068 → «0,0068», 1.0227 → «1,02». */
export const sig = (v: number, n = 3) => ru(v, sigDigits(v, n));

/** The same for TeX (decimal comma without the extra space, thin space between thousands). */
export const tsig = (v: number, n = 3) => {
	const s = sig(v, n);
	const [int, frac] = s.split(',');
	const grouped = int.length > 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') : int;
	return frac ? `${grouped}{,}${frac}` : grouped;
};

/** True when `sig(v, n)` is not the exact value. */
export const rounded = (v: number, n = 3) => {
	const d = sigDigits(v, n);
	return Math.abs(Math.round(v * 10 ** d) / 10 ** d - v) > 1e-9 * Math.max(1, Math.abs(v));
};

export const renderTex = (el: HTMLElement, src: string, display = true) =>
	katex.render(src, el, {
		displayMode: display,
		throwOnError: false,
		strict: 'ignore',
		trust: (ctx) => ctx.command === '\\htmlClass',
	});

/** Coloured symbol: i (current), u (voltage), r (resistance), q (charge). Classes .et-i, .et-u, .et-r, .et-q. */
export const c = (kind: 'i' | 'u' | 'r' | 'q', body: string) => `\\htmlClass{et-${kind}}{${body}}`;

/** Reads theme colours (CSS custom properties) for drawing on a canvas. */
export const themeColours = (el: Element, names: string[]) => {
	const cs = getComputedStyle(el);
	const out: Record<string, string> = {};
	for (const n of names) out[n] = cs.getPropertyValue(n).trim() || '#888';
	return out;
};
