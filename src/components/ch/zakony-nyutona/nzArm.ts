/**
 * A forearm with a sleeve and a hand of the shared people kit (hand.ts: a palm, a thumb and four fingers) that enters a
 * picture from its edge, for the block pressed to a wall in «Силы в механике». The hand is placed by its contact point
 * (contactLocal of the kit: the middle of a flat palm), the direction of its fingers and the roll of its palm; the
 * forearm goes on from the wrist, turned by `bend` within the kit's wrist limit of ±70°. Colors: the kit's classes
 * (PeopleStyles.astro): hm-skin, hm-outline, hm-limb-skin and a sleeve class (hm-blue).
 * Adapted from ch/atmosfernoe-davlenie/kitArm.ts (kept separate so the two chapters do not depend on each other).
 */
import { LIMITS, clamp, mk, P1, type Pt } from '@components/people/core';
import { contactLocal, hand, handShape, wristFor, type HandPose, type Side } from '@components/people/hand';

export interface ArmOpts {
	Lh: number; // px, wrist to the tip of the middle finger
	side: Side;
	sleeve: string; // class of the sleeve's color
	reach?: number; // px, how far the sleeve goes on past the elbow
}
export interface ArmPose {
	at: Pt; // the contact point of the hand pose
	pose: HandPose;
	dir: number; // rad, screen direction of the fingers
	roll: number; // rad, see hand.ts
	bend?: number; // rad, the forearm's turn against the hand's direction (the wrist angle)
}

export const nzArm = (parent: Element, o: ArmOpts) => {
	const w = 0.37 * o.Lh;
	const fore = 1.29 * o.Lh;
	const reach = o.reach ?? 3 * o.Lh;
	const fo = mk(parent, 'path', { class: 'hm-outline', 'stroke-width': (w + 1.4).toFixed(1) });
	const fs = mk(parent, 'path', { class: 'hm-limb-skin', 'stroke-width': w.toFixed(1) });
	const so = mk(parent, 'path', { class: 'hm-outline', 'stroke-width': (1.25 * w + 1.4).toFixed(1) });
	const ss = mk(parent, 'path', { class: `hm-limb ${o.sleeve}`, 'stroke-width': (1.25 * w).toFixed(1) });
	const hd = hand(parent, { cls: 'hm-skin', side: o.side, Lh: o.Lh });
	return (p: ArmPose) => {
		const shape = handShape(p.pose);
		const cl = contactLocal(p.pose, shape);
		const wrist = wristFor(o.side, p.at, p.dir, p.roll, o.Lh, cl);
		hd.set({ wrist, dir: p.dir, roll: p.roll }, shape, p.pose, cl);
		const a = p.dir + Math.PI + clamp(p.bend ?? 0, -LIMITS.wristBend, LIMITS.wristBend);
		const elbow = { x: wrist.x + fore * Math.cos(a), y: wrist.y + fore * Math.sin(a) };
		const cuff = { x: wrist.x + 0.45 * fore * Math.cos(a), y: wrist.y + 0.45 * fore * Math.sin(a) };
		const end = { x: elbow.x + reach * Math.cos(a), y: elbow.y + reach * Math.sin(a) };
		const df = `M${P1(wrist)} L${P1(elbow)}`;
		const ds = `M${P1(cuff)} L${P1(end)}`;
		fo.setAttribute('d', df);
		fs.setAttribute('d', df);
		so.setAttribute('d', ds);
		ss.setAttribute('d', ds);
		return { wrist, elbow };
	};
};
