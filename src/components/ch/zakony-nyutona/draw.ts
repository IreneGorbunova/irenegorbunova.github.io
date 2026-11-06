/** Small drawing and formatting helpers shared by the Newton's-laws models. */

export const SVG_NS = 'http://www.w3.org/2000/svg';

/** Russian number format with a decimal comma and a real minus sign; -0 is printed as 0. */
export const fmt = (v: number, digits = 1, trim = false) => {
	const eps = 0.5 * 10 ** -digits;
	const x = Math.abs(v) < eps ? 0 : v;
	return x
		.toLocaleString('ru-RU', {
			minimumFractionDigits: trim ? 0 : digits,
			maximumFractionDigits: digits,
			useGrouping: false,
		})
		.replace('-', '−');
};

/** The same number for KaTeX: decimal comma in braces, minus as is. */
export const tex = (v: number, digits = 2) => fmt(v, digits, true).replace('−', '-').replace(',', '{,}');

/**
 * A filled arrow from (x1, y1) to (x2, y2) as one path: a shaft of width w and a head.
 * Short arrows get a smaller head; an arrow shorter than `min` is not drawn.
 */
export const arrowPath = (x1: number, y1: number, x2: number, y2: number, w = 3, head = 11, min = 3) => {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.hypot(dx, dy);
	if (len < min) return '';
	const ux = dx / len;
	const uy = dy / len;
	const nx = -uy;
	const ny = ux;
	const h = Math.min(head, len * 0.6);
	const hw = h * 0.55;
	const bx = x2 - ux * h;
	const by = y2 - uy * h;
	const s = w / 2;
	const p = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;
	return (
		`M ${p(x1 + nx * s, y1 + ny * s)} L ${p(bx + nx * s, by + ny * s)} L ${p(bx + nx * hw, by + ny * hw)} ` +
		`L ${p(x2, y2)} L ${p(bx - nx * hw, by - ny * hw)} L ${p(bx - nx * s, by - ny * s)} ` +
		`L ${p(x1 - nx * s, y1 - ny * s)} Z`
	);
};

/** A zigzag spring between two points on one horizontal line. */
export const springPath = (xa: number, xb: number, y: number, coils = 10, amp = 7, lead = 6) => {
	const span = xb - xa - 2 * lead;
	let d = `M ${xa.toFixed(1)} ${y} L ${(xa + lead).toFixed(1)} ${y}`;
	const n = coils * 2;
	for (let i = 0; i < n; i++) {
		const x = xa + lead + (span * (i + 0.5)) / n;
		d += ` L ${x.toFixed(1)} ${(y + (i % 2 ? amp : -amp)).toFixed(1)}`;
	}
	d += ` L ${(xb - lead).toFixed(1)} ${y} L ${xb.toFixed(1)} ${y}`;
	return d;
};

/**
 * Keeps a number with its unit and «м/с» in one piece when a live text wraps:
 * a no-break space after a digit, a word joiner (U+2060) after the slash (Chrome breaks after «/»).
 * Safe for innerHTML strings: tags never contain «м/с» or a digit followed by a Cyrillic letter.
 */
export const nb = (s: string) => s.replace(/(\d) (?=[А-Яа-яЁё])/g, '$1 ').replace(/м\/с/g, 'м/⁠с');

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Set several attributes at once. */
export const attrs = (el: Element, a: Record<string, string | number>) => {
	for (const k in a) el.setAttribute(k, String(a[k]));
};
