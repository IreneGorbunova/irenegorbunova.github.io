/**
 * A bar magnet and a coil on one axis (SI units).
 *
 * The magnet is a uniformly magnetised cylinder. Outside it, its field is that of two
 * magnetic "charges" ±q placed on the axis at ±MAG_D from the centre (the poles lie a bit
 * inside the ends, as for a real bar magnet). For such a field the flux through a circle
 * of radius r at axial position z is the Stokes stream function
 *     Ψ(r, z) = (μ0 q / 2) · (cos θ_S − cos θ_N),
 * where θ_N, θ_S are the angles at which the circle is seen from the poles. Ψ is constant
 * along every field line, and for a turn wider than the magnet it is the full flux of B
 * (the magnetisation inside the magnet is included).
 */
export const COIL_LEN = 0.08; // m, length of the winding
export const COIL_R = 0.025; // m, radius of a turn
export const MAG_LEN = 0.1; // m
export const MAG_R = 0.012; // m
export const MAG_D = 0.042; // m, distance from the centre to a pole
export const MAG_BR = 0.35; // T, remanent induction of the magnet (ferrite magnet)
export const MAG_Q = MAG_BR * Math.PI * MAG_R ** 2; // Wb, μ0·q
export const R_CIRCUIT = 10; // Ohm, resistance of the coil and the galvanometer together

const G = (u: number) => Math.hypot(u, COIL_R);
const g = (u: number) => u / Math.hypot(u, COIL_R);

/**
 * Magnetic flux through one turn, averaged over the turns of the coil (Wb).
 * x — position of the magnet's centre relative to the coil's centre (m); the north pole looks to +x.
 */
export function flux(x: number): number {
	const h = COIL_LEN / 2;
	const d = MAG_D;
	return (MAG_Q / (2 * COIL_LEN)) * (G(h - x + d) - G(-h - x + d) - G(h - x - d) + G(-h - x - d));
}

/** dΦ/dx for flux(x), Wb/m. */
export function dflux(x: number): number {
	const h = COIL_LEN / 2;
	const d = MAG_D;
	return -(MAG_Q / (2 * COIL_LEN)) * (g(h - x + d) - g(-h - x + d) - g(h - x - d) + g(-h - x - d));
}

/** Largest flux per turn: the magnet in the middle of the coil. */
export const FLUX_MAX = flux(0);

type Pt = [number, number];

/** Field vector of the two poles at (x, y) in the meridional plane (any units, poles at ±d). */
function field(x: number, y: number, d: number): Pt {
	const dxN = x - d;
	const dxS = x + d;
	const rN = Math.hypot(dxN, y);
	const rS = Math.hypot(dxS, y);
	const kN = 1 / rN ** 3;
	const kS = 1 / rS ** 3;
	return [dxN * kN - dxS * kS, y * kN - y * kS];
}

/** Stream function (in units of μ0 q) at (x, y): constant along a field line. */
export function stream(x: number, y: number, d: number): number {
	const r = Math.abs(y);
	return 0.5 * ((x + d) / Math.hypot(x + d, r) - (x - d) / Math.hypot(x - d, r));
}

export type FieldLine = { pts: Pt[]; arrows: { x: number; y: number; a: number }[] };

/**
 * Field lines of the magnet in the upper half of the meridional plane, in centimetres,
 * magnet centre at the origin, north pole at +x. The lines are the levels
 * Ψ = (k − ½)/K of the stream function, so equal flux passes between neighbours.
 */
export function fieldLines(K: number, box: { x: number; y: number }, skip: (level: number) => boolean = () => false) {
	const d = MAG_D * 100;
	const r0 = 0.15;
	const h = 0.08;
	const lines: FieldLine[] = [];
	for (let k = 1; k <= K; k++) {
		const level = (k - 0.5) / K;
		if (skip(level)) continue;
		// Start angle around the north pole: bisect for the exact level.
		let lo = 1e-4;
		let hi = Math.PI - 1e-4;
		for (let i = 0; i < 60; i++) {
			const m = (lo + hi) / 2;
			const v = stream(d + r0 * Math.cos(m), r0 * Math.sin(m), d);
			if (v < level) lo = m;
			else hi = m;
		}
		const th = (lo + hi) / 2;
		let x = d + r0 * Math.cos(th);
		let y = r0 * Math.sin(th);
		const pts: Pt[] = [[x, y]];
		const dir = (px: number, py: number): Pt => {
			const [bx, by] = field(px, py, d);
			const b = Math.hypot(bx, by);
			return [bx / b, by / b];
		};
		let crossedMid = false;
		const arrows: FieldLine['arrows'] = [];
		for (let i = 0; i < 20000; i++) {
			const [k1x, k1y] = dir(x, y);
			const [k2x, k2y] = dir(x + (h / 2) * k1x, y + (h / 2) * k1y);
			const [k3x, k3y] = dir(x + (h / 2) * k2x, y + (h / 2) * k2y);
			const [k4x, k4y] = dir(x + h * k3x, y + h * k3y);
			const nx = x + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
			const ny = y + (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
			if (!crossedMid && x > 0 && nx <= 0) {
				crossedMid = true;
				arrows.push({ x: 0, y: y + ((ny - y) * x) / (x - nx), a: Math.atan2(ny - y, nx - x) });
			}
			x = nx;
			y = ny;
			pts.push([x, y]);
			if (Math.hypot(x + d, y) < r0) break;
			if (Math.abs(x) > box.x * 3 || y > box.y * 6) break;
		}
		lines.push({ pts, arrows });
	}
	return lines;
}

/** Polyline → SVG path, keeping only parts inside the box, with points thinned to `minStep`. */
export function toPath(
	pts: Pt[],
	box: { x: number; y: number },
	map: (p: Pt) => Pt,
	minStep: number,
): string {
	let d = '';
	let pen = false;
	let last: Pt | null = null;
	for (const p of pts) {
		const inside = Math.abs(p[0]) <= box.x && p[1] <= box.y;
		if (!inside) {
			pen = false;
			continue;
		}
		const q = map(p);
		if (!pen) {
			d += `M${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
			pen = true;
			last = q;
		} else if (last && Math.hypot(q[0] - last[0], q[1] - last[1]) >= minStep) {
			d += `L${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
			last = q;
		}
	}
	return d;
}
