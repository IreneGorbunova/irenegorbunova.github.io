/**
 * A forearm that enters a close-up picture from its edge, with a hand of the shared people kit (hand.ts: a palm, a
 * thumb and four fingers; a knitted glove with fingers or a mitten with a separate thumb), for the scenes and pictures
 * of «Конденсаторы» that show only a hand (a copy of ch/gazovye-zakony/gzArm.ts with the hand's covering, kept separate
 * so the chapters do not depend on each other). The hand is placed by its contact point (contactLocal of the kit, or a
 * given local point), the direction of its fingers and the roll of its palm; the forearm goes on from the wrist,
 * turned by `bend` within the kit's wrist limit of ±70°, and its length is the kit's adult forearm (1,29 hand lengths).
 * A back layer (`back`) takes the parts of the fingers and the thumb that lie farther from the viewer than the contact
 * point, so a held phone passes between the thumb and the fingers. Colors: the kit's classes hm-* (PeopleStyles.astro)
 * and a sleeve class of this chapter (kd-sleeve-*), which gives the stroke color of the sleeve.
 */
import { LIMITS, clamp, mk, P1, type Pt } from '@components/people/core';
import { contactLocal, hand, handShape, wristFor, type Covering, type HandPose, type HandShape, type Side, type V3 } from '@components/people/hand';

export interface ArmOpts {
	Lh: number; // px, wrist to the tip of the middle finger
	side: Side; // 'R' right hand, 'L' left hand
	sleeve: string; // class of the sleeve's color
	covering?: Covering; // skin (default), glove or mitten
	bare?: number; // the bare part of the forearm next to the wrist, parts of the forearm (default 0,45; 0 = sleeve to the wrist)
	reach?: number; // px, how far the sleeve goes on past the elbow (out of the picture)
	back?: Element; // the layer for the far parts of the hand (behind a held object)
	armBehind?: boolean; // the forearm and the sleeve go into the back layer too (a hand behind the held object)
}
export interface ArmPose {
	at: Pt; // where the contact point goes
	pose: HandPose;
	dir: number; // rad, screen direction of the fingers
	roll: number; // rad, see hand.ts
	d?: number; // grip width, parts of Lh
	shape?: HandShape;
	contact?: V3; // the local point that goes to `at` (default: the pose's contact point)
	bend?: number; // rad, the forearm's turn against the hand's direction (the wrist angle)
}

export const kdArm = (parent: Element, o: ArmOpts) => {
	const w = 0.37 * o.Lh; // forearm width near the wrist: about 6,5 см for a hand of 18 см
	const fore = 1.29 * o.Lh;
	const reach = o.reach ?? 3 * o.Lh;
	const bare = o.bare ?? 0.45;
	const g = mk(parent, 'g', { class: 'kd-arm' });
	const ag = o.back && o.armBehind ? mk(o.back, 'g', { class: 'kd-arm' }) : g;
	const fo = mk(ag, 'path', { class: 'hm-outline', 'stroke-width': (w + 1.4).toFixed(1) });
	const fs = mk(ag, 'path', { class: 'hm-limb-skin', 'stroke-width': w.toFixed(1) });
	const so = mk(ag, 'path', { class: 'hm-outline', 'stroke-width': (1.25 * w + 1.4).toFixed(1), style: 'stroke-linecap:butt' });
	const ss = mk(ag, 'path', { class: `hm-limb ${o.sleeve}`, 'stroke-width': (1.25 * w).toFixed(1), style: 'stroke-linecap:butt' });
	const cov = o.covering ?? 'skin';
	const cls = cov === 'glove' ? 'hm-glove' : cov === 'mitten' ? 'hm-mitten' : 'hm-skin';
	const hd = hand(g, { cls, side: o.side, Lh: o.Lh, covering: cov });
	if (o.back) hd.setBack(o.back);
	if (bare === 0) {
		fo.remove();
		fs.remove();
	}
	return (p: ArmPose) => {
		const d = p.d ?? 0.25;
		const shape = p.shape ?? handShape(p.pose, d);
		const cl = p.contact ?? contactLocal(p.pose, shape, d);
		const wrist = wristFor(o.side, p.at, p.dir, p.roll, o.Lh, cl);
		hd.set({ wrist, dir: p.dir, roll: p.roll }, shape, p.pose, cl);
		const a = p.dir + Math.PI + clamp(p.bend ?? 0, -LIMITS.wristBend, LIMITS.wristBend);
		const at = (k: number): Pt => ({ x: wrist.x + k * Math.cos(a), y: wrist.y + k * Math.sin(a) });
		const elbow = at(fore);
		const df = `M${P1(wrist)} L${P1(elbow)}`;
		const ds = `M${P1(at(bare * fore))} L${P1(at(fore + reach))}`;
		if (bare > 0) {
			fo.setAttribute('d', df);
			fs.setAttribute('d', df);
		}
		so.setAttribute('d', ds);
		ss.setAttribute('d', ds);
		return { wrist, elbow };
	};
};
