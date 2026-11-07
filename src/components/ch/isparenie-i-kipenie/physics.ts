/**
 * Physics and formatting helpers for the chapter «Испарение и конденсация. Кипение».
 * Saturated vapour pressure from the Buck equation (fits steam tables to 0,1–0,3 %).
 */
import katex from 'katex';

/** Saturated vapour pressure of water, kPa, at t °C (Buck 1996: 0,1 % from 0 to 100 °C, 0,3 % at 120 °C). */
export const pSatWater = (t: number) => 0.61121 * Math.exp((18.678 - t / 234.5) * (t / (257.14 + t)));

/**
 * Density of saturated water vapour, kg/m³, at t °C: ideal gas ρ = pM/(RT) with a small correction
 * for non-ideality (+0,3 % at 50 °C, +1,5 % at 100 °C, +2,4 % at 120 °C) to match steam tables.
 */
export const rhoSatWater = (t: number) =>
	((pSatWater(t) * 1000 * 0.018015) / (8.314 * (t + 273.15))) * (1 + 0.0155 * (Math.max(t, 0) / 100) ** 2.3);

/** Boiling temperature of water, °C, at pressure p (kPa): the t where p_sat(t) = p. */
export const tBoilWater = (p: number) => {
	let lo = 0;
	let hi = 200;
	for (let i = 0; i < 50; i++) {
		const m = (lo + hi) / 2;
		if (pSatWater(m) < p) lo = m;
		else hi = m;
	}
	return (lo + hi) / 2;
};

/** Pressure of the standard atmosphere, kPa, at altitude h (m), and its inverse. */
export const pAtAltitude = (h: number) => 101.325 * (1 - 2.25577e-5 * h) ** 5.25588;
export const altitudeAtP = (p: number) => (1 - (p / 101.325) ** (1 / 5.25588)) / 2.25577e-5;

/** Rounds to `digits` decimals and drops trailing zeros: 0.5 → «0,5», 2 → «2». */
export const ru = (v: number, digits = 1) =>
	(Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ru-RU', {
		maximumFractionDigits: digits,
		useGrouping: false,
	});

/** Number with thin-space thousands groups for TeX: 460000 → «460\,000». */
export const texNum = (v: number, digits = 1) => {
	const s = (Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ru-RU', {
		maximumFractionDigits: digits,
		useGrouping: true,
	});
	return s.replace(',', '{,}').replace(/\s/g, '\\,');
};

/** Number with grouped thousands for plain text: 460000 → «460 000». */
export const txtNum = (v: number, digits = 1) =>
	(Math.round(v * 10 ** digits) / 10 ** digits).toLocaleString('ru-RU', {
		maximumFractionDigits: digits,
		useGrouping: true,
	});

/** True when rounding to `digits` decimals changes the value. */
export const isRounded = (v: number, digits = 1) =>
	Math.abs(Math.round(v * 10 ** digits) / 10 ** digits - v) > 1e-9;

export const renderTex = (el: HTMLElement, src: string, display = true) =>
	katex.render(src, el, {
		displayMode: display,
		throwOnError: false,
		strict: 'ignore',
		trust: (ctx) => ctx.command === '\\htmlClass',
	});

/** Coloured piece of a formula (class .ik-<kind>). */
export const hc = (kind: string, body: string) => `\\htmlClass{ik-${kind}}{${body}}`;

/** Reads a CSS colour variable from an element (for canvas drawing). */
export const cssVar = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();

/** Calls `fn` whenever the site theme changes (Starlight sets data-theme on <html>). */
export const onThemeChange = (fn: () => void) => {
	new MutationObserver(fn).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fn);
};

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
