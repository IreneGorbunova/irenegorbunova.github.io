/**
 * The winter scene of the opening (ZvezdyIntro.astro): a frosty January evening (15 January 2026, 21:00 Moscow time) in
 * the snowy yard of a village house near Moscow (55,75° N, 37,6° E), looking south-south-east. A girl of about 12
 * (people kit, teen proportions, 150 см) and her father (adult, 180 см), both in winter clothes and gloves, 0,42 px per
 * см. She raises her arm (0,8 с, eased) and points with the index finger at the reddish star at the top of the
 * constellation; he holds 8× binoculars at his eyes, and the round inset shows what he sees: first that star
 * (Betelgeuse), then he moves the binoculars down along the constellation, past the three stars of the belt, to the
 * bluish-white star at its bottom right (Rigel), and her arm follows. Then both lower their arms. Breath steams every
 * 3,4 с (about −12 °C); the smoke of the chimney rises straight up: no wind.
 *
 * The sky (sky.ts, stars.ts) is the real sky of that place and moment, stereographic around the south-south-east
 * horizon, 260 px per radian (4,5 px per degree near the horizon). The scene lasts 12 с of real time, in which the sky
 * turns by 0,05°: the stars stand still. They twinkle, the more the lower they are (their light crosses more air);
 * Sirius, 11° above the horizon and just above the roof, flashes in colors, as it does low in the sky. Only stars down to 4,3m are drawn (the
 * lights of the village brighten the sky). The Milky Way is a faint band along the true galactic equator (here it runs
 * from Auriga through Gemini and Monoceros, between Betelgeuse and Procyon, down to the left of Sirius).
 * The inset: a field of 7° (the field of usual 8×42 binoculars), gnomonic around the direction of the binoculars with the
 * vertical up, stars down to 6,5m (the catalogue's limit; binoculars show more). In binoculars the colors of bright stars
 * are much easier to see than by eye; the dots are enlarged by their glow. The binoculars move from Betelgeuse to Rigel
 * (18,6° apart) in 2 с.
 */
import { figure, type FigurePose, type HandTarget } from '@components/people/body';
import { reach, ease } from '@components/people/motion';
import { SKELETON, type Pt } from '@components/people/core';
import { contactLocal, hand, handShape, type HandPose, type HandShape } from '@components/people/hand';

/**
 * Hands with fingers at a small size. At 0,42 px per см a hand is 6–8 px long, below the kit's level of detail, so the
 * kit draws a mitten and a pointing index finger or the grip on the binoculars cannot be seen. Each such hand is drawn
 * again by the kit's own hand() at a length of DET px, in its detailed mode (palm, thumb, four fingers), and scaled down
 * about the wrist to the real length; wrist, direction, roll and finger shape are exactly those of the figure's hand,
 * whose mitten is hidden. The checker still reads the figure's own hand.
 */
const DET = 24;
const detailHand = (parent: SVGGElement, side: 'L' | 'R', Lh: number, cls: string) => {
	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	parent.append(g);
	const h = hand(g, { cls, side, Lh: DET, covering: 'glove' });
	const k = Lh / DET;
	return {
		h,
		place: (wrist: Pt, dir: number, roll: number, sh: HandShape, pose: HandPose, contact?: [number, number, number]) => {
			g.setAttribute('transform', `translate(${wrist.x.toFixed(2)} ${wrist.y.toFixed(2)}) scale(${k.toFixed(4)})`);
			h.set({ wrist: { x: 0, y: 0 }, dir, roll }, sh, pose, contact);
		},
	};
};

export const RUN = 12;
export const S = 0.42; // px per см
export const FEET = 228; // the snow under the boots
const ANK = 8 * S; // ankle above the sole in boots
const BREATH = 3.4;
// timeline, s
const T = {
	point: [0.5, 1.3], // her arm up to Betelgeuse
	show: [1.6, 2.0], // the inset appears (at Betelgeuse)
	pan: [4.6, 6.6], // the binoculars move to Rigel, her arm follows
	hide: [9.0, 9.4], // the inset fades
	down: [9.6, 10.4], // her arm down
};
const FIELD = 7; // degrees, the field of the binoculars

type Sky = { alt: number; az: number; V: number; c: string }[];

export const winterScene = (card: HTMLElement) => {
	const $ = <T extends Element>(s: string) => card.querySelector<T>(s)!;
	const NS = 'http://www.w3.org/2000/svg';
	const pt = (n: string): Pt => {
		const c = $<SVGCircleElement>(`[data-zstar="${n}"]`);
		return { x: +c.getAttribute('cx')!, y: +c.getAttribute('cy')! };
	};
	const BET = pt('betelgeuse');
	const RIG = pt('rigel');
	const sky = $<SVGGElement>('[data-inset]');
	const aimB = JSON.parse(sky.dataset.bet!) as { alt: number; az: number };
	const aimR = JSON.parse(sky.dataset.rig!) as { alt: number; az: number };
	const field: Sky = JSON.parse(sky.dataset.stars!);

	// ---- the people
	const HD = 180;
	const HG = 150;
	const ud = S * HD;
	const ug = S * HG;
	const dad = figure($<SVGGElement>('[data-dad]'), { s: S, H: HD, clothes: 'winter', gear: 'boot', covering: 'glove', shirt: 'zw-coat-d', name: 'father with binoculars' });
	const girl = figure($<SVGGElement>('[data-girl]'), { s: S, H: HG, age: 'teen', clothes: 'winter', gear: 'boot', covering: 'glove', shirt: 'zw-coat-g', hair: 'pony', name: 'girl pointing' });
	const binoc = $<SVGGElement>('[data-binoc]');
	// detailed gloves (see detailHand): the father's far hand behind the binoculars, his near hand in front of them
	// with the fingers that wrap behind the barrel in the back layer; the girl's pointing hand
	const LhD = SKELETON.adult.hand * S * 180;
	const LhG = SKELETON.teen.hand * S * 150;
	const dFar = detailHand($<SVGGElement>('[data-hfar]'), 'L', LhD, 'pkw-glove');
	const dNear = detailHand($<SVGGElement>('[data-hnear]'), 'R', LhD, 'pkw-glove');
	dNear.h.setBack($<SVGGElement>('[data-back]'));
	const gNear = detailHand($<SVGGElement>('[data-hgirl]'), 'R', LhG, 'pkw-glove');
	const ROLL = -0.5;
	const DLH = (5 * S) / LhD; // the grip: a barrel 5 см thick, in parts of the hand length
	const gripShape = handShape('grip', DLH);
	const gripContact = contactLocal('grip', gripShape, DLH);
	let hidden = false;
	const hideKitHands = () => {
		card.querySelectorAll<SVGElement>('[data-dad] .pk-hand, [data-girl] .pk-hand[data-hand="R"]').forEach((e) => (e.style.display = 'none'));
		hidden = true;
	};
	const DX = 58;
	const GX = 112;
	const skD = SKELETON.adult;
	const skG = SKELETON.teen;
	const standHip = (x: number, u: number, sk: typeof skD): Pt => ({ x, y: FEET - ANK - (sk.thigh + sk.shin) * u * 0.995 });
	const hang = (f: typeof dad, hip: Pt, lean: number, u: number, sk: typeof skD, i: 0 | 1, a: number): HandTarget => {
		const s = f.shoulders(hip, lean)[i];
		const len = (sk.upper + sk.fore) * u * 0.97 + 0.045 * u;
		return { at: { x: s.x + len * Math.sin(a), y: s.y + len * Math.cos(a) }, pose: 'relaxed' };
	};
	// the eye of a figure (head frame of the kit: the eye at (0,56 r, 0,02 r) from the head center, the head tilted by
	// lean·0,4 + head)
	const headPt = (hip: Pt, lean: number, head: number, u: number, sk: typeof skD, px: number, py: number): Pt => {
		const ax = Math.sin(lean);
		const ay = -Math.cos(lean);
		const W = 0.17 * u * (sk.depth / 0.15);
		const a = sk.headC * u + 0.005 * u;
		const b = 0.12 * W;
		const hc = { x: hip.x + ax * a - ay * b, y: hip.y + ay * a + ax * b };
		const r = sk.headR * u;
		const tilt = lean * 0.4 + head;
		return { x: hc.x + px * r * Math.cos(tilt) - py * r * Math.sin(tilt), y: hc.y + px * r * Math.sin(tilt) + py * r * Math.cos(tilt) };
	};

	// the father: the binoculars at his eyes, pointing along `ang` (screen angle); the head turned up by the same angle
	const dHip = standHip(DX, ud, skD);
	const dLean = -0.06;
	const BL = 17 * S; // binoculars 17 см long, 7 см thick in profile (8×42)
	const BH = 7 * S;
	const dadPose = (ang: number) => {
		const head = Math.max(-0.68, Math.min(0, ang - dLean * 0.4));
		const eye = headPt(dHip, dLean, head, ud, skD, 0.56, 0.02);
		const ux = Math.cos(ang);
		const uy = Math.sin(ang);
		const nx = -uy; // the normal "up" of the binoculars (toward the top of the picture for small angles)
		const ny = ux;
		const at = (along: number, up: number): Pt => ({ x: eye.x + ux * along - nx * up, y: eye.y + uy * along - ny * up });
		// the hands grip the barrels from below, a little in front of the middle; the far hand a bit further
		const pose: FigurePose = {
			hip: dHip,
			lean: dLean,
			ankles: [{ x: DX + 6 * S, y: FEET - ANK }, { x: DX - 7 * S, y: FEET - ANK }],
			feet: [0, 0],
			hands: [
				{ at: at(1.5 * S + 0.45 * BL, -0.5 * BH), pose: 'grip', d: 5, dir: ang - Math.PI / 2 + 0.25, roll: -0.5, contact: 'binoculars' },
				{ at: at(1.5 * S + 0.75 * BL, -0.45 * BH), pose: 'grip', d: 5, dir: ang - Math.PI / 2 + 0.25, roll: -0.5, contact: 'binoculars' },
			],
			head,
			planted: [true, true],
		};
		binoc.setAttribute('transform', `translate(${at(1.5 * S, 0).x.toFixed(2)} ${at(1.5 * S, 0).y.toFixed(2)}) rotate(${((ang * 180) / Math.PI).toFixed(2)})`);
		return { pose, eye };
	};
	// the screen angle from his eye to a star
	const eye0 = headPt(dHip, dLean, -0.4, ud, skD, 0.56, 0.02);
	const angTo = (p: Pt) => Math.atan2(p.y - eye0.y, p.x - eye0.x);
	const angB = angTo(BET);
	const angR = angTo(RIG);

	// the girl: standing, then pointing with the near arm at the star
	const gHip = standHip(GX, ug, skG);
	const gLean = -0.04;
	const G0: FigurePose = {
		hip: gHip,
		lean: gLean,
		ankles: [{ x: GX + 5 * S, y: FEET - ANK }, { x: GX - 6 * S, y: FEET - ANK }],
		feet: [0, 0],
		// the near arm by angles (it is blended with the pointing arm, also given by angles)
		hands: [{ arm: [Math.PI / 2 - 0.1, 0.12], pose: 'relaxed', roll: -0.5 }, hang(girl, gHip, gLean, ug, skG, 1, -0.05)],
		head: -0.45,
		planted: [true, true],
	};
	const gSh = girl.shoulders(gHip, gLean)[0];
	const gPoint = (p: Pt): FigurePose => {
		const a = Math.atan2(p.y - gSh.y, p.x - gSh.x);
		return { ...G0, head: Math.max(-0.68, Math.min(0, a + 0.1)), hands: [{ arm: [a, 0.1], pose: 'point', roll: -0.5 }, G0.hands[1]] };
	};
	const GB = gPoint(BET);
	const GR = gPoint(RIG);

	// ---- the inset: stars by gnomonic projection around the binoculars' direction
	const R = +sky.dataset.r!;
	const k = R / Math.tan((FIELD / 2) * (Math.PI / 180));
	const D2R = Math.PI / 180;
	const dots = field.map((s) => {
		const g = document.createElementNS(NS, 'g');
		const r = Math.min(3.4, Math.max(0.6, 1.6 + 0.6 * (2 - s.V)));
		if (s.V < 2.5) {
			for (const [k, o] of [[3.2, 0.12], [2, 0.22]]) {
				const halo = document.createElementNS(NS, 'circle');
				halo.setAttribute('r', (r * k).toFixed(2));
				halo.setAttribute('fill', s.c);
				halo.setAttribute('opacity', String(o));
				g.append(halo);
			}
		}
		const c = document.createElementNS(NS, 'circle');
		c.setAttribute('r', r.toFixed(2));
		c.setAttribute('fill', s.c);
		g.append(c);
		sky.append(g);
		return { s, g };
	});
	const insetFrame = $<SVGGElement>('[data-inset-frame]');
	const cx0 = +sky.dataset.cx!;
	const cy0 = +sky.dataset.cy!;
	const drawInset = (aim: { alt: number; az: number }) => {
		const a0 = aim.alt * D2R;
		for (const { s, g } of dots) {
			const a = s.alt * D2R;
			const z = (s.az - aim.az) * D2R;
			const cosc = Math.sin(a0) * Math.sin(a) + Math.cos(a0) * Math.cos(a) * Math.cos(z);
			if (cosc < 0.9) {
				g.setAttribute('visibility', 'hidden');
				continue;
			}
			const X = (Math.cos(a) * Math.sin(z)) / cosc;
			const Y = (Math.cos(a0) * Math.sin(a) - Math.sin(a0) * Math.cos(a) * Math.cos(z)) / cosc;
			const x = cx0 + k * X;
			const y = cy0 - k * Y;
			const out = Math.hypot(x - cx0, y - cy0) > R + 4;
			g.setAttribute('visibility', out ? 'hidden' : 'visible');
			if (!out) g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
		}
	};
	let lastAim = '';

	// ---- twinkling, breath, smoke
	const tw = [...card.querySelectorAll<SVGCircleElement>('[data-tw]')].map((c, i) => ({ c, amp: +c.dataset.tw!, ph: i * 1.7, f: 5 + (i % 7) }));
	const sirius = $<SVGCircleElement>('[data-zstar="sirius"]');
	const SIRIUS_COLORS = ['rgb(214 226 255)', 'rgb(186 206 255)', 'rgb(255 238 226)', 'rgb(214 226 255)', 'rgb(198 240 255)', 'rgb(255 222 212)'];
	const puffs = [...card.querySelectorAll<SVGGElement>('[data-puff]')];
	const smoke = [...card.querySelectorAll<SVGCircleElement>('[data-smoke]')];
	const ph = (t: number, [a, b]: number[]) => ease((t - a) / (b - a));

	return (x: number) => {
		const t = x * RUN;
		// the binoculars' direction: Betelgeuse, then to Rigel
		const e = ph(t, T.pan);
		const ang = angB + (angR - angB) * e;
		const d = dadPose(ang);
		const ds = dad.pose(d.pose);
		dFar.place(ds.wrists[1], ds.grips[1].angle, ROLL, gripShape, 'grip', gripContact);
		dNear.place(ds.wrists[0], ds.grips[0].angle, ROLL, gripShape, 'grip', gripContact);
		const aim = { alt: aimB.alt + (aimR.alt - aimB.alt) * e, az: aimB.az + (aimR.az - aimB.az) * e };
		const key = `${aim.alt.toFixed(3)} ${aim.az.toFixed(3)}`;
		if (key !== lastAim) {
			drawInset(aim);
			lastAim = key;
		}
		const show = t < T.hide[0] ? ph(t, T.show) : 1 - ph(t, T.hide);
		insetFrame.setAttribute('opacity', show.toFixed(2));
		// the girl
		let gp: FigurePose;
		if (t < T.pan[0]) gp = reach(G0, GB, (t - T.point[0]) / (T.point[1] - T.point[0]));
		else if (t < T.down[0]) gp = reach(GB, GR, (t - T.pan[0] - 0.3) / (T.pan[1] - T.pan[0]));
		else gp = reach(GR, G0, (t - T.down[0]) / (T.down[1] - T.down[0]));
		const gs = girl.pose(gp);
		const gh0 = gp.hands[0] as HandTarget;
		const gpose = (gh0.pose ?? 'relaxed') as HandPose;
		gNear.place(gs.wrists[0], gs.grips[0].angle, gh0.roll ?? ROLL, gh0.shape ?? handShape(gpose, (3 * S) / LhG), gpose);
		if (!hidden) hideKitHands();
		// twinkling
		for (const s of tw) {
			const w = 0.5 * Math.sin(t * s.f + s.ph) + 0.35 * Math.sin(t * (s.f * 1.73) + 2 * s.ph) + 0.15 * Math.sin(t * 17 + s.ph);
			s.c.setAttribute('opacity', Math.min(1, Math.max(0.15, 1 - s.amp * (0.5 - 0.5 * w))).toFixed(2));
		}
		sirius.style.fill = SIRIUS_COLORS[Math.floor(t * 9) % SIRIUS_COLORS.length];
		// breath: a cloud from the mouth grows and fades in 1,6 с every BREATH s; hers half a period later
		const mouths = [
			{ m: headPt(dHip, dLean, d.pose.head ?? 0, ud, skD, 0.9, 0.62), off: 0.4 },
			{ m: headPt(gHip, gLean, gp.head ?? 0, ug, skG, 0.9, 0.62), off: 0.4 + BREATH / 2 },
		];
		puffs.forEach((p, i) => {
			const a = (((t - mouths[i].off) % BREATH) + BREATH) % BREATH;
			if (a > 1.6) {
				p.setAttribute('opacity', '0');
				return;
			}
			const q = a / 1.6;
			const m = mouths[i].m;
			p.setAttribute('transform', `translate(${(m.x + 2 + 9 * q).toFixed(1)} ${(m.y - 7 * q).toFixed(1)}) scale(${(0.4 + 1.1 * q).toFixed(2)})`);
			p.setAttribute('opacity', (0.6 * Math.sin(Math.PI * Math.min(1, q * 1.3))).toFixed(2));
		});
		// chimney smoke: puffs rise and spread
		smoke.forEach((c, i) => {
			const per = 6;
			const q = ((t + i * (per / smoke.length)) % per) / per;
			const bx = +c.dataset.x!;
			const by = +c.dataset.y!;
			c.setAttribute('cx', (bx + 1.5 * Math.sin(q * 3 + i)).toFixed(1));
			c.setAttribute('cy', (by - 30 * q).toFixed(1));
			c.setAttribute('r', (1.6 + 4.5 * q).toFixed(2));
			c.setAttribute('opacity', (0.4 * Math.sin(Math.PI * q)).toFixed(2));
		});
	};
};
