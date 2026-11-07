/** Small helpers shared by the chapter's scripts. */

/** A number with a decimal comma and the given number of decimals. */
export const fmt = (v: number, digits = 1) =>
	v.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** A number with n significant figures, decimal comma, thin spaces between thousands. */
export const sig = (v: number, n = 2) => {
	if (v === 0) return '0';
	const p = Number(v.toPrecision(n));
	return p.toLocaleString('ru-RU', { maximumFractionDigits: 20 });
};

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
export const sup = (n: number) => String(n).split('').map((c) => SUP[c] ?? c).join('');

/** a·10ⁿ as plain text with superscript digits (n significant figures of the mantissa). */
export const pow10 = (v: number, n = 2) => {
	if (v === 0) return '0';
	const ex = Math.floor(Math.log10(Math.abs(v)) + 1e-9);
	let m = Number((v / 10 ** ex).toPrecision(n));
	let e = ex;
	if (Math.abs(m) >= 10) {
		m /= 10;
		e += 1;
	}
	const ms = m.toLocaleString('ru-RU', { maximumFractionDigits: 20 });
	return m === 1 ? `10${sup(e)}` : `${ms}·10${sup(e)}`;
};

/** Years as text: 4,2 года, 26 тысяч лет, 2,5 млн лет, 13,8 млрд лет. */
export const yearsText = (y: number) => {
	const word = (v: number) => {
		const r = Number(v.toPrecision(3));
		if (!Number.isInteger(r)) return 'года';
		const m10 = r % 10;
		const m100 = r % 100;
		if (m100 >= 11 && m100 <= 19) return 'лет';
		if (m10 === 1) return 'год';
		if (m10 >= 2 && m10 <= 4) return 'года';
		return 'лет';
	};
	if (y < 1000) return `${sig(y, 3)} ${word(y)}`;
	if (y < 1e6) return `${sig(y / 1e3, 3)} тыс. лет`;
	if (y < 1e9) return `${sig(y / 1e6, 3)} млн лет`;
	if (y < 1e12) return `${sig(y / 1e9, 3)} млрд лет`;
	return `${sig(y / 1e12, 3)} трлн лет`;
};

/** Seconds as text in a natural unit. */
export const timeText = (s: number) => {
	if (s < 1e-6) return `${sig(s * 1e9, 2)} нс`;
	if (s < 1e-3) return `${sig(s * 1e6, 2)} мкс`;
	if (s < 1) return `${sig(s * 1e3, 2)} мс`;
	if (s < 60) return `${sig(s, 2)} с`;
	if (s < 3600) {
		const m = Math.floor(s / 60);
		const r = Math.round(s - m * 60);
		return r ? `${m} мин ${r} с` : `${m} мин`;
	}
	if (s < 86400) {
		const h = Math.floor(s / 3600);
		const m = Math.round((s - h * 3600) / 60);
		return m ? `${h} ч ${m} мин` : `${h} ч`;
	}
	const y = s / (365.25 * 86400);
	if (y < 1) return `${sig(s / 86400, 2)} сут`;
	return yearsText(y);
};

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)');

/** Sets a canvas to its CSS size times the device pixel ratio; returns the CSS size. */
export const fitCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, maxDpr = 2) => {
	const rect = canvas.getBoundingClientRect();
	const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
	const w = Math.max(1, Math.round(rect.width));
	const h = Math.max(1, Math.round(rect.height));
	if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
	}
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	return { w, h };
};

/** A deterministic pseudo-random generator (mulberry32), so a picture is the same on every load. */
export const prng = (seed: number) => () => {
	seed |= 0;
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
