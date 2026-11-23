/**
 * Label placement for the live models of «Законы Ньютона»: a label tries its candidate positions in order and takes the
 * first one whose box (in the SVG's user units) meets no obstacle — a segment (an arrow or a line, with its half-width),
 * a box (a body or a label placed before it) — and stays inside the view; when none is free, the one with the fewest
 * hits wins. Labels placed earlier become obstacles of the later ones.
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
const hitBox = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** An arrow from (x1, y1) to (x2, y2) as an obstacle (its head is about 5 px wide on each side). */
export const segOf = (x1: number, y1: number, x2: number, y2: number, w = 3): Seg => ({ x1, y1, x2, y2, w });

export const place = (t: SVGTextElement | SVGGraphicsElement, cands: Cand[], segs: Seg[], boxes: Box[], view: Box, pad = 1.5): Box | null => {
	let best: { c: Cand; hits: number; box: Box } | null = null;
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
		const box = { x0: bb.x - pad, y0: bb.y - pad + 2, x1: bb.x + bb.width + pad, y1: bb.y + bb.height + pad - 2 };
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
	return best.box;
};

/** Candidates around a point: on a ring of radius r, starting from the angle a0 (rad, screen, y down). */
export const ring = (x: number, y: number, r: number, a0 = 0, n = 12): Cand[] =>
	Array.from({ length: n }, (_, i) => {
		const k = i % 2 ? Math.ceil(i / 2) : -i / 2; // 0, +1, −1, +2, −2, …
		const a = a0 + (k * 2 * Math.PI) / n;
		return { x: x + r * Math.cos(a), y: y + r * Math.sin(a) + 5, anchor: 'middle' as const };
	});
