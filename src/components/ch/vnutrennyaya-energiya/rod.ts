/**
 * Heat conduction along a thin rod (the main model of the chapter).
 * The equation: ∂t/∂τ = a ∂²t/∂x² − β (t − t_air), a = k/(ρc) — thermal diffusivity,
 * β = 2h/(ρ c r) — cooling of the side surface by the air (h — heat-transfer coefficient, r — radius).
 * The heated end is held at T_HOT while the spirit lamp burns; otherwise it is insulated, like the far end.
 * Values are rounded handbook data: k in W/(m·K), ρ in kg/m³, c in J/(kg·°C).
 */
export type MatKey = 'cu' | 'al' | 'st' | 'gl' | 'wd';
export const MATS: Record<MatKey, { name: string; adj: string; k: number; rho: number; c: number }> = {
	cu: { name: 'Медь', adj: 'медном', k: 390, rho: 8900, c: 400 },
	al: { name: 'Алюминий', adj: 'алюминиевом', k: 220, rho: 2700, c: 920 },
	st: { name: 'Сталь', adj: 'стальном', k: 50, rho: 7800, c: 500 },
	gl: { name: 'Стекло', adj: 'стеклянном', k: 1, rho: 2500, c: 840 },
	wd: { name: 'Дерево', adj: 'деревянном', k: 0.2, rho: 700, c: 2400 },
};
export const MAT_KEYS = Object.keys(MATS) as MatKey[];

export const L = 0.3; // rod length, m
export const R = 0.003; // rod radius, m (diameter 6 mm)
export const H_AIR = 15; // heat-transfer coefficient to still air (convection + radiation), W/(m²·K)
export const T_AIR = 20; // °C
export const T_HOT = 200; // temperature of the end in the flame, °C
export const T_WAX = 60; // wax melts, °C
export const NAILS = [0.04, 0.08, 0.12, 0.16, 0.2, 0.24]; // m from the heated end
export const N = 120; // cells

export class Rod {
	T = new Float64Array(N).fill(T_AIR);
	private next = new Float64Array(N);
	a = 0;
	beta = 0;
	constructor(public mat: MatKey) {
		this.setMat(mat);
	}
	setMat(mat: MatKey) {
		this.mat = mat;
		const m = MATS[mat];
		this.a = m.k / (m.rho * m.c);
		this.beta = (2 * H_AIR) / (m.rho * m.c * R);
		this.T.fill(T_AIR);
	}
	/** Advances the model time by `span` seconds (explicit scheme, stable substeps). */
	step(span: number, heated: boolean) {
		const dx = L / N;
		const k = this.a / (dx * dx);
		const dtMax = Math.min(0.4 / k, 0.2 / this.beta);
		const n = Math.max(1, Math.ceil(span / dtMax));
		const dt = span / n;
		let T = this.T;
		let U = this.next;
		for (let s = 0; s < n; s++) {
			for (let i = 0; i < N; i++) {
				const l = i === 0 ? (heated ? 2 * T_HOT - T[0] : T[0]) : T[i - 1];
				const r = i === N - 1 ? T[i] : T[i + 1];
				U[i] = T[i] + dt * (k * (l - 2 * T[i] + r) - this.beta * (T[i] - T_AIR));
			}
			[T, U] = [U, T];
		}
		this.T = T;
		this.next = U;
	}
	/** Temperature at x metres from the heated end. */
	at(x: number, heated: boolean) {
		const dx = L / N;
		const u = x / dx - 0.5;
		if (u <= 0) {
			const t0 = heated ? T_HOT : this.T[0];
			return t0 + (this.T[0] - t0) * (x / (dx / 2));
		}
		const i = Math.min(N - 2, Math.floor(u));
		const f = Math.min(1, u - i);
		return this.T[i] + (this.T[i + 1] - this.T[i]) * f;
	}
	reset() {
		this.T.fill(T_AIR);
	}
}
