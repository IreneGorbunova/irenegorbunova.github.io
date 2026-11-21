/**
 * Client helpers shared by the pictures and models of «Движение по окружности» (grade 9). Arrows and labels come from
 * the helpers of «Прямолинейное движение» (same look, same colors); numbers the Russian way (decimal comma, real
 * minus). Angles: `pt(cx, cy, r, a)` puts a = 0 at the right and lets a grow counterclockwise ON SCREEN (y points down),
 * so a positive angular speed turns a point counterclockwise as the reader sees it.
 */
export { el, fmt, fmtTrim, loop, k, tex } from '../g7/kit';
export { newArrow, label, f1 } from '../pryamolineynoe-dvizhenie/pd';

export const TAU = Math.PI * 2;
/** A point of a circle: a = 0 to the right, growing counterclockwise on screen. */
export const pt = (cx: number, cy: number, r: number, a: number) => ({ x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) });
/** The unit tangent of counterclockwise motion at angle a (screen coordinates). */
export const tan = (a: number) => ({ x: -Math.sin(a), y: -Math.cos(a) });
/** An SVG arc path from angle a0 to a1 (a1 > a0, counterclockwise on screen) on a circle. */
export const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
	if (a1 - a0 < 1e-4) return '';
	if (a1 - a0 >= TAU - 1e-4) return `M${(cx + r).toFixed(1)} ${cy.toFixed(1)} a${r} ${r} 0 1 0 ${(-2 * r).toFixed(1)} 0 a${r} ${r} 0 1 0 ${(2 * r).toFixed(1)} 0`;
	const p0 = pt(cx, cy, r, a0);
	const p1 = pt(cx, cy, r, a1);
	const large = a1 - a0 > Math.PI ? 1 : 0;
	return `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} A${r} ${r} 0 ${large} 0 ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
};
/** A small right-angle mark at point p between the direction to the center (unit u) and the tangent (unit v). */
export const rightMark = (p: { x: number; y: number }, u: { x: number; y: number }, v: { x: number; y: number }, s = 7) => {
	const a = { x: p.x + u.x * s, y: p.y + u.y * s };
	const b = { x: a.x + v.x * s, y: a.y + v.y * s };
	const c = { x: p.x + v.x * s, y: p.y + v.y * s };
	return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)} L${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
};
