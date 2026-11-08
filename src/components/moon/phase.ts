/**
 * The Moon's phase for a given moment, computed in the browser (no network).
 *
 * J. Meeus, «Astronomical Algorithms» (2nd ed., 1998): the Sun from ch. 25 (low accuracy, ~0.01°), the Moon from
 * ch. 47 with the periodic terms of tables 47.A and 47.B down to ~0.001° (truncation error ~0.01°), the phase angle
 * and the illuminated fraction from ch. 48. Checked against the JPL DE421 ephemeris (python skyfield) for 2026–2027
 * (400 moments, 47 new and full moons): illuminated fraction within 0.01 % of the disc, new and full moon within
 * 1.2 minutes, days to the next new or full moon within 2 minutes.
 */

const RAD = Math.PI / 180;
const sin = (deg: number) => Math.sin(deg * RAD);
const cos = (deg: number) => Math.cos(deg * RAD);
const norm = (deg: number) => ((deg % 360) + 360) % 360;
/** Wraps an angle into (−180°, 180°]. */
const wrap = (deg: number) => {
	const a = norm(deg);
	return a > 180 ? a - 360 : a;
};

const SYNODIC = 29.530588853; // days
const DAY = 86400000;

// Table 47.A: D, M, M', F, Σl (1e-6 °), Σr (1e-3 km)
const LR: [number, number, number, number, number, number][] = [
	[0, 0, 1, 0, 6288774, -20905355],
	[2, 0, -1, 0, 1274027, -3699111],
	[2, 0, 0, 0, 658314, -2955968],
	[0, 0, 2, 0, 213618, -569925],
	[0, 1, 0, 0, -185116, 48888],
	[0, 0, 0, 2, -114332, -3149],
	[2, 0, -2, 0, 58793, 246158],
	[2, -1, -1, 0, 57066, -152138],
	[2, 0, 1, 0, 53322, -170733],
	[2, -1, 0, 0, 45758, -204586],
	[0, 1, -1, 0, -40923, -129620],
	[1, 0, 0, 0, -34720, 108743],
	[0, 1, 1, 0, -30383, 104755],
	[2, 0, 0, -2, 15327, 10321],
	[0, 0, 1, 2, -12528, 0],
	[0, 0, 1, -2, 10980, 79661],
	[4, 0, -1, 0, 10675, -34782],
	[0, 0, 3, 0, 10034, -23210],
	[4, 0, -2, 0, 8548, -21636],
	[2, 1, -1, 0, -7888, 24208],
	[2, 1, 0, 0, -6766, 30824],
	[1, 0, -1, 0, -5163, -8379],
	[1, 1, 0, 0, 4987, -16675],
	[2, -1, 1, 0, 4036, -12831],
	[2, 0, 2, 0, 3994, -10445],
	[4, 0, 0, 0, 3861, -11650],
	[2, 0, -3, 0, 3665, 14403],
	[0, 1, -2, 0, -2689, -7003],
	[2, 0, -1, 2, -2602, 0],
	[2, -1, -2, 0, 2390, 10056],
	[1, 0, 1, 0, -2348, 6322],
	[2, -2, 0, 0, 2236, -9884],
	[0, 1, 2, 0, -2120, 5751],
	[0, 2, 0, 0, -2069, 0],
	[2, -2, -1, 0, 2048, -4950],
	[2, 0, 1, -2, -1773, 4130],
	[2, 0, 0, 2, -1595, 0],
	[4, -1, -1, 0, 1215, -3958],
	[0, 0, 2, 2, -1110, 0],
	[3, 0, -1, 0, -892, 3258],
	[2, 1, 1, 0, -810, 2616],
	[4, -1, -2, 0, 759, -1897],
	[0, 2, -1, 0, -713, -2117],
	[2, 2, -1, 0, -700, 2354],
	[2, 1, -2, 0, 691, 0],
	[2, -1, 0, -2, 596, 0],
	[4, 0, 1, 0, 549, -1423],
	[0, 0, 4, 0, 537, -1117],
	[4, -1, 0, 0, 520, -1571],
	[1, 0, -2, 0, -487, -1739],
];

// Table 47.B: D, M, M', F, Σb (1e-6 °)
const B: [number, number, number, number, number][] = [
	[0, 0, 0, 1, 5128122],
	[0, 0, 1, 1, 280602],
	[0, 0, 1, -1, 277693],
	[2, 0, 0, -1, 173237],
	[2, 0, -1, 1, 55413],
	[2, 0, -1, -1, 46271],
	[2, 0, 0, 1, 32573],
	[0, 0, 2, 1, 17198],
	[2, 0, 1, -1, 9266],
	[0, 0, 2, -1, 8822],
	[2, -1, 0, -1, 8216],
	[2, 0, -2, -1, 4324],
	[2, 0, 1, 1, 4200],
	[2, 1, 0, -1, -3359],
	[2, -1, -1, 1, 2463],
	[2, -1, 0, 1, 2211],
	[2, -1, -1, -1, 2065],
	[0, 1, -1, -1, -1870],
	[4, 0, -1, -1, 1828],
	[0, 1, 0, 1, -1794],
	[0, 0, 0, 3, -1749],
	[0, 1, -1, 1, -1565],
	[1, 0, 0, 1, -1491],
	[0, 1, 1, 1, -1475],
	[0, 1, 1, -1, -1410],
	[0, 1, 0, -1, -1344],
	[1, 0, 0, -1, -1335],
	[0, 0, 3, 1, 1107],
	[4, 0, 0, -1, 1021],
	[4, 0, -1, 1, 833],
];

/** Julian centuries of Terrestrial Time since J2000.0 (ΔT ≈ 69 s in 2026). */
const centuries = (ms: number) => (ms / DAY + 2440587.5 + 69 / 86400 - 2451545) / 36525;

type Bodies = { elong: number; lat: number; dist: number; sunDist: number };

/** Geocentric ecliptic longitude difference Moon − Sun (°), the Moon's latitude (°) and both distances (km). */
function bodies(ms: number): Bodies {
	const T = centuries(ms);
	// the Sun (ch. 25)
	const Ms = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
	const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
	const e = 0.016708634 - 0.000042037 * T;
	const C =
		(1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(Ms) + (0.019993 - 0.000101 * T) * sin(2 * Ms) + 0.000289 * sin(3 * Ms);
	const sunLon = L0 + C - 0.00569; // with aberration; nutation cancels in the difference
	const sunDist = (149597870.7 * 1.000001018 * (1 - e * e)) / (1 + e * cos(Ms + C));

	// the Moon (ch. 47)
	const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
	const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
	const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
	const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
	const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T;
	const A1 = 119.75 + 131.849 * T;
	const A2 = 53.09 + 479264.29 * T;
	const A3 = 313.45 + 481266.484 * T;
	const E = 1 - 0.002516 * T - 0.0000074 * T * T;
	const ecc = (m: number) => (m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E);

	let sl = 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
	let sr = 0;
	for (const [d, m, mp, f, l, r] of LR) {
		const arg = d * D + m * M + mp * Mp + f * F;
		sl += l * ecc(m) * sin(arg);
		sr += r * ecc(m) * cos(arg);
	}
	let sb = -2235 * sin(Lp) + 382 * sin(A3) + 175 * sin(A1 - F) + 175 * sin(A1 + F) + 127 * sin(Lp - Mp) - 115 * sin(Lp + Mp);
	for (const [d, m, mp, f, b] of B) sb += b * ecc(m) * sin(d * D + m * M + mp * Mp + f * F);

	return {
		elong: norm(Lp + sl / 1e6 - sunLon),
		lat: sb / 1e6,
		dist: 385000.56 + sr / 1000,
		sunDist,
	};
}

/** The moment (ms) nearest to `ms` + `ahead` days when the Moon − Sun longitude difference equals `target` (°). */
function solve(ms: number, target: number, ahead: number) {
	let t = ms + ahead * DAY;
	for (let k = 0; k < 6; k++) t += (wrap(target - bodies(t).elong) / 360) * SYNODIC * DAY;
	return t;
}

/** The next moment (ms) after `ms` when the longitude difference reaches `target` (°). */
function next(ms: number, target: number) {
	const ahead = (norm(target - bodies(ms).elong) / 360) * SYNODIC;
	let t = solve(ms, target, ahead);
	if (t <= ms) t = solve(ms, target, ahead + SYNODIC);
	return t;
}

export type PhaseName =
	| 'новолуние'
	| 'растущий серп'
	| 'первая четверть'
	| 'растущая Луна'
	| 'полнолуние'
	| 'убывающая Луна'
	| 'последняя четверть'
	| 'убывающий серп';

export type MoonPhase = {
	/** illuminated fraction of the disc, 0…1 */
	fraction: number;
	/** phase angle Sun–Moon–Earth, 0…180° */
	angle: number;
	/** true from new moon to full moon */
	waxing: boolean;
	name: PhaseName;
	/** the next full moon (when waxing) or new moon (when waning) */
	nextEvent: 'full' | 'new';
	/** days until that event */
	days: number;
};

const PRINCIPAL: [number, PhaseName][] = [
	[0, 'новолуние'],
	[90, 'первая четверть'],
	[180, 'полнолуние'],
	[270, 'последняя четверть'],
];
/** A principal phase is named within this many days of its exact moment. */
const WINDOW = 0.5;

export function moonPhase(date: Date = new Date()): MoonPhase {
	const ms = date.getTime();
	const { elong, lat, dist, sunDist } = bodies(ms);
	// ch. 48: elongation ψ, phase angle i, illuminated fraction k
	const psi = Math.acos(cos(lat) * cos(elong)) / RAD;
	const angle = Math.atan2(sunDist * sin(psi), dist - sunDist * cos(psi)) / RAD;
	const fraction = (1 + cos(angle)) / 2;
	const waxing = elong < 180;

	let name: PhaseName = elong < 90 ? 'растущий серп' : elong < 180 ? 'растущая Луна' : elong < 270 ? 'убывающая Луна' : 'убывающий серп';
	for (const [target, n] of PRINCIPAL) {
		const off = wrap(elong - target); // > 0 after the moment
		if (Math.abs(off) > 20) continue;
		const t = solve(ms, target, -(off / 360) * SYNODIC);
		if (Math.abs(ms - t) < WINDOW * DAY) name = n;
	}
	// on the day of a full (new) moon the caption already counts to the next new (full) one
	const toFull = name === 'новолуние' || (waxing && name !== 'полнолуние');
	const nextEvent = toFull ? 'full' : 'new';
	const days = (next(ms, toFull ? 180 : 0) - ms) / DAY;
	return { fraction, angle, waxing, name, nextEvent, days };
}

/** Exact moments of the next new and full moon after `date` (for tests). */
export function nextNewFull(date: Date) {
	const ms = date.getTime();
	return { newMoon: new Date(next(ms, 0)), fullMoon: new Date(next(ms, 180)) };
}

/** «1 день», «2 дня», «5 дней», «21 день»; «меньше суток» under one day. */
export function daysText(days: number) {
	if (days < 1) return 'меньше суток';
	const n = Math.round(days);
	const m10 = n % 10;
	const m100 = n % 100;
	const word = m10 === 1 && m100 !== 11 ? 'день' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'дня' : 'дней';
	return `${n} ${word}`;
}
