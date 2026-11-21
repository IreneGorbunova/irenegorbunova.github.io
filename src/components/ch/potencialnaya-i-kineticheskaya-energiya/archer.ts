/**
 * The boy with the toy bow of «Потенциальная и кинетическая энергия» (EnIntro, ElasticPicture), drawn by the shared
 * people kit with a child's proportions (about 6 heads; 1,25 м is a boy of about seven). Indoor clothes: a shirt,
 * shorts, trainers (classes hm-*).
 *
 * The pose. In profile both shoulders are at one place, so a straight bow arm and a draw of 30 см cannot both be at
 * shoulder height (the elbow bends at most 150°, the drawing hand cannot come closer to its shoulder than about 0,11 of
 * the height). The boy therefore stands in a wide archer's stance, the arrow at the level of his chin (about 12 см above
 * the shoulder), the bow arm reaching forward and a little up; the drawing hand hooks the string with its fingers (the
 * wrist straight) and at full draw comes back under the ear.
 *
 * The far (left) hand grips the bow handle (a 2,5 см handle, the palm toward the viewer, the thumb up), the near
 * (right) hand the string. Both hands are given as contact points: `grip` the bow handle, `nock` the string where it
 * is drawn; the feet stand still.
 */
import { figure } from '@components/people/body';
import { ROLL } from '@components/people/hand';
import type { Pt } from '@components/people/core';

export interface ArcherOpts {
	s: number; // px per см
	H: number; // height, см
	hipX: number; // the hip joint, x
	ground: number; // the ground, y
}

/** Builds the boy into `g`; returns `pose(grip, nock)`. */
export const archer = (g: SVGGElement, o: ArcherOpts) => {
	const fig = figure(g, { s: o.s, H: o.H, age: 'child', clothes: 'indoor', prefix: 'hm', shirt: 'hm-blue', hair: 'short', shorts: true, name: 'archer' });
	const u = o.s * o.H;
	// the hip 0,43 of the height above the ground (straight legs: 0,48): the wide stance and the knees a little bent
	const hip: Pt = { x: o.hipX, y: o.ground - 0.43 * u };
	const ank = o.ground - 7 * o.s * Math.min(1, o.H / 172);
	const ankles: [Pt, Pt] = [
		{ x: o.hipX + 0.12 * u, y: ank },
		{ x: o.hipX - 0.11 * u, y: ank },
	];
	return (grip: Pt, nock: Pt) =>
		fig.pose({
			hip,
			lean: -0.04,
			head: 0.06,
			ankles,
			feet: [0, 0],
			planted: [true, true],
			hands: [
				{ at: nock, pose: 'grip', d: 0.6, contact: 'string' }, // the fingers go on from the forearm (the wrist straight)
				{ at: grip, pose: 'grip', d: 2.5, dir: -0.15, roll: ROLL.palmViewer, contact: 'bow' },
			],
		});
};
