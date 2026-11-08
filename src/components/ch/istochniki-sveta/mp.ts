/**
 * Helpers for the Moon's phases (MoonPhases.astro, PhasePick.astro).
 *
 * The phase is set by the elongation E: the angle Sun – Earth – Moon counted along the Moon's
 * motion, 0 at new moon, π/2 at first quarter, π at full moon, 3π/2 at last quarter. The Sun is
 * ~390 times farther than the Moon, so the phase angle (Sun – Moon – Earth) is π − E.
 * Then the lit part of the visible disc is (1 − cos E)/2 and the terminator is half an ellipse
 * whose half-width is |cos E| times the radius. The view is for the Northern hemisphere:
 * a waxing Moon is lit on the right.
 */

/** Synodic month, days (NASA NSSDC Moon fact sheet: 29.53 d). */
export const MONTH = 29.53;
export const TAU = 2 * Math.PI;

export const dayOf = (E: number): number => (E / TAU) * MONTH;
export const elongOf = (d: number): number => (((d / MONTH) * TAU) % TAU + TAU) % TAU;
export const litFraction = (E: number): number => (1 - Math.cos(E)) / 2;

/** The four main phases: day in the month and name. */
export const MAIN = [
	{ d: 0, name: 'Новолуние' },
	{ d: MONTH / 4, name: 'Первая четверть' },
	{ d: MONTH / 2, name: 'Полнолуние' },
	{ d: (3 * MONTH) / 4, name: 'Последняя четверть' },
];

/** Name of the phase on day d; a main phase within ±0,5 day of its moment. */
export function phaseName(d: number): string {
	const x = ((d % MONTH) + MONTH) % MONTH;
	for (const m of [...MAIN, { d: MONTH, name: 'Новолуние' }]) if (Math.abs(x - m.d) < 0.5) return m.name;
	if (x < MONTH / 4) return 'Растущий серп';
	if (x < MONTH / 2) return 'Растущая Луна';
	if (x < (3 * MONTH) / 4) return 'Убывающая Луна';
	return 'Убывающий серп';
}

/** A number with a decimal comma. */
export const fmt = (x: number, digits = 0): string => x.toFixed(digits).replace('.', ',').replace('-', '−');

// dark «seas» of the Moon as seen from the Northern hemisphere (the same as in EclipseLab):
// centre (u right, v down, in units of the radius), radii, darkness
const MARIA: [number, number, number, number, number][] = [
	[-0.35, -0.38, 0.32, 0.26, 0.28], // Sea of Rains
	[0.12, -0.42, 0.2, 0.17, 0.25], // Sea of Serenity
	[0.3, -0.05, 0.25, 0.2, 0.25], // Sea of Tranquillity
	[0.68, -0.28, 0.12, 0.1, 0.3], // Sea of Crises
	[-0.62, 0.05, 0.3, 0.45, 0.22], // Ocean of Storms
	[0.42, 0.32, 0.16, 0.14, 0.2], // Sea of Fertility
	[-0.18, 0.38, 0.2, 0.16, 0.18], // Sea of Clouds
];
function albedo(u: number, v: number): number {
	let a = 0.86;
	for (const [cu, cv, ru, rv, d] of MARIA) {
		const q = ((u - cu) / ru) ** 2 + ((v - cv) / rv) ** 2;
		if (q < 1) a -= d * (1 - q) ** 0.6;
	}
	return a;
}

const STARS = Array.from({ length: 26 }, (_, i) => {
	const a = Math.sin(i * 12.9898 + 1) * 43758.5453;
	const b = Math.sin(i * 78.233 + 2) * 12345.678;
	const c = Math.sin(i * 39.425 + 3) * 9876.54;
	return { x: a - Math.floor(a), y: b - Math.floor(b), m: 0.25 + 0.75 * (c - Math.floor(c)) ** 3 };
});

/**
 * Draws the Moon as seen from the Earth on a square canvas (sized to its CSS width).
 * Brightness of each point: the Lommel–Seeliger law of the lunar soil, cos i / (cos i + cos e),
 * (capped at the full-Moon level), so the full Moon looks evenly bright and the part near the
 * terminator darkens. The night part
 * is lit faintly by the Earth («пепельный свет», shown much brighter than in reality),
 * in proportion to the Earth's phase seen from the Moon, (1 + cos E)/2.
 * Returns the moon radius in CSS px.
 */
export function drawMoonView(canvas: HTMLCanvasElement, E: number, opts: { radius?: number; stars?: boolean } = {}): number {
	const dpr = Math.min(3, window.devicePixelRatio || 1);
	const css = Math.max(1, canvas.clientWidth);
	const n = Math.max(2, Math.round(css * dpr));
	if (canvas.width !== n || canvas.height !== n) canvas.width = canvas.height = n;
	const ctx = canvas.getContext('2d')!;
	const img = ctx.createImageData(n, n);
	const data = img.data;
	const R = n * (opts.radius ?? 0.4);
	const c = n / 2;
	const sx = Math.sin(E);
	const sz = -Math.cos(E); // the Sun's direction: (sin E, 0, −cos E), the viewer looks along −z
	const es = 0.05 + 0.09 * ((1 + Math.cos(E)) / 2); // earthshine
	// sky
	for (let j = 0; j < n; j++) {
		const t = j / n;
		const r = 6 + 10 * t;
		const g = 9 + 12 * t;
		const b = 26 + 22 * t;
		for (let i = 0; i < n; i++) {
			const p = (j * n + i) * 4;
			data[p] = r;
			data[p + 1] = g;
			data[p + 2] = b;
			data[p + 3] = 255;
		}
	}
	const x0 = Math.max(0, Math.floor(c - R - 2));
	const x1 = Math.min(n, Math.ceil(c + R + 2));
	for (let j = x0; j < x1; j++) {
		for (let i = x0; i < x1; i++) {
			const u = (i + 0.5 - c) / R;
			const v = (j + 0.5 - c) / R;
			const rr = u * u + v * v;
			if (rr > 1 + 3 / R) continue;
			const edge = Math.min(1, Math.max(0, (1 - Math.sqrt(rr)) * R + 0.5));
			const nz = Math.sqrt(Math.max(0, 1 - rr));
			const ci = u * sx + nz * sz; // cos of the incidence angle
			const sun = ci > 0 ? Math.min(1, (2 * ci) / (ci + nz + 1e-6)) : 0; // capped at the full-Moon level
			const a = albedo(u, v);
			const p = (j * n + i) * 4;
			const lr = 255 * a * (0.98 * sun + 0.8 * es);
			const lg = 255 * a * (0.95 * sun + 0.88 * es);
			const lb = 255 * a * (0.86 * sun + 1.05 * es);
			data[p] = data[p] * (1 - edge) + Math.min(255, lr) * edge;
			data[p + 1] = data[p + 1] * (1 - edge) + Math.min(255, lg) * edge;
			data[p + 2] = data[p + 2] * (1 - edge) + Math.min(255, lb) * edge;
		}
	}
	ctx.putImageData(img, 0, 0);
	if (opts.stars !== false) {
		for (const s of STARS) {
			const x = s.x * n;
			const y = s.y * n;
			if (Math.hypot(x - c, y - c) < R + 6 * dpr) continue;
			ctx.fillStyle = `rgba(255,255,255,${(0.25 + 0.6 * s.m).toFixed(3)})`;
			ctx.beginPath();
			ctx.arc(x, y, (0.5 + 0.7 * s.m) * dpr, 0, 7);
			ctx.fill();
		}
	}
	return R / dpr;
}

/** Position of the Moon in the top view: Sun to the left, motion counter-clockwise (seen from the north). */
export function moonXY(E: number, cx: number, cy: number, r: number): { x: number; y: number } {
	return { x: cx - r * Math.cos(E), y: cy + r * Math.sin(E) };
}

/** Elongation from a point of the top view. */
export function elongAt(x: number, y: number, cx: number, cy: number): number {
	return (Math.atan2(y - cy, -(x - cx)) + TAU) % TAU;
}
