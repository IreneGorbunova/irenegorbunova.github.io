/**
 * The people kit, motion: easing, a reach between two poses, a walk cycle with the stance foot planted, and attaching a
 * held object to a hand's grip frame.
 *
 * Human speed (the rules): a reach takes 0,4–1 s with easing; walking at about 1,3 m/s makes steps of about 0,35 H
 * (60 см for a grown-up) at about 2 steps per second; the stance foot stays put while the body passes over it, the
 * swing foot is lifted by about 0,05 H at mid-swing; the hip bobs by about 0,01 H.
 */
import { clamp, lerp, lerpPt, type Pt } from './core';
import { blendShape, handShape, type HandPose, type HandShape } from './hand';
import type { FigurePose, GripFrame, HandTarget } from './body';

/** Smoothstep easing, 0 → 1 with zero speed at both ends. */
export const ease = (t: number) => {
	const x = clamp(t, 0, 1);
	return x * x * (3 - 2 * x);
};
/** Ease in and out with a softer start (sine). */
export const easeSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));

const handOf = (h: HandTarget | Pt): HandTarget => ((h as HandTarget).at || (h as HandTarget).arm ? (h as HandTarget) : { at: h as Pt });
const shapeOf = (h: HandTarget, dLh = 0.17): HandShape => h.shape ?? handShape(h.pose ?? 'grip', dLh);

/**
 * A pose between `a` and `b` at time t (0…1, eased here): points and angles are interpolated, the hand shapes blended
 * joint by joint. `dLh` is the grip diameter in parts of the hand length for shapes that are not given.
 */
export const reach = (a: FigurePose, b: FigurePose, t: number, dLh = 0.17): FigurePose => {
	const e = ease(t);
	const hand = (i: 0 | 1): HandTarget => {
		const ha = handOf(a.hands[i]);
		const hb = handOf(b.hands[i]);
		const pick = e < 0.5 ? ha : hb;
		return {
			...pick,
			at: ha.at && hb.at ? lerpPt(ha.at, hb.at, e) : undefined,
			arm: ha.arm && hb.arm ? [lerp(ha.arm[0], hb.arm[0], e), lerp(ha.arm[1], hb.arm[1], e)] : undefined,
			dir: ha.dir !== undefined && hb.dir !== undefined ? lerp(ha.dir, hb.dir, e) : pick.dir,
			roll: ha.roll !== undefined && hb.roll !== undefined ? lerp(ha.roll, hb.roll, e) : pick.roll,
			shape: blendShape(shapeOf(ha, dLh), shapeOf(hb, dLh), e),
			pose: (e < 0.5 ? ha.pose : hb.pose) as HandPose | undefined,
		};
	};
	return {
		...(e < 0.5 ? a : b),
		hip: lerpPt(a.hip, b.hip, e),
		lean: lerp(a.lean, b.lean, e),
		head: lerp(a.head ?? 0, b.head ?? 0, e),
		ankles: [lerpPt(a.ankles[0], b.ankles[0], e), lerpPt(a.ankles[1], b.ankles[1], e)],
		feet: [lerp(a.feet[0], b.feet[0], e), lerp(a.feet[1], b.feet[1], e)],
		hands: [hand(0), hand(1)],
	};
};

export interface WalkFoot {
	x: number; // ankle x
	up: number; // lift of the ankle, px
	toe: number; // rad, the foot's angle (positive = toe down)
	planted: boolean;
	swing: number; // 0…1 within the swing, 0 while standing
}
/**
 * A walk cycle: the feet when the body has travelled `d` px (d grows with time) with steps of `step` px. Each foot
 * stands planted for one step and swings forward by two steps during the next; `base` is where the near foot stands at
 * d = 0, the far one is half a cycle later. Also the hip's bob (px, add to the hip y) and an arm swing in −1…1 (near
 * arm forward when positive; the far arm opposite).
 */
export const walk = (d: number, step: number, base: number, lift: number) => {
	const one = (i: number): WalkFoot => {
		const q = d / step + i;
		const n = Math.floor(q / 2);
		const ph = q - 2 * n;
		const sw = ph < 1 ? 0 : ph - 1;
		const e = sw * sw * (3 - 2 * sw);
		const from = base - i * step + 2 * step * n;
		// heel strike: toe up just before landing, toe down at push off
		const toe = sw > 0 ? 0.25 * Math.sin(Math.PI * sw) - 0.3 * Math.sin(Math.PI * Math.min(1, sw * 1.6)) * (1 - sw) : 0;
		return { x: from + 2 * step * e, up: lift * Math.sin(Math.PI * sw), toe, planted: sw === 0, swing: sw };
	};
	const phase = d / step;
	return {
		feet: [one(0), one(1)] as [WalkFoot, WalkFoot],
		bob: -Math.abs(Math.sin(Math.PI * phase)) * lift * 0.25,
		arm: Math.cos(Math.PI * phase),
	};
};

/**
 * Puts a held object on a hand: `obj` is drawn in its own coordinates with the origin at the grip point and x along the
 * fingers (for a cylinder held across the palm, the cylinder's axis through the origin at right angles to the picture).
 * `turn` adds a rotation (rad) of the object in the hand.
 */
export const attach = (obj: SVGGraphicsElement, fr: GripFrame, turn = 0) => {
	const deg = ((fr.angle + turn) * 180) / Math.PI;
	obj.setAttribute('transform', `translate(${fr.x.toFixed(2)} ${fr.y.toFixed(2)}) rotate(${deg.toFixed(2)})${fr.flip ? ' scale(1 -1)' : ''}`);
};

/**
 * Puts a held cylinder (a glass, a jar, a handle, a rope piece) on a hand: `obj` is drawn with its axis along its own
 * y and its top (the thumb side of the grip) toward −y, the origin on the axis at the grip.
 */
export const attachAxis = (obj: SVGGraphicsElement, fr: GripFrame) => {
	const a = Math.hypot(fr.axis.x, fr.axis.y) > 0.1 ? Math.atan2(fr.axis.y, fr.axis.x) + Math.PI / 2 : fr.angle;
	obj.setAttribute('transform', `translate(${fr.x.toFixed(2)} ${fr.y.toFixed(2)}) rotate(${((a * 180) / Math.PI).toFixed(2)})`);
};
