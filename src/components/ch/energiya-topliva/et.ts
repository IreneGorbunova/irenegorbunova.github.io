/** Helpers shared by the models of the «Энергия топлива» chapter: Russian numbers and KaTeX. */
import katex from 'katex';

/** Rounds to `digits` decimals and drops trailing zeros: 0.5 → «0,5». Groups thousands with a thin space. */
export const ru = (v: number, digits = 2) =>
	(Math.round(v * 10 ** digits) / 10 ** digits)
		.toLocaleString('ru-RU', { maximumFractionDigits: digits, useGrouping: Math.abs(v) >= 10000 })
		.replace(/\s/g, ' ');

/** Fixed number of decimals, as on a digital thermometer: 20 → «20,00». */
export const fixed = (v: number, digits: number) =>
	v.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false });

/** Decimals that keep `n` significant digits. */
export const sigDigits = (v: number, n = 3) =>
	v === 0 ? n - 1 : Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(v)) + 1e-9));

/** A number with `n` significant digits, Russian style: 0.02976 → «0,0298». */
export const sig = (v: number, n = 3) => ru(v, sigDigits(v, n));

/** True when showing `n` significant digits changes the value. */
export const isRounded = (v: number, n = 3) => {
	const d = sigDigits(v, n);
	return Math.abs(Math.round(v * 10 ** d) / 10 ** d - v) > 1e-9 * Math.max(1, Math.abs(v));
};

/** A plain number for TeX: decimal comma without the extra space, thin space between thousands. */
export const tex = (s: string) => s.replace(',', '{,}').replace(/ /g, '\\,');

/** Standard form for TeX with `n` significant digits: 460000 → «4{,}6\cdot 10^{5}». */
export const texSci = (v: number, n = 2) => {
	const e = Math.floor(Math.log10(v) + 1e-9);
	const m = v / 10 ** e;
	const ms = ru(m, n - 1);
	if (ms === '10') return `10^{${e + 1}}`;
	if (e === 0) return tex(ms);
	return `${tex(ms)}\\cdot 10^{${e}}`;
};

export const renderTex = (el: HTMLElement, src: string, display = true) =>
	katex.render(src, el, {
		displayMode: display,
		throwOnError: false,
		strict: 'ignore',
		trust: (ctx) => ctx.command === '\\htmlClass',
	});

/** Coloured part of a formula (class .et-<kind>). */
export const c = (kind: string, body: string) => `\\htmlClass{et-${kind}}{${body}}`;

/** A «nice» upper limit of a scale ≥ v: 1, 2, 5 × 10ⁿ. */
export const niceMax = (v: number) => {
	const e = Math.floor(Math.log10(v));
	for (const k of [1, 1.5, 2, 3, 5, 7.5, 10]) if (k * 10 ** e >= v) return k * 10 ** e;
	return 10 ** (e + 1);
};

/** Step between scale ticks for a scale from 0 to `max`, about 4–6 ticks. */
export const tickStep = (max: number) => {
	const e = Math.floor(Math.log10(max));
	for (const k of [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5]) {
		const s = k * 10 ** e;
		if (max / s <= 6) return s;
	}
	return 10 ** (e + 1);
};

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Runs `frame(dt)` only while the root is on screen and `active()` says so. */
export const loop = (root: HTMLElement, frame: (dt: number) => void, active: () => boolean) => {
	let raf = 0;
	let last = 0;
	let visible = true;
	const tick = (t: number) => {
		const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
		last = t;
		frame(dt);
		if (visible && active()) raf = requestAnimationFrame(tick);
		else {
			raf = 0;
			last = 0;
		}
	};
	const wake = () => {
		if (!raf && visible && active()) raf = requestAnimationFrame(tick);
	};
	new IntersectionObserver((entries) => {
		visible = entries.some((e) => e.isIntersecting);
		wake();
	}).observe(root);
	return wake;
};
