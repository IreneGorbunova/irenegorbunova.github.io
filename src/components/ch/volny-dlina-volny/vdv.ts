/**
 * Client helpers shared by the pictures and models of «Волны. Длина волны» (grade 9). Colors of the chapter, one per
 * quantity: the speed of the wave blue (`arrow--blue`, --ig-vx), the motion of one particle (its swing) red
 * (--ig-vy), the wavelength gold (--ig-v), the period green (--g7-green). Numbers the Russian way (decimal comma, real
 * minus).
 *
 * The wave of every picture is the same harmonic wave started by a source at x = 0 at t = 0:
 *   the source moves as  s(0, t) = A·sin(2π·t/T)  (from its rest position, first up or forward);
 *   a point at a distance x repeats it later by x/υ:  s(x, t) = A·sin(2π·(t − x/υ)/T)  once t ≥ x/υ, and rests before.
 * Crests of a rope (s = +A) stand at x = υ·(t − T/4 − n·T); the middles of the compressions of a spring (coils
 * closest) at x = υ·(t − n·T), n = 0, 1, 2 … (the front x = υt itself is the first compression).
 */
import { el as mkEl, loop as loopKit } from '../g7/kit';
import { newArrow as mkArrow } from '../pryamolineynoe-dvizhenie/pd';
export { el, fmt, fmtTrim, loop, k, tex } from '../g7/kit';
export { newArrow, label, f1 } from '../pryamolineynoe-dvizhenie/pd';

export const TAU = Math.PI * 2;

/** The displacement of the point at x (m) at time t (s) for a wave of amplitude A, period T, speed v. */
export const disp = (x: number, t: number, A: number, T: number, v: number) => {
	const tau = t - x / v;
	return tau < 0 ? 0 : A * Math.sin((TAU * tau) / T);
};

/** Positions (m) of the crests (kind 'crest') or of the middles of the compressions ('dense') between 0 and the front. */
export const marks = (t: number, T: number, v: number, kind: 'crest' | 'dense') => {
	const out: number[] = [];
	const shift = kind === 'crest' ? T / 4 : 0;
	for (let n = 0; n < 200; n++) {
		const x = v * (t - shift - n * T);
		if (x < -1e-9) break;
		if (x <= v * t + 1e-9) out.push(x);
	}
	return out;
};

/** A bracket «|←— label —→|» between x1 and x2 at height y (ticks up or down by `tick`). */
export const bracketPath = (x1: number, x2: number, y: number, tick = 5) =>
	`M${x1.toFixed(1)} ${(y - tick).toFixed(1)} V${(y + tick).toFixed(1)} M${x2.toFixed(1)} ${(y - tick).toFixed(1)} V${(y + tick).toFixed(1)} M${x1.toFixed(1)} ${y.toFixed(1)} H${x2.toFixed(1)}`;


/** A double arrow «↕» of a color: returns set(x1, y1, x2, y2); a length under 4 px hides it. */
export const newDouble = (g: Element, color: string) => {
	const a = mkArrow(g, color);
	const b = mkArrow(g, color);
	return (x1: number, y1: number, x2: number, y2: number, hl = 6, hw = 3.4) => {
		const mx = (x1 + x2) / 2;
		const my = (y1 + y2) / 2;
		if (Math.hypot(x2 - x1, y2 - y1) < 4) {
			a(0, 0, 0, 0);
			b(0, 0, 0, 0);
			return;
		}
		a(mx, my, x2, y2, hl, hw);
		b(mx, my, x1, y1, hl, hw);
	};
};

/**
 * A soft spring seen from the side (a «пружинка-радуга»): n coils in `g`, each a narrow ellipse whose back half is
 * drawn darker, so the coils look like the turns of a helix. set(xs, y, ry) puts coil i at x = xs[i]; `red` (index)
 * draws that coil red and thicker.
 */
export const newSlinky = (g: Element, n: number, red = -1) => {
	const back = mkEl('g');
	const front = mkEl('g');
	g.append(back, front);
	const els = Array.from({ length: n }, (_, i) => {
		const b = mkEl('path', { class: i === red ? 'vdv-red-coil' : 'vdv-coil-back', opacity: i === red ? 0.65 : 1 });
		const f = mkEl('path', { class: i === red ? 'vdv-red-coil' : 'vdv-coil' });
		back.append(b);
		front.append(f);
		return { b, f };
	});
	// the red coil goes on top of its neighbors
	if (red >= 0) {
		back.append(els[red].b);
		front.append(els[red].f);
	}
	return (xs: number[], y: number, ry: number) => {
		els.forEach((c, i) => {
			const x = xs[i];
			const x2 = i + 1 < xs.length ? xs[i + 1] : x + (x - xs[i - 1]);
			// the turn leans a little: its top is ahead of its bottom by a quarter of the gap to the next coil
			const lean = Math.min(2, (x2 - x) * 0.25);
			const top = `${(x + lean).toFixed(1)} ${(y - ry).toFixed(1)}`;
			const bot = `${(x - lean).toFixed(1)} ${(y + ry).toFixed(1)}`;
			c.b.setAttribute('d', `M${bot} A2.6 ${ry} 0 0 1 ${top}`);
			c.f.setAttribute('d', `M${top} A2.6 ${ry} 0 0 1 ${bot}`);
		});
	};
};

/**
 * The vibrator of the chapter: a wheel turning evenly with a pin in a slotted yoke (a «кулиса»), so the end it holds
 * moves exactly as s = A·sin(φ). 'up': the yoke slides up and down and holds the end at (xEnd, y − s); 'along': it
 * slides left and right and pushes a rod to the end at (xEnd + s, y). Returns set(φ, s) with s in px.
 */
export const newVibrator = (g: Element, o: { kind: 'up' | 'along'; cx: number; cy: number; R: number; xEnd: number; y: number; h?: number }) => {
	const guide = mkEl('path', { class: 'vdv-axis', 'stroke-width': 1.4 });
	const wheel = mkEl('circle', { class: 'vdv-metal', cx: o.cx, cy: o.cy, r: (o.R + 2.5).toFixed(1) });
	const crank = mkEl('line', { class: 'vdv-axis', 'stroke-width': 2.2, x1: o.cx, y1: o.cy });
	const hub = mkEl('circle', { class: 'vdv-pin', cx: o.cx, cy: o.cy, r: 1.8 });
	const yoke = mkEl('path', { class: 'vdv-metal-dark' });
	const pin = mkEl('circle', { class: 'vdv-pin', r: 2.2 });
	const holder = mkEl('rect', { class: 'vdv-metal', rx: 1.5 });
	const stand = mkEl('path', { class: 'vdv-metal-dark', d: `M${o.cx - 3} ${o.cy} L${o.cx - 9} ${o.cy + o.R + 16} H${o.cx + 9} L${o.cx + 3} ${o.cy} Z` });
	g.append(stand, guide, wheel, crank, hub, yoke, pin, holder);
	const h = o.h ?? 12;
	if (o.kind === 'up') guide.setAttribute('d', `M${o.xEnd} ${o.y - o.R - 12} V${o.y + o.R + 12}`);
	else guide.setAttribute('d', `M${o.xEnd - o.R - 10} ${o.y + h / 2 + 3} H${o.xEnd + o.R + 6}`);
	return (phi: number, s: number) => {
		if (o.kind === 'up') {
			const p = { x: o.cx + o.R * Math.cos(phi), y: o.cy - o.R * Math.sin(phi) };
			crank.setAttribute('x2', p.x.toFixed(1));
			crank.setAttribute('y2', p.y.toFixed(1));
			pin.setAttribute('cx', p.x.toFixed(1));
			pin.setAttribute('cy', p.y.toFixed(1));
			const ys = o.y - s;
			yoke.setAttribute('d', `M${(o.cx - o.R - 6).toFixed(1)} ${(ys - 3).toFixed(1)} H${o.xEnd} V${(ys + 3).toFixed(1)} H${(o.cx - o.R - 6).toFixed(1)} Z`);
			holder.setAttribute('x', String(o.xEnd - 4));
			holder.setAttribute('y', (ys - 6).toFixed(1));
			holder.setAttribute('width', '8');
			holder.setAttribute('height', '12');
		} else {
			const p = { x: o.cx + o.R * Math.sin(phi), y: o.cy + o.R * Math.cos(phi) };
			crank.setAttribute('x2', p.x.toFixed(1));
			crank.setAttribute('y2', p.y.toFixed(1));
			pin.setAttribute('cx', p.x.toFixed(1));
			pin.setAttribute('cy', p.y.toFixed(1));
			const xs = o.cx + s;
			yoke.setAttribute('d', `M${(xs - 3).toFixed(1)} ${Math.min(o.y - 3, o.cy - o.R - 5).toFixed(1)} H${(xs + 3).toFixed(1)} V${(o.cy + o.R + 5).toFixed(1)} H${(xs - 3).toFixed(1)} Z M${(xs + 2).toFixed(1)} ${(o.y - 1.5).toFixed(1)} H${(o.xEnd + s - 3).toFixed(1)} V${(o.y + 1.5).toFixed(1)} H${(xs - 1).toFixed(1)} Z`);
			holder.setAttribute('x', (o.xEnd + s - 4).toFixed(1));
			holder.setAttribute('y', (o.y - h / 2 - 2).toFixed(1));
			holder.setAttribute('width', '4');
			holder.setAttribute('height', String(h + 4));
		}
	};
};

/** A looping picture: draw(t) with t running from 0 to `cycle` s again and again while the figure is on screen. */
export const cycleLoop = (fig: Element, cycle: number, draw: (t: number) => void) => {
	let t = 0;
	draw(0);
	loopKit(fig, (dt) => {
		t = (t + dt) % cycle;
		draw(t);
		return true;
	});
};
