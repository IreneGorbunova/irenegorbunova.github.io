/**
 * The trampoline scene of the opening (SohrEnIntro.astro). Side view from a little above, 60 px per metre (0,6 px per
 * см): the grass at y = 226, the mat (Ø 3 м, drawn as an ellipse 2 · 78 px × 2 · 9,5 px) 0,8 м above it at y = 178.
 *
 * The girl (people kit, teen proportions, 145 см, 38 кг; indoor clothes with shorts) stands on the mat, dips and
 * pushes off, gains height in two jumps (her feet rise 0,35 м and 0,70 м above the flat mat) and then jumps three
 * times to 1,0 м; after the last one she lands and absorbs the bounce with her knees, and stands.
 *   Flight: free fall, υ = √(2gH): 2,62, 3,70 and 4,43 м/с at the mat; the flight to 1,0 м and back lasts
 *   2 · 4,43 / 9,8 = 0,90 с.
 *   The mat is a spring: it sags by 0,35 м under her after a jump of 1,0 м, so its stiffness is
 *   k = 2 · 38 · 9,8 · (1,0 + 0,35) / 0,35² = 8208 Н/м, ω = √(k/m) = 14,7 1/с; standing she presses it by
 *   mg/k = 4,5 см. A contact between equal jumps is a half swing of this spring around that point:
 *   (π + 2·arcsin(0,045/0,305)) / 14,7 = 0,234 с. The first two contacts (gaining height) are drawn the same way with
 *   sags of 0,22 and 0,30 м: her legs add the missing energy (the caption's popover says so). The last landing is
 *   the same spring damped by her knees (damping ratio 0,35) until she stands.
 * Arms swing up while she rises and come down while she falls; the knees bend a little on the mat; the feet stay in
 * one place on the mat (they move only up and down with it). Real time.
 * The brother (people kit, child, 118 см) sits in a garden chair, his back against the chair back and his palms on
 * the middle of his thighs (as far as his arms reach while he leans back), and turns his head to follow her.
 */
import { figure, ease, type FigurePose, type Pt } from '@components/people';

const G = 9.8;
export const K = 60;
const S = 0.6;
export const GRASS = 226;
export const NET = GRASS - 0.8 * K; // 178
export const CX = 180;
export const MRX = 78;
export const MRY = 9.5;
const M = 38;
const KM = 8208;
const W0 = Math.sqrt(KM / M);
const XEQ = (M * G) / KM; // 0,045 м

type Seg = { T: number; f: (t: number) => { y: number; crouch: number; arm: number; air: boolean; still?: boolean } };
const ARM_DOWN = Math.PI / 2 + 0.15;
const ARM_UP = -0.95;
const flight = (v: number): Seg => {
	const T = (2 * v) / G;
	return {
		T,
		f: (t) => {
			const k = 1 - Math.abs((2 * t) / T - 1); // 0 at the mat, 1 at the top
			return { y: v * t - (G * t * t) / 2, crouch: 0, arm: ARM_DOWN + (ARM_UP - ARM_DOWN) * ease(k), air: true };
		},
	};
};
/** A contact with the mat between flights: a half swing of the mat-spring, sinking to `sag` (м). */
const contact = (sag: number): Seg => {
	const A = sag - XEQ;
	const T = (Math.PI + 2 * Math.asin(Math.min(1, XEQ / A))) / W0;
	const ph0 = -Math.asin(Math.min(1, XEQ / A)); // the phase at which the mat is flat
	return {
		T,
		f: (t) => {
			const ph = ph0 + W0 * t;
			const y = -XEQ - A * Math.sin(ph); // the feet, м above the flat mat
			const k = Math.sin((Math.PI * t) / T);
			return { y: Math.min(0, y), crouch: 0.35 * k, arm: ARM_DOWN + 0.1 * k, air: false };
		},
	};
};
const STAND: Seg = { T: 0.6, f: () => ({ y: -XEQ, crouch: 0, arm: Math.PI / 2, air: false, still: true }) };
const DIP: Seg = {
	T: 0.45,
	f: (t) => {
		// she bends her knees and swings the arms back (0,3 с), then straightens and pushes the mat down (0,15 с)
		const a = Math.min(1, t / 0.3);
		const b = Math.max(0, (t - 0.3) / 0.15);
		const crouch = 0.6 * ease(a) * (1 - ease(b));
		const y = -XEQ * (1 - b) - 0.12 * Math.sin(Math.PI * b);
		return { y, crouch, arm: Math.PI / 2 + 0.6 * ease(a) - 0.45 * ease(b), air: false };
	},
};
const LAND: Seg = {
	T: 1.1,
	f: (t) => {
		// the damped mat-spring from the flat mat at 4,43 м/с downward (x above the standing point)
		const z = 0.35;
		const wd = W0 * Math.sqrt(1 - z * z);
		const x0 = XEQ;
		const v0 = -Math.sqrt(2 * G * 1.0);
		const x = Math.exp(-z * W0 * t) * (x0 * Math.cos(wd * t) + ((v0 + z * W0 * x0) / wd) * Math.sin(wd * t));
		const crouch = 0.55 * Math.sin(Math.PI * Math.min(1, t / 1.1));
		return { y: Math.min(0, -XEQ + x), crouch, arm: ARM_DOWN + (Math.PI / 2 - ARM_DOWN) * ease(t / 1.1), air: false };
	},
};
const SEGS: Seg[] = [STAND, DIP, flight(Math.sqrt(2 * G * 0.35)), contact(0.22), flight(Math.sqrt(2 * G * 0.7)), contact(0.3), flight(Math.sqrt(2 * G)), contact(0.35), flight(Math.sqrt(2 * G)), contact(0.35), flight(Math.sqrt(2 * G)), LAND, { ...STAND, T: 0.3 }];
export const RUN = SEGS.reduce((a, s) => a + s.T, 0);

const state = (t: number) => {
	let t0 = 0;
	for (const s of SEGS) {
		if (t < t0 + s.T) return s.f(t - t0);
		t0 += s.T;
	}
	return SEGS[SEGS.length - 1].f(0);
};

export const trampScene = (card: HTMLElement) => {
	const $ = <T extends Element>(s: string) => card.querySelector<T>(s)!;
	const H = 145;
	const u = S * H;
	const ANK = 7 * S * Math.min(1, H / 172); // the ankle above the sole (trainers scaled as the kit does)
	const hipH = 0.505 * u;
	const girl = figure($<SVGGElement>('[data-girl]'), { s: S, H, age: 'teen', shirt: 'hm-red', hair: 'pony', shorts: true, name: 'girl on trampoline' });
	const HB = 118;
	const ub = S * HB;
	const boy = figure($<SVGGElement>('[data-boy]'), { s: S, H: HB, age: 'child', shirt: 'hm-green', hair: 'short', shorts: true, dir: -1, name: 'brother in chair' });
	const matBack = $<SVGPathElement>('[data-mat-back]');
	const matFront = $<SVGPathElement>('[data-mat-front]');
	const hollow = $<SVGPathElement>('[data-hollow]');
	const SEAT = GRASS - 0.36 * K; // the seat of the chair
	const BX = 313; // the boy's hip: his back against the chair back
	const ANKB = 7 * S * Math.min(1, HB / 172);
	const boyHip = { x: BX, y: SEAT - 0.03 * ub };
	// the palms lie on the middle of the thighs, along them
	const onThigh = (k: Pt, f: number) => ({
		at: { x: boyHip.x + (k.x - boyHip.x) * f, y: boyHip.y + (k.y - boyHip.y) * f - 2.2 },
		pose: 'flat' as const,
		dir: Math.atan2(k.y - boyHip.y, k.x - boyHip.x),
		contact: 'thigh',
	});
	return (x: number) => {
		const t = x * RUN;
		const st = state(t);
		const feetY = NET - st.y * K; // the soles
		const d = Math.max(0, -st.y * K);
		// the mat: a rounded cone from the rim to the point under her feet
		const L = `${CX - MRX} ${NET}`;
		const R = `${CX + MRX} ${NET}`;
		const apex = `${CX} ${(NET + d).toFixed(1)}`;
		const yd = (NET + d).toFixed(1);
		matBack.setAttribute('d', `M${L} A${MRX} ${MRY} 0 0 1 ${R} Q${CX + 34} ${yd} ${apex} Q${CX - 34} ${yd} ${L} Z`);
		matFront.setAttribute('d', `M${L} A${MRX} ${MRY} 0 0 0 ${R} Q${CX + 34} ${yd} ${apex} Q${CX - 34} ${yd} ${L} Z`);
		hollow.setAttribute('d', d > 0.5 ? `M${CX - MRX * 0.8} ${NET - 2} Q${CX - 30} ${yd} ${apex} Q${CX + 30} ${yd} ${CX + MRX * 0.8} ${NET - 2}` : '');
		// the girl: the soles on the mat (or in the air), the knees bent by `crouch`
		const drop = st.crouch * 0.13 * u;
		const hip = { x: CX - 0.03 * u - st.crouch * 0.05 * u, y: feetY - ANK - hipH + drop };
		const pose: FigurePose = {
			hip,
			lean: 0.05 + st.crouch * 0.35,
			ankles: [
				{ x: CX + 0.015 * u, y: feetY - ANK },
				{ x: CX - 0.03 * u, y: feetY - ANK },
			],
			feet: st.air ? [0.25, 0.25] : [0, 0],
			hands: [
				{ arm: [st.arm, 0.35], pose: 'relaxed' },
				{ arm: [st.arm + 0.12, 0.3], pose: 'relaxed' },
			],
			head: st.air ? -0.1 : 0.1,
			planted: st.still ? [true, true] : [false, false],
		};
		girl.pose(pose);
		// the brother follows her with his eyes: the head turns up as she rises
		const look = -Math.min(0.55, Math.max(0, st.y) * 0.5) - 0.05;
		const bpose = {
			hip: boyHip,
			lean: -0.26,
			ankles: [
				{ x: BX - 0.33 * ub, y: GRASS - ANKB },
				{ x: BX - 0.29 * ub, y: GRASS - ANKB },
			] as FigurePose['ankles'],
			feet: [0, 0] as [number, number],
			head: look,
			planted: [true, true] as [boolean, boolean],
		};
		// pose once to find the knees, then put the palms on the thighs
		const kn = boy.pose({ ...bpose, hands: [{ arm: [Math.PI / 2 + 0.5, 1.1], pose: 'relaxed' }, { arm: [Math.PI / 2 + 0.4, 1.1], pose: 'relaxed' }] }).knees;
		boy.pose({ ...bpose, hands: [onThigh(kn[0], 0.48), onThigh(kn[1], 0.48)] });
	};
};
