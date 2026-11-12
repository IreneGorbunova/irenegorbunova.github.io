/**
 * Field lines of the pictures «Виды постоянных магнитов», traced at build time. Each magnet is replaced by charged
 * pole faces (+ on N, − on S; Gilbert's picture, as in magnets.ts): for a bar and a needle magnetised along their
 * length and for a horseshoe magnetised along its bend only the end faces carry charge, so outside the magnet this
 * is the true field. The charges lie in the plane of the picture and the field is the 3D one (1/r²) cut by that plane.
 */
export type Q = { x: number; y: number; q: number };
export type Pt = { x: number; y: number };
export type Line = { d: string; arrows: { x: number; y: number; a: number }[] };

const SOFT = 2.5;

const dirAt = (qs: Q[], x: number, y: number) => {
	let bx = 0;
	let by = 0;
	for (const c of qs) {
		const dx = x - c.x;
		const dy = y - c.y;
		const r2 = dx * dx + dy * dy + SOFT * SOFT;
		const f = c.q / (r2 * Math.sqrt(r2));
		bx += f * dx;
		by += f * dy;
	}
	const b = Math.hypot(bx, by) || 1;
	return { x: bx / b, y: by / b };
};

/** Traces a line from `s` along the field until it enters the magnet (`stop`) or leaves `box`. */
const trace = (qs: Q[], s: Pt, stop: (x: number, y: number) => boolean, box: [number, number, number, number]) => {
	const pts: Pt[] = [s];
	let { x, y } = s;
	const h = 0.8;
	let escaped = true;
	for (let i = 0; i < 4000; i++) {
		const d1 = dirAt(qs, x, y);
		const d2 = dirAt(qs, x + (d1.x * h) / 2, y + (d1.y * h) / 2);
		x += d2.x * h;
		y += d2.y * h;
		if (stop(x, y)) {
			escaped = false;
			break;
		}
		if (i % 3 === 2) pts.push({ x, y });
		if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) break;
	}
	pts.push({ x, y });
	return { pts, escaped };
};

const f1 = (v: number) => (Math.round(v * 10) / 10).toString();
const pathOf = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${f1(p.x)} ${f1(p.y)}`).join('');

/** Point and direction (degrees) at arc length `s` from the start of the line. */
const at = (pts: Pt[], s: number) => {
	let acc = 0;
	for (let i = 1; i < pts.length; i++) {
		const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
		if (acc + l >= s) {
			const t = (s - acc) / (l || 1);
			return {
				x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
				y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t,
				a: (Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x) * 180) / Math.PI,
			};
		}
		acc += l;
	}
	return null;
};
const lengthOf = (pts: Pt[]) => pts.reduce((a, p, i) => (i ? a + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);

/**
 * Lines from seeds near the N pole. The magnets are mirror-symmetric about the vertical line x = `mx` with N and S
 * swapped, so a line that runs out of the picture has a mirror twin that comes back into S: it is added reversed.
 */
export const lines = (
	qs: Q[],
	seeds: Pt[],
	stop: (x: number, y: number) => boolean,
	view: { w: number; h: number },
	mx: number,
) => {
	const box: [number, number, number, number] = [-60, -60, view.w + 60, view.h + 60];
	const inView = (p: { x: number; y: number }) => p.x > 8 && p.x < view.w - 8 && p.y > 8 && p.y < view.h - 8;
	const out: Line[] = [];
	for (const s of seeds) {
		const { pts, escaped } = trace(qs, s, stop, box);
		if (!escaped) {
			const m = at(pts, lengthOf(pts) / 2);
			out.push({ d: pathOf(pts), arrows: m && inView(m) ? [m] : [] });
			continue;
		}
		const a = at(pts, 26);
		out.push({ d: pathOf(pts), arrows: a && inView(a) ? [a] : [] });
		const twin = pts.map((p) => ({ x: 2 * mx - p.x, y: p.y })).reverse();
		const b = at(twin, lengthOf(twin) - 26);
		out.push({ d: pathOf(twin), arrows: b && inView(b) ? [b] : [] });
	}
	return out;
};

/** Seeds on an arc of radius `r` round (cx, cy), at angles (radians, screen) from `a0` to `a1`. */
export const arcSeeds = (cx: number, cy: number, r: number, a0: number, a1: number, n: number, sy = 1): Pt[] =>
	Array.from({ length: n }, (_, k) => {
		const a = a0 + ((a1 - a0) * k) / (n - 1);
		return { x: cx + r * Math.cos(a), y: cy + r * sy * Math.sin(a) };
	});
