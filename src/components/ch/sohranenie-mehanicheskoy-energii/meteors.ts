/**
 * The night scene of the opening (SohrEnIntro.astro): an August night in the countryside, the Perseids. A father
 * (people kit, adult, 178 см) and his son of about 9 (child, 130 см) sit on a blanket, 0,5 px per см; the father leans
 * back on his hands, the boy points at the sky with his arm straight (at this size the hands are mittens, so the
 * pointing reads by the arm); after each meteor appears his arm turns to it in 0,6 с, eased. Both look up.
 *
 * The meteors: five streaks in 13 с (every 2,2–2,8 с), each 0,3–0,8 с long: a bright head that runs along a straight
 * line and a tail that fades behind it. All streaks lie on lines through one point low in the north-east (the
 * radiant of the Perseids, behind the trees on the right) and run away from it. The sky turns too slowly to be seen
 * in 13 с, so the stars stand still and only twinkle. Real time.
 */
import { figure } from '@components/people';

const S = 0.5;
export const GROUND = 204; // where the blanket lies
export const RAD = { x: 344, y: 176 }; // the radiant
// the meteors: start time (s), direction away from the radiant (rad, screen), start distance and length (px), duration (s)
const METEORS = [
	{ t: 0.9, a: -2.55, r0: 120, L: 95, d: 0.6 },
	{ t: 3.4, a: -2.05, r0: 95, L: 60, d: 0.35 },
	{ t: 5.9, a: -2.85, r0: 170, L: 110, d: 0.8 },
	{ t: 8.4, a: -1.8, r0: 120, L: 55, d: 0.3 },
	{ t: 10.9, a: -2.35, r0: 70, L: 85, d: 0.55 },
];
export const RUN = 13;

const rnd = (i: number, k: number) => {
	const r = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
	return r - Math.floor(r);
};

export const nightScene = (card: HTMLElement) => {
	const $ = <T extends Element>(s: string) => card.querySelector<T>(s)!;
	const NS = 'http://www.w3.org/2000/svg';
	const HF = 178;
	const uf = S * HF;
	const HC = 130;
	const uc = S * HC;
	const father = figure($<SVGGElement>('[data-father]'), { s: S, H: HF, clothes: 'home', shirt: 'hm-blue', name: 'father on blanket' });
	const son = figure($<SVGGElement>('[data-son]'), { s: S, H: HC, age: 'child', shirt: 'hm-gold', hair: 'short', name: 'son pointing' });
	const ankF = 7.5 * S;
	const ankC = 7 * S * Math.min(1, HC / 172);
	// the father: sitting, leaning back on both hands, the near knee raised
	const FX = 86;
	father.pose({
		hip: { x: FX, y: GROUND - 0.06 * uf },
		lean: -0.42,
		ankles: [
			{ x: FX + 0.3 * uf, y: GROUND - ankF },
			{ x: FX + 0.42 * uf, y: GROUND - ankF },
		],
		feet: [0, -0.35],
		hands: [
			{ at: { x: FX - 0.2 * uf, y: GROUND }, pose: 'flat', dir: Math.PI * 0.95, roll: -1.25 },
			{ at: { x: FX - 0.22 * uf, y: GROUND - 1 }, pose: 'flat', dir: Math.PI * 0.95, roll: -1.25 },
		],
		head: -0.45,
		planted: [true, true],
	});
	// the son: sitting with his knees up, pointing at the sky with the near arm, the far hand on the blanket
	const CXS = 162;
	const sonHip = { x: CXS, y: GROUND - 0.06 * uc };
	const sonShoulder = son.shoulders(sonHip, -0.12)[0];
	// where he points: at the middle of each meteor's streak, the arm moving there in 0,6 с after the meteor appears
	const aimOf = (m: (typeof METEORS)[number]) => {
		const r = m.r0 + m.L / 2;
		const p = { x: RAD.x + Math.cos(m.a) * r, y: RAD.y + Math.sin(m.a) * r };
		return Math.min(-0.5, Math.max(-1.6, Math.atan2(p.y - sonShoulder.y, p.x - sonShoulder.x)));
	};
	const AIM0 = -1.0;
	const armAt = (t: number) => {
		let from = AIM0;
		let ang = AIM0;
		for (const m of METEORS) {
			if (t < m.t) break;
			const to = aimOf(m);
			const k = Math.min(1, (t - m.t) / 0.6);
			ang = from + (to - from) * k * k * (3 - 2 * k);
			from = to;
		}
		// back to the start in the last second, so the loop has no jump
		if (t > RUN - 1.2) {
			const k = Math.min(1, (t - (RUN - 1.2)) / 0.8);
			ang = ang + (AIM0 - ang) * k * k * (3 - 2 * k);
		}
		return ang;
	};
	const poseSon = (t: number) =>
		son.pose({
			hip: sonHip,
			lean: -0.12,
			ankles: [
				{ x: CXS + 0.3 * uc, y: GROUND - ankC },
				{ x: CXS + 0.26 * uc, y: GROUND - ankC },
			],
			feet: [0, 0],
			hands: [
				{ arm: [armAt(t), 0.1], pose: 'point' },
				{ at: { x: CXS - 0.1 * uc, y: GROUND - 0.5 }, pose: 'flat', dir: Math.PI * 0.95, roll: -1.25 },
			],
			head: -0.5,
			planted: [true, true],
		});
	poseSon(0);
	// stars that twinkle
	const tw = [...card.querySelectorAll<SVGCircleElement>('[data-tw]')];
	// the meteors
	const mg = $<SVGGElement>('[data-meteors]');
	const parts = METEORS.map(() => {
		const g = document.createElementNS(NS, 'g');
		const segs = [0.15, 0.35, 0.7].map((o) => {
			const l = document.createElementNS(NS, 'line');
			l.setAttribute('class', 'smn-trail');
			l.setAttribute('stroke-opacity', String(o));
			g.append(l);
			return l;
		});
		const head = document.createElementNS(NS, 'circle');
		head.setAttribute('class', 'smn-head');
		head.setAttribute('r', '1.6');
		g.append(head);
		mg.append(g);
		return { g, segs, head };
	});
	return (x: number) => {
		const t = x * RUN;
		poseSon(t);
		METEORS.forEach((m, i) => {
			const p = parts[i];
			const age = t - m.t;
			const FADE = 0.3;
			if (age < 0 || age > m.d + FADE) {
				p.g.setAttribute('visibility', 'hidden');
				return;
			}
			p.g.setAttribute('visibility', 'visible');
			const k = Math.min(1, age / m.d);
			const ux = Math.cos(m.a);
			const uy = Math.sin(m.a);
			const rh = m.r0 + m.L * k; // the head
			const tail = Math.min(rh - m.r0, 0.45 * m.L);
			const fade = age > m.d ? 1 - (age - m.d) / FADE : 1;
			p.g.setAttribute('opacity', fade.toFixed(2));
			const at = (r: number) => ({ x: RAD.x + ux * r, y: RAD.y + uy * r });
			p.segs.forEach((l, j) => {
				const a = at(rh - tail * (1 - j / 3));
				const b = at(rh - tail * (1 - (j + 1) / 3));
				l.setAttribute('x1', a.x.toFixed(1));
				l.setAttribute('y1', a.y.toFixed(1));
				l.setAttribute('x2', b.x.toFixed(1));
				l.setAttribute('y2', b.y.toFixed(1));
			});
			const h = at(rh);
			p.head.setAttribute('cx', h.x.toFixed(1));
			p.head.setAttribute('cy', h.y.toFixed(1));
			p.head.setAttribute('visibility', age > m.d ? 'hidden' : 'visible');
		});
		tw.forEach((c, i) => c.setAttribute('opacity', (0.55 + 0.45 * Math.sin(t * (1.5 + rnd(i, 3) * 2) + i)).toFixed(2)));
	};
};
