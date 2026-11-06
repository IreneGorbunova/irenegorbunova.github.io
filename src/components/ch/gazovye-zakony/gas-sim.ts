/**
 * Ideal gas in a box with a piston: the physics behind GasLab.
 *
 * The picture shows the projection of a three-dimensional gas onto the screen. Molecules are
 * points that do not interact, so their x and y motions are exactly the projections of the real
 * motion in a rectangular box; the hidden depth cancels out of the pressure.
 *
 * Units: lengths in px (1 px = 1 mm), time in model seconds. Molecular motion is slowed down
 * SLOW times. One dot stands for NU_DOT mol of nitrogen.
 */

export const R = 8.31; // Дж/(моль·К)
export const M = 0.028; // кг/моль, азот
export const NU_DOT = 0.001; // моль на одну точку
export const SLOW = 3000; // во сколько раз замедлено движение
export const PX_PER_M = 1000; // 1 px = 1 мм
export const W = 200; // ширина сосуда (по центрам молекул), px = 20 см
export const PX_PER_L = 100; // площадь поршня 1 дм², поэтому 1 л = 1 дм = 100 px высоты

export const T_MIN = 100;
export const T_MAX = 600;
export const V_MIN = 0.5;
export const V_MAX = 3;
export const N_MIN = 20;
export const N_MAX = 160;

const ACCOMMODATION = 0.35; // доля ударов о неподвижные стенки, после которых молекула «забывает» скорость
const THERMOSTAT_TAU = 0.25; // с
const PRESSURE_TAU = 2.5; // с, усреднение показаний датчика давления (молекул мало, удары случайны)

/** Standard deviation of one velocity component, px/s. */
export const sigma = (T: number) => (Math.sqrt((R * T) / M) * PX_PER_M) / SLOW;
/** m·σ²/T in model units (the mass of a dot is 1). */
const C = sigma(1) ** 2;

/** Pressure by the formula, Pa: p = νRT/V. */
export const pressure = (nu: number, T: number, V_L: number) => (nu * R * T) / (V_L * 1e-3);

const gauss = () => {
	let u = 0;
	while (u === 0) u = Math.random();
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
};
/** Normal velocity component of a molecule leaving a wall at temperature T (flux-weighted). */
const wallSpeed = (s: number) => s * Math.sqrt(-2 * Math.log(1 - Math.random()));

export type Hit = { x: number; y: number };

export class GasSim {
	cap = N_MAX + 20;
	n = 0;
	x = new Float64Array(this.cap);
	y = new Float64Array(this.cap);
	vx = new Float64Array(this.cap);
	vy = new Float64Array(this.cap);
	/** Height of the gas (box for the centres of the molecules), px. */
	h: number;
	/** Temperature of the walls and the thermostat, K. */
	T: number;
	/** Exponentially averaged momentum flux into all walls, model units. */
	flux = 0;
	/** Hits per model second, averaged. */
	hitRate = 0;
	/** Molecules still to be let out through the valve. */
	toRelease = 0;
	/** Molecules still to be pumped in through the valve. */
	toAdd = 0;
	private addClock = 0;
	/** Valve opening on the left wall: y range in px from the bottom. */
	readonly valve = { y0: 4, y1: 38 };

	constructor(n: number, T: number, V_L: number) {
		this.T = T;
		this.h = V_L * PX_PER_L;
		for (let i = 0; i < n; i++) this.spawn(Math.random() * W, Math.random() * this.h, false);
		// Start the pressure average at its equilibrium value; warmUp() then replaces it with real hits.
		this.flux = this.expectedFlux();
	}

	get nu() {
		return this.n * NU_DOT;
	}

	private spawn(x: number, y: number, fromValve: boolean) {
		if (this.n >= this.cap) return;
		const i = this.n++;
		const s = sigma(this.T);
		this.x[i] = x;
		this.y[i] = y;
		this.vx[i] = fromValve ? wallSpeed(s) : s * gauss();
		this.vy[i] = s * gauss();
	}

	private remove(i: number) {
		const j = --this.n;
		this.x[i] = this.x[j];
		this.y[i] = this.y[j];
		this.vx[i] = this.vx[j];
		this.vy[i] = this.vy[j];
	}

	/** Expected momentum flux into all four walls for the current state: 2NmσT²(1/W + 1/h). */
	expectedFlux() {
		return 2 * this.n * C * this.T * (1 / W + 1 / this.h);
	}

	/** Pressure measured by the hits, Pa. See the note at the top of the file. */
	measuredPressure() {
		return (this.flux * W * PX_PER_L * 1e3 * NU_DOT * R) / (C * 2 * (this.h + W));
	}

	/** Kinetic temperature of the gas, K (from the mean square speed in the picture). */
	gasTemperature() {
		if (this.n === 0) return this.T;
		let s = 0;
		for (let i = 0; i < this.n; i++) s += this.vx[i] ** 2 + this.vy[i] ** 2;
		return s / (2 * this.n * C);
	}

	/**
	 * Advance by dt (model seconds). The piston moves to height hNew during the step.
	 * Calls onHit(x, y) for every wall hit (for the flashes) and onEscape for every molecule let out.
	 */
	step(dt: number, hNew: number, onHit?: (x: number, y: number) => void, onEscape?: (y: number) => void) {
		const u = (hNew - this.h) / dt; // piston velocity, px/s (up is positive)
		this.h = hNew;
		const h = hNew;
		const s = sigma(this.T);
		let J = 0;
		let hits = 0;

		if (this.toAdd > 0) {
			this.addClock += dt;
			while (this.toAdd > 0 && this.addClock > 0.05) {
				this.addClock -= 0.05;
				this.toAdd--;
				const y = this.valve.y0 + Math.random() * (Math.min(this.valve.y1, h) - this.valve.y0);
				this.spawn(0.5, y, true);
			}
		}

		for (let i = 0; i < this.n; i++) {
			let x = this.x[i] + this.vx[i] * dt;
			let y = this.y[i] + this.vy[i] * dt;

			if (x < 0) {
				if (this.toRelease > 0 && y > this.valve.y0 && y < this.valve.y1) {
					this.toRelease--;
					onEscape?.(y);
					this.remove(i);
					i--;
					continue;
				}
				const vin = -this.vx[i];
				const vout = Math.random() < ACCOMMODATION ? wallSpeed(s) : vin;
				if (vout !== vin) this.vy[i] = s * gauss();
				this.vx[i] = vout;
				J += vin + vout;
				hits++;
				x = Math.min(-x, W);
				onHit?.(0, y);
			} else if (x > W) {
				const vin = this.vx[i];
				const vout = Math.random() < ACCOMMODATION ? wallSpeed(s) : vin;
				if (vout !== vin) this.vy[i] = s * gauss();
				this.vx[i] = -vout;
				J += vin + vout;
				hits++;
				x = Math.max(2 * W - x, 0);
				onHit?.(W, y);
			}

			if (y < 0) {
				const vin = -this.vy[i];
				const vout = Math.random() < ACCOMMODATION ? wallSpeed(s) : vin;
				if (vout !== vin) this.vx[i] = s * gauss();
				this.vy[i] = vout;
				J += vin + vout;
				hits++;
				y = Math.min(-y, h);
				onHit?.(x, 0);
			} else if (y > h) {
				// The piston is a smooth moving wall: in its frame the molecule bounces elastically.
				const rel = this.vy[i] - u;
				if (rel > 0) {
					this.vy[i] = 2 * u - this.vy[i];
					J += 2 * rel;
					hits++;
					onHit?.(x, h);
				}
				y = Math.max(2 * h - y, 0);
				if (y > h) y = h;
			}

			this.x[i] = x;
			this.y[i] = y;
		}

		// Thermostat: the walls keep the gas at temperature T (Berendsen rescaling).
		if (this.n > 0) {
			const Tg = this.gasTemperature();
			if (Tg > 0) {
				const lambda = Math.sqrt(Math.max(0.5, 1 + (dt / THERMOSTAT_TAU) * (this.T / Tg - 1)));
				for (let i = 0; i < this.n; i++) {
					this.vx[i] *= lambda;
					this.vy[i] *= lambda;
				}
			}
		}

		const a = 1 - Math.exp(-dt / PRESSURE_TAU);
		this.flux += (J / dt - this.flux) * a;
		this.hitRate += (hits / dt - this.hitRate) * a;
	}

	/** Run the model for t seconds without drawing, so that the pressure sensor shows real hits. */
	warmUp(t: number) {
		const dt = 1 / 60;
		for (let k = 0; k < t / dt; k++) this.step(dt, this.h);
	}

	/** Pump in k molecules through the valve (they enter one by one). */
	add(k: number) {
		this.toAdd = Math.min(this.toAdd + k, N_MAX - this.n);
	}

	/** Open the valve until k molecules have flown out. */
	release(k: number) {
		this.toRelease = Math.min(this.toRelease + k, Math.max(0, this.n - N_MIN));
	}
}
