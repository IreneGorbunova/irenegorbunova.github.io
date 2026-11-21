/**
 * A bicycle with a rider, in profile, riding to the right, for the opening scenes of the grade 10 kinematics chapters
 * (MdIntro.astro: the reflector on the spokes; ravnouskorennoe-dvizhenie/RuIntro.astro: the crossroads). The rider is
 * the person of mehanicheskaya-rabota/people.ts (indoor clothes), seated: hip joint on the saddle, hands on the grips,
 * feet on the pedals; knees and elbows bend by themselves.
 *
 * Real sizes, in centimeters (origin at the contact point of the rear wheel, y up): wheels of radius 35 см (a 28-inch
 * wheel with its tire), axles 105 см apart, bottom bracket at (42, 28), cranks 17 см, saddle top at (24, 92), grips at
 * (86, 98). The chainring turns once per 2,5 turns of the wheels (a middle gear). The rider is 175 см tall.
 *
 * `bike(g, s)` builds it into `g` (s = px per см) and returns `pose(x, gy, d)`: the rear contact point at x px on the
 * ground line gy px, after the bicycle has rolled d см (this turns the wheels and the pedals: angle = d / R).
 * `spokePoint(x, gy, d, r)` gives where a point of the front wheel r см from the axle is (the reflector).
 * Colors come from the classes `bk-*` (defined by the component) and `hm-*` (PeopleStyles.astro).
 */
import { el } from '../g7/kit';
import { human } from '../mehanicheskaya-rabota/people';

export const R = 35; // wheel radius, см
const REAR = { x: 0, y: 35 };
const FRONT = { x: 105, y: 35 };
const BB = { x: 42, y: 28 };
const CRANK = 17;
const GEAR = 2.5;
const SADDLE = { x: 24, y: 92 };
const GRIP = { x: 86, y: 98 };
const H = 175;

export interface BikeOpts {
	shirt?: string;
	hair?: 'short' | 'pony';
}

export const bike = (g: SVGGElement, s: number, o: BikeOpts = {}) => {
	g.replaceChildren();
	const mk = <K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number>) => {
		const e = el(tag, attrs);
		parent.append(e);
		return e;
	};
	const f = (v: number) => v.toFixed(1);
	// the bicycle in its own frame: px, origin at the rear contact point, y down
	const P = (p: { x: number; y: number }) => `${f(p.x * s)} ${f(-p.y * s)}`;
	const root = mk(g, 'g', {});
	const farLegs = mk(root, 'g', {});
	const wheel = (c: { x: number; y: number }) => {
		const w = mk(root, 'g', { transform: `translate(${P(c)})` });
		mk(w, 'circle', { class: 'bk-tire', r: f((R - 1.8) * s), 'stroke-width': f(3.6 * s) });
		mk(w, 'circle', { class: 'bk-rim', r: f((R - 4) * s) });
		const spokes = mk(w, 'g', {});
		let d = '';
		for (let i = 0; i < 12; i++) {
			const a = (i * Math.PI) / 6;
			d += `M0 0 L${f(Math.cos(a) * (R - 4) * s)} ${f(Math.sin(a) * (R - 4) * s)} `;
		}
		mk(spokes, 'path', { class: 'bk-spoke', d });
		mk(w, 'circle', { class: 'bk-hub', r: f(2.6 * s) });
		return spokes;
	};
	const rearSpokes = wheel(REAR);
	const frontSpokes = wheel(FRONT);
	// the frame: chain stay, seat stay, seat tube, top tube, down tube, head tube and fork
	mk(root, 'path', {
		class: 'bk-frame',
		'stroke-width': f(3 * s),
		d: `M${P(REAR)} L${P(BB)} L${P({ x: 27, y: 82 })} L${P(REAR)} M${P({ x: 27, y: 82 })} L${P({ x: 90, y: 80 })} L${P({ x: 94, y: 66 })} L${P(BB)} M${P({ x: 90, y: 80 })} L${P(FRONT)}`,
	});
	// seat post, saddle, stem and handlebar
	mk(root, 'path', { class: 'bk-part', 'stroke-width': f(2.4 * s), d: `M${P({ x: 27, y: 82 })} L${P({ x: 25.5, y: 90 })} M${P({ x: 90, y: 80 })} L${P({ x: 89, y: 96 })} L${P(GRIP)}` });
	mk(root, 'path', { class: 'bk-saddle', d: `M${P({ x: 14, y: 93 })} Q${P({ x: 24, y: 96 })} ${P({ x: 34, y: 92.5 })} L${P({ x: 32, y: 90 })} Q${P({ x: 22, y: 90.5 })} ${P({ x: 14, y: 93 })} Z` });
	mk(root, 'circle', { class: 'bk-ring', cx: f(BB.x * s), cy: f(-BB.y * s), r: f(10 * s) });
	const rider = mk(root, 'g', {});
	const crankNear = mk(root, 'path', { class: 'bk-part', 'stroke-width': f(2.2 * s) });
	const pedalNear = mk(root, 'rect', { class: 'bk-pedal', width: f(9 * s), height: f(2.4 * s), rx: f(0.8 * s) });
	const crankFar = mk(farLegs, 'path', { class: 'bk-part bk-far', 'stroke-width': f(2 * s) });
	root.insertBefore(farLegs, root.firstChild);

	const pose = human(rider, { s, H, shirt: o.shirt ?? 'hm-green', hair: o.hair ?? 'short' });
	const hip = { x: SADDLE.x - 1, y: SADDLE.y + 5 };

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
		// the ankle sits 7 см above and 7 см behind the pedal spindle (the ball of the foot is on the pedal)
		const ank = (p: { x: number; y: number }) => ({ x: (p.x - 7) * s, y: -(p.y + 8) * s });
		pose({
			hip: { x: hip.x * s, y: -hip.y * s },
			lean: 0.72,
			ankles: [ank(pn), ank(pf)],
			feet: [0.12 + 0.12 * Math.sin(ca), 0.12 - 0.12 * Math.sin(ca)],
			hands: [
				{ x: GRIP.x * s, y: -GRIP.y * s },
				{ x: (GRIP.x - 1) * s, y: -(GRIP.y - 1) * s },
			],
			head: -0.26, // the head up toward the road, within 40° of the leaning body
		});
	};
};

/** Where a point of the front wheel `r` см from the axle is, in px, when the bicycle stands at x on gy, rolled d см. */
export const spokePoint = (x: number, gy: number, s: number, d: number, r: number) => {
	const a = d / R; // the wheel turns clockwise on the screen
	return { x: x + (FRONT.x + r * Math.cos(a)) * s, y: gy - FRONT.y * s + r * Math.sin(a) * s };
};

/** The front axle in px. */
export const frontAxle = (x: number, gy: number, s: number) => ({ x: x + FRONT.x * s, y: gy - FRONT.y * s });
