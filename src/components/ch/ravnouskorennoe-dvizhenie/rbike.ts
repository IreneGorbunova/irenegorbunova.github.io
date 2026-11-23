/**
 * A bicycle with a rider in profile, riding to the right, for the opening scene «Зелёный свет» (RuIntro.astro). Our own
 * copy of the bicycle of ch/sistema-otscheta/bike.ts (that chapter may change its own), with the rider drawn directly by
 * the shared people kit (src/components/people/): seated, hip joint on the saddle, hands gripping the handlebar, the
 * balls of the feet on the pedals; knees and elbows bend by themselves within the kit's limits.
 *
 * Real sizes in centimeters (origin at the contact point of the rear wheel, y up): wheels of radius 35 см (a 28-inch
 * wheel with its tire), axles 105 см apart, bottom bracket at (42, 28), cranks 17 см, saddle top at (24, 92), grips at
 * (86, 98). The chainring turns once per 2,5 turns of the wheels (a middle gear). The rider is 168 см tall.
 *
 * `rbike(g, s, o)` builds it into `g` (s = px per см) and returns `pose(x, gy, d)`: the rear contact point at x px on
 * the ground line gy px, after the bicycle has rolled d см (this turns the wheels and the pedals: angle = d / R).
 * Colors: the classes `bk-*` (defined by the component) and the kit's `hm-*` (people/PeopleStyles.astro).
 */
import { el } from '../g7/kit';
import { figure } from '@components/people/body';

export const R = 35; // wheel radius, см
export const BIKE_LEN = 140; // from the rear contact point to the front of the front tire, см
const REAR = { x: 0, y: 35 };
const FRONT = { x: 105, y: 35 };
const BB = { x: 42, y: 28 };
const CRANK = 17;
const GEAR = 2.5;
const SADDLE = { x: 24, y: 92 };
const GRIP = { x: 86, y: 98 };

export interface RBikeOpts {
	shirt?: string;
	hair?: 'short' | 'pony';
	H?: number;
	name?: string;
}

export const rbike = (g: SVGGElement, s: number, o: RBikeOpts = {}) => {
	g.replaceChildren();
	const H = o.H ?? 168;
	const mk = <K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number>) => {
		const e = el(tag, attrs);
		parent.append(e);
		return e;
	};
	const f = (v: number) => v.toFixed(2);
	const P = (p: { x: number; y: number }) => `${f(p.x * s)} ${f(-p.y * s)}`;
	const root = mk(g, 'g', {});
	const farLegs = mk(root, 'g', {});
	const wheel = (c: { x: number; y: number }) => {
		const w = mk(root, 'g', { transform: `translate(${P(c)})` });
		mk(w, 'circle', { class: 'bk-tire', r: f((R - 1.8) * s), 'stroke-width': f(3.6 * s) });
		mk(w, 'circle', { class: 'bk-rim', r: f((R - 4) * s) });
		let d = '';
		for (let i = 0; i < 12; i++) {
			const a = (i * Math.PI) / 6;
			d += `M0 0 L${f(Math.cos(a) * (R - 4) * s)} ${f(Math.sin(a) * (R - 4) * s)} `;
		}
		const spokes = mk(w, 'path', { class: 'bk-spoke', d });
		mk(w, 'circle', { class: 'bk-hub', r: f(2.6 * s) });
		return spokes;
	};
	const rearSpokes = wheel(REAR);
	const frontSpokes = wheel(FRONT);
	mk(root, 'path', {
		class: 'bk-frame',
		'stroke-width': f(3 * s),
		d: `M${P(REAR)} L${P(BB)} L${P({ x: 27, y: 82 })} L${P(REAR)} M${P({ x: 27, y: 82 })} L${P({ x: 90, y: 80 })} L${P({ x: 94, y: 66 })} L${P(BB)} M${P({ x: 90, y: 80 })} L${P(FRONT)}`,
	});
	mk(root, 'path', { class: 'bk-part', 'stroke-width': f(2.4 * s), d: `M${P({ x: 27, y: 82 })} L${P({ x: 25.5, y: 90 })} M${P({ x: 90, y: 80 })} L${P({ x: 89, y: 96 })} L${P(GRIP)}` });
	mk(root, 'path', { class: 'bk-saddle', d: `M${P({ x: 14, y: 93 })} Q${P({ x: 24, y: 96 })} ${P({ x: 34, y: 92.5 })} L${P({ x: 32, y: 90 })} Q${P({ x: 22, y: 90.5 })} ${P({ x: 14, y: 93 })} Z` });
	mk(root, 'circle', { class: 'bk-ring', cx: f(BB.x * s), cy: f(-BB.y * s), r: f(10 * s) });
	const riderG = mk(root, 'g', {});
	const crankNear = mk(root, 'path', { class: 'bk-part', 'stroke-width': f(2.2 * s) });
	const pedalNear = mk(root, 'rect', { class: 'bk-pedal', width: f(9 * s), height: f(2.4 * s), rx: f(0.8 * s) });
	const crankFar = mk(farLegs, 'path', { class: 'bk-part bk-far', 'stroke-width': f(2 * s) });
	root.insertBefore(farLegs, root.firstChild);

	const rider = figure(riderG, { s, H, clothes: 'indoor', shirt: o.shirt ?? 'hm-green', hair: o.hair ?? 'pony', name: o.name ?? 'cyclist' });
	const hip = { x: (SADDLE.x - 1) * s, y: -(SADDLE.y + 5) * s };

	return (x: number, gy: number, d: number) => {
		root.setAttribute('transform', `translate(${f(x)} ${f(gy)})`);
		const wa = (d / R) * (180 / Math.PI);
		rearSpokes.setAttribute('transform', `rotate(${f(wa)})`);
		frontSpokes.setAttribute('transform', `rotate(${f(wa)})`);
		// the cranks turn clockwise on the screen, like the wheels
		const ca = d / R / GEAR;
		const ped = (k: number) => ({ x: BB.x + CRANK * Math.cos(ca + k), y: BB.y - CRANK * Math.sin(ca + k) });
		const pn = ped(0);
		const pf = ped(Math.PI);
		crankNear.setAttribute('d', `M${P(BB)} L${P(pn)}`);
		crankFar.setAttribute('d', `M${P(BB)} L${P(pf)}`);
		pedalNear.setAttribute('x', f((pn.x - 4.5) * s));
		pedalNear.setAttribute('y', f(-(pn.y + 1.2) * s));
		// the ankle sits 7 см behind and 8 см above the pedal spindle (the ball of the foot is on the pedal)
		const ank = (p: { x: number; y: number }) => ({ x: (p.x - 7) * s, y: -(p.y + 8) * s });
		rider.pose({
			hip,
			lean: 0.72,
			ankles: [ank(pn), ank(pf)],
			feet: [0.12 + 0.12 * Math.sin(ca), 0.12 - 0.12 * Math.sin(ca)],
			hands: [
				{ at: { x: GRIP.x * s, y: -GRIP.y * s }, pose: 'grip', d: 3, contact: 'handlebar' },
				{ at: { x: (GRIP.x - 1) * s, y: -(GRIP.y - 1) * s }, pose: 'grip', d: 3, contact: 'handlebar' },
			],
			head: 0.05, // the gaze nearly level, on the road ahead: about 22° against the leaning body (limit 40°)
		});
	};
};
