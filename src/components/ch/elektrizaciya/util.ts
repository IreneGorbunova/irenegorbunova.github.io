/** Small helpers shared by the models of the chapter «Электризация тел. Электрическое поле». */
import katex from 'katex';

export const SVG_NS = 'http://www.w3.org/2000/svg';

/** Elementary charge, C (rounded table value used in the chapter). */
export const E_CHARGE = 1.6e-19;

/** A number in Russian notation (decimal comma, true minus sign), with a fixed number of decimals. */
export const fmt = (v: number, digits = 1) =>
	(Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v)
		.toLocaleString('ru-RU', {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits,
			useGrouping: false,
		})
		.replace('-', '−');

/** The same number for TeX: the decimal comma wrapped in braces, so KaTeX adds no space after it. */
export const tnum = (v: number, digits = 1) => fmt(v, digits).replace(',', '{,}').replace('−', '-');

/** A positive number in standard form for TeX: 1.28e-9 → «1{,}3 \cdot 10^{-9}» (two significant digits). */
export const tsci = (v: number, digits = 1) => {
	if (v === 0) return '0';
	let exp = Math.floor(Math.log10(Math.abs(v)));
	let mant = Math.abs(v) / 10 ** exp;
	if (Number(mant.toFixed(digits)) >= 10) {
		mant /= 10;
		exp += 1;
	}
	const m = tnum(mant, digits);
	return `${m} \\cdot 10^{${exp}}`;
};

/** Renders TeX into an element; skips the work when the source has not changed. */
export const tex = (el: HTMLElement, src: string, display = false) => {
	if (el.dataset.tex === src) return;
	el.dataset.tex = src;
	katex.render(src, el, {
		displayMode: display,
		throwOnError: false,
		strict: 'ignore',
		trust: (ctx) => ctx.command === '\\htmlClass',
	});
};

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const narrow = () => window.matchMedia('(max-width: 40rem)').matches;

/** Pointer position in the coordinates of an SVG viewBox. */
export const svgPoint = (svg: SVGSVGElement, e: { clientX: number; clientY: number }) => {
	const m = svg.getScreenCTM();
	if (!m) return { x: 0, y: 0 };
	const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
	return { x: p.x, y: p.y };
};

/** Creates an SVG element with attributes. */
export const el = <K extends keyof SVGElementTagNameMap>(
	tag: K,
	attrs: Record<string, string | number> = {},
	parent?: Element,
) => {
	const n = document.createElementNS(SVG_NS, tag);
	for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
	if (parent) parent.appendChild(n);
	return n;
};

/**
 * A charge symbol: a coloured disc with «+» or «−» drawn by lines (readable at any size).
 * The group is centred at 0,0; move it with `transform`.
 */
export const chargeSymbol = (sign: 1 | -1, r: number, parent?: Element, cls = '') => {
	const g = el('g', { class: `chg ${sign > 0 ? 'chg--p' : 'chg--n'} ${cls}` }, parent);
	el('circle', { r }, g);
	const a = r * 0.55;
	el('line', { x1: -a, y1: 0, x2: a, y2: 0 }, g);
	if (sign > 0) el('line', { x1: 0, y1: -a, x2: 0, y2: a }, g);
	return g;
};

/**
 * Runs `frame(dt)` on every animation frame while `active()` is true and the element is on screen.
 * Returns `wake()`, which must be called whenever `active()` may have become true.
 */
export const animator = (node: Element, active: () => boolean, frame: (dt: number) => void) => {
	let raf = 0;
	let last = 0;
	let visible = true;
	const tick = (now: number) => {
		const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
		last = now;
		frame(dt);
		if (active() && visible) raf = requestAnimationFrame(tick);
		else raf = 0;
	};
	const wake = () => {
		if (raf || !visible || !active()) return;
		last = 0;
		raf = requestAnimationFrame(tick);
	};
	new IntersectionObserver((entries) => {
		visible = entries.some((e) => e.isIntersecting);
		if (visible) wake();
		else if (raf) {
			cancelAnimationFrame(raf);
			raf = 0;
		}
	}).observe(node);
	return wake;
};
