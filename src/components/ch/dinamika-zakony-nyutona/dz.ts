/**
 * Drawing helpers of the pictures and models of «Законы Ньютона» (grade 10), usable at build time and in the browser.
 * Colors of the chapter (DzStyles.astro): gravitation violet, elastic forces (N, T, a rope, a hand) blue, friction red,
 * velocity gold, acceleration green, the resultant in the ink color, a second force teal.
 */

export const f1 = (v: number) => v.toFixed(1);

/** A filled arrow from (x1, y1) to (x2, y2): a shaft of width `w` and a head; '' when shorter than `min`. */
export const arrowPath = (x1: number, y1: number, x2: number, y2: number, w = 3, head = 10, min = 2) => {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.hypot(dx, dy);
	if (len < min) return '';
	const ux = dx / len;
	const uy = dy / len;
	const nx = -uy;
	const ny = ux;
	const h = Math.min(head, len * 0.6);
	const hw = h * 0.5;
	const bx = x2 - ux * h;
	const by = y2 - uy * h;
	const s = w / 2;
	const p = (x: number, y: number) => `${f1(x)} ${f1(y)}`;
	return (
		`M${p(x1 + nx * s, y1 + ny * s)} L${p(bx + nx * s, by + ny * s)} L${p(bx + nx * hw, by + ny * hw)} ` +
		`L${p(x2, y2)} L${p(bx - nx * hw, by - ny * hw)} L${p(bx - nx * s, by - ny * s)} L${p(x1 - nx * s, y1 - ny * s)} Z`
	);
};

/** The small arrow over a vector letter whose text starts at (x, y) (baseline): `w` is the letter's width. */
export const over = (x: number, y: number, w = 10, size = 15) => {
	const y0 = y - size * 0.9;
	return `M${f1(x + 1)} ${f1(y0)} H${f1(x + w)} M${f1(x + w - 3)} ${f1(y0 - 2.2)} L${f1(x + w)} ${f1(y0)} L${f1(x + w - 3)} ${f1(y0 + 2.2)}`;
};

/** A number the Russian way: a decimal comma and a real minus sign; `digits` after the comma. */
export const fmt = (v: number, digits = 1) => {
	const x = Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v;
	return x.toFixed(digits).replace('.', ',').replace('-', '−');
};
/** Three significant figures (two decimals below 10, none from 100). */
export const sig3 = (v: number) => {
	const a = Math.abs(v);
	return fmt(v, a >= 100 ? 0 : a >= 10 ? 1 : 2);
};
