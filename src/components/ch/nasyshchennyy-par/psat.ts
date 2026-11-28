/**
 * Saturated vapor, shared by the models and pictures of «Насыщенный пар. Влажность».
 *
 * Water: the saturation-pressure equation of the international steam tables IAPWS-IF97 (Region 4, eq. 30), valid from
 * 0 to 374 °C; below 0 °C it is continued over supercooled water (−10 °C: 0,286 кПа; the value over ice is 0,260 кПа).
 * Values it gives (кПа): 0,611 at 0 °C, 1,228 at 10, 1,403 at 12, 1,706 at 15, 2,339 at 20, 2,645 at 22, 3,170 at 25,
 * 4,247 at 30, 7,384 at 40, 19,95 at 60, 31,20 at 70, 47,41 at 80, 70,18 at 90, 84,61 at 95, 101,4 at 100,
 * 143,4 at 110, 198,7 at 120, 270,3 at 130. The school tables round the same data (2,33 кПа at 20 °C in the older
 * tables, 2,34 in IAPWS).
 * The density of saturated vapor from the ideal-gas law ρ = pM/(RT), M = 18,02 г/моль, R = 8,314 Дж/(моль·К):
 * 4,85 г/м³ at 0 °C, 17,3 at 20, 51,1 at 40, 130 at 60, 589 at 100 (the steam tables give 598 at 100 °C: near
 * boiling the vapor is about 1,5 % denser than an ideal gas; the models stay at or below 100 °C).
 * Ethanol and diethyl ether: the Antoine equation log₁₀ p[мм рт. ст.] = A − B/(C + t) with the constants of the
 * usual handbooks (ethanol A = 8,20417, B = 1642,89, C = 230,3; ether A = 6,92032, B = 1064,07, C = 228,8):
 * they boil at 78,3 and 34,6 °C at 101,3 кПа.
 */
const N = [
	0, 0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2, 0.1202082470247e5, -0.32325550322333e7, 0.1491510861353e2,
	-0.48232657361591e4, 0.40511340542057e6, -0.23855557567849, 0.65017534844798e3,
];
/** Pressure of saturated water vapor, кПа (IAPWS-IF97). */
export const psat = (t: number): number => {
	const T = t + 273.15;
	const th = T + N[9] / (T - N[10]);
	const A = th * th + N[1] * th + N[2];
	const B = N[3] * th * th + N[4] * th + N[5];
	const C = N[6] * th * th + N[7] * th + N[8];
	return ((2 * C) / (-B + Math.sqrt(B * B - 4 * A * C))) ** 4 * 1000;
};
/** Density of saturated water vapor, г/м³. */
export const rhoSat = (t: number): number => (psat(t) * 1000 * 18.02) / (8.314 * (t + 273.15));
const antoine = (A: number, B: number, C: number) => (t: number) => 10 ** (A - B / (C + t)) * 0.133322;
/** Pressure of saturated vapor, кПа, of the three liquids of the boiling model. */
export const LIQUIDS = {
	water: psat,
	ethanol: antoine(8.20417, 1642.89, 230.3),
	ether: antoine(6.92032, 1064.07, 228.8),
};
/** The temperature at which f(t) = p (кПа): the dew point or the boiling point. */
export const tSat = (p: number, f: (t: number) => number = psat): number => {
	let lo = -60;
	let hi = 200;
	for (let i = 0; i < 50; i++) {
		const m = (lo + hi) / 2;
		if (f(m) < p) lo = m;
		else hi = m;
	}
	return (lo + hi) / 2;
};
