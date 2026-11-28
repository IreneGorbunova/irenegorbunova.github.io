/**
 * Two gases with the same start for RealGasPicture: «air» (nitrogen molecules, Lennard-Jones attraction and repulsion)
 * and «ideal gas» (points that only bounce off each other at the distance σ and off the walls). Two-dimensional slice
 * of a gas at 0 °C and 101 кПа: one molecule per 3,34 × 3,34 нм (3,34 нм = n^(−1/3), n = p/kT = 2,69·10²⁵ м⁻³).
 *
 * Units: нм, пс, а. е. м. (u); energy in u·нм²/пс² (1 u·нм²/пс² = 1,6605·10⁻²¹ Дж).
 *   N₂: m = 28 u; Lennard-Jones σ = 0,37 нм, ε/k = 95 К → ε = 0,790; kT at 273 К = 2,270;
 *   speed components: σ_υ = √(kT/m) = 0,285 нм/пс (mean speed in the plane 0,357 нм/пс = 357 м/с);
 *   rotation: I = 2·14 u·(0,055 нм)² = 0,0847 u·нм², ω_rms = √(kT/I) = 5,2 рад/пс.
 * Integration: velocity Verlet with dt = 0,004 пс (energy drift below 0,1 % over 100 пс; checked in node).
 */
export const W = 4 * 3.34; // box, нм
export const H = 3 * 3.34;
export const N = 12;
export const SIG = 0.37;
const EPS = 0.79;
const M = 28;
const KT = 2.27;
const RC = 1.2; // cutoff, нм
const DT = 0.004;
const MARGIN = 0.18; // the molecule's half-size at the walls

export interface Mol {
	x: number;
	y: number;
	vx: number;
	vy: number;
	ax: number;
	ay: number;
	th: number; // orientation of the dumbbell
	w: number; // angular speed
}

const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());

/** The same start for both gases: a jittered grid, Maxwell velocities with no net drift. */
export const start = (seed: number): Mol[] => {
	const r = rng(seed);
	const out: Mol[] = [];
	for (let i = 0; i < 4; i++)
		for (let j = 0; j < 3; j++) {
			const sv = Math.sqrt(KT / M);
			out.push({ x: (i + 0.5) * 3.34 + (r() - 0.5) * 1.6, y: (j + 0.5) * 3.34 + (r() - 0.5) * 1.6, vx: sv * gauss(r), vy: sv * gauss(r), ax: 0, ay: 0, th: r() * Math.PI, w: 5.2 * gauss(r) });
		}
	const mx = out.reduce((s, m) => s + m.vx, 0) / out.length;
	const my = out.reduce((s, m) => s + m.vy, 0) / out.length;
	for (const m of out) (m.vx -= mx), (m.vy -= my);
	return out;
};

const forces = (ms: Mol[]) => {
	for (const m of ms) (m.ax = 0), (m.ay = 0);
	let pot = 0;
	for (let i = 0; i < ms.length; i++)
		for (let j = i + 1; j < ms.length; j++) {
			const dx = ms[j].x - ms[i].x;
			const dy = ms[j].y - ms[i].y;
			const r2 = dx * dx + dy * dy;
			if (r2 > RC * RC) continue;
			const s6 = (SIG * SIG / r2) ** 3;
			const f = (24 * EPS * (2 * s6 * s6 - s6)) / r2; // force / r
			ms[i].ax -= (f * dx) / M;
			ms[i].ay -= (f * dy) / M;
			ms[j].ax += (f * dx) / M;
			ms[j].ay += (f * dy) / M;
			pot += 4 * EPS * (s6 * s6 - s6);
		}
	return pot;
};

const walls = (m: Mol) => {
	if (m.x < MARGIN) (m.x = 2 * MARGIN - m.x), (m.vx = Math.abs(m.vx));
	if (m.x > W - MARGIN) (m.x = 2 * (W - MARGIN) - m.x), (m.vx = -Math.abs(m.vx));
	if (m.y < MARGIN) (m.y = 2 * MARGIN - m.y), (m.vy = Math.abs(m.vy));
	if (m.y > H - MARGIN) (m.y = 2 * (H - MARGIN) - m.y), (m.vy = -Math.abs(m.vy));
};

/** Advances the «air» by time t (пс) with velocity Verlet. */
export const stepAir = (ms: Mol[], t: number) => {
	const n = Math.max(1, Math.ceil(t / DT));
	const h = t / n;
	for (let k = 0; k < n; k++) {
		for (const m of ms) {
			m.vx += 0.5 * h * m.ax;
			m.vy += 0.5 * h * m.ay;
			m.x += h * m.vx;
			m.y += h * m.vy;
			m.th += h * m.w;
			walls(m);
		}
		forces(ms);
		for (const m of ms) {
			m.vx += 0.5 * h * m.ax;
			m.vy += 0.5 * h * m.ay;
		}
	}
};
export const initAir = (ms: Mol[]) => forces(ms);
export const energyAir = (ms: Mol[]) => ms.reduce((s, m) => s + 0.5 * M * (m.vx * m.vx + m.vy * m.vy), 0) + forces(ms);

/** Advances the ideal gas: straight lines, elastic bounces at the distance σ and at the walls. */
export const stepIdeal = (ms: Mol[], t: number) => {
	const n = Math.max(1, Math.ceil(t / DT));
	const h = t / n;
	for (let k = 0; k < n; k++) {
		for (const m of ms) {
			m.x += h * m.vx;
			m.y += h * m.vy;
			walls(m);
		}
		for (let i = 0; i < ms.length; i++)
			for (let j = i + 1; j < ms.length; j++) {
				const a = ms[i];
				const b = ms[j];
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const r2 = dx * dx + dy * dy;
				if (r2 >= SIG * SIG) continue;
				const dvx = b.vx - a.vx;
				const dvy = b.vy - a.vy;
				const dot = dx * dvx + dy * dvy;
				if (dot >= 0) continue; // already moving apart
				const k2 = dot / r2; // equal masses: exchange the normal components
				a.vx += k2 * dx;
				a.vy += k2 * dy;
				b.vx -= k2 * dx;
				b.vy -= k2 * dy;
			}
	}
};
