/**
 * The Moon's near side for the opening scene and the libration picture: the main seas and a few bright craters
 * (the same list as SyncRotation.astro: [longitude E, latitude N, angular radius in degrees, kind]) and an
 * orthographic projection of them for a given sub-Earth point (libration in longitude l and latitude b, degrees).
 * x points right (east on the Moon, which is on the right as seen from the Northern hemisphere), y points down.
 */
export type Feature = [number, number, number, 'mare' | 'bright' | 'ring'];

export const NEAR: Feature[] = [
	[-58, 22, 14, 'mare'], [-55, 6, 13, 'mare'], [-66, -6, 9, 'mare'], [-45, 32, 10, 'mare'], [-40, 14, 10, 'mare'],
	[-30, 2, 8, 'mare'], [-50, 44, 7, 'mare'], [-16, 33, 14, 'mare'], [-26, 40, 8, 'mare'], [-5, 25, 7, 'mare'],
	[17, 28, 9.5, 'mare'], [30, 8, 10, 'mare'], [22, 4, 7, 'mare'], [40, 12, 6, 'mare'], [59, 17, 7, 'mare'],
	[51, -8, 9, 'mare'], [44, -2, 6, 'mare'], [35, -15, 5.5, 'mare'], [-17, -21, 9, 'mare'], [-10, -15, 6, 'mare'],
	[-23, -10, 6, 'mare'], [-39, -24, 5.5, 'mare'], [4, 13, 4.5, 'mare'], [-31, 7, 6, 'mare'],
	[-40, 54, 5, 'mare'], [-20, 56, 5, 'mare'], [0, 56, 5, 'mare'], [20, 57, 4.5, 'mare'],
	[-20, 9.6, 1.6, 'bright'], [-11, -43, 1.6, 'bright'], [-38, 8, 1.1, 'bright'],
];

/** A few far-side craters near the limbs (seen only thanks to libration) and on the near side. */
export const RINGS: Feature[] = (() => {
	let s = 11;
	const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
	const out: Feature[] = [];
	for (let i = 0; i < 40; i++) {
		const L = (rnd() * 2 - 1) * 110;
		const B = (rnd() * 2 - 1) * 80;
		out.push([L, B, 1 + rnd() * 2.6, 'ring']);
	}
	return out;
})();

const D = Math.PI / 180;

export interface Ell {
	cx: number;
	cy: number;
	rx: number;
	ry: number;
	rot: number;
	op: number;
	kind: Feature[3];
}

/**
 * Projects a feature onto a disc of radius R centred at (0, 0) for the sub-Earth point at longitude l, latitude b.
 * Returns null when the feature is on the hidden hemisphere.
 */
export const project = (f: Feature, R: number, l = 0, b = 0): Ell | null => {
	const [L, B, r, kind] = f;
	// unit vector of the feature in the Moon's frame (x to the Earth at l = b = 0, y east, z north)
	const cb = Math.cos(B * D);
	const v = [cb * Math.cos(L * D), cb * Math.sin(L * D), Math.sin(B * D)];
	// rotate by −l about z, then by −b about y: the sub-Earth point goes to +x
	const cl = Math.cos(-l * D);
	const sl = Math.sin(-l * D);
	const v1 = [v[0] * cl - v[1] * sl, v[0] * sl + v[1] * cl, v[2]];
	const cB = Math.cos(b * D);
	const sB = Math.sin(b * D);
	const v2 = [v1[0] * cB + v1[2] * sB, v1[1], -v1[0] * sB + v1[2] * cB];
	const depth = v2[0]; // cosine of the angle from the disc centre
	if (depth <= 0) return null;
	const x = R * v2[1];
	const y = -R * v2[2];
	const rp = R * Math.sin(r * D);
	return {
		cx: x,
		cy: y,
		rx: Math.max(0.15, rp * depth),
		ry: rp,
		rot: (Math.atan2(y, x) * 180) / Math.PI,
		op: Math.min(1, depth / 0.12),
		kind,
	};
};

/**
 * The unlit part of the disc of radius R (centred at 0, 0) at elongation e (radians; 0 — new moon, π — full moon),
 * as seen from the Northern hemisphere: a waxing Moon is lit on the right. The terminator is half an ellipse with
 * half-width R·|cos e|.
 */
export const shadowPath = (e: number, R: number, n = 28) => {
	const E = ((e % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
	const waxing = E < Math.PI;
	const k = Math.cos(E);
	const side = waxing ? -1 : 1; // the dark limb
	const tx = waxing ? k : -k; // the terminator's x factor
	const pts: string[] = [];
	for (let i = 0; i <= n; i++) {
		const p = -Math.PI / 2 + (Math.PI * i) / n;
		pts.push(`${(side * R * Math.cos(p)).toFixed(2)} ${(R * Math.sin(p)).toFixed(2)}`);
	}
	for (let i = n; i >= 0; i--) {
		const p = -Math.PI / 2 + (Math.PI * i) / n;
		pts.push(`${(tx * R * Math.cos(p)).toFixed(2)} ${(R * Math.sin(p)).toFixed(2)}`);
	}
	return `M${pts.join(' L')} Z`;
};
