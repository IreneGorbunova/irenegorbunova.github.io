/**
 * Shared geometry of the pictures of «Магнитное поле. Индукция магнитного поля» (client side).
 *
 * Vectors are in the screen frame of the people kit: x to the right, y down, z toward the viewer (a left-handed frame),
 * so that the 3D basis of a kit hand (handBasis in people/hand.ts) can be used directly. Physical cross products are
 * taken in the right-handed frame (x, −y, z): `pcross` does the flip, so B ∝ I × r and F ∝ I × B come out right.
 * Projection is orthographic: a point (x, y, z) is drawn at (x, y); z only orders what is in front.
 */
export type V3 = [number, number, number];
export const vadd = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vsub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vmul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const vdot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vnorm = (a: V3): V3 => vmul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const flip = (a: V3): V3 => [a[0], -a[1], a[2]];
/** The physical (right-handed) cross product of two screen-frame vectors, in the screen frame. */
export const pcross = (a: V3, b: V3): V3 => flip(cross(flip(a), flip(b)));

/**
 * A basis (e1, e2) of the plane at right angles to the current direction `i`, turned so that going from e1 to e2 is a
 * right-handed turn about i (e1 × e2 = i physically): the field lines of the current then run from e1 toward e2.
 */
export const ringBasis = (i: V3, hint: V3): { e1: V3; e2: V3 } => {
	const e1 = vnorm(vsub(hint, vmul(i, vdot(hint, i))));
	const e2 = pcross(i, e1);
	return { e1, e2 };
};
/** A point of the ring of radius r around c at angle θ (from e1 toward e2). */
export const ringPt = (c: V3, e1: V3, e2: V3, r: number, th: number): V3 => vadd(c, vadd(vmul(e1, r * Math.cos(th)), vmul(e2, r * Math.sin(th))));
/** The direction of the field line at angle θ of such a ring. */
export const ringDir = (e1: V3, e2: V3, th: number): V3 => vadd(vmul(e1, -Math.sin(th)), vmul(e2, Math.cos(th)));

/**
 * The SVG path of the parts of a ring that lie behind (back = true) or in front of its center plane z = c.z, sampled
 * every 4°.
 */
export const ringPath = (c: V3, e1: V3, e2: V3, r: number, back: boolean): string => {
	let d = '';
	let on = false;
	for (let k = 0; k <= 90; k++) {
		const th = (k / 90) * 2 * Math.PI;
		const p = ringPt(c, e1, e2, r, th);
		const isBack = p[2] < c[2] - 1e-6;
		if (isBack === back) {
			d += `${on ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
			on = true;
		} else on = false;
	}
	return d;
};

/** A filled arrowhead at screen point p pointing along the screen direction (dx, dy); `s` is its length. */
export const head = (x: number, y: number, dx: number, dy: number, s: number): string => {
	const l = Math.hypot(dx, dy) || 1;
	const ux = dx / l;
	const uy = dy / l;
	const bx = x - ux * s;
	const by = y - uy * s;
	const w = s * 0.55;
	return `M${(x + ux * s * 0.15).toFixed(1)} ${(y + uy * s * 0.15).toFixed(1)}L${(bx - uy * w).toFixed(1)} ${(by + ux * w).toFixed(1)}L${(bx + uy * w).toFixed(1)} ${(by - ux * w).toFixed(1)}Z`;
};

/** An arrow from (x1, y1) to (x2, y2) as one path: the shaft (stroke) and a separate head path (fill). */
export const arrow = (x1: number, y1: number, x2: number, y2: number, s: number) => {
	const l = Math.hypot(x2 - x1, y2 - y1) || 1;
	const ex = x2 - ((x2 - x1) / l) * s * 0.8;
	const ey = y2 - ((y2 - y1) / l) * s * 0.8;
	return { shaft: `M${x1.toFixed(1)} ${y1.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`, head: head(x2, y2, x2 - x1, y2 - y1, s) };
};
