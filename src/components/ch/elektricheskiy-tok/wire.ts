/**
 * Data of the wire model: rounded table values of resistivity at 20 °C, Ом·мм²/м
 * (as in the table of the grade-8 textbook), the ranges of the sliders and R = ρl/S.
 */
export const WIRE = {
	materials: [
		{ name: 'медь', rho: 0.017, alloy: false },
		{ name: 'алюминий', rho: 0.028, alloy: false },
		{ name: 'железо', rho: 0.1, alloy: false },
		{ name: 'никелин', rho: 0.4, alloy: true },
		{ name: 'константан', rho: 0.5, alloy: true },
		{ name: 'нихром', rho: 1.1, alloy: true },
	],
	defaultMaterial: 5,
	UMAX: 6,
	IMAX: 3,
	U0: 4.5,
	L0: 2,
	S0: 0.5,
} as const;

export const resistance = (rho: number, l: number, S: number) => (rho * l) / S;
