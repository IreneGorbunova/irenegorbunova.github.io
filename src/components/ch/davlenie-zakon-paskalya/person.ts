/**
 * A person in winter clothes, drawn in profile facing right, for DavIntro.astro (the snow scene), PressureLab.astro and
 * other chapters. Since 21 Nov 2026 a thin adapter over the shared people kit (src/components/people/), which draws the
 * body, the clothes and the mittens (a mitten shape with a separate thumb, closed round what the hand holds) and bends
 * the knees and elbows within their limits (the knee 0–150° backward only, the elbow 0–150° forward only); the API is
 * the old one. The caller gives a pose in its own SVG coordinates (px): the hip joint, the lean of the body, both ankles
 * with the angles of the feet, both hands (the center of the grip; a hanging hand is relaxed), the tips of the poles.
 *
 * Proportions are those of an adult (in parts of the height H): hip joint 0,52 H, knee 0,28 H, ankle 0,045 H,
 * shoulder joint 0,79 H, upper arm 0,18 H, forearm 0,135 H, hand 0,105 H. The footwear keeps its real size whatever the
 * height: a winter boot 28 см long (its sole is about 150 см²), a ski 180 × 8 см, a snowshoe 60 × 25 см, a skate blade
 * 27 см long under the boot. `girth` (1 for an average build) makes the body and the limbs thicker or thinner.
 *
 * Colors come from classes `pp-*`; the component that uses the module defines them (from theme variables).
 */
import { figure, type HandTarget } from '@components/people/body';
import { ik, type Pt } from '@components/people/core';

export type { Pt };
export type Gear = 'boot' | 'ski' | 'shoe' | 'skate';

export interface PersonOpts {
	s: number; // px per centimeter
	H: number; // height, см
	girth: number; // 1 = average build
	gear: Gear;
	coat: string; // class of the jacket color
	poles?: boolean;
}

export interface Pose {
	hip: Pt;
	lean: number; // rad, the body leans forward
	ankles: [Pt, Pt]; // near, far
	feet: [number, number]; // rad, positive = toe down
	hands: [Pt, Pt]; // near, far
	poleTips?: [Pt, Pt];
	head?: number; // rad, the head turns down
	grips?: [Omit<HandTarget, 'at'> | null, Omit<HandTarget, 'at'> | null]; // kit hand poses (optional)
	planted?: [boolean, boolean];
}

/** Height of the ankle above the ground under the footwear, см. */
export const ANKLE: Record<Gear, number> = { boot: 8, ski: 10.5, shoe: 9.5, skate: 15.5 };

/**
 * The bend joint between a and b for segments l1, l2; side 1 bends to the right of a→b turned clockwise (knees
 * forward). The kit's two-bone IK: the segments keep their lengths (a target out of reach is approached along a→b).
 */
export const joint = (a: Pt, b: Pt, l1: number, l2: number, side: 1 | -1): { j: Pt; end: Pt } => {
	const { j, end } = ik(a, b, l1, l2, side, Math.PI * 0.999);
	return { j, end };
};

/** Builds a person into `g` and returns the function that poses it. */
export const person = (g: SVGGElement, o: PersonOpts) => {
	const fig = figure(g, { s: o.s, H: o.H, girth: o.girth, gear: o.gear, poles: o.poles, shirt: o.coat, clothes: 'winter', prefix: 'pp', covering: 'mitten', legacy: true, name: 'winter' });
	const hand = (p: Pose, i: 0 | 1): HandTarget => ({ ...(p.grips?.[i] ?? (p.poleTips ? { pose: 'grip', d: 2.5 } : {})), at: p.hands[i] });
	return (p: Pose) => {
		fig.pose({ hip: p.hip, lean: p.lean, ankles: p.ankles, feet: p.feet, head: p.head, hands: [hand(p, 0), hand(p, 1)], poleTips: p.poleTips, planted: p.planted });
	};
};
