/**
 * Physics of the puck model «Столкновения на плоскости» (no DOM here, so it can be checked with plain node).
 *
 * Top view of a smooth horizontal ice field. Two uniform discs (pucks) slide without friction;
 * gravity and the normal force cancel, so between events every puck moves uniformly in a straight line.
 * Events are instantaneous and analytic:
 *  - elastic: smooth pucks, the impulse acts along the line of centres at contact
 *    (no tangential force, so no spin), kinetic energy is conserved;
 *  - inelastic: the pucks stick (Velcro) and move on as one rigid body: its centre of mass moves with
 *    V = (m1·v1 + m2·v2)/(m1 + m2), and the pair spins with ω = L/I (angular momentum about the
 *    centre of mass is conserved too);
 *  - burst: two pucks held together by a latch with a compressed spring between them slide as one
 *    body; at t = TS the latch opens and the spring pushes the pucks apart along the line of centres.
 * Coordinates: metres, x to the right, y up; velocities in m/s; momenta in kg·m/s.
 */

export type Mode = 'elastic' | 'inelastic' | 'burst';
export interface V2 {
	x: number;
	y: number;
}

export const FW = 2.4; // field width, m
export const FH = 1.5; // field height, m
export const VMAX = 1.5; // largest speed a puck can be given (collisions), m/s
export const VPAIR = 0.6; // largest speed of the pair before it bursts, m/s
export const UMAX = 2; // largest speed of a piece after the burst, m/s
export const PMAX = 4.5; // largest momentum of one piece after the burst, kg·m/s
export const TS = 1.2; // moment the latch opens (burst), s
export const KM = 0.25; // a momentum arrow of 1 kg·m/s is drawn as long as 0,25 m of the field
export const MARGIN = 0.02; // pucks are kept this far from the edge of the field when placed, m

/** Radius of a puck of mass m (all pucks have the same thickness and material): 1 kg → 0,1 m. */
export const radius = (m: number) => 0.1 * Math.sqrt(m);

export const add = (a: V2, b: V2): V2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: V2, k: number): V2 => ({ x: a.x * k, y: a.y * k });
export const dot = (a: V2, b: V2) => a.x * b.x + a.y * b.y;
export const cross = (a: V2, b: V2) => a.x * b.y - a.y * b.x;
export const len = (a: V2) => Math.hypot(a.x, a.y);
export const rot = (a: V2, phi: number): V2 => ({
	x: a.x * Math.cos(phi) - a.y * Math.sin(phi),
	y: a.x * Math.sin(phi) + a.y * Math.cos(phi),
});
export const unit = (a: V2, fallback: V2 = { x: 1, y: 0 }): V2 => {
	const l = len(a);
	return l > 1e-12 ? mul(a, 1 / l) : fallback;
};

/** Everything the pupil sets. Collision modes use r1, r2, v1, v2; the burst uses s0, V and u1. */
export interface Setup {
	mode: Mode;
	m1: number;
	m2: number;
	r1: V2; // start of puck 1 (centre), m
	r2: V2; // start of puck 2
	v1: V2; // velocity of puck 1, m/s
	v2: V2; // velocity of puck 2
	s0: V2; // burst: start of the centre of mass of the pair
	V: V2; // burst: velocity of the pair before the latch opens
	u1: V2; // burst: velocity of piece 1 after it
}

/** Velocity of piece 2 after the burst, from the conservation of momentum. */
export const burstU2 = (m1: number, m2: number, V: V2, u1: V2): V2 =>
	mul(sub(mul(V, m1 + m2), mul(u1, m1)), 1 / m2);

/** Does the planned burst keep both pieces within the speed and momentum limits? */
export function burstOk(m1: number, m2: number, V: V2, u1: V2) {
	const u2 = burstU2(m1, m2, V, u1);
	return len(u1) <= UMAX + 1e-9 && len(u2) <= UMAX + 1e-9 && m1 * len(u1) <= PMAX + 1e-9 && m2 * len(u2) <= PMAX + 1e-9;
}

/** Moves u1 from the wanted value back towards V (always allowed: then nothing changes) until it is allowed. */
export function clampBurst(m1: number, m2: number, V: V2, want: V2): V2 {
	if (burstOk(m1, m2, V, want)) return want;
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 40; i++) {
		const k = (lo + hi) / 2;
		if (burstOk(m1, m2, V, add(V, mul(sub(want, V), k)))) lo = k;
		else hi = k;
	}
	return add(V, mul(sub(want, V), lo));
}

/** Positions of the two pieces of the pair (touching, along the direction of u1 − u2) around its centre of mass. */
export function pairLayout(m1: number, m2: number, c: V2, n: V2): [V2, V2] {
	const M = m1 + m2;
	const d = radius(m1) + radius(m2);
	return [add(c, mul(n, (d * m2) / M)), sub(c, mul(n, (d * m1) / M))];
}

/** The state at one moment. */
export interface State {
	pos: [V2, V2]; // centres of the pucks
	vel: [V2, V2]; // velocities of the centres
	spin: number; // rotation angle of the stuck pair (rad), 0 otherwise
	after: boolean; // the event (impact / burst) has happened
	joined: boolean; // the pucks move as one body (stuck, or the pair before the burst)
}

export interface Plan {
	setup: Setup;
	hit: boolean; // the event happens (for collisions: the pucks touch before one reaches the edge)
	tEvent: number; // moment of the impact / burst (Infinity if none)
	tEnd: number; // the run stops: a puck reaches the edge of the field
	before: [V2, V2]; // momenta of the pucks before the event
	afterP: [V2, V2]; // momenta right after it (stuck: the momentum of each puck, if it moved with V)
	sum: V2; // total momentum (the same before and after)
	V: V2; // stuck: velocity of the centre of mass
	omega: number; // stuck: angular velocity, rad/s (counter-clockwise > 0)
	n: V2; // line of centres at the event, from puck 1 to puck 2 (burst: from piece 2 to piece 1)
	contact: [V2, V2]; // centres at the event
	ekBefore: number; // kinetic energy, J
	ekAfter: number; // kinetic energy right after the event (stuck: with the energy of rotation)
	ekSpin: number; // stuck: the part of ekAfter that is rotation, J
	state: (t: number) => State;
}

/** First moment when a puck moving linearly from p with velocity v touches the edge of the field. */
function edgeTime(p: V2, v: V2, r: number): number {
	let t = Infinity;
	if (v.x > 1e-12) t = Math.min(t, (FW - r - p.x) / v.x);
	if (v.x < -1e-12) t = Math.min(t, (p.x - r) / -v.x);
	if (v.y > 1e-12) t = Math.min(t, (FH - r - p.y) / v.y);
	if (v.y < -1e-12) t = Math.min(t, (p.y - r) / -v.y);
	return Math.max(0, t);
}

/** Moment the pucks touch (|Δr| = r1 + r2 while approaching), or Infinity. */
export function contactTime(r1: V2, v1: V2, r2: V2, v2: V2, R: number): number {
	const d = sub(r2, r1);
	const w = sub(v2, v1);
	const a = dot(w, w);
	const b = 2 * dot(d, w);
	const c = dot(d, d) - R * R;
	if (a < 1e-14 || b >= 0) return Infinity; // not approaching
	const D = b * b - 4 * a * c;
	if (D < 0) return Infinity; // they pass each other
	return Math.max(0, (-b - Math.sqrt(D)) / (2 * a));
}

const outside = (p: V2, r: number) => p.x < r - 1e-9 || p.x > FW - r + 1e-9 || p.y < r - 1e-9 || p.y > FH - r + 1e-9;

export function plan(s: Setup): Plan {
	const { m1, m2 } = s;
	const M = m1 + m2;
	const rad: [number, number] = [radius(m1), radius(m2)];
	const T_MAX = 30;

	if (s.mode === 'burst') {
		const u1 = s.u1;
		const u2 = burstU2(m1, m2, s.V, u1);
		const n = unit(sub(u1, u2));
		const [a0, b0] = pairLayout(m1, m2, s.s0, n);
		// the pair moves as one body until TS (or until it reaches the edge)
		const tPair = Math.min(edgeTime(a0, s.V, rad[0]), edgeTime(b0, s.V, rad[1]));
		const hit = tPair >= TS;
		const tEvent = hit ? TS : Infinity;
		const c = add(s.s0, mul(s.V, hit ? TS : 0));
		const [a1, b1] = pairLayout(m1, m2, c, n);
		const tEnd = hit ? TS + Math.min(edgeTime(a1, u1, rad[0]), edgeTime(b1, u2, rad[1])) : Math.min(tPair, T_MAX);
		const state = (t: number): State => {
			if (!hit || t < TS) {
				const [p, q] = pairLayout(m1, m2, add(s.s0, mul(s.V, t)), n);
				return { pos: [p, q], vel: [s.V, s.V], spin: 0, after: false, joined: true };
			}
			const dt = t - TS;
			return { pos: [add(a1, mul(u1, dt)), add(b1, mul(u2, dt))], vel: [u1, u2], spin: 0, after: true, joined: false };
		};
		const ekB = (M * dot(s.V, s.V)) / 2;
		return {
			setup: s,
			hit,
			tEvent,
			tEnd: Math.min(tEnd, T_MAX),
			before: [mul(s.V, m1), mul(s.V, m2)],
			afterP: hit ? [mul(u1, m1), mul(u2, m2)] : [mul(s.V, m1), mul(s.V, m2)],
			sum: mul(s.V, M),
			V: s.V,
			omega: 0,
			n,
			contact: [a1, b1],
			ekBefore: ekB,
			ekAfter: hit ? (m1 * dot(u1, u1) + m2 * dot(u2, u2)) / 2 : ekB,
			ekSpin: 0,
			state,
		};
	}

	const { r1, r2, v1, v2 } = s;
	const R = rad[0] + rad[1];
	const tFree = Math.min(edgeTime(r1, v1, rad[0]), edgeTime(r2, v2, rad[1]));
	const tc = contactTime(r1, v1, r2, v2, R);
	const hit = tc <= tFree;
	const before: [V2, V2] = [mul(v1, m1), mul(v2, m2)];
	const sum = add(before[0], before[1]);
	const V = mul(sum, 1 / M);
	const ekBefore = (m1 * dot(v1, v1) + m2 * dot(v2, v2)) / 2;
	const linear = (t: number): State => ({
		pos: [add(r1, mul(v1, t)), add(r2, mul(v2, t))],
		vel: [v1, v2],
		spin: 0,
		after: false,
		joined: false,
	});
	if (!hit) {
		return {
			setup: s, hit, tEvent: Infinity, tEnd: Math.min(tFree, T_MAX), before, afterP: before, sum, V, omega: 0,
			n: unit(sub(r2, r1)), contact: [r1, r2], ekBefore, ekAfter: ekBefore, ekSpin: 0, state: linear,
		};
	}
	const c1 = add(r1, mul(v1, tc));
	const c2 = add(r2, mul(v2, tc));
	const n = unit(sub(c2, c1));

	if (s.mode === 'elastic') {
		const mu = (m1 * m2) / M;
		const J = 2 * mu * dot(sub(v1, v2), n); // impulse on puck 2 along n
		const u1 = sub(v1, mul(n, J / m1));
		const u2 = add(v2, mul(n, J / m2));
		const tEnd = tc + Math.min(edgeTime(c1, u1, rad[0]), edgeTime(c2, u2, rad[1]));
		const state = (t: number): State => {
			if (t < tc) return linear(t);
			const dt = t - tc;
			return { pos: [add(c1, mul(u1, dt)), add(c2, mul(u2, dt))], vel: [u1, u2], spin: 0, after: true, joined: false };
		};
		return {
			setup: s, hit, tEvent: tc, tEnd: Math.min(tEnd, T_MAX), before, afterP: [mul(u1, m1), mul(u2, m2)], sum, V,
			omega: 0, n, contact: [c1, c2], ekBefore, ekAfter: (m1 * dot(u1, u1) + m2 * dot(u2, u2)) / 2, ekSpin: 0, state,
		};
	}

	// perfectly inelastic: one rigid body from now on
	const C = mul(add(mul(c1, m1), mul(c2, m2)), 1 / M);
	const d1 = sub(c1, C);
	const d2 = sub(c2, C);
	const L = m1 * cross(d1, sub(v1, V)) + m2 * cross(d2, sub(v2, V));
	const I = m1 * dot(d1, d1) + m2 * dot(d2, d2) + (m1 * rad[0] ** 2 + m2 * rad[1] ** 2) / 2;
	const omega = L / I;
	const state = (t: number): State => {
		if (t < tc) return linear(t);
		const dt = t - tc;
		const phi = omega * dt;
		const c = add(C, mul(V, dt));
		const e1 = rot(d1, phi);
		const e2 = rot(d2, phi);
		// velocity of a point of a rotating body: V + ω × r
		const w = (e: V2): V2 => add(V, { x: -omega * e.y, y: omega * e.x });
		return { pos: [add(c, e1), add(c, e2)], vel: [w(e1), w(e2)], spin: phi, after: true, joined: true };
	};
	// the stuck pair stops when one of its pucks touches the edge: step, then refine by bisection
	let tEnd = T_MAX;
	const out = (t: number) => {
		const st = state(t);
		return outside(st.pos[0], rad[0]) || outside(st.pos[1], rad[1]);
	};
	for (let t = tc; t < T_MAX; t += 0.005) {
		if (out(t)) {
			let lo = Math.max(tc, t - 0.005);
			let hi = t;
			for (let i = 0; i < 40; i++) {
				const mid = (lo + hi) / 2;
				if (out(mid)) hi = mid;
				else lo = mid;
			}
			tEnd = lo;
			break;
		}
	}
	const ekSpin = (I * omega * omega) / 2;
	return {
		setup: s, hit, tEvent: tc, tEnd, before, afterP: [mul(V, m1), mul(V, m2)], sum, V, omega, n, contact: [c1, c2],
		ekBefore, ekAfter: (M * dot(V, V)) / 2 + ekSpin, ekSpin, state,
	};
}

/** Angle between two vectors, degrees (0…180). */
export const angleDeg = (a: V2, b: V2) =>
	(Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (len(a) * len(b) || 1)))) * 180) / Math.PI;

/**
 * An arrow from (x0, y0) to (x1, y1) as one filled path (screen coordinates): shaft of thickness t,
 * head of length hl and width hw. Returns '' when the arrow is too short to draw.
 */
export function arrowPath(x0: number, y0: number, x1: number, y1: number, t = 3.4, hl = 11, hw = 11): string {
	const dx = x1 - x0;
	const dy = y1 - y0;
	const L = Math.hypot(dx, dy);
	if (L < 1.5) return '';
	const ux = dx / L;
	const uy = dy / L;
	const nx = -uy;
	const ny = ux;
	const h = Math.min(hl, L * 0.7);
	const w = Math.max(t, Math.min(hw, hw * (h / hl) + 2));
	const bx = x1 - ux * h;
	const by = y1 - uy * h;
	const P = (x: number, y: number) => `${x.toFixed(2)},${y.toFixed(2)}`;
	return (
		`M${P(x0 + (nx * t) / 2, y0 + (ny * t) / 2)} L${P(bx + (nx * t) / 2, by + (ny * t) / 2)} ` +
		`L${P(bx + (nx * w) / 2, by + (ny * w) / 2)} L${P(x1, y1)} L${P(bx - (nx * w) / 2, by - (ny * w) / 2)} ` +
		`L${P(bx - (nx * t) / 2, by - (ny * t) / 2)} L${P(x0 - (nx * t) / 2, y0 - (ny * t) / 2)} Z`
	);
}
