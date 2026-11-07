/** Helpers shared by the widgets of the chapter «Источники света». */

/** Area of the overlap of two circles with radii r1, r2 whose centres are d apart. */
export function overlap(r1: number, r2: number, d: number): number {
	if (r1 <= 0 || r2 <= 0) return 0;
	if (d >= r1 + r2) return 0;
	if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
	const a1 = Math.acos(Math.min(1, Math.max(-1, (d * d + r1 * r1 - r2 * r2) / (2 * d * r1))));
	const a2 = Math.acos(Math.min(1, Math.max(-1, (d * d + r2 * r2 - r1 * r1) / (2 * d * r2))));
	const k = (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2);
	return r1 * r1 * a1 + r2 * r2 * a2 - 0.5 * Math.sqrt(Math.max(0, k));
}

/** Fraction of a disc (radius rs) that stays visible behind a disc (radius rb) shifted by d. */
export function visibleFraction(rs: number, rb: number, d: number): number {
	if (rs <= 1e-9) return d < rb ? 0 : 1;
	return 1 - overlap(rs, rb, d) / (Math.PI * rs * rs);
}

/** A number with a decimal comma and a thin space in thousands: fmt(1234.5, 1) → «1 234,5». */
export function fmt(x: number, digits = 0): string {
	const s = Math.abs(x).toFixed(digits);
	const [int, frac] = s.split('.');
	const grouped = int.length > 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : int;
	const sign = x < 0 && Number(s) !== 0 ? '−' : '';
	return sign + grouped + (frac ? ',' + frac : '');
}

/** The same for KaTeX: decimal comma as {,} and a thin space as \,. */
export function tfmt(x: number, digits = 0): string {
	return fmt(x, digits).replace(',', '{,}').replace(/ /g, '\\,').replace('−', '-');
}

export type RGB = [number, number, number];

/** Resolve a CSS colour (it may use var() and color-mix()) to sRGB 0–255 with a probe element. */
export function resolveColor(root: HTMLElement, css: string): RGB {
	const probe = document.createElement('span');
	probe.style.cssText = `position:absolute;visibility:hidden;color:${css}`;
	root.appendChild(probe);
	const c = getComputedStyle(probe).color;
	probe.remove();
	const nums = (c.match(/-?[\d.]+(e-?\d+)?/g) || ['0', '0', '0']).map(Number);
	if (c.startsWith('color(')) return [nums[0] * 255, nums[1] * 255, nums[2] * 255];
	return [nums[0], nums[1], nums[2]];
}

/** Call fn now and whenever the site theme switches. */
export function onTheme(fn: () => void): void {
	fn();
	new MutationObserver(fn).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

export const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function svgPoint(svg: SVGSVGElement, e: PointerEvent): { x: number; y: number } {
	const pt = svg.createSVGPoint();
	pt.x = e.clientX;
	pt.y = e.clientY;
	const m = svg.getScreenCTM();
	const p = m ? pt.matrixTransform(m.inverse()) : pt;
	return { x: p.x, y: p.y };
}

export const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));
