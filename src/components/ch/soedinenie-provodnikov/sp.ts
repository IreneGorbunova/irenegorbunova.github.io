/**
 * Helpers of the chapter «Последовательное и параллельное соединение проводников»:
 * Russian number formatting, KaTeX rendering and the solver of the three circuits of the main model.
 * Ideal source, wires and meters; the lamps are treated as resistors whose resistance does not change.
 */
import katex from 'katex';

/** Rounds to `digits` decimals and drops trailing zeros: 0.5 → «0,5», 2 → «2». */
export const ru = (v: number, digits = 2) =>
	(Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ru-RU', {
		maximumFractionDigits: digits,
		useGrouping: false,
	});

/** Decimals that keep `n` significant digits: 2,5 → 2; 0,25 → 3. */
export const sigDigits = (v: number, n = 3) =>
	v === 0 ? 0 : Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(v))));

/** Rounds to `n` significant digits. */
export const sig = (v: number, n = 3) => {
	const d = sigDigits(v, n);
	return Math.round(v * 10 ** d) / 10 ** d;
};

/** True when keeping `n` significant digits changes the value. */
export const isRounded = (v: number, n = 3) => Math.abs(sig(v, n) - v) > 1e-9 * Math.max(1, Math.abs(v));

/** A number with 3 significant digits, trailing zeros dropped: «0,167», «1,5», «12». */
export const num = (v: number, n = 3) => ru(sig(v, n), sigDigits(v, n));

/** The same for TeX: decimal comma without the extra space. */
export const tnum = (v: number, n = 3) => num(v, n).replace(',', '{,}');

/** Coloured symbol of a quantity (classes .sp-u, .sp-i, .sp-r). */
export const q = (kind: 'u' | 'i' | 'r', body: string) => `\\htmlClass{sp-${kind}}{${body}}`;

export const renderTex = (el: HTMLElement, src: string, display = true) =>
	katex.render(src, el, {
		displayMode: display,
		throwOnError: false,
		strict: 'ignore',
		trust: (ctx) => ctx.command === '\\htmlClass',
	});

export type Mode = 'series' | 'parallel' | 'mixed';

export interface Solution {
	/** current from the source, А */
	I: number;
	/** current through every lamp, А (0 for a lamp that is out) */
	Ik: number[];
	/** voltage across every lamp or its empty socket, В; null where an ideal voltmeter has no defined reading */
	Uk: (number | null)[];
	/** resistance of the whole circuit, Ом (Infinity when the circuit is open) */
	R: number;
}

/** Parallel resistance of the given resistors; Infinity for none. */
export const par = (rs: number[]) => (rs.length ? 1 / rs.reduce((s, r) => s + 1 / r, 0) : Infinity);

/**
 * The circuit: a source of voltage U and n lamps of resistances R[k]; on[k] is false for an unscrewed lamp.
 * series: 1 — 2 — 3; parallel: all lamps between the same two nodes; mixed (n = 3): lamp 1, then 2 and 3 in parallel.
 */
export const solve = (mode: Mode, U: number, R: number[], on: boolean[]): Solution => {
	const n = R.length;
	const zeros = () => Array<number>(n).fill(0);
	if (mode === 'series') {
		const off = on.filter((x) => !x).length;
		if (off > 0) {
			// open circuit: no current; the whole voltage lies across the gap, if there is exactly one
			const Uk = on.map((x) => (x ? 0 : off === 1 ? U : null));
			return { I: 0, Ik: zeros(), Uk, R: Infinity };
		}
		const Rt = R.reduce((s, r) => s + r, 0);
		const I = U / Rt;
		return { I, Ik: R.map(() => I), Uk: R.map((r) => I * r), R: Rt };
	}
	if (mode === 'parallel') {
		const Ik = R.map((r, k) => (on[k] ? U / r : 0));
		const I = Ik.reduce((s, i) => s + i, 0);
		return { I, Ik, Uk: R.map(() => U), R: par(R.filter((_, k) => on[k])) };
	}
	// mixed: lamp 1 in series with the parallel pair 2, 3
	const R23 = par([1, 2].filter((k) => on[k]).map((k) => R[k]));
	if (on[0] && Number.isFinite(R23)) {
		const Rt = R[0] + R23;
		const I = U / Rt;
		const U23 = I * R23;
		return {
			I,
			Ik: [I, on[1] ? U23 / R[1] : 0, on[2] ? U23 / R[2] : 0],
			Uk: [I * R[0], U23, U23],
			R: Rt,
		};
	}
	if (on[0]) return { I: 0, Ik: zeros(), Uk: [0, U, U], R: Infinity }; // pair open: no current, U across it
	if (Number.isFinite(R23)) return { I: 0, Ik: zeros(), Uk: [U, 0, 0], R: Infinity }; // lamp 1 out
	return { I: 0, Ik: zeros(), Uk: [null, null, null], R: Infinity };
};
