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

/**
 * The small arrow over the letter of a vector's label (as ProjAnglePicture of «Перемещение…» draws it): a short line
 * over the first glyph of `label` with a little head on the right. Call after the label has been placed; the mark
 * copies the label's visibility.
 */
export const vecMark = (label: SVGTextElement, mark: SVGPathElement) => {
	mark.style.visibility = label.style.visibility;
	let r: DOMRect;
	try {
		r = label.getExtentOfChar(0) as DOMRect;
	} catch {
		return;
	}
	if (!r.width) return;
	const w = Math.max(r.width * 0.95, 8);
	const cx = r.x + r.width * 0.62;
	const lower = /[a-zа-я]/.test(label.textContent?.charAt(0) ?? '');
	const fs = parseFloat(getComputedStyle(label).fontSize) || r.height / 1.2;
	const base = Number(label.getAttribute('y')) || r.y + r.height * 0.8;
	const y = base - fs * (lower ? 0.66 : 0.9);
	const h = Math.max(fs * 0.13, 2.2);
	mark.setAttribute('d', `M${(cx - w / 2).toFixed(1)} ${y.toFixed(1)} H${(cx + w / 2).toFixed(1)} M${(cx + w / 2 - h).toFixed(1)} ${(y - h).toFixed(1)} L${(cx + w / 2).toFixed(1)} ${y.toFixed(1)} L${(cx + w / 2 - h).toFixed(1)} ${(y + h).toFixed(1)}`);
};
