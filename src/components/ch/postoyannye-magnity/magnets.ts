/**
 * Field of permanent magnets on a table, in the "magnetic charges" picture (Gilbert's model): a uniformly
 * magnetised bar is equivalent to two charged end faces, +q on the N face and −q on the S face. For a horseshoe
 * whose magnetisation follows its bend there are no charges inside either, only at the two tips.
 * Outside the magnets this gives the true field of the magnets. The table is the plane z = 0, the charges
 * sit in it, and the field is the 3D field (1/r²) of the point charges, cut by the table plane.
 */

export type Kind = 'bar' | 'horse';
export type Charge = { x: number; y: number; q: number };
export type Magnet = { kind: Kind; x: number; y: number; a: number; world: Charge[] };

export const BAR = { L: 220, W: 50 };
/** Horseshoe: arms along x, centred at y = ±ARM_Y, from x = X0 (start of the bend) to the tips at x = TIP. */
export const HORSE = { X0: -45, TIP: 85, ARM_Y: 40, R_IN: 25, R_OUT: 55 };
const SOFT = 7; // softening of the point charges, world units (the faces are not points)

/** Charges in the magnet's own frame (x along the magnet, N towards +x for a bar; N arm at y < 0 for a horseshoe). */
export const localCharges = (kind: Kind): Charge[] => {
	const out: Charge[] = [];
	if (kind === 'bar') {
		const ys = [-19, -9.5, 0, 9.5, 19];
		for (const y of ys) {
			out.push({ x: BAR.L / 2 - 4, y, q: 1 / ys.length });
			out.push({ x: -BAR.L / 2 + 4, y, q: -1 / ys.length });
		}
	} else {
		const ys = [-11, -3.7, 3.7, 11];
		for (const y of ys) {
			out.push({ x: HORSE.TIP - 4, y: -HORSE.ARM_Y + y, q: 1 / ys.length });
			out.push({ x: HORSE.TIP - 4, y: HORSE.ARM_Y + y, q: -1 / ys.length });
		}
	}
	return out;
};

export const toWorld = (m: Magnet, lx: number, ly: number) => {
	const c = Math.cos(m.a);
	const s = Math.sin(m.a);
	return { x: m.x + c * lx - s * ly, y: m.y + s * lx + c * ly };
};
export const toLocal = (m: Magnet, x: number, y: number) => {
	const c = Math.cos(m.a);
	const s = Math.sin(m.a);
	const dx = x - m.x;
	const dy = y - m.y;
	return { x: c * dx + s * dy, y: -s * dx + c * dy };
};

export const place = (m: Magnet) => {
	m.world = localCharges(m.kind).map((ch) => ({ ...toWorld(m, ch.x, ch.y), q: ch.q }));
};

export const makeMagnet = (kind: Kind, x: number, y: number, a: number): Magnet => {
	const m: Magnet = { kind, x, y, a, world: [] };
	place(m);
	return m;
};

/** Is the world point inside the body of the magnet (with an extra margin)? */
export const inside = (m: Magnet, x: number, y: number, pad = 0) => {
	const p = toLocal(m, x, y);
	if (m.kind === 'bar') return Math.abs(p.x) <= BAR.L / 2 + pad && Math.abs(p.y) <= BAR.W / 2 + pad;
	if (p.x > HORSE.TIP + pad) return false;
	if (p.x >= HORSE.X0) {
		const ay = Math.abs(p.y);
		return ay >= HORSE.R_IN - pad && ay <= HORSE.R_OUT + pad;
	}
	const r = Math.hypot(p.x - HORSE.X0, p.y);
	return r >= HORSE.R_IN - pad && r <= HORSE.R_OUT + pad;
};

/** Half-size of the magnet across its axis (where the rotation handle goes). */
export const halfHeight = (m: Magnet) => (m.kind === 'bar' ? BAR.W / 2 : HORSE.R_OUT);

/** Field at a point from all magnets, in arbitrary units (≈ 1/r² at r world units from a unit pole). */
export const field = (mags: Magnet[], x: number, y: number) => {
	let bx = 0;
	let by = 0;
	for (const m of mags)
		for (const c of m.world) {
			const dx = x - c.x;
			const dy = y - c.y;
			const r2 = dx * dx + dy * dy + SOFT * SOFT;
			const f = c.q / (r2 * Math.sqrt(r2));
			bx += f * dx;
			by += f * dy;
		}
	return { bx, by };
};

/** Total force on magnet `a` from magnet `b` (like charges repel). */
export const force = (a: Magnet, b: Magnet) => {
	let fx = 0;
	let fy = 0;
	for (const ca of a.world)
		for (const cb of b.world) {
			const dx = ca.x - cb.x;
			const dy = ca.y - cb.y;
			const r2 = dx * dx + dy * dy + SOFT * SOFT;
			const f = (ca.q * cb.q) / (r2 * Math.sqrt(r2));
			fx += f * dx;
			fy += f * dy;
		}
	return { fx, fy };
};

/** Centres of the N and S pole faces in the world. */
export const poles = (m: Magnet) => {
	const n = m.kind === 'bar' ? toWorld(m, BAR.L / 2 - 4, 0) : toWorld(m, HORSE.TIP - 4, -HORSE.ARM_Y);
	const s = m.kind === 'bar' ? toWorld(m, -BAR.L / 2 + 4, 0) : toWorld(m, HORSE.TIP - 4, HORSE.ARM_Y);
	return { n, s };
};

/** Seeds of the field lines: points just outside the N pole of the magnet. */
export const seeds = (m: Magnet) => {
	const out: { x: number; y: number }[] = [];
	if (m.kind === 'bar') {
		for (let k = -6; k <= 6; k++) {
			const t = (k / 6) * 1.95;
			out.push(toWorld(m, BAR.L / 2 - 14 + 34 * Math.cos(t), 34 * Math.sin(t) * 0.95));
		}
	} else {
		for (let k = -5; k <= 5; k++) {
			const t = (k / 5) * 2.2;
			out.push(toWorld(m, HORSE.TIP - 12 + 24 * Math.cos(t), -HORSE.ARM_Y + 24 * Math.sin(t)));
		}
	}
	return out;
};
