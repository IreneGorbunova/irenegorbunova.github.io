/**
 * School (GOST) circuit symbols for the circuit constructor. Every part is drawn horizontally around (0, 0)
 * with its leads reaching x = ±50 (two grid cells): end a at x = −50, end b at x = +50. The «+» of a source
 * (long thin plate) and of a meter is at end a. Letters and labels are not part of the body: the board draws
 * them upright. The body is split into leads (drawn under the moving electrons) and the body itself
 * (drawn over them and hiding them).
 */
import type { Kind } from './solver';

export type State = { closed?: boolean; broken?: boolean };

/** half length of the part's body along the segment: electrons are hidden there */
export const HALF: Record<Kind, number> = {
	source: 10,
	key: 16,
	lamp: 16,
	resistor: 21,
	rheostat: 21,
	ammeter: 16,
	voltmeter: 16,
	fuse: 19,
	wire: 0,
};

const ln = (x1: number, y1: number, x2: number, y2: number, cls = 'ck__w') =>
	`<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;

/** the two leads from the ends to the body */
export const leads = (kind: Kind, end = 50) => {
	if (kind === 'wire') return ln(-end, 0, end, 0);
	const h = kind === 'source' ? 6 : HALF[kind];
	return ln(-end, 0, -h, 0) + ln(kind === 'source' ? 4 : h, 0, end, 0);
};

const cross = (r: number, cls: string) => {
	const c = (r * Math.SQRT1_2).toFixed(2);
	return `<path class="${cls}" d="M -${c} -${c} L ${c} ${c} M ${c} -${c} L -${c} ${c}"/>`;
};

/** the body of a part (without leads and letters) */
export const body = (kind: Kind, s: State = {}) => {
	switch (kind) {
		case 'source':
			return (
				'<rect class="ck__bg" x="-12" y="-21" width="26" height="42"/>' +
				ln(-6, -18, -6, 18, 'ck__plate') +
				'<rect class="ck__minus" x="4" y="-9" width="6" height="18"/>'
			);
		case 'key':
			return (
				ln(-16, 0, s.closed ? 17 : 12, s.closed ? -3.5 : -17, 'ck__w ck__lever') +
				'<circle class="ck__contact" cx="-16" cy="0" r="3.6"/><circle class="ck__contact" cx="16" cy="0" r="3.6"/>'
			);
		case 'lamp':
			if (s.broken) {
				// broken filament: the cross with a gap in the middle, and a crack
				const k = 11.3;
				const g = 4.2;
				return (
					'<circle class="ck__glass ck__glass--dead" r="16"/>' +
					`<path class="ck__fil ck__fil--dead" d="M -${k} -${k} L -${g} -${g + 1.6} M ${k} ${k} L ${g} ${g + 1.6} M ${k} -${k} L ${g + 1.6} -${g} M -${k} ${k} L -${g + 1.6} ${g}"/>`
				);
			}
			return '<circle class="ck__glass" r="16"/><circle class="ck__heat" r="16" opacity="0"/>' + cross(16, 'ck__fil') + cross(16, 'ck__fil ck__fil--hot').replace('<path', '<path opacity="0"');
		case 'resistor':
			return '<rect class="ck__box" x="-21" y="-8" width="42" height="16"/>';
		case 'rheostat':
			return (
				'<rect class="ck__box" x="-21" y="-8" width="42" height="16"/>' +
				ln(-17, 15, 13, -12, 'ck__w ck__arrow') +
				'<path class="ck__ah" d="M 19 -17 L 8.5 -14.5 L 15.5 -7.5 Z"/>'
			);
		case 'ammeter':
		case 'voltmeter':
			return '<circle class="ck__box" r="16"/>';
		case 'fuse':
			return (
				'<rect class="ck__box" x="-19" y="-7" width="38" height="14"/>' +
				(s.broken
					? '<path class="ck__w ck__melt" d="M -19 0 H -6 L -3.5 -3.5 M 19 0 H 6 L 3.5 3.5"/>'
					: ln(-19, 0, 19, 0))
			);
		case 'wire':
			return '';
	}
};

/** a small standalone symbol for the palette */
export const icon = (kind: Kind) => {
	const letter = kind === 'ammeter' ? 'A' : kind === 'voltmeter' ? 'V' : '';
	const state = { closed: false };
	return (
		`<svg class="ck__icon" viewBox="-54 -22 108 44" aria-hidden="true">${leads(kind, 52)}${body(kind, state)}` +
		(letter ? `<text class="ck__letter" x="0" y="6">${letter}</text>` : '') +
		'</svg>'
	);
};
