/**
 * Circuit symbols (as on school diagrams) for the circuit builder. Every symbol is drawn horizontally around
 * (0, 0) with its leads reaching x = ±45; the current of the builder goes through it from left to right,
 * so a source has its «+» (long thin plate) on the right. Texts are returned separately so that they stay
 * upright when the symbol is rotated.
 */
export type Kind = 'empty' | 'wire' | 'cell' | 'battery' | 'key' | 'lamp' | 'resistor' | 'bell' | 'ammeter' | 'voltmeter';

export const PARTS: { kind: Kind; name: string; short: string }[] = [
	{ kind: 'wire', name: 'соединительный провод', short: 'провод' },
	{ kind: 'cell', name: 'гальванический элемент 1,5 В', short: 'элемент 1,5 В' },
	{ kind: 'battery', name: 'батарея элементов 4,5 В', short: 'батарея 4,5 В' },
	{ kind: 'key', name: 'ключ', short: 'ключ' },
	{ kind: 'lamp', name: 'электрическая лампа', short: 'лампа' },
	{ kind: 'resistor', name: 'резистор', short: 'резистор' },
	{ kind: 'bell', name: 'электрический звонок', short: 'звонок' },
	{ kind: 'ammeter', name: 'амперметр', short: 'амперметр' },
	{ kind: 'voltmeter', name: 'вольтметр', short: 'вольтметр' },
	{ kind: 'empty', name: 'убрать (разрыв цепи)', short: 'убрать' },
];

type Txt = { x: number; y: number; t: string; cls: string };
const lead = (a: number, b: number) => `<line class="cb__w" x1="${a}" y1="0" x2="${b}" y2="0"/>`;
const plates = (xm: number, xp: number) =>
	`<line class="cb__plate cb__plate--minus" x1="${xm}" y1="-8" x2="${xm}" y2="8"/>` +
	`<line class="cb__plate" x1="${xp}" y1="-17" x2="${xp}" y2="17"/>`;

export const symbol = (kind: Kind, closed = true): { body: string; texts: Txt[] } => {
	switch (kind) {
		case 'empty':
			return {
				body:
					lead(-45, -30) +
					lead(30, 45) +
					'<circle class="cb__end" cx="-30" cy="0" r="3"/><circle class="cb__end" cx="30" cy="0" r="3"/>' +
					'<rect class="cb__hole" x="-20" y="-16" width="40" height="32" rx="6"/>',
				texts: [{ x: 0, y: 6, t: '?', cls: 'cb__q' }],
			};
		case 'wire':
			return { body: lead(-45, 45), texts: [] };
		case 'cell':
			return {
				body: lead(-45, -5) + lead(5, 45) + plates(-5, 5),
				texts: [
					{ x: -15, y: -16, t: '−', cls: 'cb__pm' },
					{ x: 15, y: -16, t: '+', cls: 'cb__pm' },
				],
			};
		case 'battery':
			return {
				body:
					lead(-45, -19) +
					lead(19, 45) +
					plates(-19, -11) +
					plates(11, 19) +
					'<line class="cb__dash" x1="-9" y1="0" x2="9" y2="0"/>',
				texts: [
					{ x: -29, y: -16, t: '−', cls: 'cb__pm' },
					{ x: 29, y: -16, t: '+', cls: 'cb__pm' },
				],
			};
		case 'key':
			return {
				body:
					lead(-45, -18) +
					lead(18, 45) +
					`<line class="cb__lever" x1="-18" y1="0" x2="${closed ? 18 : 13}" y2="${closed ? 0 : -18}"/>` +
					'<circle class="cb__contact" cx="-18" cy="0" r="3.5"/><circle class="cb__contact" cx="18" cy="0" r="3.5"/>',
				texts: [],
			};
		case 'lamp':
			return {
				body:
					'<circle class="cb__glow" cx="0" cy="0" r="44"/>' +
					lead(-45, -15) +
					lead(15, 45) +
					'<circle class="cb__ring" cx="0" cy="0" r="15"/>' +
					'<line class="cb__w" x1="-10.6" y1="-10.6" x2="10.6" y2="10.6"/><line class="cb__w" x1="-10.6" y1="10.6" x2="10.6" y2="-10.6"/>',
				texts: [],
			};
		case 'resistor':
			return {
				body: lead(-45, -21) + lead(21, 45) + '<rect class="cb__ring" x="-21" y="-8" width="42" height="16"/>',
				texts: [],
			};
		case 'bell':
			return {
				body:
					lead(-45, -8) +
					lead(8, 45) +
					'<g class="cb__bell"><path class="cb__ring" d="M -16 -2 A 16 16 0 0 1 16 -2 Z"/></g>' +
					'<line class="cb__w" x1="-8" y1="0" x2="-8" y2="-2"/><line class="cb__w" x1="8" y1="0" x2="8" y2="-2"/>',
				texts: [],
			};
		case 'ammeter':
		case 'voltmeter':
			return {
				body: lead(-45, -16) + lead(16, 45) + '<circle class="cb__ring cb__meter" cx="0" cy="0" r="16"/>',
				texts: [{ x: 0, y: 6, t: kind === 'ammeter' ? 'A' : 'V', cls: 'cb__letter' }],
			};
	}
};

/** A symbol as a small standalone SVG (for the palette). */
export const icon = (kind: Kind) => {
	const { body, texts } = symbol(kind, false);
	const t = texts.map((x) => `<text class="${x.cls}" x="${x.x}" y="${x.y}" text-anchor="middle">${x.t}</text>`).join('');
	return `<svg class="cb__icon" viewBox="-48 -26 96 44" aria-hidden="true">${body}${t}</svg>`;
};
