/**
 * Saturated water vapour, shared by the models of «Насыщенный пар. Влажность».
 * The pressure from the Antoine equation (log₁₀ p[мм рт. ст.] = A − B/(C + t)) with the usual constants for water,
 * 1–100 °C: A = 8,07131, B = 1730,63, C = 233,426; 100–374 °C: A = 8,14019, B = 1810,94, C = 244,485. It agrees
 * with the tables within 1 %: 0,61 кПа at 0 °C, 2,33 at 20 °C, 101,3 at 100 °C, 198 at 120 °C. The density follows
 * from the ideal-gas law ρ = pM/(RT), M = 0,018 кг/моль: 17,2 г/м³ at 20 °C.
 */
export const psat = (t: number): number => {
	const [A, B, C] = t <= 100 ? [8.07131, 1730.63, 233.426] : [8.14019, 1810.94, 244.485];
	return 10 ** (A - B / (C + t)) * 0.133322; // кПа
};
/** Density of saturated vapour, г/м³. */
export const rhoSat = (t: number): number => (psat(t) * 1000 * 0.018 * 1000) / (8.31 * (t + 273));
/** The temperature at which the pressure of saturated vapour equals p (кПа): the dew point or the boiling point. */
export const tSat = (p: number): number => {
	let lo = -30;
	let hi = 200;
	for (let i = 0; i < 50; i++) {
		const m = (lo + hi) / 2;
		if (psat(m) < p) lo = m;
		else hi = m;
	}
	return (lo + hi) / 2;
};
