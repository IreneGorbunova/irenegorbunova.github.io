/**
 * The field of a bar magnet in the plane of a drawing, for the static pictures (computed at build time). The magnet is
 * modelled by two point poles inside the bar, +1 near its N end and −1 near its S end (the standard school picture of a
 * dipole's lines; good outside the bar). Coordinates in px, y down.
 */
export type Pt = { x: number; y: number };
export interface Bar {
	n: Pt; // the N pole's point
	s: Pt; // the S pole's point
}
/** The field (arbitrary units) at p: B = Σ q·r/|r|³ from the two poles. */
export const field = (bar: Bar, p: Pt): Pt => {
	let bx = 0;
	let by = 0;
	for (const [c, q] of [
		[bar.n, 1],
		[bar.s, -1],
	] as [Pt, number][]) {
		const dx = p.x - c.x;
		const dy = p.y - c.y;
		const r3 = Math.pow(dx * dx + dy * dy, 1.5) || 1e-9;
		bx += (q * dx) / r3;
		by += (q * dy) / r3;
	}
	return { x: bx, y: by };
};
/**
 * Field lines leaving the N pole at the given angles (rad, measured from the direction N → S... any), traced along B
 * in steps of `h` px until they come within `stop` px of the S pole or leave the box [0, w] × [0, h].
 */
export const lines = (bar: Bar, angles: number[], box: { w: number; h: number }, start = 6, stop = 6, h = 1.5): Pt[][] =>
	angles.map((a) => {
		let p = { x: bar.n.x + start * Math.cos(a), y: bar.n.y + start * Math.sin(a) };
		const pts = [p];
		for (let k = 0; k < 4000; k++) {
			const b = field(bar, p);
			const l = Math.hypot(b.x, b.y) || 1;
			// midpoint step
			const m = { x: p.x + (b.x / l) * h * 0.5, y: p.y + (b.y / l) * h * 0.5 };
			const bm = field(bar, m);
			const lm = Math.hypot(bm.x, bm.y) || 1;
			p = { x: p.x + (bm.x / lm) * h, y: p.y + (bm.y / lm) * h };
			pts.push(p);
			if (Math.hypot(p.x - bar.s.x, p.y - bar.s.y) < stop) break;
			if (p.x < -40 || p.y < -40 || p.x > box.w + 40 || p.y > box.h + 40) break;
		}
		return pts;
	});
/** A polyline as an SVG path, every `every`-th point. */
export const path = (pts: Pt[], every = 3) => pts.filter((_, i) => i % every === 0 || i === pts.length - 1).map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
/** The point and direction at a fraction t (0…1) of a polyline's length. */
export const along = (pts: Pt[], t: number): { p: Pt; d: Pt } => {
	let L = 0;
	const seg: number[] = [];
	for (let i = 1; i < pts.length; i++) {
		const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
		seg.push(l);
		L += l;
	}
	let goal = t * L;
	for (let i = 1; i < pts.length; i++) {
		if (goal <= seg[i - 1]) {
			const k = goal / (seg[i - 1] || 1);
			const a = pts[i - 1];
			const b = pts[i];
			return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, d: { x: b.x - a.x, y: b.y - a.y } };
		}
		goal -= seg[i - 1];
	}
	const n = pts.length;
	return { p: pts[n - 1], d: { x: pts[n - 1].x - pts[n - 2].x, y: pts[n - 1].y - pts[n - 2].y } };
};
/** A filled arrowhead at p along d. */
export const headAt = (p: Pt, d: Pt, s = 7) => {
	const l = Math.hypot(d.x, d.y) || 1;
	const ux = d.x / l;
	const uy = d.y / l;
	const bx = p.x - ux * s * 0.5;
	const by = p.y - uy * s * 0.5;
	return `M${(p.x + ux * s * 0.5).toFixed(1)} ${(p.y + uy * s * 0.5).toFixed(1)}L${(bx - uy * s * 0.45).toFixed(1)} ${(by + ux * s * 0.45).toFixed(1)}L${(bx + uy * s * 0.45).toFixed(1)} ${(by - ux * s * 0.45).toFixed(1)}Z`;
};
