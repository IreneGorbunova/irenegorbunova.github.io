/**
 * Physics shared by the photoeffect chapter models.
 *
 * Constants are the school values (Мякишев, Касьянов), so that every number a pupil sees
 * can be checked on a calculator: h = 6,63·10⁻³⁴ Дж·с, c = 3·10⁸ м/с, e = 1,6·10⁻¹⁹ Кл,
 * m = 9,1·10⁻³¹ кг.
 *
 * The photocell model: two parallel plates (a solid cathode at the bottom and a mesh anode
 * at the top) fill a glass cylinder of radius W; light hits a spot |x| ≤ s in the middle of
 * the cathode. The field between the plates is uniform. A photoelectron leaves the spot with
 * kinetic energy ε·E_max, where ε has the density 6ε(1 − ε) (Beta(2, 2): the fastest
 * electrons come from the very surface and are few), in a direction with the density
 * cos θ / 2 (θ from the normal). It reaches the anode if it crosses the gap before hitting
 * the glass wall. The share Φ of electrons that reach the anode depends only on u = U / U_з,
 * so the whole current–voltage curve is I = I_н · Φ(U / U_з).
 */

export const H = 6.63e-34; // Дж·с
export const C = 3e8; // м/с
export const E = 1.6e-19; // Кл
export const M = 9.1e-31; // кг
/** hc/e in эВ·нм (1243,125). */
export const HC = ((H * C) / E) * 1e9;

export type Metal = { id: string; name: string; gen: string; A: number };
/**
 * Work functions, rounded: CRC Handbook of Chemistry and Physics (polycrystalline values and
 * ranges for typical faces); zinc as in Russian school tables. Real samples differ by tenths
 * of an electronvolt depending on the surface.
 */
export const METALS: Metal[] = [
	{ id: 'cs', name: 'Цезий', gen: 'цезия', A: 2.1 },
	{ id: 'k', name: 'Калий', gen: 'калия', A: 2.3 },
	{ id: 'li', name: 'Литий', gen: 'лития', A: 2.9 },
	{ id: 'zn', name: 'Цинк', gen: 'цинка', A: 4.2 },
	{ id: 'cu', name: 'Медь', gen: 'меди', A: 4.5 },
	{ id: 'pt', name: 'Платина', gen: 'платины', A: 5.6 },
];

/** Photon energy, эВ. */
export const photonEV = (nm: number) => HC / nm;
/** Frequency, Гц. */
export const freq = (nm: number) => C / (nm * 1e-9);
/** Speed of an electron with kinetic energy ev (эВ), км/с. */
export const speedKmS = (ev: number) => Math.sqrt((2 * Math.max(ev, 0) * E) / M) / 1e3;
/** Red boundary, нм. */
export const redBoundary = (A: number) => HC / A;

/* ---------- geometry of the photocell (mm) ---------- */
export const GAP = 16;
export const HALF_W = 20;
export const SPOT = 4;

/** Sideways shift of an electron when it reaches the anode plane, k = eU / E_electron. */
export function shift(sinT: number, cosT: number, k: number) {
	if (Math.abs(k) < 1e-12) return (GAP * sinT) / Math.max(cosT, 1e-12);
	return (2 * GAP * sinT * (Math.sqrt(Math.max(cosT * cosT + k, 0)) - cosT)) / k;
}

/** Share of the spot |x0| ≤ s from which an electron with this shift still hits the anode. */
function overlap(dx: number) {
	const lo = Math.max(-SPOT + dx, -HALF_W);
	const hi = Math.min(SPOT + dx, HALF_W);
	return Math.min(Math.max(hi - lo, 0), 2 * SPOT) / (2 * SPOT);
}

/** Φ(u): the share of photoelectrons that reach the anode, by midpoint quadrature. */
export function phiExact(u: number, n = 120) {
	const lo = u < 0 ? -u : 0;
	if (lo >= 1) return 0;
	let total = 0;
	for (let i = 0; i < n; i++) {
		const eps = lo + ((i + 0.5) / n) * (1 - lo);
		const we = (6 * eps * (1 - eps) * (1 - lo)) / n;
		const k = u / eps;
		const smax = u < 0 ? Math.sqrt(Math.max(0, 1 + u / eps)) : 1;
		let sum = 0;
		for (let j = 0; j < n; j++) {
			const s = -smax + ((j + 0.5) / n) * 2 * smax;
			sum += overlap(shift(s, Math.sqrt(1 - s * s), k));
		}
		total += (we * sum * (2 * smax)) / n / 2;
	}
	return Math.min(total, 1);
}

/** Tabulated Φ: dense near u = −1 (where the current dies out), logarithmic for u > 0. */
export type PhiTable = { neg: number[]; pos: number[] };
export const NEG_N = 64;
export const POS_N = 120;
export const POS_MAX = Math.log(1 + 2000);

export function buildPhiTable(): PhiTable {
	const neg: number[] = [];
	for (let i = 0; i <= NEG_N; i++) {
		const t = i / NEG_N;
		neg.push(+phiExact(-1 + t * t).toPrecision(6));
	}
	const pos: number[] = [];
	for (let i = 0; i <= POS_N; i++) {
		const u = Math.exp((i / POS_N) * POS_MAX) - 1;
		pos.push(+phiExact(u).toPrecision(6));
	}
	return { neg, pos };
}

export function phiLookup(t: PhiTable, u: number) {
	if (!(u > -1)) return 0;
	if (u <= 0) {
		const x = Math.sqrt(u + 1) * NEG_N;
		const i = Math.min(Math.floor(x), NEG_N - 1);
		return t.neg[i] + (t.neg[i + 1] - t.neg[i]) * (x - i);
	}
	const x = (Math.log(1 + u) / POS_MAX) * POS_N;
	if (x >= POS_N) return t.pos[POS_N];
	const i = Math.floor(x);
	return t.pos[i] + (t.pos[i + 1] - t.pos[i]) * (x - i);
}

/** Photocurrent as a share of the saturation current. */
export function currentShare(t: PhiTable, U: number, Ek: number) {
	if (Ek <= 0) return 0;
	return phiLookup(t, U / Ek);
}

/* ---------- colour of light ---------- */
const HUES: [number, number][] = [
	[380, 275],
	[410, 265],
	[440, 240],
	[470, 215],
	[490, 190],
	[505, 160],
	[520, 125],
	[550, 95],
	[575, 58],
	[590, 42],
	[610, 25],
	[640, 8],
	[680, 0],
	[760, 0],
];
/** Hue of a spectral colour; ultraviolet (λ < 380 нм) is invisible and gets a pale lavender. */
export function hueOf(nm: number) {
	if (nm < 380) return 280;
	for (let i = 1; i < HUES.length; i++) {
		if (nm <= HUES[i][0]) {
			const [l0, h0] = HUES[i - 1];
			const [l1, h1] = HUES[i];
			return h0 + ((h1 - h0) * (nm - l0)) / (l1 - l0);
		}
	}
	return 0;
}
/** CSS colour that uses the theme lightness tokens --fe-sat / --fe-lit (set by the component). */
export function lightColor(nm: number, alpha = 1) {
	const h = hueOf(nm).toFixed(0);
	const sat = nm < 380 ? 'calc(var(--fe-sat) * 0.45)' : 'var(--fe-sat)';
	return `hsl(${h} ${sat} var(--fe-lit) / ${alpha})`;
}

export function colourName(nm: number) {
	if (nm < 380) return 'ультрафиолет';
	if (nm < 450) return 'фиолетовый';
	if (nm < 485) return 'синий';
	if (nm < 500) return 'голубой';
	if (nm < 565) return 'зелёный';
	if (nm < 590) return 'жёлтый';
	if (nm < 625) return 'оранжевый';
	return 'красный';
}

/* ---------- formatting ---------- */
/** Round half away from zero to the given number of decimals. */
export const round = (v: number, digits = 2) => Math.sign(v) * (Math.round(Math.abs(v) * 10 ** digits) / 10 ** digits);
export const fmt = (v: number, digits = 2) =>
	round(v, digits).toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** Number for KaTeX: decimal comma, no grouping. */
export const tex = (v: number, digits = 2) => round(v, digits).toFixed(digits).replace('.', '{,}');
/** a·10^n for KaTeX with the given number of decimals in the mantissa. */
export function sci(v: number, digits = 2) {
	let n = Math.floor(Math.log10(Math.abs(v)));
	let m = v / 10 ** n;
	if (+m.toFixed(digits) >= 10) {
		n += 1;
		m /= 10;
	}
	return `{${tex(m, digits)}\\cdot10^{${n}}}`;
}

/* ---------- photocell scene (SVG units) ---------- */
/** px per mm; the tube is drawn to scale. */
export const K = 9;
export const CX = 250;
/** y of the cathode surface and of the anode mesh. */
export const YC = 322;
export const YA = YC - GAP * K;
/** Animation time per real nanosecond: motion is slowed down 4·10⁷ times. */
export const TS = 0.04;
/** Acceleration of an electron in the gap per volt, мм/нс². */
export const ACC_PER_VOLT = (E / (M * GAP * 1e-3)) * 1e-15;
/** Speed of an electron with energy ev (эВ), мм/нс. */
export const speedMmNs = (ev: number) => Math.sqrt((2 * Math.max(ev, 0) * E) / M) * 1e-6;
/** Saturation current at 100 % intensity, мкА. */
export const I_MAX = 8;
