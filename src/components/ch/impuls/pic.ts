/** Geometry helpers of the explanatory pictures of «Импульс»: an arrow as a shaft path and a head polygon. */
export const arrow = (x1: number, y1: number, x2: number, y2: number, head = 9, half = 4.5) => {
	const L = Math.hypot(x2 - x1, y2 - y1) || 1;
	const ux = (x2 - x1) / L;
	const uy = (y2 - y1) / L;
	const bx = x2 - ux * head;
	const by = y2 - uy * head;
	const f = (v: number) => v.toFixed(1);
	return {
		shaft: `M ${f(x1)} ${f(y1)} L ${f(bx + ux * 1.5)} ${f(by + uy * 1.5)}`,
		head: `${f(x2)},${f(y2)} ${f(bx - uy * half)},${f(by + ux * half)} ${f(bx + uy * half)},${f(by - ux * half)}`,
	};
};
