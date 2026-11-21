/**
 * A forearm that enters a close-up picture from its edge, with a hand of the shared people kit (hand.ts: a palm, a
 * thumb and four fingers) and a sleeve, for the pictures of «Атмосферное давление» that show only a hand. The hand is
 * placed by its contact point (contactLocal of the kit: the middle of a flat palm, the center of a grip, the pads of a
 * pinch), the direction of its fingers and the roll of its palm; the wrist stays straight (the forearm goes on from the
 * hand, turned by `bend`, which keeps within the kit's wrist limit of ±70°). Colors: the kit's classes hm-* (skin,
 * outline) and a sleeve class with a stroke color (AtmStyles.astro: ah-kit-green, ah-kit-red).
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

export const kitArm = (parent: Element, o: ArmOpts) => {
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

/**
 * A grip round a cylinder (diameter d, parts of Lh) whose end is closed by the pad of the thumb, as when a tube is
 * held near its open end and the thumb covers the opening. The end lies on the cylinder's axis on the thumb side, as
 * far as the thumb reaches (0,27 Lh from its knuckle); `endZ` is its local z (the grip's center is at z = 0), so the
 * caller puts the opening (endZ − 0)·Lh from the grip's center along the axis. The thumb keeps its bone lengths; blend
 * the result with handShape('grip', d) to move the thumb on and off.
 */
export const coverShape = (d: number): { shape: HandShape; endZ: number } => {
	const g = handShape('grip', d);
	const c = contactLocal('grip', g, d);
	const mcp = g.th[0];
	const L1 = 0.17;
	const L2 = 0.13;
	const R = 0.27;
	const dx = c[0] - mcp[0];
	const dy = c[1] - mcp[1];
	const zE = mcp[2] + Math.sqrt(Math.max(0.0025, R * R - dx * dx - dy * dy));
	const tip: [number, number, number] = [c[0], c[1], zE + 0.02];
	// the thumb's middle joint: on both bones' lengths, bulging away from the palm (+y, the back of the hand)
	const v = [tip[0] - mcp[0], tip[1] - mcp[1], tip[2] - mcp[2]];
	const D = Math.hypot(v[0], v[1], v[2]);
	const e = v.map((x) => x / D);
	const a = (L1 * L1 - L2 * L2 + D * D) / (2 * D);
	const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
	// a direction at right angles to e, as close to +y as possible
	const up = [0, 1, 0];
	const k = up[0] * e[0] + up[1] * e[1] + up[2] * e[2];
	const p = [up[0] - k * e[0], up[1] - k * e[1], up[2] - k * e[2]];
	const pl = Math.hypot(p[0], p[1], p[2]) || 1;
	const ip: [number, number, number] = [mcp[0] + a * e[0] + (h * p[0]) / pl, mcp[1] + a * e[1] + (h * p[1]) / pl, mcp[2] + a * e[2] + (h * p[2]) / pl];
	return { shape: { f: g.f, s: g.s, th: [mcp, ip, tip] }, endZ: zE - c[2] };
};
