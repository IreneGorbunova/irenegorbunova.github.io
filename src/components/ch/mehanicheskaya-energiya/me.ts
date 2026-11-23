/**
 * Helpers of the new pictures and models of «Работа и энергия» (grade 10), client and server side.
 */
/** The path of an arrow's shaft and head from (x1, y1) to (x2, y2); the head (h px) ends at the tip. */
export const arrowD = (x1: number, y1: number, x2: number, y2: number, h = 7) => {
	const L = Math.hypot(x2 - x1, y2 - y1);
	if (L < 0.5) return { shaft: '', head: '' };
	const ux = (x2 - x1) / L;
	const uy = (y2 - y1) / L;
	const hh = Math.min(h, L);
	const bx = x2 - ux * hh;
	const by = y2 - uy * hh;
	const w = hh * 0.45;
	const f = (v: number) => v.toFixed(1);
	return {
		shaft: L > hh ? `M${f(x1)} ${f(y1)} L${f(bx + ux * 0.5)} ${f(by + uy * 0.5)}` : '',
		head: `M${f(x2)} ${f(y2)} L${f(bx - uy * w)} ${f(by + ux * w)} L${f(bx + uy * w)} ${f(by - ux * w)} Z`,
	};
};
/** Sets an arrow made of two paths (shaft, head). */
export const setArrow = (shaft: SVGPathElement, head: SVGPathElement, x1: number, y1: number, x2: number, y2: number, h = 7) => {
	const a = arrowD(x1, y1, x2, y2, h);
	shaft.setAttribute('d', a.shaft);
	head.setAttribute('d', a.head);
};
