/**
 * Client helpers shared by the pictures and models of «Перемещение. Прямолинейное равномерное и равноускоренное
 * движение» (grade 9). Colors of the chapter (one per quantity, as in the grade-10 kinematics chapters): velocity blue
 * (`arrow--blue`, --ig-vx), acceleration red (`arrow--red`, --ig-vy), displacement, its projection and the area under
 * the graph of velocity gold (`arrow--gold`, --ig-v). Numbers the Russian way (decimal comma, real minus).
 */
import { el, fmt, fmtTrim } from '../g7/kit';

export { el, fmt, fmtTrim };
export const f1 = (v: number) => v.toFixed(1);

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
	for (const p of parts) {
		if (typeof p === 'string') t.append(document.createTextNode(p));
		else {
			const i = el('tspan', { class: 't-i' });
			i.textContent = p[0];
			t.append(i);
			if (p[1]) {
				const s = el('tspan', { 'baseline-shift': 'sub', 'font-size': '9' });
				s.textContent = p[1];
				t.append(s);
			}
		}
	}
	parent.append(t);
	return t;
};

/**
 * An axis Ox along y = `y` from px `xa` to `xb`, the value v at px X(v); ticks every `step`, numbers every `every`
 * (default: each tick), an arrowhead at the positive end and the label «x, м». `dir` −1 points it to the left.
 */
export const axisX = (g: Element, o: { y: number; xa: number; xb: number; X: (v: number) => number; from: number; to: number; step: number; every?: number; dir?: 1 | -1; name?: string; unit?: string }) => {
	g.replaceChildren();
	const dir = o.dir ?? 1;
	g.append(el('path', { class: 'ink', d: `M${f1(o.xa)} ${o.y} H${f1(o.xb)}` }));
	const tip = dir > 0 ? o.xb : o.xa;
	g.append(el('path', { class: 'head--ink', d: `M${f1(tip + 5 * dir)} ${o.y} l${-9 * dir} -4 v8 Z` }));
	const every = o.every ?? o.step;
	for (let v = o.from; v <= o.to + 1e-9; v += o.step) {
		const x = o.X(v);
		if (x < o.xa - 0.5 || x > o.xb + 0.5) continue;
		const major = Math.abs(v / every - Math.round(v / every)) < 1e-6;
		g.append(el('line', { class: 'ln', x1: f1(x), y1: o.y - (major ? 4 : 2.5), x2: f1(x), y2: o.y + (major ? 4 : 2.5) }));
		if (major) {
			const t = el('text', { class: 't-small t-num', x: f1(x), y: o.y + 15, 'text-anchor': 'middle' });
			t.textContent = fmtTrim(v, 1);
			g.append(t);
		}
	}
	label(g, dir > 0 ? o.xb - 2 : o.xa + 2, o.y - 8, [[o.name ?? 'x'], `, ${o.unit ?? 'м'}`], { 'text-anchor': dir > 0 ? 'end' : 'start' });
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
		g.append(el('line', { class: 'pdm-grid', x1: f1(T(t)), y1: o.y0, x2: f1(T(t)), y2: o.y0 + o.h }));
		if (Math.abs(t / te - Math.round(t / te)) < 1e-6 && t > 0 && t < o.t1 - 1e-9) {
			const tx = el('text', { class: 't-small t-num', x: f1(T(t)), y: f1(Math.min(o.y0 + o.h, V(0)) + 13), 'text-anchor': 'middle' });
			tx.textContent = fmtTrim(t, 1);
			g.append(tx);
		}
	}
	for (let v = Math.ceil(o.v0 / o.vStep) * o.vStep; v <= o.v1 + 1e-9; v += o.vStep) {
		g.append(el('line', { class: 'pdm-grid', x1: o.x0, y1: f1(V(v)), x2: o.x0 + o.w, y2: f1(V(v)) }));
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
	// the time label stands under the axis in place of the last number, clear of the graph's lines
	label(g, o.x0 + o.w + 9, Math.min(o.y0 + o.h, V(0)) + 13, [['t'], ', с'], { 'text-anchor': 'end', class: 't-halo' });
	label(g, o.x0 + 7, o.y0 - 1, [o.vName, `, ${o.vUnit}`], { class: 't-halo' });
	return { T, V };
};
