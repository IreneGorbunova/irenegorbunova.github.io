/**
 * Client helpers shared by the pictures and models of «Электромагнитные волны. Свет как электромагнитная волна»
 * (grade 9). Colors (EvsStyles.astro): E red (arrow class 'e'), B purple ('b'), the direction of the wave gold, λ
 * green. Numbers the Russian way (decimal comma, real minus).
 */
import { el } from '../g7/kit';
export { el, fmt, fmtTrim, fmtInt, loop, k, tex, ease } from '../g7/kit';
export { newArrow, label, f1 } from '../pryamolineynoe-dvizhenie/pd';

export const TAU = Math.PI * 2;
/** The speed of light in vacuum, м/с (the school value 3·10⁸ м/с is used in the text). */
export const C = 299_792_458;

/**
 * An orthographic view of 3D points: x along the wave, y up, z toward the viewer of the side view (a right-handed
 * frame). The camera turns by the yaw `a` about the vertical axis and looks down by the pitch `b`:
 *   X = x·cos a − z·sin a,  d = x·sin a + z·cos a,  Y(up) = y·cos b − d·sin b,  depth (toward the viewer) = d·cos b + y·sin b.
 * a = b = 0 is the side view (z points at the viewer), b = 90° the view from above.
 */
export const view = (a: number, b: number, cx: number, cy: number) => {
	const ca = Math.cos(a);
	const sa = Math.sin(a);
	const cb = Math.cos(b);
	const sb = Math.sin(b);
	return {
		p: (x: number, y: number, z: number) => {
			const d = x * sa + z * ca;
			return { x: cx + x * ca - z * sa, y: cy - (y * cb - d * sb), depth: d * cb + y * sb };
		},
	};
};
export type View = ReturnType<typeof view>;

/**
 * A field vector drawn from a base point: an arrow while its picture is long enough, and a circle with a dot (toward
 * the viewer) or a cross (away) while it points along the line of sight. `color` is 'e' or 'b'.
 */
export const newVec = (g: Element, color: 'e' | 'b') => {
	const shaft = el('path', { class: `arrow arrow--${color}`, 'stroke-width': 1.8 });
	const head = el('path', { class: `head--${color}` });
	const ring = el('circle', { fill: 'none', class: `arrow--${color}`, 'stroke-width': 1.2 });
	const mark = el('path', { class: `arrow--${color}`, 'stroke-width': 1.2, fill: 'none' });
	ring.setAttribute('stroke', `var(--evs-${color})`);
	mark.setAttribute('stroke', `var(--evs-${color})`);
	g.append(shaft, head, ring, mark);
	return (bx: number, by: number, tx: number, ty: number, toward: number, mag: number) => {
		const dx = tx - bx;
		const dy = ty - by;
		const L = Math.hypot(dx, dy);
		const showArrow = L >= 5;
		if (showArrow) {
			const ux = dx / L;
			const uy = dy / L;
			const hl = Math.min(6, L * 0.55);
			const hw = Math.min(3.2, L * 0.3);
			const ex = tx - ux * hl;
			const ey = ty - uy * hl;
			shaft.setAttribute('d', `M${bx.toFixed(1)} ${by.toFixed(1)} L${(ex + ux * 0.4).toFixed(1)} ${(ey + uy * 0.4).toFixed(1)}`);
			head.setAttribute('d', `M${tx.toFixed(1)} ${ty.toFixed(1)} L${(ex - uy * hw).toFixed(1)} ${(ey + ux * hw).toFixed(1)} L${(ex + uy * hw).toFixed(1)} ${(ey - ux * hw).toFixed(1)} Z`);
		} else {
			shaft.setAttribute('d', '');
			head.setAttribute('d', '');
		}
		const sym = !showArrow && mag > 0.12;
		if (sym) {
			const r = 1.8 + 3.2 * mag;
			ring.setAttribute('cx', bx.toFixed(1));
			ring.setAttribute('cy', by.toFixed(1));
			ring.setAttribute('r', r.toFixed(1));
			const q = r * 0.62;
			mark.setAttribute(
				'd',
				toward > 0
					? `M${(bx - 0.6).toFixed(1)} ${by.toFixed(1)} a0.6 0.6 0 1 0 1.2 0 a0.6 0.6 0 1 0 -1.2 0`
					: `M${(bx - q).toFixed(1)} ${(by - q).toFixed(1)} L${(bx + q).toFixed(1)} ${(by + q).toFixed(1)} M${(bx + q).toFixed(1)} ${(by - q).toFixed(1)} L${(bx - q).toFixed(1)} ${(by + q).toFixed(1)}`,
			);
			mark.setAttribute('stroke-width', toward > 0 ? '1.6' : '1.2');
		} else {
			ring.setAttribute('r', '0');
			mark.setAttribute('d', '');
		}
	};
};

/** A bracket «|——|» between two screen points, its ticks `tick` px across. */
export const bracket = (x1: number, y1: number, x2: number, y2: number, tick = 4) => {
	const L = Math.hypot(x2 - x1, y2 - y1) || 1;
	const nx = (-(y2 - y1) / L) * tick;
	const ny = ((x2 - x1) / L) * tick;
	const P = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;
	return `M${P(x1 - nx, y1 - ny)} L${P(x1 + nx, y1 + ny)} M${P(x2 - nx, y2 - ny)} L${P(x2 + nx, y2 + ny)} M${P(x1, y1)} L${P(x2, y2)}`;
};

/**
 * The color of light of a wavelength (нм) as an sRGB string, for 380…760 нм: a smooth approximation of the spectrum
 * (after the well-known piecewise fit by D. Bruton), dimmed toward both ends where the eye sees little.
 */
export const spectral = (nm: number, gamma = 0.8) => {
	let r = 0;
	let g = 0;
	let b = 0;
	if (nm < 440) {
		r = -(nm - 440) / 60;
		b = 1;
	} else if (nm < 490) {
		g = (nm - 440) / 50;
		b = 1;
	} else if (nm < 510) {
		g = 1;
		b = -(nm - 510) / 20;
	} else if (nm < 580) {
		r = (nm - 510) / 70;
		g = 1;
	} else if (nm < 645) {
		r = 1;
		g = -(nm - 645) / 65;
	} else r = 1;
	let f = 1;
	if (nm < 420) f = 0.3 + (0.7 * (nm - 380)) / 40;
	else if (nm > 700) f = 0.3 + (0.7 * (760 - nm)) / 60;
	const c = (v: number) => Math.round(255 * Math.pow(Math.max(0, Math.min(1, v * f)), gamma));
	return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
};
