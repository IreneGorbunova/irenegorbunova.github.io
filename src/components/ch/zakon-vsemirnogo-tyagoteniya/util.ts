/** Helpers shared by the models of the chapter «Закон всемирного тяготения». SI units throughout. */
import katex from 'katex';

/** Gravitational constant, CODATA 2018: 6,674 30·10⁻¹¹ Н·м²/кг². Formulas on the page show 6,67·10⁻¹¹. */
export const G = 6.674e-11;
/** The value the pupils use in formulas. */
export const G_SCHOOL = 6.67e-11;

/** A number in Russian notation (decimal comma, true minus), fixed decimals; thin space between thousands. */
export const fmt = (v: number, digits = 1, group = false) => {
	const s = (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toLocaleString('ru-RU', {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
		useGrouping: group,
	});
	return s.replace('-', '−').replace(/\s/g, ' ');
};

/** The same number for TeX: decimal comma in braces, thin spaces as \, . */
export const tnum = (v: number, digits = 1, group = false) =>
	fmt(v, digits, group).replace(',', '{,}').replace('−', '-').replace(/ /g, '\\,');

/** Mantissa and exponent with `sig` significant digits: 0,000 52 → [5.2, −4]. */
export const sci = (v: number, sig = 3): [number, number] => {
	if (v === 0) return [0, 0];
	let e = Math.floor(Math.log10(Math.abs(v)));
	let m = Number((v / 10 ** e).toPrecision(sig));
	if (Math.abs(m) >= 10) {
		m /= 10;
		e += 1;
	}
	return [m, e];
};

/** A number as «a·10^n» in TeX (plain number when 0,1 ≤ |v| < 10 000). */
export const tsci = (v: number, sig = 3) => {
	const [m, e] = sci(v, sig);
	if (e >= -1 && e <= 3) {
		const d = Math.max(0, sig - 1 - e);
		return tnum(Number(v.toPrecision(sig)), d, true);
	}
	return `${tnum(m, sig - 1)}\\cdot 10^{${e}}`;
};

/** The same in HTML: «5,2·10<sup>−4</sup>». */
export const hsci = (v: number, sig = 3) => {
	const [m, e] = sci(v, sig);
	if (e >= -1 && e <= 3) return fmt(Number(v.toPrecision(sig)), Math.max(0, sig - 1 - e), true);
	return `${fmt(m, sig - 1)}·10<sup>${String(e).replace('-', '−')}</sup>`;
};

/** Renders TeX into an element; skips the work when the source has not changed. */
export const renderTex = (el: HTMLElement, src: string, display = true) => {
	if (el.dataset.tex === src) return;
	el.dataset.tex = src;
	katex.render(src, el, { throwOnError: false, displayMode: display });
};

export const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Runs `frame(dt)` on every animation frame while `active()` is true and the element is on screen.
 * Returns `wake()`, to be called whenever `active()` may have become true.
 */
export const animator = (el: Element, active: () => boolean, frame: (dt: number) => void) => {
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
	}).observe(el);
	return wake;
};

/** A filled arrow from (x1, y1) to (x2, y2) as one path: a shaft of width w and a head. */
export const arrowPath = (x1: number, y1: number, x2: number, y2: number, w = 3, head = 11) => {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.hypot(dx, dy);
	if (len < 0.5) return '';
	const ux = dx / len;
	const uy = dy / len;
	const nx = -uy;
	const ny = ux;
	const h = Math.min(head, len * 0.75);
	const hw = Math.max(h * 0.55, w);
	const bx = x2 - ux * h;
	const by = y2 - uy * h;
	const s = w / 2;
	const p = (x: number, y: number) => `${x.toFixed(2)} ${y.toFixed(2)}`;
	return (
		`M ${p(x1 + nx * s, y1 + ny * s)} L ${p(bx + nx * s, by + ny * s)} L ${p(bx + nx * hw, by + ny * hw)} ` +
		`L ${p(x2, y2)} L ${p(bx - nx * hw, by - ny * hw)} L ${p(bx - nx * s, by - ny * s)} ` +
		`L ${p(x1 - nx * s, y1 - ny * s)} Z`
	);
};
