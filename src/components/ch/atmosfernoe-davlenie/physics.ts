/**
 * Physics shared by the models of the chapter «Атмосферное давление».
 *
 * Numbers follow the grade 7 textbook (А. В. Пёрышкин): g = 9,8 Н/кг, ρ(ртути) = 13 600 кг/м³,
 * normal pressure 760 мм рт. ст. ≈ 101 300 Па. The change of pressure with altitude is the
 * International Standard Atmosphere (troposphere, valid up to 11 km): the temperature falls by
 * 6,5 K per km from 15 °C at sea level.
 */

export const G = 9.8;
export const RHO_HG = 13600;
export const RHO_WATER = 1000;
/** Pressure at sea level, Па (760 мм рт. ст. with the textbook's ρ and g). */
export const P0 = 101300;
/** 1 мм рт. ст. in pascals: ρgh with h = 1 мм. */
export const MMHG = RHO_HG * G * 0.001;

const T0 = 288.15;
const LAPSE = 0.0065;
const EXPONENT = 5.2558; // g·M / (R·L)

/** Air pressure (Па) at altitude h (м) above sea level, standard atmosphere. */
export const pressureAt = (h: number) => P0 * Math.pow(1 - (LAPSE * h) / T0, EXPONENT);

/** Air density at altitude h divided by the density at sea level. */
export const densityRatioAt = (h: number) => Math.pow(1 - (LAPSE * h) / T0, EXPONENT - 1);

/** Altitude (м) at which the standard atmosphere has pressure p (Па). */
export const altitudeAt = (p: number) => (T0 / LAPSE) * (1 - Math.pow(p / P0, 1 / EXPONENT));

/** Height (м) of a liquid column of density rho balanced by pressure p. */
export const columnHeight = (p: number, rho: number) => p / (rho * G);

/** Russian number format: decimal comma, a thin gap between thousands from 10 000 on. */
export const fmt = (v: number, digits = 0) =>
	v
		.toLocaleString('ru-RU', {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits,
			useGrouping: Math.abs(v) >= 9999.5,
		})
		.replace(/[\u00a0\u202f ]/g, '\u00a0')
		.replace('-', '\u2212');

/** The same number written for KaTeX: `13\,600`, `9{,}8`. */
export const tex = (v: number, digits = 0) =>
	fmt(v, digits).replace(',', '{,}').replace(/\u00a0/g, '\\,').replace('\u2212', '-');

/** Round to a "nice" number of significant digits for school answers (101 293 → 101 300). */
export const roundTo = (v: number, step: number) => Math.round(v / step) * step;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Frame-rate independent exponential approach of x to target with time constant tau (s). */
export const approach = (x: number, target: number, dt: number, tau: number) =>
	target + (x - target) * Math.exp(-dt / tau);

export const reducedMotion = () =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
