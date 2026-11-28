/**
 * Drawing helpers of the pictures and models of «Равновесие тел» (grade 10), usable at build time and in the browser.
 * Colors of the chapter (RtStyles.astro), one per quantity: the force of gravity m·g⃗ blue, the weight of a person P⃗
 * red, the tension of a thread, cable or rope T⃗ green, the reactions of supports, floor and wall N⃗ violet, the force
 * of a hand F⃗ teal, friction F⃗тр orange, the arm of a force d gold; the center of gravity is a quartered disc.
 *
 * Vector labels: a <text> with the attribute data-rtv="i,j" (indexes of the characters of its textContent that are
 * vectors) gets a small arrow over each of these characters from `vecArrows` (run in the browser; it measures the
 * glyphs, so it works with any font). Run it again after a label moves.
 */

export const f1 = (v: number) => v.toFixed(1);

/** A number the Russian way: a decimal comma and a real minus sign; `digits` after the comma. */
export const fmt = (v: number, digits = 1) => {
	const x = Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v;
	return x.toFixed(digits).replace('.', ',').replace('-', '−');
};

/** A filled arrow from (x1, y1) to (x2, y2): a shaft of width `w` and a head; '' when shorter than `min`. */
export const arrowPath = (x1: number, y1: number, x2: number, y2: number, w = 3, head = 10, min = 2) => {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.hypot(dx, dy);
	if (len < min) return '';
	const ux = dx / len;
	const uy = dy / len;
	const nx = -uy;
	const ny = ux;
	const h = Math.min(head, len * 0.6);
	const hw = h * 0.5;
	const bx = x2 - ux * h;
	const by = y2 - uy * h;
	const s = w / 2;
	const p = (x: number, y: number) => `${f1(x)} ${f1(y)}`;
	return (
		`M${p(x1 + nx * s, y1 + ny * s)} L${p(bx + nx * s, by + ny * s)} L${p(bx + nx * hw, by + ny * hw)} ` +
		`L${p(x2, y2)} L${p(bx - nx * hw, by - ny * hw)} L${p(bx - nx * s, by - ny * s)} L${p(x1 - nx * s, y1 - ny * s)} Z`
	);
};

/** The center-of-gravity mark (a disc of radius r in four quarters, two dark and two light) as SVG markup. */
export const cgMark = (x: number, y: number, r = 5) =>
	`<g class="rt-cg" transform="translate(${f1(x)} ${f1(y)})"><circle r="${r}" class="rt-cg__l"></circle>` +
	`<path class="rt-cg__d" d="M0 0 H${r} A${r} ${r} 0 0 0 0 ${-r} Z M0 0 H${-r} A${r} ${r} 0 0 0 0 ${r} Z"></path>` +
	`<circle r="${r}" class="rt-cg__o"></circle></g>`;

const NS = 'http://www.w3.org/2000/svg';

/** Draws the arrows over the vector characters of every text[data-rtv] inside `root` (replacing the old ones). */
export const vecArrows = (root: Element) => {
	for (const t of root.querySelectorAll<SVGTextElement>('text[data-rtv]')) vecArrow(t);
};
export const vecArrow = (t: SVGTextElement) => {
	const id = t.dataset.rtvId ?? (t.dataset.rtvId = Math.random().toString(36).slice(2, 8));
	const parent = t.parentNode as Element;
	for (const o of parent.querySelectorAll(`[data-rtv-of="${id}"]`)) o.remove();
	const shown = getComputedStyle(t).display !== 'none' && t.textContent?.trim();
	if (!shown) return;
	const cls = /rt-t--(\w+)/.exec(t.getAttribute('class') ?? '')?.[1] ?? 'ink';
	let d = '';
	for (const s of (t.dataset.rtv ?? '').split(',').filter(Boolean)) {
		let r: DOMRect | SVGRect;
		try {
			r = t.getExtentOfChar(Number(s));
		} catch {
			continue;
		}
		if (!r.width) continue;
		const x0 = r.x + 1.2;
		const x1 = r.x + r.width + 1.6;
		// above the capital (or ascender) height, or above the x-height for a short lowercase letter
		const ch = (t.textContent ?? '')[Number(s)] ?? 'A';
		const low = /[acegmnopqrsuvwxyz]/.test(ch);
		const y = r.y + r.height * (low ? 0.42 : 0.21) - 3.2;
		d += `M${f1(x0)} ${f1(y)} H${f1(x1)} M${f1(x1 - 3)} ${f1(y - 2.2)} L${f1(x1)} ${f1(y)} L${f1(x1 - 3)} ${f1(y + 2.2)} `;
	}
	if (!d) return;
	const halo = document.createElementNS(NS, 'path');
	halo.setAttribute('class', 'rt-ov rt-ov--halo');
	halo.setAttribute('d', d);
	halo.dataset.rtvOf = id;
	const ov = document.createElementNS(NS, 'path');
	ov.setAttribute('class', `rt-ov rt-s--${cls}`);
	ov.setAttribute('d', d);
	ov.dataset.rtvOf = id;
	t.after(halo, ov);
};

/**
 * Label placement for the live models: a label tries its candidate positions in order and takes the first one whose
 * box (in the SVG's user units, the vector arrow included) meets no obstacle — a segment (an arrow or a line, with its
 * half-width), a box (a body or a label placed before it) — and stays inside the view; when none is free, the one with
 * the fewest hits wins. Labels placed earlier become obstacles of the later ones.
 */
export type Seg = { x1: number; y1: number; x2: number; y2: number; w: number };
export type Box = { x0: number; y0: number; x1: number; y1: number };
export type Cand = { x: number; y: number; anchor?: 'start' | 'middle' | 'end' };

const hitSeg = (s: Seg, b: Box) => {
	const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
	const n = Math.max(1, Math.ceil(L / 1.5));
	for (let i = 0; i <= n; i++) {
		const x = s.x1 + ((s.x2 - s.x1) * i) / n;
		const y = s.y1 + ((s.y2 - s.y1) * i) / n;
		if (x > b.x0 - s.w && x < b.x1 + s.w && y > b.y0 - s.w && y < b.y1 + s.w) return true;
	}
	return false;
};
export const hitBox = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** A segment obstacle (an arrow from (x1, y1) to (x2, y2): its head is about 5 px wide on each side). */
export const segOf = (x1: number, y1: number, x2: number, y2: number, w = 3): Seg => ({ x1, y1, x2, y2, w });
/** A polyline or polygon as segments. */
export const segsOf = (pts: { x: number; y: number }[], w = 1.5, closed = false): Seg[] => {
	const out: Seg[] = [];
	for (let i = 0; i + 1 < pts.length; i++) out.push(segOf(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, w));
	if (closed && pts.length > 2) out.push(segOf(pts[pts.length - 1].x, pts[pts.length - 1].y, pts[0].x, pts[0].y, w));
	return out;
};

export const place = (t: SVGTextElement, cands: Cand[], segs: Seg[], boxes: Box[], view: Box, pad = 1.5): Box | null => {
	let best: { c: Cand; hits: number; box: Box } | null = null;
	const vec = !!t.dataset.rtv;
	for (const c of cands) {
		t.setAttribute('x', c.x.toFixed(1));
		t.setAttribute('y', c.y.toFixed(1));
		if (c.anchor) t.setAttribute('text-anchor', c.anchor);
		let bb: DOMRect;
		try {
			bb = t.getBBox();
		} catch {
			return null;
		}
		if (!bb.width) return null;
		const box = { x0: bb.x - pad, y0: bb.y - pad + (vec ? -1 : 2), x1: bb.x + bb.width + pad + (vec ? 1.5 : 0), y1: bb.y + bb.height + pad - 2 };
		let hits = 0;
		if (box.x0 < view.x0 || box.x1 > view.x1 || box.y0 < view.y0 || box.y1 > view.y1) hits += 1;
		for (const s of segs) if (hitSeg(s, box)) hits++;
		for (const b of boxes) if (hitBox(b, box)) hits++;
		if (!best || hits < best.hits) best = { c, hits, box };
		if (!hits) break;
	}
	if (!best) return null;
	t.setAttribute('x', best.c.x.toFixed(1));
	t.setAttribute('y', best.c.y.toFixed(1));
	if (best.c.anchor) t.setAttribute('text-anchor', best.c.anchor);
	boxes.push(best.box);
	if (vec) vecArrow(t);
	return best.box;
};

/** Candidates around a point: on a ring of radius r, starting from the angle a0 (rad, screen, y down). */
export const ring = (x: number, y: number, r: number, a0 = 0, n = 12): Cand[] =>
	Array.from({ length: n }, (_, i) => {
		const k = i % 2 ? Math.ceil(i / 2) : -i / 2; // 0, +1, −1, +2, −2, …
		const a = a0 + (k * 2 * Math.PI) / n;
		return { x: x + r * Math.cos(a), y: y + r * Math.sin(a) + 5, anchor: 'middle' as const };
	});

/** Candidates on three rings (radii 18, 26, 34) around a point, starting from the angle a0. */
export const rings = (x: number, y: number, a0 = 0): Cand[] => [...ring(x, y, 18, a0, 12), ...ring(x, y, 26, a0, 16), ...ring(x, y, 34, a0, 16)];

/** Candidates along an arrow from (x1, y1) to (x2, y2): beside it at fractions of its length, on both sides. */
export const along = (x1: number, y1: number, x2: number, y2: number, off = 13, fr = [0.55, 0.75, 0.35, 0.9, 0.2]): Cand[] => {
	const L = Math.hypot(x2 - x1, y2 - y1) || 1;
	const nx = -(y2 - y1) / L;
	const ny = (x2 - x1) / L;
	const out: Cand[] = [];
	for (const f of fr)
		for (const s of [1, -1]) out.push({ x: x1 + (x2 - x1) * f + nx * off * s, y: y1 + (y2 - y1) * f + ny * off * s + 5, anchor: 'middle' });
	out.push({ x: x2 + ((x2 - x1) / L) * 12, y: y2 + ((y2 - y1) / L) * 12 + 5, anchor: 'middle' });
	return out;
};
