/**
 * Small drawing helpers for the pictures and models of «Механическое движение. Система отсчёта» (grade 10).
 * `arrow` gives the shaft (stops at the base of the head) and the head of a vector from (x0, y0) to (x1, y1) in px;
 * a vector shorter than the head gets a shorter head. `ru` writes a number with a decimal comma and a real minus.
 */
export const arrow = (x0: number, y0: number, x1: number, y1: number, head = 9, half = 4.5) => {
	const L = Math.hypot(x1 - x0, y1 - y0);
	if (L < 0.5) return { line: '', head: '' };
	const h = Math.min(head, L * 0.6);
	const w = (half * h) / head;
	const ux = (x1 - x0) / L;
	const uy = (y1 - y0) / L;
	const bx = x1 - ux * h;
	const by = y1 - uy * h;
	const f = (v: number) => v.toFixed(1);
	return {
		line: `M${f(x0)} ${f(y0)} L${f(bx)} ${f(by)}`,
		head: `M${f(x1)} ${f(y1)} L${f(bx - uy * w)} ${f(by + ux * w)} L${f(bx + uy * w)} ${f(by - ux * w)} Z`,
	};
};

/** A number with `d` decimals, a decimal comma and the sign «−»; −0 becomes 0. */
export const ru = (v: number, d = 1) => {
	const s = (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('.', ',');
	return s.startsWith('-') ? '−' + s.slice(1) : s;
};

/** Like `ru`, without trailing zeros after the comma (2,50 → 2,5; 5,00 → 5). */
export const ruTrim = (v: number, d = 2) => ru(v, d).replace(/(,\d*?)0+$/, '$1').replace(/,$/, '');
