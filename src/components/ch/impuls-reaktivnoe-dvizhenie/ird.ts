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

/** SVG text with italic letters: parts are strings, or [letter, index] for an italic letter with a subscript. */
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
