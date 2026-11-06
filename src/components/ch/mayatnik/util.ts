/** Small helpers shared by the pendulum chapter's interactive models. */
import katex from 'katex';

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

/** Renders TeX into an element; skips the work when the source has not changed. */
export const tex = (el: HTMLElement, src: string) => {
	if (el.dataset.tex === src) return;
	el.dataset.tex = src;
	katex.render(src, el, { throwOnError: false });
};

export const SVG_NS = 'http://www.w3.org/2000/svg';

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Pointer position in the coordinates of an SVG viewBox. */
export const svgPoint = (svg: SVGSVGElement, e: { clientX: number; clientY: number }) => {
	const m = svg.getScreenCTM();
	if (!m) return { x: 0, y: 0 };
	const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
	return { x: p.x, y: p.y };
};

/**
 * Runs `frame(dt)` on every animation frame while `active()` is true and the element is on screen.
 * Returns `wake()`, which must be called whenever `active()` may have become true.
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

/** Slider with a logarithmic scale: position 0…1000 ↔ value min…max. */
export const logScale = (min: number, max: number) => ({
	toValue: (pos: number) => min * (max / min) ** (pos / 1000),
	toPos: (value: number) => (1000 * Math.log(value / min)) / Math.log(max / min),
});
