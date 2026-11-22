/**
 * Client helpers shared by the pictures and models of «Звук и его характеристики» (grade 9). Colors, one per role (as
 * in «Волны. Длина волны»): the air gray, the marked particle red, the direction in which sound runs gold
 * (`arrow--gold`), the swing of the particles blue (`arrow--blue`, a double arrow), λ and periods green.
 *
 * The sound of every picture is the same harmonic wave from a source whose surface moves as s0(t) = A·sin(2πνt):
 * a layer of air at the distance x repeats it later by x/υ,  s(x, t) = A·sin(2πν(t − x/υ)).
 * The air is densest (a compression) where the neighbors move toward each other most: phase 2πν(t − x/υ) = 2πn;
 * thinnest (a rarefaction) at phase π + 2πn. In a picture the swing A is hugely exaggerated (in a real sound it is
 * from about a ten-millionth of a millimeter to a few hundredths of a millimeter) and the time is slowed down.
 */
import { el } from '../g7/kit';
import { newArrow } from '../pryamolineynoe-dvizhenie/pd';
export { el, fmt, fmtTrim, fmtInt, loop, k, tex } from '../g7/kit';
export { newArrow, f1 } from '../pryamolineynoe-dvizhenie/pd';

export const TAU = Math.PI * 2;

/** A small deterministic pseudo-random number in [0, 1). */
export const rnd = (i: number, k: number) => {
	const r = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
	return r - Math.floor(r);
};

/** A double arrow «↔» of a color: returns set(x1, y1, x2, y2); a length under 4 px hides it. */
export const newDouble = (g: Element, color: string) => {
	const a = newArrow(g, color);
	const b = newArrow(g, color);
	return (x1: number, y1: number, x2: number, y2: number, hl = 6, hw = 3.4) => {
		const mx = (x1 + x2) / 2;
		const my = (y1 + y2) / 2;
		if (Math.hypot(x2 - x1, y2 - y1) < 4) {
			a(0, 0, 0, 0);
			b(0, 0, 0, 0);
			return;
		}
		a(mx, my, x2, y2, hl, hw);
		b(mx, my, x1, y1, hl, hw);
	};
};

/**
 * Air as particles: rows × cols dots in the box (x0, y0, w, h), each a little off the grid (the molecules of a gas are
 * not in rows), drawn into `g`. `red` marks one particle (index) red and larger. set(disp) moves each dot by disp(x)
 * along x, where x is its rest position; dots that leave the box are hidden.
 */
export const newAir = (g: Element, o: { x0: number; y0: number; w: number; h: number; dx: number; rows: number; r?: number; red?: number; seed?: number; clip?: [number, number] }) => {
	const cols = Math.floor(o.w / o.dx) + 1;
	const dy = o.h / (o.rows - 1 || 1);
	const seed = o.seed ?? 1;
	const pts: { x: number; y: number; c: SVGCircleElement }[] = [];
	for (let j = 0; j < o.rows; j++)
		for (let i = 0; i < cols; i++) {
			const x = o.x0 + i * o.dx + (rnd(i + 31 * j, seed) - 0.5) * o.dx * 0.45 + (j % 2) * o.dx * 0.5;
			const y = o.y0 + j * dy + (rnd(i + 31 * j, seed + 7) - 0.5) * dy * 0.6;
			const c = el('circle', { class: 'zv-air', r: o.r ?? 1.7 });
			g.append(c);
			pts.push({ x, y, c });
		}
	let redPt: (typeof pts)[number] | null = null;
	if (o.red !== undefined) {
		redPt = pts[Math.min(pts.length - 1, o.red)];
		redPt.c.setAttribute('class', 'zv-red');
		redPt.c.setAttribute('r', String((o.r ?? 1.7) * 2.2));
		g.append(redPt.c); // on top
	}
	const [lo, hi] = o.clip ?? [o.x0 - o.dx, o.x0 + o.w + o.dx];
	return {
		pts,
		red: redPt,
		set: (disp: (x: number) => number, minX = -Infinity) => {
			for (const p of pts) {
				const x = p.x + disp(p.x);
				const vis = x >= lo && x <= hi && x >= minX;
				p.c.setAttribute('cx', x.toFixed(2));
				p.c.setAttribute('cy', p.y.toFixed(2));
				p.c.style.display = vis ? '' : 'none';
			}
		},
	};
};
