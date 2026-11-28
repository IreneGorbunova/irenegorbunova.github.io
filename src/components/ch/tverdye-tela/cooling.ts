/**
 * The solidification scheme of CoolingLab.astro (no DOM: also run by node for the checks).
 *
 * A square window of the melt is divided into M × M cells (two cells per spacing of the particles in each direction).
 * The undercooling u goes from 0 at the melting temperature to 1 at the «glass» temperature (two thirds of the way down
 * to the room temperature), where nothing moves any more; it grows at the rate q (the cooling rate, «медленно» 1,
 * «быстро» 30, «очень быстро» 600, in arbitrary units of u per unit of time). Classical nucleation and growth, as
 * G. Tammann described them (1903): both the rate of nucleation J (per cell per unit time) and the speed of growth v
 * (cells per unit time) depend on the undercooling,
 *   J(u) = J0·u²(1 − u) + J1·u⁶(1 − u)³   (no nuclei at the melting point, most at about two thirds of the way down,
 *                                          none at the glass temperature, where the particles cannot move),
 *   v(u) = v0·(1 − u)^1,5·min(1, u/0,02)    (fastest just below the melting point, slower and slower as it cools),
 * J0 = 0,3, J1 = 60 000, v0 = 5000. A liquid cell next to a grain joins it with the probability v·dt per step (times
 * the number of grown neighbours / 3, at most 1) and takes that grain's orientation; a liquid cell with no grown
 * neighbour becomes a new nucleus with the probability J·dt. At u = 1 the liquid left freezes where it is: it is
 * amorphous. A grain smaller than MIN_PTS particles is too small to show its rows and is counted as amorphous.
 * «быстро» is drawn as site saturation: at u = 0,15 nine to fifteen nuclei appear at once at random places kept apart
 * (no other nucleation), so the grains grow to similar sizes and can be counted (review, 28 Nov 2026). Neighbouring
 * grains never share a tint (greedy coloring, TINT_COUNT tints).
 * Tuned so that «медленно» gives one crystal (sometimes two), «быстро» 9–15 grains and «очень быстро» more
 * than 90 % without order (checked over many seeds with node). A scheme, not a calculation of a real melt.
 */
export const M = 56; // cells per side
export const N = M / 2; // particles per side
export const RATES = { slow: 1, fast: 30, vfast: 600 } as const;
export type Rate = keyof typeof RATES;
const J0 = 0.3;
const J1 = 60000;
const V0 = 5000;
export const MIN_PTS = 6;
const U_BURST = 0.15;
const K_MIN = 9;
const K_MAX = 15;
export const TINT_COUNT = 6;

export interface Grain {
	id: number;
	angle: number; // rad, the orientation of its square lattice (0…π/2)
	ox: number; // the lattice origin (the nucleus), in particle spacings
	oy: number;
	pts: { x: number; y: number; u: number }[]; // its lattice points (in particle spacings) and when they appeared (u)
	tint: number;
}
export interface Result {
	grains: Grain[]; // only those of MIN_PTS particles or more
	cellU: Float32Array; // u at which each cell crystallized (Infinity: never)
	cellG: Int32Array; // the grain of each cell (−1: amorphous)
	uEnd: number; // u when all was solid, or 1
	amorphous: number; // the share of the window without order, 0…1
}

/** A repeatable pseudo-random generator (0…1). */
export const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

export const solidify = (rate: Rate, seed: number): Result => {
	const q = RATES[rate];
	const rnd = rng(seed);
	const g = new Int32Array(M * M).fill(-1);
	const cu = new Float32Array(M * M).fill(Infinity);
	const nuclei: { i: number; j: number; u: number }[] = [];
	const du = Math.min(0.002, (0.6 * q) / V0); // a step in u; the growth probability per step stays below 0,6
	const dt = du / q;
	let u = 0;
	let liquid = M * M;
	const nb = new Int32Array(8);
	const fresh: number[] = [];
	// «быстро»: the nuclei appear almost at once (site saturation): when the undercooling reaches U_BURST, K_MIN…K_MAX
	// nuclei at random places no closer than 0,75 of the mean spacing, so the grains grow to similar sizes.
	let burst = rate === 'fast';
	while (u < 1 && liquid > 0) {
		u += du;
		if (burst && u >= U_BURST) {
			burst = false;
			const K = K_MIN + Math.floor(rnd() * (K_MAX - K_MIN + 1));
			const dmin = 0.75 * M / Math.sqrt(K);
			for (let tries = 0; nuclei.length < K && tries < 5000; tries++) {
				const i = Math.floor(rnd() * M);
				const j = Math.floor(rnd() * M);
				if (nuclei.some((n) => (n.i - i) ** 2 + (n.j - j) ** 2 < dmin * dmin)) continue;
				g[i * M + j] = nuclei.length;
				cu[i * M + j] = u;
				nuclei.push({ i, j, u });
				liquid--;
			}
		}
		const J = J0 * u * u * (1 - u) + J1 * u ** 6 * (1 - u) ** 3;
		const v = V0 * (1 - u) ** 1.5 * Math.min(1, u / 0.02);
		const pg = v * dt;
		const pn = J * dt;
		fresh.length = 0;
		for (let i = 0; i < M; i++)
			for (let j = 0; j < M; j++) {
				const c = i * M + j;
				if (g[c] >= 0) continue;
				let n = 0;
				for (let a = -1; a <= 1; a++)
					for (let b = -1; b <= 1; b++) {
						if (!a && !b) continue;
						const ii = i + a;
						const jj = j + b;
						if (ii < 0 || jj < 0 || ii >= M || jj >= M) continue;
						const k = g[ii * M + jj];
						if (k >= 0) nb[n++] = k;
					}
				if (n) {
					if (rnd() < pg * Math.min(1, n / 3)) fresh.push(c, nb[Math.floor(rnd() * n)]);
				} else if (rate !== 'fast' && rnd() < pn) {
					fresh.push(c, nuclei.length);
					nuclei.push({ i, j, u });
				}
			}
		for (let k = 0; k < fresh.length; k += 2) {
			g[fresh[k]] = fresh[k + 1];
			cu[fresh[k]] = u;
		}
		liquid -= fresh.length / 2;
	}
	const uEnd = Math.min(1, u);
	// the lattice of each grain: a square lattice of spacing 1 (particle spacings) turned by its angle, through its nucleus
	const raw: Grain[] = nuclei.map((n, id) => ({ id, angle: rnd() * (Math.PI / 2), ox: (n.j + 0.5) / 2, oy: (n.i + 0.5) / 2, pts: [], tint: 0 }));
	const R = Math.ceil(N * 1.5);
	for (const gr of raw) {
		const c = Math.cos(gr.angle);
		const s = Math.sin(gr.angle);
		for (let a = -R; a <= R; a++)
			for (let b = -R; b <= R; b++) {
				const x = gr.ox + a * c - b * s;
				const y = gr.oy + a * s + b * c;
				if (x < 0.25 || y < 0.25 || x > N - 0.25 || y > N - 0.25) continue;
				const cell = Math.floor(y * 2) * M + Math.floor(x * 2);
				if (g[cell] === gr.id) gr.pts.push({ x, y, u: cu[cell] });
			}
	}
	const keep = new Set<number>();
	const grains = raw.filter((gr) => gr.pts.length >= MIN_PTS);
	// tints: neighbouring grains never share one (greedy coloring over the cells that touch)
	const near = new Map<number, Set<number>>();
	for (const gr of grains) {
		keep.add(gr.id);
		near.set(gr.id, new Set());
	}
	for (let i = 0; i < M; i++)
		for (let j = 0; j < M; j++) {
			const k = g[i * M + j];
			for (const [a, b] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
				const ii = i + a;
				const jj = j + b;
				if (ii >= M || jj < 0 || jj >= M) continue;
				const l = g[ii * M + jj];
				if (k !== l && near.has(k) && near.has(l)) (near.get(k)!.add(l), near.get(l)!.add(k));
			}
		}
	const tintOf = new Map<number, number>();
	[...grains].sort((x, y) => near.get(y.id)!.size - near.get(x.id)!.size).forEach((gr, n) => {
		const used = new Set([...near.get(gr.id)!].map((id) => tintOf.get(id)));
		let t = n % TINT_COUNT;
		for (let d = 0; d < TINT_COUNT && used.has(t); d++) t = (t + 1) % TINT_COUNT;
		tintOf.set(gr.id, t);
		gr.tint = t;
	});
	let amorph = 0;
	for (let c = 0; c < M * M; c++)
		if (!keep.has(g[c])) {
			g[c] = -1;
			cu[c] = Infinity;
			amorph++;
		}
	return { grains, cellU: cu, cellG: g, uEnd, amorphous: amorph / (M * M) };
};
