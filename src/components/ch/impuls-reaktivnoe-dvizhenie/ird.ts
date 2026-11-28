/**
 * Client helpers shared by the pictures and models of «Импульс. Закон сохранения импульса. Реактивное движение»
 * (grade 9). Colors: velocity blue, momentum violet (thicker arrow), force red. Numbers the Russian way.
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

/** A new arrow of a color ('blue' | 'violet' | 'red' | 'gold' | 'ink') appended to `g`; violet (momentum) is wider. */
export const newArrow = (g: Element, color: string) => {
	const s = el('path', { class: `arrow arrow--${color}` });
	const h = el('path', { class: `head--${color}` });
	g.append(s, h);
	const wide = color === 'violet';
	return (x1: number, y1: number, x2: number, y2: number) => arrow(s, h, x1, y1, x2, y2, wide ? 10 : 8, wide ? 6.5 : 4.5);
};

/** A part of a label: a string, or [letter, index, vector] for an italic letter with a subscript, an arrow over it when `vector`. */
export type Part = string | [string, string?, boolean?];
/** SVG text with italic letters: parts are strings, or [letter, index, vector] (see Part). */
export const label = (parent: Element, x: number, y: number, parts: Part[], attrs: Record<string, string | number> = {}) => {
	const t = el('text', { x: f1(x), y: f1(y), ...attrs });
	setLabel(t, parts);
	parent.append(t);
	return t;
};
/** Replaces the content of a label made by `label`. */
export const setLabel = (t: SVGTextElement, parts: Part[]) => {
	t.replaceChildren();
	for (const p of parts) {
		if (typeof p === 'string') t.append(document.createTextNode(p));
		else {
			const i = el('tspan', { class: p[2] ? 't-i t-vec' : 't-i' });
			i.textContent = p[0];
			t.append(i);
			if (p[1]) {
				const s = el('tspan', { dy: '2.5', 'font-size': '9' });
				s.textContent = p[1];
				t.append(s);
				const back = el('tspan', { dy: '-2.5' });
				back.textContent = '​';
				t.append(back);
			}
		}
	}
};

/**
 * Vector labels: a short arrow over every letter `tspan.t-vec` inside `root` (as ProjAnglePicture of «Перемещение»
 * draws it: a line with a small open head). The arrow is a path right after its text, in the text's color, measured
 * from the rendered glyph (so it follows the font size at every width); it copies the text's visibility. Call again after
 * a label moves or changes; `vecAuto` also redraws on resize and when the fonts have loaded.
 */
const marks = new WeakMap<SVGTextElement, SVGPathElement>();
const COLORS = ['blue', 'violet', 'red', 'gold', 'green'];
const CAPS = /[A-ZА-ЯЁ]/;
export const vecMarks = (root: Element) => {
	for (const t of root.querySelectorAll<SVGTextElement>('text')) {
		const spans = t.querySelectorAll<SVGTSpanElement>('tspan.t-vec');
		let path = marks.get(t);
		if (!spans.length && !path) continue;
		if (!path || !path.isConnected) {
			path = el('path', { class: 'ird-vec' });
			const c = COLORS.find((k) => t.classList.contains(`t-${k}`) || spans[0]?.classList.contains(`t-${k}`));
			if (c) path.classList.add(`ird-vec--${c}`);
			t.after(path);
			marks.set(t, path);
		}
		path.setAttribute('visibility', t.getAttribute('visibility') ?? 'visible');
		path.setAttribute('opacity', t.getAttribute('opacity') ?? '1');
		let d = '';
		let sw = 1;
		for (const s of spans) {
			if (!s.getNumberOfChars()) continue;
			let a: DOMPoint, b: DOMPoint;
			try {
				a = s.getStartPositionOfChar(0);
				b = s.getEndPositionOfChar(0);
			} catch {
				continue;
			}
			const fs = parseFloat(getComputedStyle(s).fontSize) || 12;
			sw = Math.max(1, 0.085 * fs);
			const cap = CAPS.test(s.textContent ?? '');
			const y = a.y - (cap ? 0.93 : 0.74) * fs;
			const cx = (a.x + b.x) / 2 + (cap ? 0.12 : 0.1) * fs; // italic: the top of the glyph leans right
			const hw = Math.max(0.24 * fs, Math.abs(b.x - a.x) / 2);
			const h = 0.15 * fs;
			const x1 = cx - hw;
			const x2 = cx + hw;
			d += `M${f1(x1)} ${f1(y)} H${f1(x2)} M${f1(x2 - h)} ${f1(y - h)} L${f1(x2)} ${f1(y)} L${f1(x2 - h)} ${f1(y + h)} `;
		}
		path.setAttribute('d', d.trim());
		path.style.strokeWidth = `${sw.toFixed(2)}px`;
	}
};
/** Draws the vector arrows of `root` now, after the fonts load and on every resize. */
export const vecAuto = (root: Element) => {
	vecMarks(root);
	document.fonts?.ready.then(() => vecMarks(root));
	new ResizeObserver(() => vecMarks(root)).observe(root.closest('figure') ?? root);
};
