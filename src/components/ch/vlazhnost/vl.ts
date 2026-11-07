/** Helpers shared by the humidity models: the saturated-vapour table, the dew point, number formatting, KaTeX. */
import katex from 'katex';
import { RHO0, T_MIN } from './data';

export const T_MAX = T_MIN + RHO0.length - 1;

/** Density of saturated vapour ρ₀ (g/m³) at t °C: the table value, linear between whole degrees. */
export const rho0 = (t: number) => {
	const x = Math.min(Math.max(t, T_MIN), T_MAX) - T_MIN;
	const i = Math.min(Math.floor(x), RHO0.length - 2);
	return RHO0[i] + (RHO0[i + 1] - RHO0[i]) * (x - i);
};

/** Dew point: the temperature at which ρ₀ equals the given vapour density (the inverse of rho0). */
export const dewPoint = (rho: number) => {
	if (rho <= RHO0[0]) return T_MIN;
	for (let i = 0; i < RHO0.length - 1; i++) {
		if (rho <= RHO0[i + 1]) return T_MIN + i + (rho - RHO0[i]) / (RHO0[i + 1] - RHO0[i]);
	}
	return T_MAX;
};

/** Rounds to `digits` decimals, Russian decimal comma, trailing zeros dropped. */
export const ru = (v: number, digits = 1) =>
	(Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ru-RU', {
		maximumFractionDigits: digits,
		useGrouping: false,
	});

/** Fixed number of decimals: 10 → «10,0». */
export const fixed = (v: number, digits = 1) =>
	(Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ru-RU', {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
		useGrouping: false,
	});

/** A formatted number for TeX: decimal comma without the extra space. */
export const tex = (s: string) => s.replace(',', '{,}');

export const renderTex = (el: HTMLElement, src: string, display = true) =>
	katex.render(src, el, {
		displayMode: display,
		throwOnError: false,
		strict: 'ignore',
		trust: (ctx) => ctx.command === '\\htmlClass',
	});

export const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
