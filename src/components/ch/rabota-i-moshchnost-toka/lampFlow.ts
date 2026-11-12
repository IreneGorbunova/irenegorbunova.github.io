/**
 * Drawings and energy paths for LampEnergy.astro: an incandescent lamp (60 Вт) and an LED lamp (9 Вт) that give the
 * same light (about 800 лм), both hanging from a cord.
 *
 * Coordinates: each lamp has its own SVG, viewBox 0 0 220 200. The 10 × 10 block of 1 Дж cells («из сети 100 Дж»)
 * sits on the left, the lamp hangs at x = 170. `segs` are the energy paths: segment 0 carries all the energy along the
 * cord to where it turns into light and heat (the filament / the LED chips); the others carry one band each out of
 * the lamp. The width of a stream is proportional to its share. Bands: 0 light, 1 heat through the bulb, 2 heat
 * through the base (incandescent) or the housing (LED). `out[b]` is the direction in which band b leaves the lamp.
 *
 * Shares, percent of the electric energy (rounded, «примерно» on the page):
 * - Incandescent 60 Вт, ≈ 800 лм (13–14 лм/Вт): visible light ≈ 5 %. Lamptech (Museum of Electric Lamp Technology),
 *   «Incandescent lamps — operation»: «only some 5 % is converted into visible light»; Wikipedia, «Incandescent light
 *   bulb»: «less than 5 %». Our own check, a tungsten spectrum at 2700–2800 K: 800 лм ↔ about 3,2 Вт of radiation
 *   at 400–700 нм, 5,4 % of 60 Вт (counting the deep red up to 780 нм, which the eye barely sees, gives about 9 %).
 *   Heat: 95 %, mostly through the bulb (invisible infrared radiation and the hot gas), a little through the base
 *   (the 88 / 7 split between the two exits is only a picture).
 * - LED lamp 9 Вт, 806 лм (≈ 90 лм/Вт, a typical «60 Вт» replacement): white phosphor LEDs give about 330 лм per
 *   watt of light (luminous efficacy of radiation, U.S. DOE, «2019 Lighting R&D Opportunities», Jan 2020), so the
 *   light is 90 / 330 ≈ 27 %, rounded to 30 %. Heat: 70 %, mostly through the housing that cools the LED board and
 *   the driver, less through the dome (the 15 / 55 split is only a picture).
 * - Per second: 60 Вт · 5 % = 3 Дж and 9 Вт · 30 % ≈ 2,7 Дж of light — about the same, as it should be.
 *   Equivalence 806 лм ↔ 60 Вт: EU Regulation 1194/2012, table 6; ENERGY STAR: 800 лм ↔ 60 Вт.
 */
export type LampId = 'inc' | 'led';

export interface Tag {
	t: string;
	x: number;
	y: number;
	a?: 'start' | 'middle' | 'end';
}

export interface Lamp {
	name: string;
	P: number; // Вт
	s: [number, number, number]; // percent: light, heat through the bulb, heat through the base / housing
	label: string; // aria-label
	art: string; // drawing under the streams
	top: string; // drawing over the streams (glass, glow)
	segs: { d: string; bands: number[] }[];
	routes: number[][];
	out: [number, number][];
	tags: Tag[];
}

export const VIEW_W = 220;
export const VIEW_H = 200;
export const CELL = 8;
export const PITCH = 10;
export const BLOCK: [number, number] = [6, 38]; // top-left corner of the 10 × 10 block
export const HOP = 'M 104 88 C 116 88 112 46 128 46';
export const K = 0.1; // width of a stream per percent

const CORD = 'M 104 88 C 116 88 112 46 128 46 H 156 Q 170 46 170 60 V 64';
const SOCKET = `<path class="le-cord" d="${CORD}"/>
	<rect class="le-socket" x="157" y="62" width="26" height="20" rx="3"/>
	<path class="le-socket-line" d="M 157 70 H 183"/>`;
const BASE = (y0: number, y1: number) => {
	let thr = '';
	for (let y = y0 + 4; y < y1 - 1; y += 4) thr += `M 161 ${y} L 179 ${y + 2} `;
	return `<rect class="le-base" x="161" y="${y0}" width="18" height="${y1 - y0}" rx="1.5"/><path class="le-thread" d="${thr}"/>`;
};
const waves = (pts: [number, number][]) =>
	pts.map(([x, y], i) => `<path class="le-wave" style="animation-delay:${(i * 0.7).toFixed(1)}s" d="M ${x} ${y} q -3 -5 0 -10 t 0 -10"/>`).join('');

/* ---------------------------------------------------------------- incandescent: filament at (170, 140) */
const BULB = 'M 161 98 C 161 110 140 114 140 140 A 30 30 0 0 0 200 140 C 200 114 179 110 179 98 Z';
let fil = 'M 161 140';
for (let x = 161; x < 179; x += 3) fil += ` l 1.5 -3 l 1.5 3`;
const inc: Lamp = {
	name: 'Лампа накаливания',
	P: 60,
	s: [5, 88, 7],
	label: 'Лампа накаливания 60 Вт: из 100 Дж электрической энергии примерно 5 Дж уходят светом, 95 Дж — теплом, в основном через колбу',
	art: `${SOCKET}${BASE(82, 98)}
		<circle class="le-halo le-halo--warm" cx="170" cy="140" r="30"/>
		<path class="le-glass" d="${BULB}"/>
		<path class="le-lead" d="M 166 98 L 161 140 M 174 98 L 179 140 M 170 98 V 128"/>
		<path class="le-fil" d="${fil}"/>
		${waves([[128, 114], [140, 104]])}`,
	top: '',
	segs: [
		{ d: 'M 128 46 H 156 Q 170 46 170 60 V 139', bands: [0, 1, 2] },
		{ d: 'M 170 139 V 196', bands: [0] },
		{ d: 'M 170 139 C 158 141 150 148 138 150 C 128 152 122 152 110 152', bands: [1] },
		{ d: 'M 170 139 C 177 133 178 120 178 106 C 178 96 186 91 208 90', bands: [2] },
	],
	routes: [[0, 1], [0, 2], [0, 3]],
	out: [[0, 1], [-1, 0.2], [1, -0.2]],
	tags: [
		{ t: 'свет', x: 177, y: 194, a: 'start' },
		{ t: 'тепло', x: 112, y: 170, a: 'end' },
		{ t: 'тепло', x: 186, y: 110, a: 'start' },
	],
};

/* ---------------------------------------------------------------- LED lamp: chips at (170, 122) */
const DOME = 'M 146 120 C 146 150 156 168 170 168 C 184 168 194 150 194 120 Z';
const led: Lamp = {
	name: 'Светодиодная лампа',
	P: 9,
	s: [30, 15, 55],
	label: 'Светодиодная лампа 9 Вт: из 100 Дж электрической энергии примерно 30 Дж уходят светом, 70 Дж — теплом, в основном через корпус',
	art: `${SOCKET}${BASE(82, 96)}
		<circle class="le-halo le-halo--led" cx="170" cy="140" r="28"/>
		<path class="le-housing" d="M 160 96 H 180 L 195 118 H 145 Z"/>
		<path class="le-fins" d="M 166 99 L 158 116 M 174 99 L 182 116 M 170 99 V 116"/>
		<path class="le-dome" d="${DOME}"/>
		<rect class="le-board" x="146" y="117" width="48" height="4" rx="1"/>
		<g class="le-chips"><rect x="151" y="121" width="5" height="3" rx="0.8"/><rect x="160" y="121" width="5" height="3" rx="0.8"/><rect x="175" y="121" width="5" height="3" rx="0.8"/><rect x="184" y="121" width="5" height="3" rx="0.8"/></g>
		${waves([[196, 92], [206, 98]])}`,
	top: '',
	segs: [
		{ d: 'M 128 46 H 156 Q 170 46 170 60 V 121', bands: [0, 1, 2] },
		{ d: 'M 170 121 V 196', bands: [0] },
		{ d: 'M 170 121 C 162 130 154 143 142 148 C 132 152 122 152 110 152', bands: [1] },
		{ d: 'M 170 121 C 180 119 187 114 189 106 C 191 98 198 94 210 92', bands: [2] },
	],
	routes: [[0, 1], [0, 2], [0, 3]],
	out: [[0, 1], [-1, 0.2], [1, -0.2]],
	tags: [
		{ t: 'свет', x: 177, y: 194, a: 'start' },
		{ t: 'тепло', x: 112, y: 170, a: 'end' },
		{ t: 'тепло', x: 188, y: 84, a: 'start' },
	],
};

export const LAMPS: Record<LampId, Lamp> = { inc, led };
export const LAMP_IDS: LampId[] = ['inc', 'led'];

/** Light (band 0) goes to pile 0, the two heat bands to pile 1. */
export const pileOf = (band: number) => (band === 0 ? 0 : 1);
