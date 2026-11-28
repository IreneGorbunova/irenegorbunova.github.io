/**
 * A forearm that enters a close-up picture from its edge, with a hand of the shared people kit (hand.ts: a palm, a
 * thumb and four fingers) and a sleeve, for the scenes and pictures of «Газовые законы» that show only a hand (a copy of
 * ch/atmosfernoe-davlenie/kitArm.ts, kept separate so the two chapters do not depend on each other). The hand is
 * placed by its contact point (contactLocal of the kit: the middle of a flat palm, the center of a grip, the pads of a
 * pinch), the direction of its fingers and the roll of its palm; the wrist stays straight (the forearm goes on from the
 * hand, turned by `bend`, which keeps within the kit's wrist limit of ±70°). Colors: the kit's classes hm-* (skin,
 * outline) and a sleeve class with a stroke color (a class of this chapter, e.g. gz-sleeve-blue).
 */
import { LIMITS, clamp, mk, P1, type Pt } from '@components/people/core';
import { contactLocal, hand, handShape, wristFor, type HandPose, type HandShape, type Side } from '@components/people/hand';

export interface ArmOpts {
	Lh: number; // px, wrist to the tip of the middle finger
	side: Side; // the hand: 'R' right, 'L' left
	sleeve: string; // class of the sleeve's color
	fore?: number; // px, forearm length (default 1,29 Lh, as the kit's adult)
	reach?: number; // px, how far the sleeve goes on past the elbow (out of the picture)
}
export interface ArmPose {
	at: Pt; // the contact point of the hand pose
	pose: HandPose;
	dir: number; // rad, screen direction of the fingers
	roll: number; // rad, see hand.ts
	d?: number; // grip or pinch width, parts of Lh
	shape?: HandShape;
	bend?: number; // rad, the forearm's turn against the hand's direction (the wrist angle)
}

export const gzArm = (parent: Element, o: ArmOpts) => {
	const w = 0.37 * o.Lh; // forearm width near the wrist: about 6,5 см for a hand of 18 см
	const fore = o.fore ?? 1.29 * o.Lh;
	const reach = o.reach ?? 3 * o.Lh;
	const fo = mk(parent, 'path', { class: 'hm-outline', 'stroke-width': (w + 1.4).toFixed(1) });
	const fs = mk(parent, 'path', { class: 'hm-limb-skin', 'stroke-width': w.toFixed(1) });
	const so = mk(parent, 'path', { class: 'hm-outline', 'stroke-width': (1.25 * w + 1.4).toFixed(1) });
	const ss = mk(parent, 'path', { class: `hm-limb ${o.sleeve}`, 'stroke-width': (1.25 * w).toFixed(1) });
	const hd = hand(parent, { cls: 'hm-skin', side: o.side, Lh: o.Lh });
	return (p: ArmPose) => {
		const d = p.d ?? 0.25;
		const shape = p.shape ?? handShape(p.pose, d);
		const cl = contactLocal(p.pose, shape, d);
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
