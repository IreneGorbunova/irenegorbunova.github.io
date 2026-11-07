/**
 * Magnetic fields of the chapter, in the plane of a horizontal sheet of cardboard.
 * Coordinates in centimetres, x to the right (east), y up the screen (north); fields in microtesla.
 *
 * - A long straight wire perpendicular to the sheet: B = μ0·I / (2π r), lines are circles.
 *   `dir = +1`: the current flows towards the viewer (a dot), the lines go counter-clockwise.
 * - A coil (solenoid) whose axis lies in the sheet along x: the sum of circular turns,
 *   each computed exactly with complete elliptic integrals (Simpson et al., NASA 2001).
 *   `dir = +1`: inside the coil the field points to +x, so the right end is the north pole.
 * - The Earth: a uniform horizontal field pointing north (+y).
 */

export const MU0_2PI = 20; // μ0/(2π) in μT·cm/A: 2·10⁻⁷ Тл·м/А = 20 мкТл·см/А
export const B_EARTH = 17; // horizontal component of the Earth's field in central Russia, μT (rounded)

export const SHEET = { W: 32, H: 24 }; // the sheet, cm (x from −16 to 16, y from −12 to 12)
export const WIRE_R = 0.5; // radius of the drawn wire, cm

export const COIL = {
	turns: 20,
	a: 2.2, // radius of the turns, cm
	len: 10, // length of the winding, cm
	wire: 0.24, // radius of a drawn cross-section of the wire, cm
};
export const coilTurnsX = (): number[] =>
	Array.from({ length: COIL.turns }, (_, j) => -COIL.len / 2 + (COIL.len / COIL.turns) * (j + 0.5));

/** Complete elliptic integrals K(m), E(m) of the parameter m = k², by the arithmetic-geometric mean. */
export function ellipKE(m: number): [number, number] {
	let a = 1;
	let b = Math.sqrt(1 - m);
	let c = Math.sqrt(m);
	let sum = 0.5 * c * c;
	let pow = 0.5;
	for (let n = 0; n < 30 && Math.abs(c) > 1e-15; n++) {
		const an = (a + b) / 2;
		c = (a - b) / 2;
		b = Math.sqrt(a * b);
		a = an;
		pow *= 2;
		sum += pow * c * c;
	}
	const K = Math.PI / (2 * a);
	return [K, K * (1 - sum)];
}

/** Field of one circular turn (current 1 A, radius a, centre on the x axis at x0), in the sheet: [Bx, By], μT. */
export function loopField(a: number, x0: number, x: number, y: number): [number, number] {
	const z = x - x0;
	const rho = Math.abs(y);
	const C = 2 * MU0_2PI; // μ0/π in μT·cm/A
	const s = a * a + rho * rho + z * z;
	const alpha2 = s - 2 * a * rho;
	const beta2 = s + 2 * a * rho;
	if (alpha2 < 1e-9) return [0, 0];
	const beta = Math.sqrt(beta2);
	const [K, E] = ellipKE(1 - alpha2 / beta2);
	const bz = (C / (2 * alpha2 * beta)) * ((a * a - rho * rho - z * z) * E + alpha2 * K);
	if (rho < 1e-6) return [bz, 0];
	const brho = ((C * z) / (2 * alpha2 * beta * rho)) * (s * E - alpha2 * K);
	return [bz, y >= 0 ? brho : -brho];
}

/** Field of the coil for 1 A (dir = +1), μT. */
export function coilField(x: number, y: number): [number, number] {
	let bx = 0;
	let by = 0;
	for (const x0 of coilTurnsX()) {
		const [fx, fy] = loopField(COIL.a, x0, x, y);
		bx += fx;
		by += fy;
	}
	return [bx, by];
}

/** Field of the straight wire at the origin for 1 A towards the viewer (dir = +1), μT. */
export function wireField(x: number, y: number): [number, number] {
	const r2 = x * x + y * y;
	if (r2 < 1e-9) return [0, 0];
	const k = MU0_2PI / r2;
	return [-k * y, k * x];
}

/** Trace a field line of `field` from (x0, y0): both ways until it closes or leaves the box. */
export function traceLine(
	field: (x: number, y: number) => [number, number],
	x0: number,
	y0: number,
	box = { x: 20, y: 15 },
	ds = 0.06,
	maxSteps = 6000,
): { pts: [number, number][]; closed: boolean } {
	const dirAt = (x: number, y: number, sgn: number): [number, number] => {
		const [bx, by] = field(x, y);
		const b = Math.hypot(bx, by) || 1;
		return [(sgn * bx) / b, (sgn * by) / b];
	};
	const run = (sgn: number) => {
		const pts: [number, number][] = [[x0, y0]];
		let x = x0;
		let y = y0;
		let travelled = 0;
		for (let i = 0; i < maxSteps; i++) {
			const k1 = dirAt(x, y, sgn);
			const k2 = dirAt(x + (ds / 2) * k1[0], y + (ds / 2) * k1[1], sgn);
			const k3 = dirAt(x + (ds / 2) * k2[0], y + (ds / 2) * k2[1], sgn);
			const k4 = dirAt(x + ds * k3[0], y + ds * k3[1], sgn);
			x += (ds / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
			y += (ds / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
			travelled += ds;
			pts.push([x, y]);
			if (travelled > 2 && Math.hypot(x - x0, y - y0) < ds * 1.5) {
				pts[pts.length - 1] = [x0, y0];
				return { pts, closed: true };
			}
			if (Math.abs(x) > box.x || Math.abs(y) > box.y) return { pts, closed: false };
		}
		return { pts, closed: false };
	};
	const fwd = run(1);
	if (fwd.closed) return fwd;
	const back = run(-1);
	return { pts: back.pts.reverse().concat(fwd.pts.slice(1)), closed: false };
}

/** Thin a polyline: keep points that are at least `min` apart (and the last one). */
export function thin(pts: [number, number][], min = 0.25): [number, number][] {
	const out: [number, number][] = [pts[0]];
	for (let i = 1; i < pts.length - 1; i++) {
		const [px, py] = out[out.length - 1];
		if (Math.hypot(pts[i][0] - px, pts[i][1] - py) >= min) out.push(pts[i]);
	}
	out.push(pts[pts.length - 1]);
	return out;
}

/** Field lines of the coil: seeds on the middle cross-section, evenly spaced across the coil. */
export function coilLines(n = 4, frac = 0.8, box = { x: 18, y: 14 }) {
	const lines: { pts: [number, number][]; closed: boolean }[] = [];
	for (let i = 0; i < n; i++) {
		const y = ((i + 0.5) / n) * frac * COIL.a;
		for (const sy of [1, -1]) {
			const l = traceLine(coilField, 0, sy * y, box);
			lines.push({ pts: thin(l.pts), closed: l.closed });
		}
	}
	return lines;
}

/** Points where a polyline crosses the vertical lines x = c, with the direction of the polyline there (radians, maths axes). */
export function crossings(pts: [number, number][], cs: number[]): { x: number; y: number; ang: number }[] {
	const out: { x: number; y: number; ang: number }[] = [];
	for (let i = 1; i < pts.length; i++) {
		const [x1, y1] = pts[i - 1];
		const [x2, y2] = pts[i];
		for (const c of cs) {
			if ((x1 - c) * (x2 - c) < 0) {
				const t = (c - x1) / (x2 - x1);
				out.push({ x: c, y: y1 + t * (y2 - y1), ang: Math.atan2(y2 - y1, x2 - x1) });
			}
		}
	}
	return out;
}
