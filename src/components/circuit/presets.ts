/**
 * Starting circuits of the constructor (the `preset` prop). Coordinates are grid nodes; the board centres
 * every preset, so each must fit 7 × 8 cells (the narrow board is 7 × 9, the wide one 13 × 8).
 * In a source and in a meter, end a is the «+».
 */
import type { Kind, P } from './solver';

export type PresetPart = { kind: Kind; a: P; b: P; v?: number; closed?: boolean };

export const PRESETS: Record<string, PresetPart[]> = {
	// «Соединение проводников»: a source 6 В, a key and two lamps, not connected yet
	lamps: [
		{ kind: 'lamp', a: [0, 0], b: [2, 0], v: 12 },
		{ kind: 'lamp', a: [3, 0], b: [5, 0], v: 12 },
		{ kind: 'source', a: [0, 4], b: [2, 4], v: 6 },
		{ kind: 'key', a: [3, 4], b: [5, 4] },
	],
	// «Закон Ома»: a source, a resistor, a key, an ammeter and a voltmeter, not connected yet
	ohm: [
		{ kind: 'voltmeter', a: [3, 0], b: [5, 0] },
		{ kind: 'ammeter', a: [0, 2], b: [2, 2] },
		{ kind: 'resistor', a: [3, 2], b: [5, 2], v: 10 },
		{ kind: 'source', a: [0, 5], b: [2, 5], v: 4.5 },
		{ kind: 'key', a: [3, 5], b: [5, 5] },
	],
	// «Работа и мощность тока»: a source, a fuse 1 А and a lamp in a closed circuit, and a loose wire
	fuse: [
		{ kind: 'source', a: [0, 0], b: [0, 2], v: 4.5 },
		{ kind: 'wire', a: [0, 0], b: [1, 0] },
		{ kind: 'fuse', a: [1, 0], b: [3, 0], v: 1 },
		{ kind: 'wire', a: [3, 0], b: [5, 0] },
		{ kind: 'lamp', a: [5, 0], b: [5, 2], v: 12 },
		{ kind: 'wire', a: [0, 2], b: [5, 2] },
		{ kind: 'wire', a: [2, 3], b: [2, 5] },
	],
	empty: [],
};
