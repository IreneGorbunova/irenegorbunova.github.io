/** Geometry helpers for the static pictures of «Законы Ньютона» (used at build time in the frontmatter). */

/** An arrow from (x1, y1) to (x2, y2): the shaft (stopping at the head) and a filled triangular head. */
export const arrow = (x1: number, y1: number, x2: number, y2: number, head = 10) => {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.hypot(dx, dy);
	const ux = dx / len;
	const uy = dy / len;
	const h = Math.min(head, len * 0.6);
	const bx = x2 - ux * h;
	const by = y2 - uy * h;
	const w = h * 0.45;
	const f = (v: number) => v.toFixed(1);
	return {
		shaft: `M ${f(x1)} ${f(y1)} L ${f(bx + ux * 1.5)} ${f(by + uy * 1.5)}`,
		head: `M ${f(x2)} ${f(y2)} L ${f(bx - uy * w)} ${f(by + ux * w)} L ${f(bx + uy * w)} ${f(by - ux * w)} Z`,
	};
};

/** The small arrow over a vector letter whose text starts at (x, y): `w` is the letter's width. */
export const over = (x: number, y: number, w = 11) => {
	const y0 = y - 16;
	return `M ${x + 1} ${y0} H ${x + w} M ${x + w - 3} ${y0 - 2.5} L ${x + w} ${y0} L ${x + w - 3} ${y0 + 2.5}`;
};
