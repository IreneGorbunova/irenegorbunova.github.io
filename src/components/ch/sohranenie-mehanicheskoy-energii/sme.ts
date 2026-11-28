/**
 * Client helpers shared by the pictures and models of «Закон сохранения механической энергии» (grade 9).
 *
 * Colors of the chapter, one per quantity in every picture and model: forces (F, mg, F_тр) red arrows (`arrow--red`,
 * --g7-red = --ig-vy), velocity blue arrows (`arrow--blue`, --g7-blue = --ig-vx), displacement and heights gold
 * (`arrow--gold`, --g7-gold = --ig-v). Energy bars: kinetic energy blue (the hue of velocity), potential energy gold
 * (the hue of height), the full mechanical energy E green (--g7-green), internal energy violet (--g7-violet).
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

export type BarKind = 'ek' | 'ep' | 'e' | 'u' | 'ek1' | 'ek2' | 'ep1' | 'ep2';
const BAR_NAME: Record<BarKind, (string | [string, string?])[]> = {
	ek: [['E', 'к']],
	ep: [['E', 'п']],
	e: [['E']],
	u: ['внутр.'],
	ek1: [['E', 'к1']],
	ek2: [['E', 'к2']],
	ep1: [['E', 'п1']],
	ep2: [['E', 'п2']],
};
const BAR_COLOR: Record<BarKind, string> = { ek: 'ek', ep: 'ep', e: 'e', u: 'u', ek1: 'ek', ek2: 'ek', ep1: 'ep', ep2: 'ep' };

/**
 * Energy bars on a common scale: `kinds` side by side from x, the bottoms at `base`, `full` px for `max` joules. Each
 * bar has its letter under it and its value in joules above it; colors as above ('u' is internal energy).
 * A dashed gold line at the height of the starting energy is drawn with `ref` (the level the sum must keep).
 * Returns set(values) to redraw them.
 */
export const energyBars = (g: Element, o: { x: number; base: number; full: number; max: number; kinds: BarKind[]; w?: number; gap?: number; digits?: number; unit?: string; ref?: boolean }) => {
	const w = o.w ?? 24;
	const gap = o.gap ?? 12;
	const unit = o.unit ?? 'Дж';
	const digits = o.digits ?? 1;
	const span = o.kinds.length * w + (o.kinds.length - 1) * gap;
	g.append(el('line', { class: 'sme-bar-base', x1: f1(o.x - 6), x2: f1(o.x + span + 6), y1: f1(o.base), y2: f1(o.base) }));
	const ref = o.ref ? el('line', { class: 'sme-bar-ref', x1: f1(o.x - 6), x2: f1(o.x + span + 6), y1: f1(o.base - o.full), y2: f1(o.base - o.full) }) : null;
	if (ref) g.append(ref);
	const items = o.kinds.map((kind, i) => {
		const x = o.x + i * (w + gap);
		g.append(el('rect', { class: 'sme-bar-slot', x: f1(x), y: f1(o.base - o.full), width: w, height: f1(o.full), rx: 2 }));
		const r = el('rect', { class: `sme-bar sme-bar--${BAR_COLOR[kind]}`, x: f1(x), y: f1(o.base), width: w, height: 0, rx: 2 });
		g.append(r);
		label(g, x + w / 2, o.base + 16, BAR_NAME[kind], { 'text-anchor': 'middle', class: `sme-bar-name sme-bar-name--${BAR_COLOR[kind]}${kind === 'u' ? ' t-small' : ''}` });
		const v = el('text', { class: 't-small t-num t-halo sme-bar-val', x: f1(x + w / 2), y: f1(o.base - 4), 'text-anchor': 'middle' });
		g.append(v);
		return { r, v };
	});
	const set = (vals: number[]) => {
		vals.forEach((val, i) => {
			const h = Math.max(0, Math.min(1.08, val / o.max)) * o.full;
			const it = items[i];
			it.r.setAttribute('y', f1(o.base - h));
			it.r.setAttribute('height', f1(h));
			it.v.setAttribute('y', f1(o.base - h - 4));
			it.v.textContent = `${fmt(Math.abs(val) < 0.5 * 10 ** -digits ? 0 : val, digits)}${unit ? ' ' + unit : ''}`;
		});
	};
	return Object.assign(set, { x: (i: number) => o.x + i * (w + gap), w, top: (val: number) => o.base - Math.max(0, Math.min(1.08, val / o.max)) * o.full });
};

/**
 * A vector label: a small arrow over the letter number `ci` of a label made by `label` (a short path in the color of
 * the label, as in sistema-otscheta/ProjAnglePicture). The arrow is placed from the measured glyph and follows the
 * text: call the returned function after every change of the text's x, y or visibility. Upper-case letters get the
 * arrow higher than lower-case ones; italic letters slant, so the arrow is shifted a little to the right.
 */
export const vecMark = (t: SVGTextElement, ci: number, color: string) => {
	const p = el('path', { class: `sme-vec sme-vec--${color}`, d: '' });
	t.after(p);
	let rel: { a: number; b: number; y: number } | null = null;
	return () => {
		const vis = t.getAttribute('visibility') ?? 'visible';
		p.setAttribute('visibility', vis);
		if (!rel) {
			try {
				if (ci >= t.getNumberOfChars()) return;
				const s = t.getStartPositionOfChar(ci);
				const e = t.getEndPositionOfChar(ci);
				if (!(e.x > s.x)) return;
				const x0 = Number(t.getAttribute('x'));
				const y0 = Number(t.getAttribute('y'));
				const fs = parseFloat(getComputedStyle(t).fontSize) || 14;
				const ch = (t.textContent ?? '')[ci] ?? 'x';
				const up = ch !== ch.toLowerCase();
				const sk = 0.1 * fs;
				const mid = (s.x + e.x) / 2 - x0 + sk;
				const half = Math.max(3.5, (e.x - s.x) / 2);
				rel = { a: mid - half, b: mid + half, y: s.y - y0 - (up ? 0.95 : 0.74) * fs };
			} catch {
				return;
			}
		}
		const x = Number(t.getAttribute('x')) + rel.b;
		const y = Number(t.getAttribute('y')) + rel.y;
		const xa = Number(t.getAttribute('x')) + rel.a;
		p.setAttribute('d', `M${f1(xa)} ${f1(y)} H${f1(x)} M${f1(x - 2.6)} ${f1(y - 2.4)} L${f1(x)} ${f1(y)} L${f1(x - 2.6)} ${f1(y + 2.4)}`);
	};
};
