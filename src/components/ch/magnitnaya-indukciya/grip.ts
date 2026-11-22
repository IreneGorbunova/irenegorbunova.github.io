/**
 * Hands for the rules of this chapter, built from the people kit (people/hand.ts): a hand that grips a rod (a wire or
 * a coil) with the thumb stretched along it, a flat hand with the thumb set out at 90° (the left-hand rule), and the
 * forearm with a shirt sleeve that the hand grows from. Lengths are in parts of the hand length Lh (wrist to the tip of
 * the middle finger), as in hand.ts. The thumb keeps the kit's bone lengths (0,24 + 0,17 + 0,13).
 */
import { handBasis, handShape, wristFor, type HandShape, type Side, type V3 } from '@components/people/hand';
import type { Pt } from '@components/people/core';

const TB: V3 = [0.08, -0.03, 0.11]; // the base of the thumb (CMC), hand.ts
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const norm = (a: V3): V3 => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** The point of the rod's axis in the hand frame for a rod of diameter d. */
export const rodAxis = (d: number): V3 => [0.45, -(0.055 + d / 2), 0];

/**
 * A grip around a rod of diameter d (local z along the rod) with the thumb stretched along the rod (+z), lying on the
 * rod's side next to the wrist: the metacarpal swings toward the rod, the two phalanges run along it.
 */
export const thumbAlong = (d: number): HandShape => {
	const g = handShape('grip', d);
	const ax = rodAxis(d);
	const tip: V3 = [ax[0] - (d / 2 + 0.03), ax[1] - 0.005, 0.55];
	const j1 = add(TB, mul(norm([0.24, -0.09, 0.19]), 0.24));
	const u = norm(sub(tip, j1));
	const j2 = add(j1, mul(u, 0.17));
	return { f: g.f, s: g.s, th: [j1, j2, add(j2, mul(u, 0.13))] };
};

/**
 * A flat hand (fingers straight and together) with the thumb set out in the plane of the palm at 90° to the fingers
 * (the left-hand rule): the thumb runs along +z (its own side), slightly bent at the joints.
 */
export const thumbOut = (): HandShape => {
	const f = handShape('flat');
	const j1 = add(TB, mul(norm([0.25, -0.02, 0.97]), 0.24));
	const u = norm([0.08, 0, 1]);
	const j2 = add(j1, mul(u, 0.17));
	return { f: f.f, s: f.s, th: [j1, j2, add(j2, mul(u, 0.13))] };
};

/** The wrist that puts the local point `p` at `target` for a hand of length Lh with this direction and roll. */
export const place = (side: Side, target: Pt, dir: number, roll: number, Lh: number, p: V3) => wristFor(side, target, dir, roll, Lh, p);

/** The 3D directions of a placed hand: a (fingers), b (back), t (thumb side); screen frame (x right, y down, z to us). */
export const basis = (side: Side, dir: number, roll: number) => handBasis(side, dir, roll) as { a: V3; b: V3; t: V3 };

/**
 * A forearm (skin) and a shirt sleeve from the wrist backward along −a (screen direction of the fingers `dir`), drawn as
 * two tapered quads; the forearm starts 0,1·Lh inside the hand so the hand, drawn later, covers the joint.
 */
export const forearm = (wrist: Pt, dir: number, Lh: number, len = 1.8) => {
	const ax = -Math.cos(dir);
	const ay = -Math.sin(dir);
	const px = -ay;
	const py = ax;
	const at = (s: number, w: number) => `${(wrist.x + ax * s * Lh + px * w * Lh).toFixed(1)} ${(wrist.y + ay * s * Lh + py * w * Lh).toFixed(1)}`;
	return {
		skin: `M${at(-0.1, 0.13)}L${at(0.8, 0.2)}L${at(0.8, -0.2)}L${at(-0.1, -0.13)}Z`,
		sleeve: `M${at(0.66, 0.25)}L${at(len, 0.3)}L${at(len, -0.3)}L${at(0.66, -0.25)}Z`,
	};
};
