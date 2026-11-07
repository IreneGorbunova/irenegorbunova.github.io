/**
 * Physics and formatting shared by the melting models.
 * Table values (rounded) as in А. В. Пёрышкин, «Физика. 8 класс». For naphthalene, which is not in the
 * textbook's table of specific heats, rounded reference values are used.
 */
import katex from 'katex';

export type SubstanceId = 'ice' | 'naph' | 'tin' | 'lead';

export interface Substance {
	id: SubstanceId;
	/** Button label. */
	label: string;
	/** Names of the solid and the liquid, nominative and genitive. */
	solid: string;
	solidGen: string;
	liquid: string;
	liquidGen: string;
	/** Melting point, °C. */
	tm: number;
	/** Specific heat of fusion, J/kg. */
	lambda: number;
	/** λ for TeX, as in the table. */
	lambdaTex: string;
	/** Specific heat of the solid and of the liquid, J/(kg·°C). */
	cs: number;
	cl: number;
	/** Start and end temperatures of the experiment, °C. */
	t0: number;
	tEnd: number;
	/** Volume of the liquid / volume of the same mass of solid (only for the picture). */
	expand: number;
	/** Does the solid float in its own liquid? */
	floats: boolean;
}

export const SUBSTANCES: Record<SubstanceId, Substance> = {
	ice: {
		id: 'ice',
		label: 'Лёд',
		solid: 'лёд',
		solidGen: 'льда',
		liquid: 'вода',
		liquidGen: 'воды',
		tm: 0,
		lambda: 3.4e5,
		lambdaTex: '3{,}4\\cdot 10^5',
		cs: 2100,
		cl: 4200,
		t0: -20,
		tEnd: 40,
		expand: 0.92,
		floats: true,
	},
	naph: {
		id: 'naph',
		label: 'Нафталин',
		solid: 'нафталин',
		solidGen: 'нафталина',
		liquid: 'жидкий нафталин',
		liquidGen: 'жидкого нафталина',
		tm: 80,
		lambda: 1.5e5,
		lambdaTex: '1{,}5\\cdot 10^5',
		cs: 1300,
		cl: 1700,
		t0: 20,
		tEnd: 120,
		expand: 1.17,
		floats: false,
	},
	tin: {
		id: 'tin',
		label: 'Олово',
		solid: 'олово',
		solidGen: 'олова',
		liquid: 'жидкое олово',
		liquidGen: 'жидкого олова',
		tm: 232,
		lambda: 0.59e5,
		lambdaTex: '0{,}59\\cdot 10^5',
		cs: 230,
		cl: 230,
		t0: 20,
		tEnd: 300,
		expand: 1.05,
		floats: false,
	},
	lead: {
		id: 'lead',
		label: 'Свинец',
		solid: 'свинец',
		solidGen: 'свинца',
		liquid: 'жидкий свинец',
		liquidGen: 'жидкого свинца',
		tm: 327,
		lambda: 0.25e5,
		lambdaTex: '0{,}25\\cdot 10^5',
		cs: 140,
		cl: 140,
		t0: 20,
		tEnd: 400,
		expand: 1.06,
		floats: false,
	},
};

/** Energies (J) that mark the ends of the three stages, counted from the start state. */
export const stages = (s: Substance, m: number) => {
	const e1 = s.cs * m * (s.tm - s.t0);
	const e2 = e1 + s.lambda * m;
	const e3 = e2 + s.cl * m * (s.tEnd - s.tm);
	return { e1, e2, e3 };
};

/** Temperature and melted fraction for a given energy received since the start. */
export const stateOf = (s: Substance, m: number, e: number) => {
	const { e1, e2 } = stages(s, m);
	if (e <= e1) return { t: s.t0 + e / (s.cs * m), f: 0 };
	if (e < e2) return { t: s.tm, f: (e - e1) / (s.lambda * m) };
	return { t: s.tm + (e - e2) / (s.cl * m), f: 1 };
};

/** Rounds to `digits` decimals and drops trailing zeros: 0.5 → «0,5», 2 → «2». */
export const ru = (v: number, digits = 2) =>
	(Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ru-RU', {
		maximumFractionDigits: digits,
		useGrouping: true,
	});

/** Fixed number of decimals: 0.5 → «0,50». */
export const fixed = (v: number, digits: number) =>
	(Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toLocaleString('ru-RU', {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
		useGrouping: false,
	});

/** A number for TeX: decimal comma, thin space between thousands, real minus. */
export const tex = (v: number, digits = 2) => {
	const r = Math.round(v * 10 ** digits) / 10 ** digits;
	const neg = r < 0;
	const [int, rawFrac = ''] = Math.abs(r).toFixed(digits).split('.');
	const frac = rawFrac.replace(/0+$/, '');
	const grouped = int.length > 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') : int;
	return (neg ? '-' : '') + grouped + (frac ? `{,}${frac}` : '');
};

/** True when rounding to `digits` decimals changes the value. */
export const isRounded = (v: number, digits = 0) =>
	Math.abs(Math.round(v * 10 ** digits) / 10 ** digits - v) > 1e-9;

export const renderTex = (el: HTMLElement, src: string, display = true) =>
	katex.render(src, el, {
		displayMode: display,
		throwOnError: false,
		strict: 'ignore',
		trust: (ctx) => ctx.command === '\\htmlClass',
	});

/** A «nice» upper limit for an axis: 1, 2, 2.5, 5 × 10ⁿ. */
export const niceCeil = (v: number) => {
	const p = 10 ** Math.floor(Math.log10(v));
	for (const k of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (k * p >= v - 1e-9) return k * p;
	return 10 * p;
};

/** Tick step for an axis of length `span`, aiming at about `n` ticks. */
export const tickStep = (span: number, n = 6) => {
	const raw = span / n;
	const p = 10 ** Math.floor(Math.log10(raw));
	for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= raw - 1e-9) return k * p;
	return 10 * p;
};
