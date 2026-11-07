/**
 * Illustrative model of a school electromagnet (a coil on an iron rod) lifting paper clips.
 * The field of the coil is proportional to N·I. Iron multiplies it many times (here 100 times)
 * but saturates: its field cannot grow without limit (tanh). The number of clips grows with the field.
 */
export const MAX_CLIPS = 24;
const NI_SAT = 300; // А: the scale of N·I at which the iron of the model starts to saturate
const IRON_GAIN = 100; // how many times the iron core strengthens the field of the coil (unsaturated)

/** Magnetic action of the electromagnet, from 0 to 1 (1 — fully saturated iron). */
export function magneticAction(NI: number, core: boolean): number {
	const s = NI / NI_SAT;
	return core ? Math.tanh(s) : s / IRON_GAIN;
}

/** Number of clips the electromagnet holds. */
export function clipsLifted(NI: number, core: boolean): number {
	const b = magneticAction(NI, core);
	return Math.floor(MAX_CLIPS * Math.pow(b, 1.5) + 1e-9);
}
