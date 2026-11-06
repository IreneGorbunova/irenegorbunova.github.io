/** Helpers shared by the Ohm's law models: Russian number formatting and KaTeX rendering. */
import katex from 'katex';

/** Rounds to `digits` decimals and drops trailing zeros: 0.5 → «0,5», 2 → «2». */
export const ru = (v: number, digits = 2) =>
	(Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ru-RU', {
		maximumFractionDigits: digits,
		useGrouping: false,
	});

/** Fixed number of decimals, as on a digital meter: 0.5 → «0,50». */
export const fixed = (v: number, digits: number) =>
	v.toLocaleString('ru-RU', {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
		useGrouping: false,
	});

/** True when rounding to `digits` decimals changes the value. */
export const isRounded = (v: number, digits = 2) =>
	Math.abs(Math.round(v * 10 ** digits) / 10 ** digits - v) > 1e-9;

/** Decimals that keep `n` significant digits: 2,5 → 2; 0,25 → 3; 0,0125 → 4. */
export const sigDigits = (v: number, n = 3) =>
	v === 0 ? n - 1 : Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(v))));

/** Rounds to `n` significant digits: 1/30 → 0.0333. */
export const sig = (v: number, n = 3) => {
	const d = sigDigits(v, n);
	return Math.round(v * 10 ** d) / 10 ** d;
};

/** A number for TeX: decimal comma without the extra space. */
export const tex = (v: number, digits = 2) => ru(v, digits).replace(',', '{,}');

/** Coloured symbol of a quantity: u, i or r (classes .zo-u, .zo-i, .zo-r). */
export const q = (kind: 'u' | 'i' | 'r', body: string) => `\\htmlClass{zo-${kind}}{${body}}`;

export const renderTex = (el: HTMLElement, src: string, display = true) =>
	katex.render(src, el, {
		displayMode: display,
		throwOnError: false,
		strict: 'ignore',
		trust: (ctx) => ctx.command === '\\htmlClass',
	});
