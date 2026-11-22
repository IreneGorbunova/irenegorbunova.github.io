/**
 * The color of a black body of temperature T as an sRGB string: Planck's spectrum B(λ, T) ∝ λ⁻⁵ / (exp(hc/λkT) − 1)
 * (hc/k = 1,4388·10⁻² м·К) folded with the CIE 1931 color matching functions (the multi-lobe Gaussian fit of Wyman,
 * Sloan and Shirley, 2013) → XYZ → linear sRGB, each channel divided by that of a 6500 К black body (so 6500 К is
 * drawn white and 5800 К warm white, rgb(255 247 235), never pink) → brightness normalized (the brightest channel = 1)
 * → sRGB gamma. Used by StarColorLab and the other pictures, so a star has one color everywhere.
 */
export const HCK = 1.4388e-2; // hc/k, м·К
export const WIEN = 2.898e-3; // м·К
const g = (l: number, mu: number, s1: number, s2: number) => {
	const t = (l - mu) / (l < mu ? s1 : s2);
	return Math.exp(-0.5 * t * t);
};
const xb = (l: number) => 1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2);
const yb = (l: number) => 0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1);
const zb = (l: number) => 1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8);
/** Planck's law, arbitrary units; λ in nm. */
export const planck = (lnm: number, T: number) => {
	const l = lnm * 1e-9;
	return 1 / (l ** 5 * (Math.exp(HCK / (l * T)) - 1));
};
// linear sRGB of a black body, before any normalization
const linRGB = (T: number): [number, number, number] => {
	let X = 0;
	let Y = 0;
	let Z = 0;
	for (let l = 380; l <= 780; l += 5) {
		const b = planck(l, T);
		X += b * xb(l);
		Y += b * yb(l);
		Z += b * zb(l);
	}
	return [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z];
};
// the white point: a 6500 К black body is drawn white (its channels divide every color's)
const W6500 = linRGB(6500);
/** sRGB color of a black body at T (К). */
export const bbColor = (T: number) => {
	let [r, gg, b] = linRGB(T).map((v, i) => v / W6500[i]);
	const lo = Math.min(0, r, gg, b);
	r -= lo;
	gg -= lo;
	b -= lo;
	const m = Math.max(r, gg, b);
	const enc = (c: number) => {
		const v = c / m;
		return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
	};
	return `rgb(${enc(r)} ${enc(gg)} ${enc(b)})`;
};
