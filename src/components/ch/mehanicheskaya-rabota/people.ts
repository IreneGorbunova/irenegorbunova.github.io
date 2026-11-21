/**
 * People in indoor clothes for the pictures of «Механическая работа и мощность» and many other chapters. Since 21 Nov
 * 2026 a thin adapter over the shared people kit (src/components/people/): the body, the clothes, the joint limits and
 * the hands with a palm, a thumb and four fingers come from there; this file keeps its old API so its callers did not
 * change. Proportions (in parts of the height H): hip joint 0,52 H, thigh 0,24 H, shin 0,235 H, shoulder joint 0,79 H,
 * upper arm 0,18 H, forearm 0,135 H, hand 0,105 H, head radius 0,064 H (about 7½ heads); the elbow bends 0–150° forward
 * only, the knee 0–150° backward only. Hair (short or a ponytail), a shirt or a sleeveless singlet, trousers or shorts,
 * trainers 26 см long for a grown-up (shorter for a child: in proportion to the height).
 *
 * The caller gives a pose in its own SVG coordinates (px): the hip joint, the lean of the body, the ankles, the angles
 * of the feet, the hands. A hand target is the center of the grip (a 3 см handle; a hand that hangs is relaxed instead),
 * or, when `palms` gives an angle, the middle of a flat palm with the fingers along that angle, as when one presses on
 * a wall. `grips` (optional) gives a kit hand pose per hand instead. `dir: -1` draws the person facing left (the caller
 * still passes real coordinates). Colors come from the classes `hm-*` (PeopleStyles.astro).
 */
import { figure, type HandTarget } from '@components/people/body';
import type { Pt } from '@components/people/core';

export type { Pt };

export interface HumanOpts {
	s: number; // px per centimeter
	H: number; // height, см
	girth?: number; // 1 = average build
	shirt: string; // class of the shirt color
	hair?: 'short' | 'pony';
	bare?: boolean; // a sleeveless singlet: bare arms
	shorts?: boolean;
	dir?: 1 | -1; // 1 faces right, −1 faces left
}

export interface HumanPose {
	hip: Pt;
	lean: number; // rad, the body leans forward
	ankles: [Pt, Pt]; // near, far
	feet: [number, number]; // rad, positive = toe down
	hands: [Pt, Pt]; // near, far: the center of the grip or of the flat hand
	palms?: [number | null, number | null]; // rad, the direction of the fingers of a flat hand (−π/2 = up)
	head?: number; // rad, the head turns down
	grips?: [Omit<HandTarget, 'at'> | null, Omit<HandTarget, 'at'> | null]; // kit hand poses (optional)
	planted?: [boolean, boolean];
}

/** Height of the ankle above the floor in trainers, см (for a grown-up; a child's foot is smaller in proportion). */
export const ANKLE = 7;

/** Builds a person into `g` and returns the function that poses it. */
export const human = (g: SVGGElement, o: HumanOpts) => {
	const fig = figure(g, { ...o, clothes: 'indoor', prefix: 'hm', legacy: true, name: 'human' });
	const hand = (p: HumanPose, i: 0 | 1): HandTarget => {
		const palm = p.palms?.[i];
		const kit = p.grips?.[i];
		if (kit) return { ...kit, at: p.hands[i] };
		if (palm !== null && palm !== undefined) return { at: p.hands[i], pose: 'flat', dir: palm };
		return { at: p.hands[i] };
	};
	return (p: HumanPose) => {
		fig.pose({ hip: p.hip, lean: p.lean, ankles: p.ankles, feet: p.feet, head: p.head, hands: [hand(p, 0), hand(p, 1)], planted: p.planted });
	};
};

/**
 * Walking: the positions of two feet when the body has moved by `d` px, with steps of `step` px. Each foot stands
 * for one step of the body and swings forward by two steps during the next one (lifted by `lift` px at most).
 * `base` is where the near foot stands at d = 0; the far one starts half a cycle later.
 */
export type Foot = { x: number; up: number; swing: number; from: number; to: number; e: number };
export const gait = (d: number, step: number, base: number, lift: number): [Foot, Foot] => {
	const one = (i: number): Foot => {
		const q = d / step + i;
		const n = Math.floor(q / 2);
		const ph = q - 2 * n;
		const sw = ph < 1 ? 0 : ph - 1;
		const e = sw * sw * (3 - 2 * sw);
		const from = base - i * step + 2 * step * n;
		return { x: from + 2 * step * e, up: lift * Math.sin(Math.PI * sw), swing: sw, from, to: from + 2 * step, e };
	};
	return [one(0), one(1)];
};
