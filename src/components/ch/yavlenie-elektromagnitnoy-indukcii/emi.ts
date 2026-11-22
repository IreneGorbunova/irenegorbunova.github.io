/**
 * Shared physics and drawing of «Электромагнитная индукция» (grade 9): a bar magnet, a coil and a zero-center
 * galvanometer. Used both at build time (field lines) and in the browser (flux, current, needle).
 *
 * The magnet is a school bar magnet 10 см long, 2 см thick, modeled by two magnetic "charges" (poles) 8,5 см apart,
 * each sending out a total magnetic flux Φ0 = 5·10⁻⁵ Вб (B ≈ 0,1–0,2 Тл near a pole face). The flux of one pole through
 * a turn of radius a at a distance d along the axis is ±(Φ0/2)(1 − |d|/√(d² + a²)); while the turn is around the
 * magnet itself the flux inside the magnet, +Φ0, is added, so the flux stays continuous when a pole passes a turn.
 * The coil: 1000 turns, 8 см long, radius 2,5 см (the pictures draw about ten turns), the circuit with the
 * galvanometer 50 Ом. Ψ is summed over 40 turns standing for the 1000; the EMF is −dΨ/dt and the current I = EMF/R.
 * At 0,25 м/с the magnet entering the coil gives about 0,12 В and 2,5 мА (checked in python).
 *
 * Sign convention (x to the right, y up, z toward the viewer): Ψ > 0 when the field inside the coil points to +x.
 * The current I > 0 when it flows UP in the front halves of the turns (the halves nearer the viewer); such a current
 * makes a field toward −x inside the coil (its left end is a north pole). The EMF that drives such a current is
 * +dΨ/dt (the law −dΨ/dt written for the opposite way round), so I = (dΨ/dt)/R. Lenz: the N pole approaching from
 * the left raises Ψ, I > 0, and the left end of the coil repels the magnet.
 */

export const PHI0 = 5e-5; // Вб, total flux of one pole
export const MAG_L = 0.1; // м, length of the magnet
export const MAG_W = 0.02; // м, thickness of the magnet
export const POLE_D = 0.085; // м, distance between the model poles
export const COIL_L = 0.08; // м
export const COIL_A = 0.025; // м, radius of the turns
export const TURNS = 1000;
export const R_OHM = 50;

const K = 40;
const XT = Array.from({ length: K }, (_, i) => -COIL_L / 2 + (COIL_L * i) / (K - 1));

const pole = (x: number, xp: number, q: number, a: number) => {
	const d = x - xp;
	if (Math.abs(d) < 1e-9) return 0;
	return ((q * PHI0) / 2) * Math.sign(d) * (1 - Math.abs(d) / Math.hypot(d, a));
};

/**
 * Flux linkage Ψ (Вб) of the coil (center at x = 0) for the magnet centered at xc (м), with its N pole toward +x when
 * `nRight` is true. `turns` scales the result (the coil of the pictures has TURNS).
 */
export const linkage = (xc: number, nRight = true, turns = TURNS, a = COIL_A) => {
	const s = nRight ? 1 : -1;
	const xN = xc + (s * POLE_D) / 2;
	const xS = xc - (s * POLE_D) / 2;
	const lo = Math.min(xN, xS);
	const hi = Math.max(xN, xS);
	let tot = 0;
	for (const x of XT) {
		tot += pole(x, xN, 1, a) + pole(x, xS, -1, a);
		if (x > lo && x < hi) tot += s * PHI0;
	}
	return (turns * tot) / K;
};

/**
 * A galvanometer needle: a damped oscillator θ'' = ω²(u − θ) − 2ζωθ' following the input u (in divisions), stopped at
 * ±`stop`. Steps of 2 ms. Default: period 0,4 с, ζ = 0,7 (a well damped demonstration galvanometer).
 */
export const needle = (period = 0.4, zeta = 0.7, stop = 5.5) => {
	const w = (2 * Math.PI) / period;
	let th = 0;
	let om = 0;
	return {
		step(target: number, dt: number) {
			let left = dt;
			while (left > 1e-9) {
				const h = Math.min(0.002, left);
				om += (w * w * (target - th) - 2 * zeta * w * om) * h;
				th += om * h;
				if (th > stop) {
					th = stop;
					om = Math.min(0, om);
				}
				if (th < -stop) {
					th = -stop;
					om = Math.max(0, om);
				}
				left -= h;
			}
			return th;
		},
		reset() {
			th = 0;
			om = 0;
		},
		get value() {
			return th;
		},
	};
};

/**
 * Field lines of the magnet in its own frame (м; the magnet's center at the origin, N toward +x), in the plane through
 * its axis: lines traced from the N pole at the given starting angles (rad from +x) until they reach the S pole or
 * leave the box |x| < bx, |y| < by. Returns polylines in meters.
 */
export const fieldLines = (angles: number[], bx: number, by: number): [number, number][][] => {
	const xN = POLE_D / 2;
	const xS = -POLE_D / 2;
	const B = (x: number, y: number): [number, number] => {
		const dxn = x - xN;
		const dxs = x - xS;
		const rn = Math.hypot(dxn, y) ** 3;
		const rs = Math.hypot(dxs, y) ** 3;
		return [dxn / rn - dxs / rs, y / rn - y / rs];
	};
	const out: [number, number][][] = [];
	for (const a0 of angles) {
		let x = xN + 0.004 * Math.cos(a0);
		let y = 0.004 * Math.sin(a0);
		const pts: [number, number][] = [[xN, 0]];
		for (let k = 0; k < 4000; k++) {
			pts.push([x, y]);
			const h = 0.0012;
			const [b1x, b1y] = B(x, y);
			const l1 = Math.hypot(b1x, b1y);
			const mx = x + (h / 2) * (b1x / l1);
			const my = y + (h / 2) * (b1y / l1);
			const [b2x, b2y] = B(mx, my);
			const l2 = Math.hypot(b2x, b2y);
			x += h * (b2x / l2);
			y += h * (b2y / l2);
			if (Math.hypot(x - xS, y) < 0.004) {
				pts.push([xS, 0]);
				break;
			}
			if (Math.abs(x) > bx || Math.abs(y) > by) {
				pts.push([x, y]);
				break;
			}
		}
		out.push(pts);
	}
	return out;
};

/** A polyline (in meters, y up) as an SVG path at `s` px per meter around the origin (screen y down). */
export const toPath = (pts: [number, number][], s: number, ox = 0, oy = 0, every = 3) =>
	pts
		.filter((_, i) => i % every === 0 || i === pts.length - 1)
		.map(([x, y], i) => `${i ? 'L' : 'M'}${(ox + x * s).toFixed(1)} ${(oy - y * s).toFixed(1)}`)
		.join(' ');

/**
 * A coil seen obliquely from the front-left: the axis along x, a turn of radius r drawn as an ellipse of half-width
 * k·r (the depth z shifts a point by −k·z on screen, so the front halves are the left halves of the ellipses).
 * Returns the paths of the back halves and of the front halves (a helix: the front half of turn i goes from the
 * bottom at x_i up to the top at x_i + p/2, the back half on down to the bottom at x_i + p), with the screen midpoint
 * of every front half (for current arrows). Screen coordinates: center (cx, cy), length L px, n turns.
 */
export const coilPaths = (cx: number, cy: number, L: number, r: number, n: number, k = 0.32, arrowAt = 0.72) => {
	const p = L / n;
	const x0 = cx - L / 2;
	const back: string[] = [];
	const front: string[] = [];
	const mids: { x: number; y: number; dx: number; dy: number }[] = [];
	const pt = (xa: number, phi: number) => {
		// phi = 0 at the bottom, π at the top, through the front (z > 0) for 0 < phi < π
		const y = -r * Math.cos(phi);
		const z = r * Math.sin(phi);
		return { x: xa - k * z, y: cy - y };
	};
	for (let i = 0; i < n; i++) {
		const xi = x0 + i * p;
		let f = '';
		let b = '';
		for (let j = 0; j <= 16; j++) {
			const t = j / 16;
			const q = pt(xi + (p / 2) * t, Math.PI * t);
			f += `${j ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
			const w = pt(xi + p / 2 + (p / 2) * t, Math.PI + Math.PI * t);
			b += `${j ? 'L' : 'M'}${w.x.toFixed(1)} ${w.y.toFixed(1)}`;
		}
		front.push(f);
		back.push(b);
		// a point of the front half at arrowAt·π (0,72: upper front, clear of a magnet inside; 0,5: mid-height of the
		// front strand) and the tangent there, in the direction bottom → top (the direction of a positive current)
		const ph = arrowAt * Math.PI;
		const m = pt(xi + (p / 2) * arrowAt, ph);
		mids.push({ ...m, dx: p / 2 / Math.PI - k * r * Math.cos(ph), dy: -r * Math.sin(ph) });
	}
	return { front, back, mids, x0, x1: x0 + L, bottom: cy + r, top: cy - r };
};

/** An arrowhead at (x, y) pointing along (dx, dy), length s. */
export const arrowHead = (x: number, y: number, dx: number, dy: number, s: number) => {
	const l = Math.hypot(dx, dy) || 1;
	const ux = dx / l;
	const uy = dy / l;
	const bx = x - ux * s;
	const by = y - uy * s;
	const w = s * 0.5;
	return `M${x.toFixed(1)} ${y.toFixed(1)} L${(bx - uy * w).toFixed(1)} ${(by + ux * w).toFixed(1)} L${(bx + uy * w).toFixed(1)} ${(by - ux * w).toFixed(1)} Z`;
};

// ---- client-side drawing helpers (SVG built in the browser)
const SVGNS = 'http://www.w3.org/2000/svg';
export const svgEl = <K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number> = {}, text?: string) => {
	const e = document.createElementNS(SVGNS, tag) as SVGElementTagNameMap[K];
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
	if (text !== undefined) e.textContent = text;
	parent.append(e);
	return e;
};

/**
 * A demonstration galvanometer with the zero in the middle: a case, a light dial with −5 … +5 divisions over ±50°,
 * a dark needle and two terminals on top (returned, for the leads). `set(div)` turns the needle to `div` divisions
 * (clamped by the stops at ±5,5). `r` is the dial radius in px.
 */
export const galvanometer = (parent: Element, cx: number, cy: number, r: number) => {
	const g = svgEl(parent, 'g', { class: 'emi-galv' });
	const w = 2.7 * r;
	const h = 1.55 * r;
	const top = cy - 1.18 * r;
	svgEl(g, 'rect', { class: 'emi-galv__case', x: cx - w / 2, y: top, width: w, height: h, rx: 0.16 * r });
	svgEl(g, 'path', { class: 'emi-galv__face', d: `M${cx - 1.12 * r} ${cy - 0.05 * r} A${1.15 * r} ${1.15 * r} 0 0 1 ${cx + 1.12 * r} ${cy - 0.05 * r} Z` });
	const P = (deg: number, rr: number) => {
		const a = (deg * Math.PI) / 180;
		return `${(cx + rr * Math.sin(a)).toFixed(1)} ${(cy - rr * Math.cos(a)).toFixed(1)}`;
	};
	for (let k = -5; k <= 5; k++) {
		const deg = k * 10;
		svgEl(g, 'path', { class: 'emi-galv__tick', d: `M${P(deg, r)} L${P(deg, r - (k % 5 === 0 ? 0.2 : 0.12) * r)}` });
		if (k % 5 === 0) svgEl(g, 'text', { class: 'emi-galv__num', x: P(deg, 0.68 * r).split(' ')[0], y: (+P(deg, 0.68 * r).split(' ')[1] + 0.12 * r).toFixed(1), 'text-anchor': 'middle', 'font-size': (0.26 * r).toFixed(1) }, String(Math.abs(k)));
	}
	const needle = svgEl(g, 'path', { class: 'emi-galv__needle', d: `M${cx} ${cy + 0.06 * r} L${cx} ${cy - 0.95 * r}` });
	svgEl(g, 'circle', { class: 'emi-galv__pivot', cx, cy, r: 0.08 * r });
	const tl = { x: cx - 0.95 * r, y: top };
	const tr = { x: cx + 0.95 * r, y: top };
	for (const t of [tl, tr]) svgEl(g, 'circle', { class: 'emi-galv__term', cx: t.x, cy: t.y, r: Math.max(2, 0.08 * r) });
	return {
		terminals: [tl, tr] as const,
		set(div: number) {
			const d = Math.max(-5.5, Math.min(5.5, div));
			needle.setAttribute('transform', `rotate(${(d * 10).toFixed(2)} ${cx} ${cy})`);
		},
	};
};
