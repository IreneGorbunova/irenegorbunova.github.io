/**
 * Data shared by the models of the chapter «Солнечная система. Звёзды. Галактики».
 *
 * Constants are the school values (Мякишев, Касьянов): G = 6,67·10⁻¹¹ Н·м²/кг², c = 3·10⁸ м/с,
 * 1 а.е. = 1,496·10¹¹ м, 1 св. год = 9,46·10¹⁵ м, 1 пк = 3,09·10¹⁶ м = 3,26 св. года.
 * Orbital elements: JPL «Keplerian elements for approximate positions of the major planets» (J2000);
 * periods, radii and masses: NASA planetary fact sheets; star data: catalogue values, rounded.
 */

export const G = 6.67e-11; // Н·м²/кг²
export const C = 3e8; // м/с
export const AU = 1.496e11; // м
export const LY = 9.46e15; // м
export const PC = 3.086e16; // м
export const M_SUN = 1.99e30; // кг
export const R_SUN = 6.96e8; // м
export const L_SUN = 3.83e26; // Вт
export const T_SUN = 5772; // K
export const R_EARTH = 6.371e6; // м
export const YEAR = 365.25 * 86400; // с
export const DAY = 86400; // с
/** Hubble constant, км/(с·Мпк). */
export const H0 = 70;

export type Body = {
	id: string;
	name: string;
	/** semi-major axis, а.е. */
	a: number;
	/** eccentricity */
	e: number;
	/** sidereal period, years */
	T: number;
	/** longitude of perihelion ϖ at J2000, degrees (orientation of the ellipse in the ecliptic) */
	w: number;
	/** mean longitude at J2000, degrees */
	L0: number;
	/** mean radius, km */
	R: number;
	/** mass in Earth masses */
	M: number;
	/** on-screen colour */
	color: string;
	kind: 'inner' | 'outer' | 'dwarf' | 'comet';
	/** retrograde motion (Halley's comet) */
	retro?: boolean;
};

export const BODIES: Body[] = [
	{ id: 'mercury', name: 'Меркурий', a: 0.38709927, e: 0.20563593, T: 0.2408467, w: 77.45779628, L0: 252.2503235, R: 2439.7, M: 0.0553, color: '#b8b2a8', kind: 'inner' },
	{ id: 'venus', name: 'Венера', a: 0.72333566, e: 0.00677672, T: 0.61519726, w: 131.60246718, L0: 181.9790995, R: 6051.8, M: 0.815, color: '#e8d4a2', kind: 'inner' },
	{ id: 'earth', name: 'Земля', a: 1.00000261, e: 0.01671123, T: 1.0000174, w: 102.93768193, L0: 100.46457166, R: 6371, M: 1, color: '#6fa8ff', kind: 'inner' },
	{ id: 'mars', name: 'Марс', a: 1.52371034, e: 0.0933941, T: 1.8808476, w: -23.94362959, L0: -4.55343205, R: 3389.5, M: 0.107, color: '#e07a4f', kind: 'inner' },
	{ id: 'jupiter', name: 'Юпитер', a: 5.202887, e: 0.04838624, T: 11.862615, w: 14.72847983, L0: 34.39644051, R: 69911, M: 317.8, color: '#e3b98a', kind: 'outer' },
	{ id: 'saturn', name: 'Сатурн', a: 9.53667594, e: 0.05386179, T: 29.447498, w: 92.59887831, L0: 49.95424423, R: 58232, M: 95.2, color: '#f0d9a0', kind: 'outer' },
	{ id: 'uranus', name: 'Уран', a: 19.18916464, e: 0.04725744, T: 84.016846, w: 170.9542763, L0: 313.23810451, R: 25362, M: 14.5, color: '#9fe3e8', kind: 'outer' },
	{ id: 'neptune', name: 'Нептун', a: 30.06992276, e: 0.00859048, T: 164.79132, w: 44.96476227, L0: -55.12002969, R: 24622, M: 17.1, color: '#5c7cff', kind: 'outer' },
	{ id: 'pluto', name: 'Плутон', a: 39.48211675, e: 0.2488273, T: 247.92065, w: 224.06891629, L0: 238.92903833, R: 1188.3, M: 0.0022, color: '#d9c7b8', kind: 'dwarf' },
	// Halley's comet: a = 17,83 а.е., e = 0,967, T ≈ 75,3 года, retrograde orbit (i = 162°); ϖ = Ω + ω ≈ 58° + 111° (projected to the plane)
	{ id: 'halley', name: 'Комета Галлея', a: 17.834, e: 0.96714, T: 75.32, w: 169.75, L0: 0, R: 5.5, M: 3.7e-14, color: '#cfe9ff', kind: 'comet', retro: true },
];

/** Position on an orbit at time t (years from J2000): solves Kepler's equation. Returns x, y in а.е., r, true anomaly. */
export const orbitPos = (b: Body, t: number) => {
	const n = (2 * Math.PI) / b.T;
	const w = (b.w * Math.PI) / 180;
	// mean anomaly from the mean longitude; a comet starts at perihelion
	let Mm = b.kind === 'comet' ? n * t : ((b.L0 - b.w) * Math.PI) / 180 + n * t;
	Mm = ((Mm % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
	let E = b.e > 0.8 ? Math.PI : Mm;
	for (let i = 0; i < 30; i++) {
		const d = (E - b.e * Math.sin(E) - Mm) / (1 - b.e * Math.cos(E));
		E -= d;
		if (Math.abs(d) < 1e-12) break;
	}
	const nu = 2 * Math.atan2(Math.sqrt(1 + b.e) * Math.sin(E / 2), Math.sqrt(1 - b.e) * Math.cos(E / 2));
	const r = b.a * (1 - b.e * Math.cos(E));
	const ang = b.retro ? w - nu : w + nu;
	return { x: r * Math.cos(ang), y: r * Math.sin(ang), r, nu, E };
};

/** Orbital speed from the vis-viva equation, км/с (GM of the Sun in а.е.³/год² is 4π²). */
export const orbitSpeed = (b: Body, r: number) => {
	const k = (4 * Math.PI * Math.PI * AU) / (YEAR * YEAR); // GM/а.е.², м/с² at 1 а.е.
	return Math.sqrt(k * AU * (2 / r - 1 / b.a)) / 1000;
};

/** Main-sequence parameters by mass (solar units): interpolation in log M of a standard table (Zombeck). */
const MS: [number, number, number][] = [
	// M, L, T
	[0.1, 0.0012, 2650],
	[0.15, 0.0027, 3120],
	[0.6, 0.072, 3800],
	[0.69, 0.16, 4410],
	[0.78, 0.4, 5240],
	[0.93, 0.79, 5610],
	[1, 1, 5780],
	[1.1, 1.26, 5920],
	[1.3, 2.5, 6540],
	[1.7, 6, 7240],
	[2.1, 20, 8620],
	[3.2, 80, 10800],
	[6.5, 800, 16400],
	[18, 20000, 30000],
	[40, 500000, 38000],
	[60, 790000, 44000],
];

export const mainSequence = (M: number) => {
	const lm = Math.log10(M);
	let i = 1;
	while (i < MS.length - 1 && Math.log10(MS[i][0]) < lm) i++;
	const [m0, l0, t0] = MS[i - 1];
	const [m1, l1, t1] = MS[i];
	const f = (lm - Math.log10(m0)) / (Math.log10(m1) - Math.log10(m0));
	const L = 10 ** (Math.log10(l0) + f * (Math.log10(l1) - Math.log10(l0)));
	const T = 10 ** (Math.log10(t0) + f * (Math.log10(t1) - Math.log10(t0)));
	return { L, T };
};

/** Main-sequence lifetime, years: t ≈ 10¹⁰ лет · (M/M☉)^(−2,5); the most massive stars live a few million years. */
export const msLifetime = (M: number) => Math.max(1e10 * M ** -2.5, 3e6);

/** Radius in solar radii from luminosity and temperature: L = 4πR²σT⁴. */
export const radiusOf = (L: number, T: number) => Math.sqrt(L) * (T_SUN / T) ** 2;

export type Star = { name: string; T: number; L: number; kind: 'ms' | 'giant' | 'super' | 'wd' };
/** Real stars for the diagram (effective temperature, K; luminosity in L☉; catalogue values, rounded). */
export const STARS: Star[] = [
	{ name: 'Солнце', T: 5772, L: 1, kind: 'ms' },
	{ name: 'Сириус A', T: 9940, L: 25, kind: 'ms' },
	{ name: 'Вега', T: 9600, L: 40, kind: 'ms' },
	{ name: 'Альтаир', T: 7550, L: 11, kind: 'ms' },
	{ name: 'Процион A', T: 6530, L: 6.9, kind: 'ms' },
	{ name: 'α Центавра A', T: 5790, L: 1.5, kind: 'ms' },
	{ name: 'α Центавра B', T: 5260, L: 0.5, kind: 'ms' },
	{ name: 'τ Кита', T: 5340, L: 0.52, kind: 'ms' },
	{ name: 'Звезда Барнарда', T: 3130, L: 0.0035, kind: 'ms' },
	{ name: 'Проксима Центавра', T: 3040, L: 0.0017, kind: 'ms' },
	{ name: 'Регул A', T: 12460, L: 290, kind: 'ms' },
	{ name: 'Спика A', T: 25300, L: 20500, kind: 'ms' },
	{ name: 'Ахернар', T: 15000, L: 3150, kind: 'ms' },
	{ name: 'Арктур', T: 4290, L: 170, kind: 'giant' },
	{ name: 'Альдебаран', T: 3900, L: 440, kind: 'giant' },
	{ name: 'Поллукс', T: 4670, L: 43, kind: 'giant' },
	{ name: 'Капелла Aa', T: 4970, L: 79, kind: 'giant' },
	{ name: 'Полярная', T: 6015, L: 1260, kind: 'super' },
	{ name: 'Канопус', T: 7350, L: 10700, kind: 'super' },
	{ name: 'Бетельгейзе', T: 3600, L: 100000, kind: 'super' },
	{ name: 'Антарес A', T: 3660, L: 76000, kind: 'super' },
	{ name: 'Ригель A', T: 12100, L: 120000, kind: 'super' },
	{ name: 'Денеб', T: 8500, L: 196000, kind: 'super' },
	{ name: 'Сириус B', T: 25000, L: 0.056, kind: 'wd' },
	{ name: '40 Эридана B', T: 16500, L: 0.013, kind: 'wd' },
	{ name: 'Звезда ван Маанена', T: 6130, L: 0.00017, kind: 'wd' },
];

/** Colour of a black body of temperature T (K) as an rgb() string (Helland's approximation). */
export const bbColor = (T: number) => {
	const t = Math.min(Math.max(T, 1000), 40000) / 100;
	const cl = (v: number) => Math.round(Math.min(255, Math.max(0, v)));
	const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
	const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
	const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
	return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
};

/** Spectral class by temperature (boundaries as in school tables). */
export const spectralClass = (T: number) =>
	T >= 30000 ? 'O' : T >= 10000 ? 'B' : T >= 7500 ? 'A' : T >= 6000 ? 'F' : T >= 5200 ? 'G' : T >= 3700 ? 'K' : 'M';
