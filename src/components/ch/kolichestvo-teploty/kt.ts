/** Shared data and helpers for the «Количество теплоты» chapter models. */
import katex from 'katex';

/** Rounded table values, Дж/(кг·°C), and densities, кг/м³ (школьные таблицы). */
export const SUBSTANCES = {
	water: { name: 'Вода', gen: 'воды', c: 4200, rho: 1000 },
	oil: { name: 'Подсолнечное масло', short: 'Масло', gen: 'масла', c: 1700, rho: 930 },
	sand: { name: 'Песок (сухой)', short: 'Песок', gen: 'песка', c: 830, rho: 1500 },
	al: { name: 'Алюминий', gen: 'алюминия', c: 920, rho: 2700 },
	fe: { name: 'Железо', gen: 'железа', c: 460, rho: 7800 },
	cu: { name: 'Медь', gen: 'меди', c: 400, rho: 8900 },
	pb: { name: 'Свинец', gen: 'свинца', c: 140, rho: 11300 },
} as const;
export type Key = keyof typeof SUBSTANCES;

/** Rounds to `digits` decimals, drops trailing zeros, decimal comma: 0.5 → «0,5». */
export const ru = (v: number, digits = 1) =>
	(Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ru-RU', {
		maximumFractionDigits: digits,
		useGrouping: false,
	});

/** Integer with thin-space groups for TeX: 336000 → «336\,000». */
export const texInt = (v: number) => {
	const s = String(Math.round(v));
	return s.length > 4 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') : s;
};

/** Integer with groups for HTML text: 336000 → «336 000» (narrow no-break spaces). */
export const htmlInt = (v: number) => {
	const s = String(Math.round(v));
	return s.length > 4 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : s;
};

/** A number for TeX with decimal comma. */
export const tex = (v: number, digits = 1) => ru(v, digits).replace(',', '{,}');

/** True when rounding to `digits` decimals changes the value. */
export const isRounded = (v: number, digits = 1) => Math.abs(Math.round(v * 10 ** digits) / 10 ** digits - v) > 1e-9;

/** Coloured part of a formula (class .kt-<kind>). */
export const q = (kind: string, body: string) => `\\htmlClass{kt-${kind}}{${body}}`;

export const DEG = '\\,^\\circ\\text{C}';

export const renderTex = (el: HTMLElement, src: string, display = true) =>
	katex.render(src, el, {
		displayMode: display,
		throwOnError: false,
		strict: 'ignore',
		trust: (ctx) => ctx.command === '\\htmlClass',
	});

/** CSS colour of water at temperature t (°C): blue when cold, red when hot. */
export const tempColor = (t: number) => {
	const p = Math.round(Math.min(100, Math.max(0, t)));
	return `color-mix(in oklab, var(--ig-vy) ${p}%, var(--ig-vx))`;
};
