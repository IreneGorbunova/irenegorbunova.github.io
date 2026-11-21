/**
 * Client helpers shared by the pictures and models of «Свободное падение» (grade 9). Colors of the chapter, as in
 * «Прямолинейное движение»: velocity blue (`arrow--blue`, --ig-vx), the acceleration g red (`arrow--red`, --ig-vy, the
 * same length everywhere in a component: g does not change), displacement and heights gold (`arrow--gold`, --ig-v).
 * Numbers the Russian way (decimal comma, real minus).
 */
import { el, fmt, fmtTrim } from '../g7/kit';

export { el, fmt, fmtTrim };
export const f1 = (v: number) => v.toFixed(1);
export const G = 9.8;

/** Sets an arrow from (x1, y1) to (x2, y2): the shaft ends at the base of the head. Shorter than `min` px: hidden. */
export const arrow = (shaft: SVGPathElement, head: SVGPathElement, x1: number, y1: number, x2: number, y2: number, hl = 8, hw = 4.5, min = 1.5) => {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const L = Math.hypot(dx, dy);
	if (L < min) {
		shaft.setAttribute('d', '');
		head.setAttribute('d', '');
		return;
	}
	const ux = dx / L;
	const uy = dy / L;
	const h = Math.min(hl, L * 0.6);
	const bx = x2 - ux * h;
	const by = y2 - uy * h;
	shaft.setAttribute('d', `M${f1(x1)} ${f1(y1)} L${f1(bx + ux * 0.5)} ${f1(by + uy * 0.5)}`);
	head.setAttribute('d', `M${f1(x2)} ${f1(y2)} L${f1(bx - uy * hw)} ${f1(by + ux * hw)} L${f1(bx + uy * hw)} ${f1(by - ux * hw)} Z`);
};

/** A new arrow (shaft + head) of a color ('blue' | 'red' | 'gold' | 'ink') appended to `g`. */
export const newArrow = (g: Element, color: string) => {
	const s = el('path', { class: `arrow arrow--${color}` });
	const h = el('path', { class: `head--${color}` });
	g.append(s, h);
	return (x1: number, y1: number, x2: number, y2: number, hl?: number, hw?: number) => arrow(s, h, x1, y1, x2, y2, hl, hw);
};

/** SVG text with optional italic letters: parts are strings, or [letter, index] for an italic letter with a subscript. */
export const label = (parent: Element, x: number, y: number, parts: (string | [string, string?])[], attrs: Record<string, string | number> = {}) => {
	const t = el('text', { x: f1(x), y: f1(y), ...attrs });
	setLabel(t, parts);
	parent.append(t);
	return t;
};
/** Replaces the content of a label made by `label`. */
export const setLabel = (t: SVGTextElement, parts: (string | [string, string?])[]) => {
	t.replaceChildren();
	for (const p of parts) {
		if (typeof p === 'string') t.append(document.createTextNode(p));
		else {
			const i = el('tspan', { class: 't-i' });
			i.textContent = p[0];
			t.append(i);
			if (p[1]) {
				// a small subscript just below the line (a full 'sub' shift drops it too far at this size)
				const s = el('tspan', { dy: '2.5', 'font-size': '9' });
				s.textContent = p[1];
				t.append(s);
				const back = el('tspan', { dy: '-2.5' });
				back.textContent = '\u200b';
				t.append(back);
			}
		}
	}
};

/**
 * A fall with quadratic drag from rest: a = g(1 − υ²/υт²) (υт = 0 means no drag), tabulated every `dt` seconds until
 * the body has fallen `L` metres. Returns the time of the fall and y(t), υ(t) by linear interpolation.
 */
export const dragFall = (vt: number, L: number, dt = 1e-4) => {
	const ys: number[] = [0];
	const vs: number[] = [0];
	let y = 0;
	let v = 0;
	const h = dt / 10;
	while (y < L) {
		for (let k = 0; k < 10 && y < L; k++) {
			const a = vt > 0 ? G * (1 - (v * v) / (vt * vt)) : G;
			v += a * h;
			y += v * h;
		}
		ys.push(Math.min(y, L));
		vs.push(v);
	}
	const T = (ys.length - 1) * dt;
	const at = (arr: number[], t: number) => {
		const i = Math.max(0, Math.min(arr.length - 1.0001, t / dt));
		const k = Math.floor(i);
		return arr[k] + (arr[Math.min(k + 1, arr.length - 1)] - arr[k]) * (i - k);
	};
	return { T, y: (t: number) => (t >= T ? L : at(ys, t)), v: (t: number) => at(vs, Math.min(t, T)) };
};

/**
 * A graph frame: the time axis at value 0, the value axis at t = 0, light grid lines, numbers and labels. Returns the
 * maps T(t) → px and V(v) → px.
 */
export const graphFrame = (g: Element, o: { x0: number; y0: number; w: number; h: number; t1: number; tStep: number; tEvery?: number; v0: number; v1: number; vStep: number; vEvery?: number; vName: [string, string?]; vUnit: string }) => {
	g.replaceChildren();
	const T = (t: number) => o.x0 + (t / o.t1) * o.w;
	const V = (v: number) => o.y0 + o.h - ((v - o.v0) / (o.v1 - o.v0)) * o.h;
	const te = o.tEvery ?? o.tStep;
	const ve = o.vEvery ?? o.vStep;
	for (let t = 0; t <= o.t1 + 1e-9; t += o.tStep) {
		g.append(el('line', { class: 'spt-grid', x1: f1(T(t)), y1: o.y0, x2: f1(T(t)), y2: o.y0 + o.h }));
		if (Math.abs(t / te - Math.round(t / te)) < 1e-6 && t > 0 && t < o.t1 - 1e-9) {
			const tx = el('text', { class: 't-small t-num', x: f1(T(t)), y: f1(Math.min(o.y0 + o.h, V(0)) + 13), 'text-anchor': 'middle' });
			tx.textContent = fmtTrim(t, 1);
			g.append(tx);
		}
	}
	for (let v = Math.ceil(o.v0 / o.vStep) * o.vStep; v <= o.v1 + 1e-9; v += o.vStep) {
		g.append(el('line', { class: 'spt-grid', x1: o.x0, y1: f1(V(v)), x2: o.x0 + o.w, y2: f1(V(v)) }));
		if (Math.abs(v / ve - Math.round(v / ve)) < 1e-6) {
			const tx = el('text', { class: 't-small t-num', x: o.x0 - 4, y: f1(V(v) + 3.5), 'text-anchor': 'end' });
			tx.textContent = fmtTrim(v, 1);
			g.append(tx);
		}
	}
	g.append(el('path', { class: 'ink', d: `M${o.x0} ${f1(V(0))} H${o.x0 + o.w + 4}` }));
	g.append(el('path', { class: 'head--ink', d: `M${o.x0 + o.w + 9} ${f1(V(0))} l-9 -4 v8 Z` }));
	g.append(el('path', { class: 'ink', d: `M${o.x0} ${o.y0 + o.h} V${o.y0 - 4}` }));
	g.append(el('path', { class: 'head--ink', d: `M${o.x0} ${o.y0 - 9} l-4 9 h8 Z` }));
	label(g, o.x0 + o.w + 9, Math.min(o.y0 + o.h, V(0)) + 13, [['t'], ', с'], { 'text-anchor': 'end', class: 't-halo' });
	label(g, o.x0 + 7, o.y0 - 1, [o.vName, `, ${o.vUnit}`], { class: 't-halo' });
	return { T, V };
};
