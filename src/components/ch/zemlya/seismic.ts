/**
 * Seismic rays in a spherically layered Earth. The velocities are a simplified IASP91 model (straight lines between
 * the nodes below); the Earth is cut into 10 km shells of constant speed. In a shell a ray is straight, so
 * r·sin i = b is constant along it; at a boundary Snell's law for a sphere keeps r·sin i / υ = p. A ray that cannot
 * enter the next shell (sin i > 1) turns back; an S ray stops at the liquid core (υ_S = 0).
 */

export const R_EARTH = 6371;
export const R_CMB = 6371 - 2889; // the core–mantle boundary, km from the centre
export const R_ICB = 6371 - 5154; // the inner core boundary

/** [depth km, υ_P km/s, υ_S km/s]; a repeated depth is a jump. */
const NODES: [number, number, number][] = [
	[0, 5.8, 3.36],
	[20, 5.8, 3.36],
	[20, 6.5, 3.75],
	[35, 6.5, 3.75],
	[35, 8.04, 4.47],
	[210, 8.3, 4.52],
	[410, 9.03, 4.87],
	[410, 9.36, 5.07],
	[660, 10.2, 5.6],
	[660, 10.79, 5.95],
	[760, 11.07, 6.21],
	[2740, 13.65, 7.26],
	[2889, 13.69, 7.3],
	[2889, 8.01, 0],
	[5154, 10.26, 0],
	[5154, 11.09, 3.5],
	[6371, 11.26, 3.67],
];

export interface Shell {
	top: number;
	bot: number;
	vp: number;
	vs: number;
}

/** The shells from the surface down. `solidInner = false` makes the inner core liquid (the outer core continued). */
export const buildShells = (solidInner = true, dz = 10): Shell[] => {
	const shells: Shell[] = [];
	for (let k = 0; k < NODES.length - 1; k++) {
		const [d0, p0, s0] = NODES[k];
		const [d1, p1, s1] = NODES[k + 1];
		if (d1 === d0) continue;
		const n = Math.max(1, Math.round((d1 - d0) / dz));
		for (let j = 0; j < n; j++) {
			const a = d0 + ((d1 - d0) * j) / n;
			const b = d0 + ((d1 - d0) * (j + 1)) / n;
			const f = ((a + b) / 2 - d0) / (d1 - d0);
			let vp = p0 + (p1 - p0) * f;
			let vs = s0 + (s1 - s0) * f;
			if (!solidInner && d0 >= 5154) {
				vp = 8.01 + ((10.26 - 8.01) * ((a + b) / 2 - 2889)) / (5154 - 2889);
				vs = 0;
			}
			shells.push({ top: R_EARTH - a, bot: R_EARTH - b, vp, vs });
		}
	}
	return shells;
};

export interface Ray {
	/** Points [r km, θ rad from the epicentre] along the ray. */
	pts: [number, number][];
	/** Travel time (s) at every point. */
	times: number[];
	/** The distance from the epicentre where the ray comes back to the surface, degrees; null if it never does. */
	dist: number | null;
	/** Total travel time, s. */
	time: number;
	/** Did the ray pass through the inner core? */
	inner: boolean;
	/** An S ray stopped at the liquid core. */
	stopped: boolean;
}

/** Traces a ray leaving the surface at `i0` degrees from the vertical. */
export const trace = (i0: number, wave: 'P' | 'S', shells: Shell[]): Ray => {
	const v = (s: Shell) => (wave === 'P' ? s.vp : s.vs);
	const p = (R_EARTH * Math.sin((i0 * Math.PI) / 180)) / v(shells[0]);
	const pts: [number, number][] = [[R_EARTH, 0]];
	const times = [0];
	let theta = 0;
	let t = 0;
	let k = 0;
	let down = true;
	let inner = false;
	const done = (dist: number | null, stopped = false): Ray => ({ pts, times, dist, time: t, inner, stopped });
	for (let guard = 0; guard < 100000; guard++) {
		const s = shells[k];
		const vel = v(s);
		if (vel <= 0) return done(null, true);
		const b = p * vel;
		if (s.bot < R_ICB + 1e-6) inner = true;
		if (down) {
			if (b >= s.bot) {
				// the ray turns inside this shell
				theta += 2 * Math.acos(Math.min(1, b / s.top));
				t += (2 * Math.sqrt(Math.max(0, s.top * s.top - b * b))) / vel;
				pts.push([s.top, theta]);
				times.push(t);
				down = false;
				k -= 1;
				if (k < 0) return done((theta * 180) / Math.PI);
				continue;
			}
			theta += Math.acos(b / s.top) - Math.acos(b / s.bot);
			t += (Math.sqrt(s.top * s.top - b * b) - Math.sqrt(s.bot * s.bot - b * b)) / vel;
			pts.push([s.bot, theta]);
			times.push(t);
			k += 1;
			if (k >= shells.length) return done(null);
			const nv = v(shells[k]);
			if (nv <= 0) return done(null, true);
			if (p * nv > s.bot) {
				// total reflection at the boundary
				down = false;
				k -= 1;
			}
		} else {
			theta += Math.acos(b / s.top) - Math.acos(b / s.bot);
			t += (Math.sqrt(s.top * s.top - b * b) - Math.sqrt(s.bot * s.bot - b * b)) / vel;
			pts.push([s.top, theta]);
			times.push(t);
			k -= 1;
			if (k < 0) return done((theta * 180) / Math.PI);
		}
	}
	return done(null);
};

/**
 * Where the rays come back to the surface: a dense fan of rays, then the gaps.
 * Returns the empty intervals (degrees) between 30° and 180° for the given set of arrivals.
 */
export const gaps = (dists: number[], from = 30, step = 0.5) => {
	const n = Math.round((180 - from) / step);
	const hit = new Array(n + 1).fill(false);
	for (const d of dists) {
		const x = Math.min(d % 360, 360 - (d % 360));
		if (x >= from) hit[Math.min(n, Math.floor((x - from) / step))] = true;
	}
	const out: [number, number][] = [];
	let s = -1;
	for (let i = 0; i <= n; i++) {
		if (!hit[i] && s < 0) s = i;
		if (hit[i] && s >= 0) {
			out.push([from + s * step, from + i * step]);
			s = -1;
		}
	}
	if (s >= 0) out.push([from + s * step, 180]);
	return out;
};
