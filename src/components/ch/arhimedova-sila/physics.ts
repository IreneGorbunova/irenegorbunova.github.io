/**
 * Shared data and helpers for the chapter «Архимедова сила. Плавание тел».
 * Densities are the table values of the 7th-grade textbook (А. В. Пёрышкин), kg/m³;
 * «солёная вода» is a strong solution of table salt (≈ 1200 kg/m³).
 */

export const G = 9.8;

export interface Substance {
	id: string;
	name: string;
	/** Name in the genitive / prepositional-free form used in sentences: «в воде». */
	inName?: string;
	rho: number;
}

export const BODIES: Substance[] = [
	{ id: 'cork', name: 'Пробка', rho: 240 },
	{ id: 'pine', name: 'Сосна', rho: 400 },
	{ id: 'ice', name: 'Лёд', rho: 900 },
	{ id: 'plexi', name: 'Оргстекло', rho: 1200 },
	{ id: 'al', name: 'Алюминий', rho: 2700 },
	{ id: 'iron', name: 'Железо', rho: 7800 },
	{ id: 'lead', name: 'Свинец', rho: 11300 },
	{ id: 'gold', name: 'Золото', rho: 19300 },
];

export const LIQUIDS: Substance[] = [
	{ id: 'kerosene', name: 'Керосин', inName: 'в керосине', rho: 800 },
	{ id: 'oil', name: 'Масло', inName: 'в подсолнечном масле', rho: 930 },
	{ id: 'water', name: 'Вода', inName: 'в воде', rho: 1000 },
	{ id: 'brine', name: 'Солёная вода', inName: 'в солёной воде', rho: 1200 },
	{ id: 'mercury', name: 'Ртуть', inName: 'в ртути', rho: 13600 },
];

/** Group the digits of an integer part as in Russian tables: «2700», but «13 600». */
const group = (int: string) => (int.length > 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') : int);

/** Russian number format with a fixed number of decimals («0,63», «2940», «13 600»). */
export const fmt = (v: number, digits = 2) => {
	let s = (Math.round(Math.abs(v) * 10 ** digits) / 10 ** digits).toFixed(digits);
	if (Number(s) === 0) return (0).toFixed(digits).replace('.', ',');
	const [int, frac] = s.split('.');
	s = group(int) + (frac ? ',' + frac : '');
	return v < 0 ? '−' + s : s;
};

/** Integers: «2700», «13 600». */
export const fmtInt = (n: number) => fmt(n, 0);

/** Russian number format without trailing zeros, at most `digits` decimals. */
export const fmtTrim = (v: number, digits = 7) => {
	const s = fmt(v, digits);
	return s.includes(',') ? s.replace(/0+$/, '').replace(/,$/, '') : s;
};

/** Turn a formatted number into TeX: decimal comma, thin space between digit groups, minus sign. */
export const tex = (s: string) => s.replace(/,/g, '{,}').replace(/\u00a0/g, '\\,').replace(/−/g, '-');

/** Round to `digits` decimals as a number. */
export const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const reducedMotion = () =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
