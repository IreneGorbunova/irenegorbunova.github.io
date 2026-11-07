/**
 * Constellations of the textbook sections (pilot: grade 8 «Тепловые явления» = Ursa Major).
 * A section's constellation is shared among its chapters: the stars, in `stars` order, are cut into consecutive
 * blocks, one block per chapter (sizes differ by at most one), so chapters can be added, merged or dropped freely.
 * A chapter lights the share of its block equal to the share of its rays (rays.ts) that are lit.
 * Positions: real RA/Dec (J2000, rounded), gnomonic projection, east to the left, north up — as seen in the sky.
 * The figure is Hevelius' «Uranographia» (1690, public domain), mirrored: he drew the sky as on a celestial globe.
 * It was fitted to the dipper stars with a similarity transform (tools: /storage/arsenii/ig_webpage/review/sky/fit.py).
 */

export interface Star {
	id: string;
	name: string;
	ra: number; // hours
	dec: number; // degrees
	mag: number;
}
export interface Constellation {
	name: string;
	fact: string;
	stars: Star[];
	lines: [string, string][];
	center: { ra: number; dec: number };
	art?: {
		file: string;
		/** where the image lies in the (mirrored) plate coordinates */
		rect: { x: number; y: number; w: number; h: number };
		/** plate → projected sky: sky = s·R·p + t */
		s: number;
		R: [[number, number], [number, number]];
		t: [number, number];
		credit: string;
	};
}

const h = (hh: number, mm: number, ss: number) => hh + mm / 60 + ss / 3600;
const d = (dd: number, mm: number) => dd + mm / 60;

export const CONSTELLATIONS: Record<string, Constellation> = {
	'ursa-major': {
		name: 'Большая Медведица',
		fact: 'Семь самых ярких её звёзд — это Большой Ковш. Продлите линию через две крайние звезды ковша, Мерак и Дубхе, примерно на пять расстояний между ними — и придёте к Полярной звезде.',
		center: { ra: 11, dec: 50 },
		// in the order the chapters get them: tail, bowl, hind legs, belly, front legs, head
		stars: [
			{ id: 'eta', name: 'Бенетнаш', ra: h(13, 47, 32), dec: d(49, 19), mag: 1.9 },
			{ id: 'zeta', name: 'Мицар', ra: h(13, 23, 56), dec: d(54, 56), mag: 2.2 },
			{ id: 'eps', name: 'Алиот', ra: h(12, 54, 2), dec: d(55, 58), mag: 1.8 },
			{ id: 'delta', name: 'Мегрец', ra: h(12, 15, 26), dec: d(57, 2), mag: 3.3 },
			{ id: 'alpha', name: 'Дубхе', ra: h(11, 3, 44), dec: d(61, 45), mag: 1.8 },
			{ id: 'beta', name: 'Мерак', ra: h(11, 1, 50), dec: d(56, 23), mag: 2.4 },
			{ id: 'gamma', name: 'Фекда', ra: h(11, 53, 50), dec: d(53, 42), mag: 2.4 },
			{ id: 'chi', name: 'хи Большой Медведицы', ra: h(11, 46, 3), dec: d(47, 47), mag: 3.7 },
			{ id: 'nu', name: 'Алула Северная', ra: h(11, 18, 29), dec: d(33, 6), mag: 3.5 },
			{ id: 'xi', name: 'Алула Южная', ra: h(11, 18, 11), dec: d(31, 32), mag: 3.8 },
			{ id: 'psi', name: 'пси Большой Медведицы', ra: h(11, 9, 40), dec: d(44, 30), mag: 3.0 },
			{ id: 'mu', name: 'Тания Южная', ra: h(10, 22, 20), dec: d(41, 30), mag: 3.0 },
			{ id: 'lambda', name: 'Тания Северная', ra: h(10, 17, 6), dec: d(42, 55), mag: 3.5 },
			{ id: 'theta', name: 'тета Большой Медведицы', ra: h(9, 32, 52), dec: d(51, 41), mag: 3.2 },
			{ id: 'kappa', name: 'каппа Большой Медведицы', ra: h(9, 3, 38), dec: d(47, 9), mag: 3.6 },
			{ id: 'iota', name: 'Талита', ra: h(8, 59, 13), dec: d(48, 2), mag: 3.1 },
			{ id: 'ups', name: 'ипсилон Большой Медведицы', ra: h(9, 50, 59), dec: d(59, 2), mag: 3.8 },
			{ id: 'h23', name: '23 Большой Медведицы', ra: h(9, 31, 32), dec: d(63, 4), mag: 3.7 },
			{ id: 'omicron', name: 'Мускида', ra: h(8, 30, 16), dec: d(60, 43), mag: 3.4 },
		],
		lines: [
			['eta', 'zeta'],
			['zeta', 'eps'],
			['eps', 'delta'],
			['delta', 'alpha'],
			['alpha', 'beta'],
			['beta', 'gamma'],
			['gamma', 'delta'],
			['gamma', 'chi'],
			['chi', 'nu'],
			['chi', 'xi'],
			['beta', 'psi'],
			['psi', 'mu'],
			['psi', 'lambda'],
			['beta', 'theta'],
			['theta', 'kappa'],
			['theta', 'iota'],
			['alpha', 'ups'],
			['ups', 'theta'],
			['alpha', 'h23'],
			['h23', 'omicron'],
			['omicron', 'ups'],
		],
		art: {
			file: 'sky/ursa-major.webp',
			rect: { x: 282 / 1.92, y: 234 / 1.92, w: 1396 / 1.92, h: 1078 / 1.92 },
			s: 0.0013142638602934367,
			R: [
				[0.9133872518381254, 0.40709179330907236],
				[-0.4070917933090725, 0.9133872518381257],
			],
			t: [-0.7772578410971279, -0.2144187928012472],
			credit: 'Рисунок — гравюра из звёздного атласа Яна Гевелия «Уранография» (1690). Гевелий рисовал созвездия такими, какими они выглядят на небесном глобусе снаружи, поэтому гравюра отражена.',
		},
	},
};

/** Sections that have a constellation: «<grade label>/<section label>» → constellation key. */
export const SECTION_SKY: Record<string, string> = {
	'8 класс/Тепловые явления': 'ursa-major',
};

/** Gnomonic projection around the centre; x grows to the west (right), y grows to the south (down). */
export const project = (c: Constellation, ra: number, dec: number): [number, number] => {
	const r = Math.PI / 180;
	const a0 = c.center.ra * 15 * r;
	const d0 = c.center.dec * r;
	const a = ra * 15 * r;
	const dd = dec * r;
	const cosc = Math.sin(d0) * Math.sin(dd) + Math.cos(d0) * Math.cos(dd) * Math.cos(a - a0);
	const x = (Math.cos(dd) * Math.sin(a - a0)) / cosc;
	const y = (Math.cos(d0) * Math.sin(dd) - Math.sin(d0) * Math.cos(dd) * Math.cos(a - a0)) / cosc;
	return [-x, -y];
};

/** Consecutive blocks of star indices, one per chapter. */
export const blocks = (nStars: number, nChapters: number) => {
	const base = Math.floor(nStars / nChapters);
	const extra = nStars % nChapters;
	const out: number[][] = [];
	let k = 0;
	for (let i = 0; i < nChapters; i++) {
		const size = base + (i < extra ? 1 : 0);
		out.push(Array.from({ length: size }, (_, j) => k + j));
		k += size;
	}
	return out;
};

/** How many stars of a block of `size` a chapter lights with `lit` of `need` rays. */
export const litCount = (size: number, lit: number, need: number) => Math.floor((size * lit) / need + 0.5);
