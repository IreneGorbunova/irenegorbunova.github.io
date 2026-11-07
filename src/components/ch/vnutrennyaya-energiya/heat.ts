/** Helpers shared by the models of the chapter «Внутренняя энергия. Теплопередача». */
import katex from 'katex';

export type RGB = [number, number, number];

/** Rounds to `digits` decimals with a decimal comma: 2.5 → «2,5». */
export const ru = (v: number, digits = 1) =>
	(Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ru-RU', {
		maximumFractionDigits: digits,
		useGrouping: false,
	});

/** Fixed decimals: 2 → «2,00». */
export const fixed = (v: number, digits: number) =>
	v.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false });

/** A number for TeX: decimal comma without the extra space. */
export const tex = (v: number, digits = 2) => ru(v, digits).replace(',', '{,}');

export const renderTex = (el: HTMLElement, src: string, display = true) =>
	katex.render(src, el, {
		displayMode: display,
		throwOnError: false,
		strict: 'ignore',
		trust: (ctx) => ctx.command === '\\htmlClass',
	});

let probe: CanvasRenderingContext2D | null = null;
/** Converts any CSS colour (hsl(), #hex, …) to RGB numbers. */
export const toRGB = (css: string): RGB => {
	if (!probe) {
		const c = document.createElement('canvas');
		c.width = c.height = 1;
		probe = c.getContext('2d', { willReadFrequently: true })!;
	}
	probe.clearRect(0, 0, 1, 1);
	probe.fillStyle = '#000';
	probe.fillStyle = css.trim() || '#888';
	probe.fillRect(0, 0, 1, 1);
	const d = probe.getImageData(0, 0, 1, 1).data;
	return [d[0], d[1], d[2]];
};

/** Reads a CSS variable of the element as RGB. */
export const varRGB = (el: Element, name: string) => toRGB(getComputedStyle(el).getPropertyValue(name));

export const mix = (a: RGB, b: RGB, t: number): RGB => [
	a[0] + (b[0] - a[0]) * t,
	a[1] + (b[1] - a[1]) * t,
	a[2] + (b[2] - a[2]) * t,
];
export const css = (c: RGB, alpha = 1) =>
	alpha >= 1
		? `rgb(${c[0] | 0} ${c[1] | 0} ${c[2] | 0})`
		: `rgb(${c[0] | 0} ${c[1] | 0} ${c[2] | 0} / ${alpha})`;

/**
 * Colours of a «thermal camera» scale taken from the theme: cold — blue, warm — red, hot — gold.
 * `heat(f)` with f from 0 (coldest of the scale) to 1 (hottest).
 */
export const heatScale = (el: Element) => {
	const cold = varRGB(el, '--ig-vx');
	const warm = varRGB(el, '--ig-vy');
	const hot = varRGB(el, '--ig-v');
	return (f: number): RGB => {
		const x = Math.min(1, Math.max(0, f));
		return x < 0.5 ? mix(cold, warm, x * 2) : mix(warm, hot, x * 2 - 1);
	};
};

/** Calls `cb` whenever the site theme (light/dark) changes. */
export const onTheme = (cb: () => void) => {
	new MutationObserver(cb).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', cb);
};

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Animation loop that runs only while `root` is on screen. `step(dt, t)` returns false when nothing moves
 * (then the loop sleeps until `wake()`).
 */
export const loop = (root: Element, step: (dt: number, t: number) => boolean) => {
	let raf = 0;
	let last = 0;
	let visible = false;
	const frame = (now: number) => {
		const dt = Math.min((now - (last || now)) / 1000, 1 / 20);
		last = now;
		const busy = step(dt, now / 1000);
		raf = visible && busy ? requestAnimationFrame(frame) : 0;
	};
	const wake = () => {
		if (!raf && visible) {
			last = 0;
			raf = requestAnimationFrame(frame);
		}
	};
	new IntersectionObserver((entries) => {
		visible = entries.some((e) => e.isIntersecting);
		if (visible) wake();
	}).observe(root);
	return wake;
};

/** Seeded random numbers, so that the pictures look the same after every reload. */
export const rng = (seed: number) => () => {
	seed = (seed * 1664525 + 1013904223) >>> 0;
	return seed / 4294967296;
};

/** Pointer position in the coordinates of an SVG viewBox. */
export const svgPoint = (svg: SVGSVGElement, e: { clientX: number; clientY: number }) => {
	const p = svg.createSVGPoint();
	p.x = e.clientX;
	p.y = e.clientY;
	const m = svg.getScreenCTM();
	return m ? p.matrixTransform(m.inverse()) : p;
};
