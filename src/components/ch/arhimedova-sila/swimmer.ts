/**
 * A person in swimwear, drawn in profile facing right, for the pictures of «Архимедова сила. Плавание тел» (the ball
 * in the pool, the Dead Sea). Since 21 Nov 2026 a thin adapter over the shared people kit (src/components/people/):
 * bare skin, swim trunks, short hair, bare feet 25 см long, relaxed hands with a palm, a thumb and four fingers; the
 * knees and elbows bend within their limits (0–150°). Proportions in parts of the height H: hip joint 0,52 H, thigh
 * 0,24 H, shin 0,235 H, shoulder joint 0,79 H, upper arm 0,18 H, forearm 0,135 H, hand 0,105 H, head 0,128 H across.
 *
 * The pose works at any angle: `lean` = 0 stands upright, −π/2 lies on the back with the head to the left and the
 * face up (then pass `head` = −0,6·π/2 so that the face looks straight up). A hand target is the middle of the hand.
 *
 * Colors come from classes `sw-*`, defined in SwimmerStyles.astro (from theme variables); the trunks color is the
 * caller's class.
 */
import { figure, type HandTarget } from '@components/people/body';
import type { Pt } from '@components/people/core';

export type { Pt };

export interface SwimmerOpts {
	s: number; // px per centimeter
	H: number; // height, см
	girth: number; // 1 = average build
	suit: string; // class of the trunks color
}

export interface SwimPose {
	hip: Pt;
	lean: number; // rad, the body leans forward (−π/2: lying on the back)
	ankles: [Pt, Pt]; // near, far
	feet: [number, number]; // rad, positive = toe down
	hands: [Pt, Pt]; // near, far
	head?: number; // rad, the head turns down
	knees?: 1 | -1; // 1 = the knees bend forward (default)
	grips?: [Omit<HandTarget, 'at'> | null, Omit<HandTarget, 'at'> | null]; // kit hand poses (optional)
}

/** Height of the ankle above the sole of a bare foot, см. */
export const ANKLE = 7;

/** Builds a swimmer into `g` and returns the function that poses it. */
export const swimmer = (g: SVGGElement, o: SwimmerOpts) => {
	const fig = figure(g, { s: o.s, H: o.H, girth: o.girth, shirt: o.suit, clothes: 'swim', prefix: 'sw', legacy: true, name: 'swimmer' });
	const hand = (p: SwimPose, i: 0 | 1): HandTarget => ({ pose: 'relaxed', ...(p.grips?.[i] ?? {}), at: p.hands[i] });
	return (p: SwimPose) => {
		fig.pose({ hip: p.hip, lean: p.lean, ankles: p.ankles, feet: p.feet, head: p.head, knees: p.knees, hands: [hand(p, 0), hand(p, 1)] });
	};
};
