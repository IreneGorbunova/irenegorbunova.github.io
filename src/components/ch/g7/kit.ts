/**
 * Helpers shared by the models of the grade 7 chapters (client side). Numbers are shown the Russian way: a decimal
 * comma and a real minus sign.
 */
import katex from 'katex';
export { loop, clamp } from '@components/intro/scene';

export const NS = 'http://www.w3.org/2000/svg';

/** 3.14159 → «3,14» */
export const fmt = (v: number, digits = 1): string => {
	const s = (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits).replace('.', ',');
	return s.replace('-', '−');
};
/** Like fmt, but without trailing zeros: 2.50 → «2,5», 3.00 → «3». */
export const fmtTrim = (v: number, digits = 2): string => {
	let s = fmt(v, digits);
	if (s.includes(',')) s = s.replace(/0+$/, '').replace(/,$/, '');
	return s;
};
/** 12345.6 → «12 346» (thin non-breaking spaces between the thousands). */
export const fmtInt = (v: number): string =>
	Math.round(v)
		.toString()
		.replace('-', '−')
		.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
/** A number already written with a comma, made safe for TeX. */
export const tex = (s: string): string => s.replace(/,/g, '{,}').replace(/−/g, '-').replace(/ /g, '\\,');
export const k = (s: string): string => katex.renderToString(s, { throwOnError: false });

/** A new SVG element with attributes. */
export const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, text?: string): SVGElementTagNameMap[K] => {
	const e = document.createElementNS(NS, tag);
	for (const [name, v] of Object.entries(attrs)) e.setAttribute(name, String(v));
	if (text !== undefined) e.textContent = text;
	return e;
};
export const set = (e: Element, attrs: Record<string, string | number>) => {
	for (const [name, v] of Object.entries(attrs)) e.setAttribute(name, String(v));
};

/** The pointer position in the coordinates of the SVG's viewBox. */
export const svgPoint = (svg: SVGSVGElement, e: { clientX: number; clientY: number }) => {
	const pt = svg.createSVGPoint();
	pt.x = e.clientX;
	pt.y = e.clientY;
	const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
	return { x: p.x, y: p.y };
};

/** Dragging of `handle` inside `svg`: `move` gets the pointer in viewBox coordinates and the shift from the start. */
export const drag = (
	handle: Element,
	svg: SVGSVGElement,
	on: { start?: (p: { x: number; y: number }) => void; move: (p: { x: number; y: number }, d: { dx: number; dy: number }) => void; end?: () => void },
) => {
	let from: { x: number; y: number } | null = null;
	handle.addEventListener('pointerdown', (ev) => {
		const e = ev as PointerEvent;
		from = svgPoint(svg, e);
		(handle as Element).setPointerCapture(e.pointerId);
		on.start?.(from);
		e.preventDefault();
	});
	handle.addEventListener('pointermove', (ev) => {
		if (!from) return;
		const p = svgPoint(svg, ev as PointerEvent);
		on.move(p, { dx: p.x - from.x, dy: p.y - from.y });
	});
	const end = () => {
		if (!from) return;
		from = null;
		on.end?.();
	};
	handle.addEventListener('pointerup', end);
	handle.addEventListener('pointercancel', end);
};

/** A group of buttons where one is pressed: calls `pick` with the pressed button. */
export const segment = (group: Element, pick: (btn: HTMLButtonElement) => void) => {
	const btns = [...group.querySelectorAll<HTMLButtonElement>('button')];
	for (const b of btns)
		b.addEventListener('click', () => {
			for (const o of btns) o.setAttribute('aria-pressed', String(o === b));
			pick(b);
		});
};

/** Smooth step from 0 to 1. */
export const ease = (u: number) => {
	const t = Math.min(1, Math.max(0, u));
	return t * t * (3 - 2 * t);
};
/** A repeatable pseudo-random generator (0…1). */
export const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
