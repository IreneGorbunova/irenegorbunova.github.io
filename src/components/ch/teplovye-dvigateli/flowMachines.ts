/**
 * Side-view drawings for EnergyFlow.astro: a car (petrol), a tractor (diesel), a steam locomotive and a thermal
 * power station (steam turbine), each with the paths along which the fuel's energy really leaves the machine.
 *
 * Coordinates: the SVG's viewBox is 0 0 640 320; a machine is drawn in its own frame shifted down by 10, with the
 * ground at y = 290 (310 in the viewBox). The 10 × 10 block of fuel cells is in viewBox coordinates.
 *
 * A machine's energy paths are `segs`: each is a path in the machine frame with the list of bands (0 useful work,
 * 1–3 losses) whose energy runs along it; its width is proportional to the sum of their shares. `routes[b]` is the
 * chain of segments band b follows, from the fuel to its exit; `out[b]` is the direction in which band b's energy
 * leaves the machine at the end of its last segment.
 */
export type MachineId = 'loco' | 'petrol' | 'diesel' | 'tes';

export interface Tag {
	t: string;
	x: number;
	y: number;
	a?: 'start' | 'middle' | 'end';
	/** a thin leader line from the tag to the part: x1 y1 x2 y2 */
	l?: [number, number, number, number];
	/** hidden on a narrow screen, where the letters are large compared with the drawing */
	minor?: boolean;
}

export interface Machine {
	label: string; // for aria-label
	art: string; // drawing under the energy paths
	top?: string; // drawing above the energy paths (wheels, details)
	block: [number, number]; // top-left corner of the fuel block, viewBox coordinates
	hop: string; // path (machine frame) from the fuel block to the fuel, where segs[0] starts
	segs: { d: string; bands: number[] }[];
	routes: number[][];
	out: [number, number][];
	tags: Tag[];
}

export const FRAME_DY = 10;
export const VIEW_W = 640;
export const VIEW_H = 320;
export const CELL = 8; // fuel cell, viewBox units
export const PITCH = 10;

const r1 = (v: number) => Math.round(v * 10) / 10;

/** A wheel: tyre, rim with spokes, hub. */
const wheel = (x: number, y: number, r: number, spokes = 6, lugs = false) => {
	const rim = r * (lugs ? 0.56 : 0.62);
	let s = `<circle class="efm-tyre" cx="${x}" cy="${y}" r="${r}"/>`;
	if (lugs) s += `<circle class="efm-lugs" cx="${x}" cy="${y}" r="${r1(r - 4)}" stroke-dasharray="5 6"/>`;
	s += `<circle class="efm-rim" cx="${x}" cy="${y}" r="${r1(rim)}"/>`;
	for (let k = 0; k < spokes; k++) {
		const a = (2 * Math.PI * k) / spokes + 0.3;
		s += `<line class="efm-spoke" x1="${x}" y1="${y}" x2="${r1(x + rim * 0.86 * Math.cos(a))}" y2="${r1(y + rim * 0.86 * Math.sin(a))}"/>`;
	}
	s += `<circle class="efm-hub" cx="${x}" cy="${y}" r="${r1(Math.max(3, r * 0.16))}"/>`;
	return s;
};

/** Concentric soft circles: a glow of heat (friction) without SVG filters. */
const glow = (x: number, y: number, r: number) =>
	[1, 0.7, 0.42].map((k) => `<circle class="efm-glow" cx="${x}" cy="${y}" r="${r1(r * k)}"/>`).join('');

/** Wavy lines of warm air rising from (x, y). */
const heat = (x: number, y: number, n = 3, dx = 9) =>
	Array.from({ length: n }, (_, k) => {
		const x0 = x + (k - (n - 1) / 2) * dx;
		return `<path class="efm-heat" d="M ${x0} ${y} q -4 -6 0 -12 t 0 -12"/>`;
	}).join('');

const puffs = (pts: [number, number, number][], cls = 'efm-smoke') =>
	pts.map(([x, y, r]) => `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"/>`).join('');

const ground = `<rect class="efm-ground" x="0" y="290" width="640" height="24"/>`;

/* ------------------------------------------------------------------ petrol: a car */
// The car of the opening scene (EngineIntro), 2,1× larger: x' = 160 + 2,1(x − 100), y' = 161,9 + 2,1(y − 135).
const CAR_BODY =
	'M102 184 L100 166 Q100 154 110 151 L136 137 Q140 135 146 135 H200 Q206 135 210 138 L230 152 L262 156 Q272 158 272 168 V180 Q272 184 268 184 H254 A16 16 0 0 0 222 184 H150 A16 16 0 0 0 118 184 Z';
const car: Machine = {
	label: 'Автомобиль: энергия бензина из бака идёт в двигатель, оттуда к колёсам, в выхлопную трубу, через радиатор в воздух и на трение',
	art: `${ground}
		<g transform="translate(-50 -121.6) scale(2.1)">
			<path class="efm-body" stroke-width="0.6" d="${CAR_BODY}"/>
			<path class="efm-glass" stroke-width="0.5" d="M131 152 L143 141 H198 L214 152 Z"/>
			<path class="efm-line" stroke-width="0.6" d="M172 141 V182"/>
			<ellipse class="efm-lamp" cx="268" cy="162" rx="2.6" ry="3.6"/>
			<rect class="efm-tail" x="99.6" y="157" width="3.2" height="7" rx="1.4"/>
		</g>
		<path class="efm-pipe" d="M 470 239 C 474 258 470 276 452 276 L 168 276"/>
		<rect class="efm-pipe-end" x="152" y="272" width="18" height="8" rx="2"/>
		<path class="efm-thin" d="M 306 252 L 410 254 C 440 254 452 246 460 238"/>
		<rect class="efm-tank" x="262" y="240" width="44" height="18" rx="4"/>
		<rect class="efm-rad" x="508" y="210" width="9" height="42" rx="2"/>
		<path class="efm-slats" d="M 508 218 h 9 M 508 226 h 9 M 508 234 h 9 M 508 242 h 9"/>
		<path class="efm-thin" d="M 500 214 H 508 M 500 234 H 508"/>
		${glow(474, 234, 22)}
		<rect class="efm-part" x="446" y="207" width="54" height="32" rx="5"/>
		<path class="efm-line" d="M 454 214 v 18 M 464 214 v 18 M 474 214 v 18"/>
		${glow(440, 234, 14)}
		<rect class="efm-part" x="430" y="226" width="20" height="16" rx="3"/>
		${puffs([[140, 268, 7], [124, 259, 10], [104, 247, 13]])}
		${puffs([[520, 286, 5], [533, 280, 6]], 'efm-air')}`,
	top: `${wheel(231.4, 262.7, 27.3)}${wheel(449.8, 262.7, 27.3)}
		<path class="efm-turn" d="M 433 250 A 21 21 0 0 1 466 249"/>`,
	block: [18, 64],
	hop: 'M 112 150 C 170 160 250 200 284 249',
	segs: [
		{ d: 'M 284 249 C 330 250 380 254 410 254 C 440 254 460 238 473 223', bands: [0, 1, 2, 3] },
		{ d: 'M 473 223 C 460 226 446 228 440 236 C 436 246 444 256 449.8 262.7', bands: [0] },
		{ d: 'M 473 223 C 478 250 474 276 452 276 L 180 276 C 170 276 164 274 150 270', bands: [1] },
		{ d: 'M 473 223 C 488 219 502 216 512 220 C 520 238 518 262 504 284', bands: [2] },
		{ d: 'M 473 223 C 480 230 486 233 492 236', bands: [3] },
	],
	routes: [[0, 1], [0, 2], [0, 3], [0, 4]],
	out: [[0.2, 1], [-1, -0.3], [-0.4, 1], [0.2, 1]],
	tags: [
		{ t: 'бак', x: 284, y: 232 },
		{ t: 'двигатель', x: 470, y: 150, l: [470, 155, 470, 205] },
		{ t: 'радиатор', x: 532, y: 198, a: 'start', l: [530, 202, 518, 212] },
	],
};

/* ------------------------------------------------------------------ diesel: a tractor */
const tractor: Machine = {
	label: 'Трактор: энергия дизельного топлива из бака идёт в двигатель, оттуда через коробку передач к большим задним колёсам, в выхлопную трубу, через радиатор в воздух и на трение',
	art: `${ground}
		<rect class="efm-dark" x="300" y="218" width="214" height="12" rx="3"/>
		<path class="efm-body" d="M 258 168 H 522 Q 530 168 530 176 V 212 Q 530 220 522 220 H 258 Z"/>
		<rect class="efm-rad" x="526" y="172" width="11" height="44" rx="2"/>
		<path class="efm-slats" d="M 526 180 h 11 M 526 188 h 11 M 526 196 h 11 M 526 204 h 11"/>
		<rect class="efm-body" x="136" y="158" width="136" height="22" rx="3"/>
		<rect class="efm-glass" x="146" y="84" width="114" height="76"/>
		<rect class="efm-body" x="138" y="78" width="10" height="84"/>
		<rect class="efm-body" x="258" y="78" width="10" height="92"/>
		<rect class="efm-body" x="132" y="66" width="142" height="14" rx="4"/>
		<path class="efm-line" d="M 236 156 L 222 130 M 214 128 l 16 4"/>
		<rect class="efm-dark" x="150" y="134" width="30" height="24" rx="4"/>
		<rect class="efm-tank" x="270" y="152" width="48" height="16" rx="4"/>
		<rect class="efm-tank" x="288" y="147" width="8" height="5" rx="1"/>
		<rect class="efm-pipe-end" x="336" y="84" width="8" height="86"/>
		<rect class="efm-pipe-end" x="333" y="80" width="14" height="6" rx="2"/>
		${puffs([[332, 66, 7], [320, 52, 10], [303, 38, 13]])}
		${glow(366, 212, 20)}
		<rect class="efm-part" x="300" y="176" width="120" height="38" rx="5"/>
		<path class="efm-line" d="M 312 182 v 26 M 326 182 v 26 M 340 182 v 26 M 354 182 v 26"/>
		${glow(282, 207, 14)}
		<rect class="efm-part" x="266" y="196" width="32" height="22" rx="3"/>
		<path class="efm-thin" d="M 420 194 H 526"/>
		${puffs([[420, 244, 5], [410, 254, 6]], 'efm-air')}`,
	top: `<path class="efm-fender" d="M 127.4 214 A 70 70 0 0 1 264.6 214"/>
		${wheel(196, 228, 62, 8, true)}${wheel(482, 258, 32, 6, true)}`,
	block: [424, 64],
	hop: 'M 428 146 C 390 150 320 140 294 160',
	segs: [
		{ d: 'M 294 160 C 294 182 320 194 360 195', bands: [0, 1, 2, 3] },
		{ d: 'M 360 195 C 330 200 304 207 282 207 C 250 207 220 214 196 228', bands: [0] },
		{ d: 'M 360 195 C 350 192 340 186 340 166 L 340 78', bands: [1] },
		{ d: 'M 360 195 C 420 192 490 190 530 192 C 536 208 530 222 512 223 C 486 224 462 222 444 226 C 432 230 426 238 424 248', bands: [2] },
		{ d: 'M 360 195 C 362 202 366 208 372 214', bands: [3] },
	],
	routes: [[0, 1], [0, 2], [0, 3], [0, 4]],
	out: [[0, 1], [-0.5, -1], [-0.3, 1], [0, 1]],
	tags: [
		{ t: 'бак', x: 294, y: 142 },
		{ t: 'двигатель', x: 386, y: 210 },
		{ t: 'радиатор', x: 636, y: 158, a: 'end', l: [580, 162, 534, 174] },
	],
};

/* ------------------------------------------------------------------ steam locomotive */
const loco: Machine = {
	label: 'Паровоз: уголь из тендера горит в топке, пар из котла идёт в цилиндр и толкает поршень, который вращает колёса; дым с искрами и несгоревшим углём и отработавший пар вылетают в трубу, горячий котёл нагревает воздух',
	art: `<rect class="efm-ground" x="0" y="290" width="640" height="24"/>
		<rect class="efm-rail" x="0" y="290" width="640" height="5"/>
		<path class="efm-coal" d="M 22 174 Q 34 160 54 162 Q 70 150 90 158 Q 112 152 140 174 Z"/>
		<rect class="efm-body" x="16" y="172" width="130" height="86" rx="4"/>
		<rect class="efm-dark" x="12" y="256" width="138" height="8" rx="2"/>
		<rect class="efm-body" x="150" y="118" width="72" height="140"/>
		<rect class="efm-body" x="144" y="108" width="84" height="12" rx="3"/>
		<rect class="efm-glass" x="164" y="132" width="40" height="30" rx="3"/>
		<path class="efm-body" d="M 222 140 H 500 V 204 H 222 Z"/>
		<path class="efm-body" d="M 356 140 V 132 Q 356 122 370 122 Q 384 122 384 132 V 140 Z"/>
		<rect class="efm-body" x="500" y="132" width="48" height="80" rx="6"/>
		<rect class="efm-body" x="508" y="96" width="28" height="38"/>
		<rect class="efm-body" x="503" y="90" width="38" height="9" rx="2"/>
		<path class="efm-line" d="M 280 140 V 204 M 360 140 V 204 M 440 140 V 204"/>
		<rect class="efm-dark" x="222" y="206" width="338" height="8" rx="2"/>
		<rect class="efm-part" x="490" y="218" width="58" height="28" rx="4"/>
		<path class="efm-pipe" d="M 384 132 C 430 128 486 128 492 160 C 496 186 500 206 506 218"/>
		<rect class="efm-dark" x="548" y="226" width="14" height="22" rx="2"/>
		<path class="efm-dark" d="M 548 250 L 586 288 H 548 Z"/>
		<rect class="efm-fire-box" x="192" y="196" width="62" height="50" rx="4"/>
		<path class="efm-flame" d="M 204 240 q -4 -12 4 -22 q 2 10 8 12 q 0 -14 8 -22 q 4 14 10 18 q 2 -8 8 -12 q 4 14 -2 26 Z"/>
		${puffs([[508, 66, 9], [490, 50, 12], [466, 36, 15], [440, 26, 17]])}
		${puffs([[534, 66, 9], [540, 46, 12], [536, 24, 14]], 'efm-steam')}
		${heat(286, 116, 4, 10)}`,
	top: `${wheel(40, 276, 14, 5)}${wheel(82, 276, 14, 5)}${wheel(124, 276, 14, 5)}
		${wheel(290, 256, 34, 10)}${wheel(370, 256, 34, 10)}${wheel(450, 256, 34, 10)}${wheel(524, 276, 14, 5)}
		<path class="efm-rod" d="M 304 266 H 464"/>
		<path class="efm-rod2" d="M 490 232 H 474 L 384 266"/>`,
	block: [28, 64],
	hop: 'M 76 150 C 78 156 80 162 80 168',
	segs: [
		{ d: 'M 80 168 C 130 168 176 196 223 221', bands: [0, 1, 2, 3] },
		{ d: 'M 223 221 C 236 202 250 186 280 186 L 488 186 C 508 186 516 176 516 156 L 516 82', bands: [1] },
		{ d: 'M 223 221 C 232 196 250 164 300 158', bands: [0, 2, 3] },
		{ d: 'M 300 158 C 330 150 346 136 370 132 C 430 128 486 128 492 160 C 496 186 504 214 519 232', bands: [0, 2] },
		{ d: 'M 519 232 L 474 232 L 384 266', bands: [0] },
		{ d: 'M 519 232 C 526 222 528 206 528 186 L 528 82', bands: [2] },
		{ d: 'M 300 158 C 296 142 290 128 286 104', bands: [3] },
	],
	routes: [[0, 2, 3, 4], [0, 1], [0, 2, 3, 5], [0, 2, 6]],
	out: [[0, 1], [-0.6, -1], [0.2, -1], [0, -1]],
	tags: [
		{ t: 'топка', x: 223, y: 210 },
		{ t: 'котёл', x: 420, y: 168 },
		{ t: 'цилиндр', x: 636, y: 228, a: 'end', minor: true },
		{ t: 'труба', x: 560, y: 104, a: 'start' },
	],
};

/* ------------------------------------------------------------------ thermal power station */
const tes: Machine = {
	label: 'Тепловая электростанция: топливо горит в топке котла, пар вращает турбину, а она генератор, ток по проводам идёт в дом; дым уходит в трубу, отработавший пар охлаждают в конденсаторе водой из градирни',
	art: `${ground}
		<path class="efm-tower" d="M 452 290 Q 476 200 470 96 H 522 Q 516 200 540 290 Z"/>
		<ellipse class="efm-tower-top" cx="496" cy="96" rx="26" ry="4"/>
		${puffs([[484, 74, 13], [506, 66, 15], [494, 46, 17], [520, 40, 14]], 'efm-steam')}
		<rect class="efm-body" x="230" y="20" width="14" height="270"/>
		<rect class="efm-body" x="227" y="16" width="20" height="6" rx="2"/>
		${puffs([[248, 6, 7], [264, -2, 10]])}
		<rect class="efm-body" x="124" y="118" width="104" height="172"/>
		<rect class="efm-room" x="132" y="126" width="88" height="160" rx="3"/>
		<rect class="efm-part" x="140" y="146" width="72" height="86" rx="10"/>
		<rect class="efm-fire-box" x="140" y="242" width="72" height="40" rx="4"/>
		<path class="efm-flame" d="M 150 278 q -4 -12 4 -22 q 2 10 8 12 q 0 -14 8 -22 q 4 14 10 18 q 2 -8 8 -12 q 4 14 -2 26 Z"/>
		<path class="efm-coal" d="M 10 290 Q 30 262 60 258 Q 92 262 112 290 Z"/>
		<rect class="efm-body" x="252" y="150" width="182" height="140"/>
		<rect class="efm-room" x="260" y="158" width="166" height="128" rx="3"/>
		<path class="efm-pipe" d="M 212 164 H 244 Q 264 164 264 184 V 196"/>
		<rect class="efm-dark" x="262" y="226" width="150" height="8"/>
		<path class="efm-part" d="M 266 196 L 330 186 V 226 L 266 216 Z"/>
		<rect class="efm-shaft" x="266" y="204" width="130" height="5" rx="2"/>
		${glow(371, 206, 26)}
		<rect class="efm-gen" x="342" y="186" width="56" height="40" rx="6"/>
		<path class="efm-line" d="M 352 190 V 222 M 362 190 V 222 M 372 190 V 222 M 382 190 V 222"/>
		<rect class="efm-cond" x="272" y="240" width="56" height="30" rx="5"/>
		<path class="efm-water-pipe" d="M 328 262 C 380 282 420 282 466 278"/>
		<path class="efm-pylon" d="M 566 290 L 574 140 L 582 290 M 562 140 H 586 M 568 230 L 580 252 M 580 230 L 568 252 M 570 180 L 578 196 M 578 180 L 570 196"/>
		<path class="efm-wire" d="M 396 188 Q 480 172 563 140 M 585 140 Q 606 190 612 250"/>
		<path class="efm-roof" d="M 590 254 L 614 232 L 638 254 Z"/>
		<rect class="efm-home" x="594" y="252" width="40" height="38"/>
		<rect class="efm-window" x="606" y="262" width="16" height="14"/>`,
	top: '',
	block: [14, 64],
	hop: 'M 63 150 C 63 200 62 236 62 258',
	segs: [
		{ d: 'M 62 262 C 100 266 140 266 176 262', bands: [0, 1, 2, 3] },
		{ d: 'M 176 262 C 196 236 200 150 214 128 C 222 116 237 116 237 94 L 237 14', bands: [1] },
		{ d: 'M 176 262 C 166 230 160 196 178 176 C 196 160 240 162 256 172 C 266 180 268 198 298 206', bands: [0, 2, 3] },
		{ d: 'M 298 206 L 371 206 C 400 200 470 176 566 140 C 596 150 610 190 614 268', bands: [0] },
		{ d: 'M 298 206 L 300 256 C 340 286 420 286 470 278 C 492 270 496 200 496 100 L 496 60', bands: [2] },
		{ d: 'M 298 206 C 330 196 344 182 350 164', bands: [3] },
	],
	routes: [[0, 2, 3], [0, 1], [0, 2, 4], [0, 2, 5]],
	out: [[0, 1], [0.5, -1], [0, -1], [0, -1]],
	tags: [
		{ t: 'котёл', x: 176, y: 142 },
		{ t: 'турбина', x: 298, y: 180 },
		{ t: 'генератор', x: 372, y: 248, minor: true },
		{ t: 'конденсатор', x: 300, y: 300, minor: true },
		{ t: 'градирня', x: 496, y: 128 },
	],
};

export const MACHINES: Record<MachineId, Machine> = { petrol: car, diesel: tractor, loco, tes };
