/**
 * Physics of the cart model (no DOM here, so it can be checked with plain node).
 *
 * The contact is simulated with a real force: a spring bumper (elastic impact), a plasticine pad
 * that is crushed and then holds the carts together (perfectly inelastic impact), or a compressed
 * spring released by burning a thread (the carts start at rest and fly apart).
 * The force on cart 1 is always minus the force on cart 2, so the total momentum is conserved at
 * every moment of the impact, not only "before" and "after".
 */

export type Mode = 'elastic' | 'inelastic' | 'burst';

export const TRACK = 2; // track length, m
export const LC = 0.24; // cart body length, m
export const EDGE = 0.02; // carts stop this close to the track ends, m
export const LB = 0.08; // spring bumper (elastic mode), natural length, m
export const KB = 5000; // its stiffness, N/m
export const LP = 0.03; // two plasticine pads together, m
export const KP = 25000; // stiffness of plasticine while it is being crushed, N/m
export const LS = 0.08; // the spring between the carts (burst mode), natural length, m
export const KS = 400; // its stiffness, N/m
export const ES = 0.3; // energy stored in the compressed spring, J
export const XS = Math.sqrt((2 * ES) / KS); // its initial compression, m

export const reducedMass = (m1: number, m2: number) => (m1 * m2) / (m1 + m2);

/** Velocities after the interaction (projections on the x axis). */
export function finalVelocities(mode: Mode, m1: number, v1: number, m2: number, v2: number) {
	if (mode === 'burst') {
		const p = Math.sqrt(2 * ES * reducedMass(m1, m2));
		return { u1: -p / m1, u2: p / m2, hit: true };
	}
	if (v1 <= v2) return { u1: v1, u2: v2, hit: false };
	if (mode === 'inelastic') {
		const V = (m1 * v1 + m2 * v2) / (m1 + m2);
		return { u1: V, u2: V, hit: true };
	}
	return {
		u1: ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2),
		u2: ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2),
		hit: true,
	};
}

/** Gap between the cart bodies at the first touch (or at the start, for burst). */
export const contactGap = (mode: Mode) => (mode === 'elastic' ? LB : mode === 'inelastic' ? LP : LS - XS);

export interface Plan {
	mode: Mode;
	m1: number;
	m2: number;
	v1: number;
	v2: number;
	u1: number;
	u2: number;
	hit: boolean;
	x1: number; // initial left face of cart 1, m
	x2: number; // initial left face of cart 2, m
	tOn: number; // model time when the contact starts, s
	Tc: number; // duration of the contact, s
	Fmax: number; // largest force during the contact, N
	tMax: number; // the run stops at this model time at the latest, s
}

/** Chooses where the carts start so that the impact happens in view and both phases are long enough. */
export function plan(mode: Mode, m1: number, v1: number, m2: number, v2: number): Plan {
	const { u1, u2, hit } = finalVelocities(mode, m1, v1, m2, v2);
	const mu = reducedMass(m1, m2);
	const D = contactGap(mode);
	const base = { mode, m1, m2, v1, v2, u1, u2, hit };

	if (mode === 'burst') {
		const free = TRACK - 2 * EDGE - 2 * LC - D;
		const a = (free * Math.abs(u1)) / (Math.abs(u1) + Math.abs(u2));
		const x1 = EDGE + a;
		const Tc = (Math.PI / 2) * Math.sqrt(mu / KS);
		return { ...base, x1, x2: x1 + LC + D, tOn: 0, Tc, Fmax: KS * XS, tMax: Tc + Math.min(2.2, a / Math.abs(u1)) };
	}

	if (!hit) {
		const x1 = 0.35;
		const x2 = 1.25;
		let t = 2.2;
		if (v1 < 0) t = Math.min(t, (x1 - EDGE) / -v1);
		if (v2 > 0) t = Math.min(t, (TRACK - EDGE - LC - x2) / v2);
		return { ...base, x1, x2, tOn: Infinity, Tc: 0, Fmax: 0, tMax: t };
	}

	const vr = v1 - v2;
	const k = mode === 'elastic' ? KB : KP;
	const Tc = mode === 'elastic' ? Math.PI * Math.sqrt(mu / k) : (Math.PI / 2) * Math.sqrt(mu / k);
	const Fmax = vr * Math.sqrt(mu * k);

	// X = left face of cart 2 at the first touch. Look for the X that leaves the most time
	// before the impact (up to 1 s) and after it (up to 1.4 s).
	let best = { score: -1, X: TRACK / 2, tc: 0.5, ta: 1 };
	for (let X = EDGE + LC + D; X <= TRACK - EDGE - LC + 1e-9; X += 0.005) {
		let tc = 1;
		if (v1 > 0) tc = Math.min(tc, (X - D - LC - EDGE) / v1);
		if (v2 < 0) tc = Math.min(tc, (TRACK - EDGE - LC - X) / -v2);
		let ta = 1.4;
		if (u1 < 0) ta = Math.min(ta, (X - D - LC - EDGE) / -u1);
		if (u2 > 0) ta = Math.min(ta, (TRACK - EDGE - LC - X) / u2);
		const score = Math.min(tc / 1, ta / 1.4) - 1e-3 * Math.abs(X - TRACK / 2);
		if (score > best.score) best = { score, X, tc, ta };
	}
	const { X, tc, ta } = best;
	return {
		...base,
		x1: X - D - LC - v1 * tc,
		x2: X - v2 * tc,
		tOn: tc,
		Tc,
		Fmax,
		tMax: tc + Tc + ta + 0.05,
	};
}

/** State of the run; `step` advances it by dt with the velocity Verlet scheme. */
export class Sim {
	t = 0;
	x1: number;
	x2: number;
	v1: number;
	v2: number;
	F = 0; // force between the carts, N (> 0 pushes them apart)
	touched = false; // the contact has started
	done = false; // the contact is over (separated or stuck together)
	stuck = false;
	squash = 0; // permanent crush of the plasticine after sticking, m
	p: Plan;
	constructor(p: Plan) {
		this.p = p;
		this.x1 = p.x1;
		this.x2 = p.x2;
		if (p.mode === 'burst') {
			this.v1 = 0;
			this.v2 = 0;
		} else {
			this.v1 = p.v1;
			this.v2 = p.v2;
		}
	}
	/** Compression of the spring / plasticine, m (0 when not touching). */
	compression(): number {
		const gap = this.x2 - this.x1 - LC;
		const L = this.p.mode === 'elastic' ? LB : this.p.mode === 'inelastic' ? LP : LS;
		return Math.max(0, L - gap);
	}
	private force(): number {
		if (this.done || this.stuck) return 0;
		const c = this.compression();
		if (c <= 0) return 0;
		const k = this.p.mode === 'elastic' ? KB : this.p.mode === 'inelastic' ? KP : KS;
		return k * c;
	}
	step(dt: number) {
		const { m1, m2 } = this.p;
		if (this.stuck) {
			this.x1 += this.v1 * dt;
			this.x2 += this.v2 * dt;
			this.t += dt;
			return;
		}
		let F = this.force();
		this.v1 -= (0.5 * dt * F) / m1;
		this.v2 += (0.5 * dt * F) / m2;
		this.x1 += this.v1 * dt;
		this.x2 += this.v2 * dt;
		F = this.force();
		this.v1 -= (0.5 * dt * F) / m1;
		this.v2 += (0.5 * dt * F) / m2;
		this.t += dt;
		this.F = F;
		if (F > 0) this.touched = true;
		if (!this.touched || this.done) return;
		if (this.p.mode === 'inelastic' && this.v1 - this.v2 <= 0) {
			// The plasticine stops being crushed: from now on the carts move as one body.
			this.stuck = true;
			this.done = true;
			this.squash = this.compression();
			this.v1 = this.v2 = this.p.u1; // equal to the computed value up to rounding
			this.F = 0;
		} else if (F === 0) {
			// Separated: the velocities equal the exact values up to the integration error.
			this.done = true;
			this.v1 = this.p.u1;
			this.v2 = this.p.u2;
		}
	}
	advance(T: number, h = 2e-5) {
		const n = Math.max(1, Math.ceil(T / h));
		const dt = T / n;
		for (let i = 0; i < n; i++) this.step(dt);
	}
	get p1() {
		return this.p.m1 * this.v1;
	}
	get p2() {
		return this.p.m2 * this.v2;
	}
	/** Cart touches a track end after the interaction (or there was none). */
	atEnd(): boolean {
		return this.x1 <= EDGE * 0.5 || this.x2 + LC >= TRACK - EDGE * 0.5;
	}
}
