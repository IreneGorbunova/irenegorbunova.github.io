/**
 * The street scene of the opening (ZvezdyIntro.astro): a city street by day. A boy of 14 with a school backpack (people
 * kit, teen, 165 см) and his mother (adult, 168 см) wait at a pedestrian crossing, facing the traffic that comes from
 * the left, 0,25 px per см. An ambulance (a van 5,5 м long, 2,5 м high) drives past from left to right with its siren
 * on. (The kit draws people in profile, so they keep looking to the left, where it came from.)
 *
 * Sound: the siren sends out wave crests at equal intervals; each crest is a circle growing at the speed of sound around
 * the point where the siren was when it sent it. Ahead of the car the circles crowd together, behind it they spread
 * apart. The note above the boy rises and falls with the pitch he hears: the frequency of the crests that reach him,
 * f′ = f / (1 − (υ/c)·cos θ), θ between the car's velocity and the line from the point of emission to him.
 * Real numbers: f = 900 Гц, υ = 60 км/ч = 16,7 м/с, c = 340 м/с: ahead he hears 946 Гц, after it passes 858 Гц;
 * the wavelength is 0,378 м at rest, 0,359 м ahead, 0,396 м behind.
 * Exaggerated and slowed (the caption's popover says the waves are exaggerated): at υ/c = 0,05 the crowding could not be
 * seen, so the circles are drawn for a car 6 times faster relative to sound, υ/c = 0,3; and time runs slowed: the car
 * crosses the street at 50 px/s (2 м/с of the picture instead of 16,7 м/с), the crests leave every 0,15 с and grow at
 * 167 px/s. The note's height follows log₂ f′/f for υ/c = 0,3 (it moves up by half an octave and down by a third of one).
 */
import { figure, type FigurePose, type HandTarget } from '@components/people/body';
import { SKELETON, type Pt } from '@components/people/core';

export const RUN = 11.5;
export const S = 0.25; // px per см on the road
const SP = 0.32; // px per см for the people on the near sidewalk (nearer to us)
export const FEET = 228; // the sidewalk
export const WHEEL = 199; // the road under the wheels
const ANK = 7 * SP;
export const CAR = { L: 550 * S, H: 250 * S }; // the van, px
const V = 50; // px/s, the car
const C = V / 0.3; // px/s, sound in the picture
const DT = 0.15; // s between crests
const X0 = -CAR.L - 30; // the car's rear at t = 0
const SIREN_DX = CAR.L - 30; // the siren on the roof, from the rear
const SIREN_Y = WHEEL - CAR.H - 3;

export const sirenScene = (card: HTMLElement) => {
	const $ = <T extends Element>(s: string) => card.querySelector<T>(s)!;
	const NS = 'http://www.w3.org/2000/svg';
	const car = $<SVGGElement>('[data-car]');
	const wheels = [...card.querySelectorAll<SVGGElement>('[data-wheel]')];
	const lights = [...card.querySelectorAll<SVGElement>('[data-flash]')];
	const waves = $<SVGGElement>('[data-waves]');
	const note = $<SVGGElement>('[data-pitch]');
	const ref = $<SVGPathElement>('[data-pitch-ref]');

	// ---- people, both facing left (toward the coming traffic)
	const HB = 165;
	const HM = 168;
	const ub = SP * HB;
	const um = SP * HM;
	const boy = figure($<SVGGElement>('[data-boy]'), { s: SP, H: HB, age: 'teen', shirt: 'zs-jacket-b', hair: 'short', dir: -1, name: 'boy with backpack' });
	const mom = figure($<SVGGElement>('[data-mom]'), { s: SP, H: HM, shirt: 'zs-coat-m', hair: 'pony', dir: -1, name: 'mother' });
	const stand = (f: typeof boy, x: number, u: number, sk: (typeof SKELETON)['adult'], head: number): FigurePose => {
		const ay = FEET - ANK;
		const hip = { x, y: ay - (sk.thigh + sk.shin) * u * 0.995 };
		const sh = f.shoulders(hip, 0.02);
		const len = (sk.upper + sk.fore) * u * 0.97 + 0.045 * u;
		const hang = (s: Pt, a: number): HandTarget => ({ at: { x: s.x - len * Math.sin(a), y: s.y + len * Math.cos(a) }, pose: 'relaxed' });
		return { hip, lean: 0.02, ankles: [{ x: x - 4 * SP, y: ay }, { x: x + 5 * SP, y: ay }], feet: [0, 0], hands: [hang(sh[0], 0.07), hang(sh[1], -0.05)], head, planted: [true, true] };
	};
	const BX = 258;
	const MX = 296;
	const B0 = stand(boy, BX, ub, SKELETON.teen, 0);
	const M0 = stand(mom, MX, um, SKELETON.adult, 0);
	// the backpack: on the boy's back (to the right, he faces left), from the shoulders down 40 см
	const pack = $<SVGRectElement>('[data-pack]');
	const bsh = boy.shoulders(B0.hip, B0.lean)[0];
	pack.setAttribute('x', (bsh.x + 0.07 * ub).toFixed(1));
	pack.setAttribute('y', (bsh.y - 0.01 * ub).toFixed(1));
	pack.setAttribute('width', (12 * SP).toFixed(1));
	pack.setAttribute('height', (40 * SP).toFixed(1));
	const strap = $<SVGPathElement>('[data-strap]');
	strap.setAttribute('d', `M${(bsh.x + 0.07 * ub).toFixed(1)} ${(bsh.y + 1).toFixed(1)} Q${(bsh.x - 1).toFixed(1)} ${(bsh.y + 2).toFixed(1)} ${(bsh.x - 0.5).toFixed(1)} ${(bsh.y + 0.12 * ub).toFixed(1)}`);
	// the listener: the boy's ear
	const ear: Pt = { x: BX, y: B0.hip.y - 0.42 * ub };
	// a short line at the height of the siren's own pitch (f′ = f)
	// the note stays above the roof of the van (its light bar is at y ≈ 132): f′ = f at y = NOTE_Y
	const NOTE_Y = 114;
	ref.setAttribute('d', `M${(ear.x - 14).toFixed(1)} ${NOTE_Y} H${(ear.x + 6).toFixed(1)}`);

	// crests: pool of circles
	const N = 40;
	const circles = Array.from({ length: N }, () => {
		const c = document.createElementNS(NS, 'circle');
		c.setAttribute('class', 'zgs-wave');
		waves.append(c);
		return c;
	});
	const siren = (t: number): Pt => ({ x: X0 + SIREN_DX + V * t, y: SIREN_Y });
	// the time of emission of the crest that reaches point p at time t (the crest sent at te: |p − P(te)| = C (t − te))
	const heardFrom = (p: Pt, t: number) => {
		let lo = t - 10;
		let hi = t;
		for (let i = 0; i < 40; i++) {
			const m = (lo + hi) / 2;
			const P = siren(m);
			if (Math.hypot(p.x - P.x, p.y - P.y) > C * (t - m)) hi = m; // not there yet: the crest that arrives now is older
			else lo = m;
		}
		return lo;
	};

	return (x: number) => {
		const t = x * RUN;
		const rear = X0 + V * t;
		car.setAttribute('transform', `translate(${rear.toFixed(1)} 0)`);
		const rot = ((V * t) / 9) * (180 / Math.PI);
		wheels.forEach((w) => w.setAttribute('transform', `rotate(${rot.toFixed(1)})`));
		lights.forEach((l, i) => l.setAttribute('opacity', (Math.floor(t * 4) + i) % 2 ? '1' : '0.25'));
		// crests sent since the start, the newest first
		const last = Math.floor(t / DT);
		circles.forEach((c, i) => {
			const k = last - i;
			if (k < 0) {
				c.setAttribute('visibility', 'hidden');
				return;
			}
			const te = k * DT;
			const r = C * (t - te);
			const P = siren(te);
			c.setAttribute('visibility', 'visible');
			c.setAttribute('cx', P.x.toFixed(1));
			c.setAttribute('cy', P.y.toFixed(1));
			c.setAttribute('r', r.toFixed(1));
			c.setAttribute('opacity', Math.max(0, 0.85 * (1 - r / 190)).toFixed(2));
		});
		// the pitch he hears
		const te = heardFrom(ear, t);
		const P = siren(te);
		const cos = (ear.x - P.x) / Math.hypot(ear.x - P.x, ear.y - P.y);
		const heard = te >= 0;
		const ratio = 1 / (1 - 0.3 * cos);
		const ny = NOTE_Y - 26 * Math.log2(ratio); // 99…124 for υ/c = 0,3: always above the van
		note.setAttribute('transform', `translate(${(ear.x - 6).toFixed(1)} ${ny.toFixed(1)})`);
		note.setAttribute('opacity', heard ? '1' : '0');
		boy.pose(B0);
		mom.pose(M0);
	};
};
