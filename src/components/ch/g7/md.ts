/**
 * A small two-dimensional model of molecules for the grade 7 chapters: round particles that attract each other at
 * a distance and repel when they come close (the Lennard-Jones force), in a box with reflecting walls.
 * Units: the size of a molecule σ = 1, its mass = 1, the depth of the attraction ε = 1; the temperature is the mean
 * kinetic energy of a particle (so in these units the 2D model melts near 0,4 and boils away above about 0,5).
 * Motion: velocity Verlet steps. A thermostat gently pulls the temperature to the wanted value, as a heater or
 * a cooler in contact with the vessel would. Optional: gravity, a removable partition, particles of a larger size
 * and mass (a Brownian grain), a floor that attracts the molecules (wetting), walls that move inward from any side
 * (`top`, `left`, `right`, `bottom`) and a callback on every blow on a wall (`onHit`).
 */
export interface MDSetup {
	/** width and height of the box, in σ */
	w: number;
	h: number;
	/** downward acceleration, in ε/(mσ) */
	g?: number;
	/** the strength of the floor's attraction, in ε (0: the floor only repels) */
	floor?: number;
}

const RC = 2.5; // the force is cut off beyond 2,5 σ
const RC2 = RC * RC;

export class MD {
	n = 0;
	w: number;
	h: number;
	g: number;
	floor: number;
	x = new Float64Array(0);
	y = new Float64Array(0);
	vx = new Float64Array(0);
	vy = new Float64Array(0);
	fx = new Float64Array(0);
	fy = new Float64Array(0);
	/** how much larger than a molecule the particle is (added to the distance at which it touches others), σ */
	extra = new Float64Array(0);
	m = new Float64Array(0);
	kind = new Uint8Array(0);
	/** y of a lid that closes the box from above (0: the top of the box) */
	top = 0;
	/** the momentum the particles have given to the lid since it was last set to zero (for the pressure of a gas) */
	impulseTop = 0;
	/** the same for all four walls together (the lid included) */
	impulseWalls = 0;
	/** x of the left wall (0: the left edge of the box) */
	left = 0;
	/** x of the right wall and y of the bottom (null: the right edge and the bottom of the box) */
	right: number | null = null;
	bottom: number | null = null;
	/** called on every blow on a wall: wall 0 top, 1 right, 2 bottom, 3 left; (x, y) the point of the blow; dp the momentum given */
	onHit: ((wall: number, x: number, y: number, dp: number) => void) | null = null;
	/** x of a wall that particles cannot cross (null: no partition) */
	partition: number | null = null;
	/** the temperature the thermostat keeps; null: no thermostat */
	target: number | null = 1;
	/** how fast the thermostat acts: the smaller, the faster */
	tau = 0.4;
	time = 0;

	constructor(s: MDSetup) {
		this.w = s.w;
		this.h = s.h;
		this.g = s.g ?? 0;
		this.floor = s.floor ?? 0;
	}

	/** Replace all particles: positions, kinds; velocities random for the temperature T. */
	set(points: { x: number; y: number; kind?: number; extra?: number; m?: number }[], T: number, rnd: () => number = Math.random) {
		const n = (this.n = points.length);
		this.x = new Float64Array(n);
		this.y = new Float64Array(n);
		this.vx = new Float64Array(n);
		this.vy = new Float64Array(n);
		this.fx = new Float64Array(n);
		this.fy = new Float64Array(n);
		this.extra = new Float64Array(n);
		this.m = new Float64Array(n).fill(1);
		this.kind = new Uint8Array(n);
		points.forEach((p, i) => {
			this.x[i] = p.x;
			this.y[i] = p.y;
			this.kind[i] = p.kind ?? 0;
			this.extra[i] = p.extra ?? 0;
			this.m[i] = p.m ?? 1;
			// two independent normal components: mean kinetic energy T per particle
			const s = Math.sqrt(T / this.m[i]);
			const a = Math.sqrt(-2 * Math.log(1 - rnd())) * s;
			const b = 2 * Math.PI * rnd();
			this.vx[i] = a * Math.cos(b);
			this.vy[i] = a * Math.sin(b);
		});
		this.time = 0;
		this.forces();
	}

	/** Mean kinetic energy per particle: the temperature of the model. */
	temperature(): number {
		let k = 0;
		for (let i = 0; i < this.n; i++) k += this.m[i] * (this.vx[i] * this.vx[i] + this.vy[i] * this.vy[i]);
		return this.n ? k / (2 * this.n) : 0;
	}

	forces() {
		const { n, x, y, fx, fy, extra } = this;
		for (let i = 0; i < n; i++) {
			fx[i] = 0;
			fy[i] = this.g * this.m[i]; // screen coordinates: y grows downward
			if (this.floor > 0) {
				// a floor made of molecules: it repels at contact and attracts within a few σ (the 9-3 wall force);
				// z is the distance to the floor, the force is positive when it pushes away from the floor
				const z = Math.max(0.75, this.h - y[i]);
				const z2 = z * z;
				const z4 = z2 * z2;
				fy[i] -= this.floor * (1.2 / (z4 * z4 * z2) - 3 / z4);
			}
		}
		for (let i = 0; i < n - 1; i++) {
			const xi = x[i];
			const yi = y[i];
			const ei = extra[i];
			for (let j = i + 1; j < n; j++) {
				const dx = xi - x[j];
				const dy = yi - y[j];
				const d = ei + extra[j];
				if (d === 0) {
					const r2 = dx * dx + dy * dy;
					if (r2 > RC2) continue;
					const s2 = 1 / Math.max(r2, 0.64);
					const s6 = s2 * s2 * s2;
					const f = 24 * s6 * (2 * s6 - 1) * s2;
					fx[i] += f * dx;
					fy[i] += f * dy;
					fx[j] -= f * dx;
					fy[j] -= f * dy;
				} else {
					const r = Math.sqrt(dx * dx + dy * dy);
					const re = Math.max(r - d, 0.8);
					if (re > RC) continue;
					const s2 = 1 / (re * re);
					const s6 = s2 * s2 * s2;
					const f = (24 * s6 * (2 * s6 - 1)) / (re * Math.max(r, 1e-6));
					fx[i] += f * dx;
					fy[i] += f * dy;
					fx[j] -= f * dx;
					fy[j] -= f * dy;
				}
			}
		}
	}

	step(dt: number) {
		const { n, x, y, vx, vy, fx, fy, m, extra } = this;
		const L = this.left;
		const R = this.right ?? this.w;
		const TOP = this.top;
		const B = this.bottom ?? this.h;
		const hit = this.onHit;
		for (let i = 0; i < n; i++) {
			vx[i] += (0.5 * dt * fx[i]) / m[i];
			vy[i] += (0.5 * dt * fy[i]) / m[i];
			const x0 = x[i];
			x[i] += dt * vx[i];
			y[i] += dt * vy[i];
			const pad = 0.5 + extra[i];
			if (x[i] < L + pad) {
				x[i] = Math.min(R - pad, 2 * (L + pad) - x[i]);
				if (vx[i] < 0) {
					const dp = 2 * m[i] * -vx[i];
					this.impulseWalls += dp;
					if (hit) hit(3, L, y[i], dp);
				}
				vx[i] = Math.abs(vx[i]);
			} else if (x[i] > R - pad) {
				x[i] = Math.max(L + pad, 2 * (R - pad) - x[i]);
				if (vx[i] > 0) {
					const dp = 2 * m[i] * vx[i];
					this.impulseWalls += dp;
					if (hit) hit(1, R, y[i], dp);
				}
				vx[i] = -Math.abs(vx[i]);
			}
			if (y[i] < TOP + pad) {
				y[i] = Math.min(B - pad, 2 * (TOP + pad) - y[i]);
				if (vy[i] < 0) {
					const dp = 2 * m[i] * -vy[i];
					this.impulseTop += dp;
					this.impulseWalls += dp;
					if (hit) hit(0, x[i], TOP, dp);
				}
				vy[i] = Math.abs(vy[i]);
			} else if (y[i] > B - pad) {
				y[i] = 2 * (B - pad) - y[i];
				if (vy[i] > 0) {
					const dp = 2 * m[i] * vy[i];
					this.impulseWalls += dp;
					if (hit) hit(2, x[i], B, dp);
				}
				vy[i] = -Math.abs(vy[i]);
			}
			const p = this.partition;
			if (p !== null) {
				if (x0 < p && x[i] > p - pad) {
					x[i] = 2 * (p - pad) - x[i];
					vx[i] = -Math.abs(vx[i]);
				} else if (x0 >= p && x[i] < p + pad) {
					x[i] = 2 * (p + pad) - x[i];
					vx[i] = Math.abs(vx[i]);
				}
			}
		}
		this.forces();
		for (let i = 0; i < n; i++) {
			vx[i] += (0.5 * dt * fx[i]) / m[i];
			vy[i] += (0.5 * dt * fy[i]) / m[i];
		}
		if (this.target !== null) {
			const T = this.temperature();
			if (T > 1e-9) {
				const k = Math.sqrt(Math.max(0.25, Math.min(4, 1 + (dt / this.tau) * (this.target / T - 1))));
				for (let i = 0; i < n; i++) {
					vx[i] *= k;
					vy[i] *= k;
				}
			}
		}
		this.time += dt;
	}

	/** Advance by several steps (one animation frame). */
	run(steps: number, dt = 0.006) {
		for (let s = 0; s < steps; s++) this.step(dt);
	}
}

/** Points of a triangular lattice with the spacing `a` inside a rectangle. */
export const lattice = (x0: number, y0: number, x1: number, y1: number, a: number): { x: number; y: number }[] => {
	const out: { x: number; y: number }[] = [];
	const dy = (a * Math.sqrt(3)) / 2;
	let row = 0;
	for (let y = y1 - 0.5; y >= y0 + 0.5; y -= dy, row++) for (let x = x0 + 0.5 + (row % 2 ? a / 2 : 0); x <= x1 - 0.5; x += a) out.push({ x, y });
	return out;
};

/** Reads the colors of the page's theme for a canvas. */
export const themeColors = (el: Element, names: Record<string, string>): Record<string, string> => {
	const cs = getComputedStyle(el);
	const out: Record<string, string> = {};
	// colors given through color-mix() are resolved by painting them on a hidden element
	const probe = document.createElement('span');
	probe.style.display = 'none';
	el.append(probe);
	for (const [key, v] of Object.entries(names)) {
		probe.style.color = v.startsWith('--') ? cs.getPropertyValue(v).trim() || 'gray' : v;
		out[key] = getComputedStyle(probe).color;
	}
	probe.remove();
	return out;
};

/** Paints the particles on a canvas: `px` pixels per σ; `fill(i)` gives the color of particle i. */
export const paint = (ctx: CanvasRenderingContext2D, md: MD, px: number, fill: (i: number) => string, stroke?: string) => {
	for (let i = 0; i < md.n; i++) {
		ctx.beginPath();
		ctx.arc(md.x[i] * px, md.y[i] * px, (0.5 + md.extra[i]) * px * 0.94, 0, Math.PI * 2);
		ctx.fillStyle = fill(i);
		ctx.fill();
		if (stroke) {
			ctx.strokeStyle = stroke;
			ctx.lineWidth = px * 0.06;
			ctx.stroke();
		}
	}
};
