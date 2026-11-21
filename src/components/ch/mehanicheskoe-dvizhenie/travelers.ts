/**
 * The small people of «Механическое движение» (MoveIntro, RelLab), drawn with the shared people kit
 * (src/components/people/): a passenger seated in a carriage and seen through its window (the figure is clipped to
 * the window), a standing station attendant who holds a flag, a pedestrian who walks (the kit's walk cycle: the foot
 * on the ground stays put) and a cyclist whose feet stay on the pedals and hands on the handlebar. Every figure is a
 * grown-up of 1,7 м in indoor clothes (classes hm-*); sizes are given in px for the whole height.
 */
import { figure } from '@components/people/body';
import { walk } from '@components/people/motion';
import { NS, type Pt } from '@components/people/core';

let clipNo = 0;

/**
 * A passenger seated facing right, the head (radius r px) at `head`, seen through the window `win` [x, y, w, h]
 * (the rest of the figure is hidden by the clip). Returns nothing: the passenger sits still.
 */
export const passenger = (g: SVGGElement, head: Pt, r: number, win: [number, number, number, number], shirt = 'hm-red') => {
	const H = 170;
	const s = r / (0.064 * H);
	const u = s * H;
	const id = `mv-win-${++clipNo}-${Math.random().toString(36).slice(2, 7)}`;
	const cp = document.createElementNS(NS, 'clipPath');
	cp.setAttribute('id', id);
	const rect = document.createElementNS(NS, 'rect');
	const [x, y, w, h] = win;
	for (const [k, v] of Object.entries({ x, y, width: w, height: h, rx: 3 })) rect.setAttribute(k, String(v));
	cp.append(rect);
	g.append(cp);
	const inner = document.createElementNS(NS, 'g');
	inner.setAttribute('clip-path', `url(#${id})`);
	g.append(inner);
	const fig = figure(inner, { s, H, clothes: 'indoor', shirt, hair: 'short', name: 'passenger' });
	// seated: the hip joint 0,4 of the height below the head's center, the thighs forward, the hands in the lap
	const hip = { x: head.x - 0.1 * 0.15 * u, y: head.y + 0.4 * u };
	fig.pose({
		hip,
		lean: 0,
		ankles: [
			{ x: hip.x + 0.25 * u, y: hip.y + 0.22 * u },
			{ x: hip.x + 0.23 * u, y: hip.y + 0.22 * u },
		],
		feet: [0, 0],
		hands: [
			{ arm: [Math.PI / 2 - 0.3, 1.1], pose: 'relaxed' },
			{ arm: [Math.PI / 2 - 0.25, 1.15], pose: 'relaxed' },
		],
	});
};

/** A station attendant standing on `ground` at x, facing right, `Hpx` tall, the near hand holding a flag's stick at `grip`. */
export const attendant = (g: SVGGElement, x: number, ground: number, Hpx: number, grip: Pt) => {
	const H = 170;
	const s = Hpx / H;
	const fig = figure(g, { s, H, clothes: 'indoor', shirt: 'hm-blue', hair: 'short', name: 'attendant' });
	const ank = ground - 7 * s;
	fig.pose({
		hip: { x, y: ground - 0.515 * Hpx },
		lean: 0,
		ankles: [
			{ x: x + 0.03 * Hpx, y: ank },
			{ x: x - 0.03 * Hpx, y: ank },
		],
		feet: [0, 0],
		planted: [true, true],
		hands: [
			{ at: grip, pose: 'grip', d: 2.5, contact: 'flag' },
			{ arm: [Math.PI / 2 + 0.05, 0.2], pose: 'relaxed' },
		],
	});
};

/**
 * A pedestrian walking to the right, `Hpx` tall, in a group that the caller moves along with him: pose(d) puts the
 * feet for a distance d px walked (the group's own translation is d), so the foot on the ground stays put on screen.
 */
export const pedestrian = (g: SVGGElement, Hpx: number) => {
	const H = 170;
	const s = Hpx / H;
	const fig = figure(g, { s, H, clothes: 'indoor', shirt: 'hm-gold', hair: 'short', name: 'pedestrian' });
	const step = 0.35 * Hpx;
	let last = -1;
	return (d: number) => {
		// a restart (or a jump of the clock) is not a slide: the feet are checked only while he walks on smoothly
		const smooth = d > 0 && d >= last && d - last < 1;
		last = d;
		const w = walk(d, step, 0.5 * step, 0.05 * Hpx);
		fig.pose({
			hip: { x: 0, y: -0.465 * Hpx + w.bob },
			lean: 0.04,
			ankles: [
				{ x: w.feet[0].x - d, y: -7 * s - w.feet[0].up },
				{ x: w.feet[1].x - d, y: -7 * s - w.feet[1].up },
			],
			feet: [w.feet[0].toe, w.feet[1].toe],
			planted: [w.feet[0].planted && smooth, w.feet[1].planted && smooth],
			hands: [
				{ arm: [Math.PI / 2 - 0.35 * w.arm, 0.2 + 0.15 * Math.max(0, w.arm)], pose: 'relaxed' },
				{ arm: [Math.PI / 2 + 0.35 * w.arm, 0.2 + 0.15 * Math.max(0, -w.arm)], pose: 'relaxed' },
			],
		});
	};
};

/**
 * A cyclist on a bicycle with wheels of radius R px (the ground at y = 0, the wheels' centers at x = ±1,4 R): the
 * frame and the cranks are drawn into `bike`, the rider into `g`. pose(d) turns the wheels and the cranks for a
 * distance d px ridden (one turn of the cranks per 2,2 turns of the wheels, a usual gear); the feet stay on the pedals.
 */
export const cyclist = (g: SVGGElement, bike: SVGPathElement, crank: SVGPathElement, R: number) => {
	const H = 170;
	const s = (R / 35) * 1; // a wheel of radius 35 см is R px
	const u = s * H;
	const fig = figure(g, { s, H, clothes: 'indoor', shirt: 'hm-red', hair: 'short', name: 'cyclist' });
	const W = 1.4 * R;
	const BB = { x: 0, y: -R }; // the bottom bracket
	const saddle = { x: -0.42 * R, y: -2.55 * R };
	const bar = { x: 0.95 * W, y: -2.95 * R };
	const f = (v: number) => v.toFixed(1);
	bike.setAttribute(
		'd',
		`M${f(-W)} ${f(-R)} L${f(BB.x)} ${f(BB.y)} L${f(saddle.x + 0.1 * R)} ${f(saddle.y + 0.2 * R)} M${f(BB.x)} ${f(BB.y)} L${f(0.8 * W)} ${f(-2.4 * R)} L${f(saddle.x + 0.15 * R)} ${f(saddle.y + 0.35 * R)} L${f(-W)} ${f(-R)} M${f(W)} ${f(-R)} L${f(bar.x)} ${f(bar.y + 0.15 * R)} M${f(saddle.x - 0.35 * R)} ${f(saddle.y)} H${f(saddle.x + 0.35 * R)}`,
	);
	const cr = 0.48 * R; // crank 17 см
	return (d: number) => {
		const a = d / R / 2.2; // crank angle
		const p0 = { x: BB.x + cr * Math.cos(a), y: BB.y + cr * Math.sin(a) };
		const p1 = { x: BB.x - cr * Math.cos(a), y: BB.y - cr * Math.sin(a) };
		crank.setAttribute('d', `M${f(p0.x)} ${f(p0.y)} L${f(p1.x)} ${f(p1.y)}`);
		const ank = (p: Pt): Pt => ({ x: p.x - 0.06 * u, y: p.y - 0.035 * u });
		fig.pose({
			hip: { x: saddle.x, y: saddle.y - 0.02 * u },
			lean: 0.55,
			head: -0.35,
			ankles: [ank(p0), ank(p1)],
			feet: [0.15, 0.15],
			hands: [
				{ at: bar, pose: 'grip', d: 2.5, dir: 0.3, contact: 'handlebar' },
				{ at: { x: bar.x - 0.3, y: bar.y + 0.2 }, pose: 'grip', d: 2.5, dir: 0.3, contact: 'handlebar' },
			],
		});
	};
};
