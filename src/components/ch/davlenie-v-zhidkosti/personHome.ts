/**
 * A person in light clothes (a shirt with short sleeves, trousers, low shoes, bare head with short hair), drawn in
 * profile facing right, for ZhidIntro.astro and the chapters on simple machines and efficiency. Since 21 Nov 2026 a thin
 * adapter over the shared people kit (src/components/people/), which draws the body, the clothes and the hands (a palm,
 * a thumb and four fingers, closed round what they hold) and bends the knees and elbows within their limits (the knee
 * 0–150° backward only, the elbow 0–150° forward only); the API is the old one. To face left, the caller mirrors the
 * group.
 *
 * Proportions (in parts of the height H): hip joint 0,52 H, thigh 0,24 H, shin 0,235 H, shoulder joint 0,79 H, upper
 * arm 0,18 H, forearm 0,135 H, hand 0,105 H, head 0,13 H across. A shoe is 27 см long whatever the height. A hand
 * target is the center of the grip (a 3 см handle or rope; a hanging hand is relaxed).
 *
 * Colors come from classes `ph-*`; the component that uses the module defines them (from theme variables).
 */
import { figure, type HandTarget } from '@components/people/body';
import { joint, type Pt } from '../davlenie-zakon-paskalya/person';

export type { Pt };
export { joint };

export interface PersonOpts {
	s: number; // px per centimeter
	H: number; // height, см
	girth: number; // 1 = average build
	shirt: string; // class of the shirt color
}

export interface Pose {
	hip: Pt;
	lean: number; // rad, the body leans forward
	ankles: [Pt, Pt]; // near, far
	feet: [number, number]; // rad, positive = toe down
	hands: [Pt, Pt]; // near, far
	head?: number; // rad, the head turns down
	grips?: [Omit<HandTarget, 'at'> | null, Omit<HandTarget, 'at'> | null]; // kit hand poses (optional)
	planted?: [boolean, boolean];
}

/** Height of the ankle above the ground in a shoe, см. */
export const ANKLE = 7.5;

/** Builds a person into `g` and returns the function that poses it. */
export const person = (g: SVGGElement, o: PersonOpts) => {
	const fig = figure(g, { s: o.s, H: o.H, girth: o.girth, shirt: o.shirt, clothes: 'home', prefix: 'ph', legacy: true, name: 'home' });
	const hand = (p: Pose, i: 0 | 1): HandTarget => ({ ...(p.grips?.[i] ?? {}), at: p.hands[i] });
	return (p: Pose) => {
		fig.pose({ hip: p.hip, lean: p.lean, ankles: p.ankles, feet: p.feet, head: p.head, hands: [hand(p, 0), hand(p, 1)], planted: p.planted });
	};
};
