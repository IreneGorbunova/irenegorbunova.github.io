/** Small helpers shared by the models of the «Импульс» chapter. */

export const SVG_NS = 'http://www.w3.org/2000/svg';

/** Creates an SVG element with attributes and appends it to `parent` (if given). */
export function svg<K extends keyof SVGElementTagNameMap>(
	tag: K,
	attrs: Record<string, string | number> = {},
	parent?: Element,
): SVGElementTagNameMap[K] {
	const el = document.createElementNS(SVG_NS, tag);
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
	if (parent) parent.append(el);
	return el;
}

export function attrs(el: Element, a: Record<string, string | number>) {
	for (const [k, v] of Object.entries(a)) el.setAttribute(k, String(v));
}

/** Number in Russian style: decimal comma, real minus sign. */
export function fmt(v: number, digits = 1, trim = false): string {
	if (Math.abs(v) < 0.5 * 10 ** -digits) v = 0;
	let s = Math.abs(v).toLocaleString('ru-RU', {
		minimumFractionDigits: trim ? 0 : digits,
		maximumFractionDigits: digits,
	});
	s = s.replace(/ /g, ' ');
	return (v < 0 ? '−' : '') + s;
}

/** The same number for KaTeX: `1{,}5`, negative numbers optionally in parentheses. */
export function tex(v: number, digits = 1, trim = false, paren = false): string {
	if (Math.abs(v) < 0.5 * 10 ** -digits) v = 0;
	const body = Math.abs(v)
		.toLocaleString('ru-RU', {
			minimumFractionDigits: trim ? 0 : digits,
			maximumFractionDigits: digits,
			useGrouping: true,
		})
		.replace(/[  \s]/g, '\\,')
		.replace(',', '{,}');
	if (v < 0) return paren ? `(-${body})` : `-${body}`;
	return body;
}

/** Rounds a and b so that the rounded values add up to the rounded a + b. */
export function roundPair(a: number, b: number, digits = 2): [number, number, number] {
	const f = 10 ** digits;
	const total = Math.round((a + b) * f) / f;
	const ra = Math.round(a * f) / f;
	const rb = Math.round(b * f) / f;
	if (Math.abs(ra + rb - total) < 0.5 / f) return [ra, rb, total];
	// fix the one whose rounding was the larger lie
	if (Math.abs(ra - a) > Math.abs(rb - b)) return [Math.round((total - rb) * f) / f, rb, total];
	return [ra, Math.round((total - ra) * f) / f, total];
}

export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const smooth = (x: number) => {
	const t = clamp(x, 0, 1);
	return t * t * (3 - 2 * t);
};

/** Decimal places needed to write every multiple of a tick step exactly (2,5 → 1; 0,25 → 2). */
export function stepDigits(step: number): number {
	let d = 0;
	while (d < 4 && Math.abs(step * 10 ** d - Math.round(step * 10 ** d)) > 1e-6) d++;
	return d;
}

/** A "nice" tick step (1, 2, 2.5, 5 × 10ⁿ) for a range drawn in `px` pixels. */
export function niceStep(range: number, px: number, minPx = 46): number {
	const raw = (range * minPx) / Math.max(px, 1);
	const p = 10 ** Math.floor(Math.log10(raw));
	for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p;
	return 10 * p;
}

/**
 * A horizontal arrow as one filled path: shaft of thickness t, head of length hl and width hw.
 * Returns '' when the arrow is too short to draw.
 */
export function hArrow(x0: number, x1: number, y: number, t = 3.2, hl = 11, hw = 10): string {
	const L = Math.abs(x1 - x0);
	if (L < 1.5) return '';
	const d = Math.sign(x1 - x0);
	const h = Math.min(hl, L * 0.7);
	const w = Math.max(t, Math.min(hw, hw * (h / hl) + 2));
	const xs = x1 - d * h;
	const r = (n: number) => n.toFixed(2);
	return (
		`M${r(x0)},${r(y - t / 2)} L${r(xs)},${r(y - t / 2)} L${r(xs)},${r(y - w / 2)} ` +
		`L${r(x1)},${r(y)} L${r(xs)},${r(y + w / 2)} L${r(xs)},${r(y + t / 2)} L${r(x0)},${r(y + t / 2)} Z`
	);
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Zig-zag spring between x0 and x1 at height y. */
export function springPath(x0: number, x1: number, y: number, amp: number, coils = 7): string {
	const n = coils * 2;
	const L = x1 - x0;
	const lead = Math.min(4, Math.abs(L) * 0.12) * Math.sign(L || 1);
	const a = x0 + lead;
	const b = x1 - lead;
	let d = `M${x0.toFixed(2)},${y} L${a.toFixed(2)},${y}`;
	for (let i = 1; i <= n; i++) {
		const x = a + ((b - a) * (i - 0.5)) / n;
		d += ` L${x.toFixed(2)},${(y + (i % 2 ? -amp : amp)).toFixed(2)}`;
	}
	d += ` L${b.toFixed(2)},${y} L${x1.toFixed(2)},${y}`;
	return d;
}

/** «раз» / «раза» after a whole number: в 2 раза, в 5 раз, в 21 раз, в 23 раза. */
export function times(n: number): string {
	const a = Math.abs(Math.round(n));
	const d = a % 10;
	const dd = a % 100;
	return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? 'раза' : 'раз';
}
